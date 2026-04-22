"""End-to-end RINEX pipeline orchestration.

Given a flat set of RINEX files the user uploaded, plus optional control
station coordinates, this module:

  1. Parses all OBS headers to identify stations and sessions.
  2. Groups observation files into (station, session_id, role) tuples.
     Role is either "base" (stationary, provides the reference frame) or
     "mobile" (rover, possibly visiting multiple points in one day).
  3. For each (base, rover-session) pair, runs rnx2rtkp to solve a
     baseline and records the ECEF vector.
  4. Also computes inter-base baselines for network redundancy.
  5. Feeds the baselines into the existing loops + adjustment pipeline.

The session identifier lets a single "Tiahoue" marker visiting 3 sites in
one day produce 3 distinct points in the network ("Tiahoue_I",
"Tiahoue_I5", "Tiahoue_K"), which the rest of the pipeline treats as
independent unknowns.
"""
from __future__ import annotations

import os
import re
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

from .models import Station, Baseline
from .rinex  import parse_obs_header, is_obs, is_nav, RinexObsHeader
from .baselines import _DEFAULT_RNX2RTKP, RTKLibConfig
from .decimate import decimate_rinex_obs


# ═════════════════════════════  station discovery  ═════════════════════════

# Extract a session code from a RINEX 2 filename ending in hour letter.
# Examples:
#   moyen2006I.26O    → session "I"    (hour 8 UTC)
#   Tiahoue006I5.26O  → session "I5"   (same hour, 5th in sequence)
#   Tiahoue006K.26O   → session "K"    (hour 10 UTC)
#
# RINEX 2 convention: DDDH.YYt  where DDD = day-of-year, H = hour letter
# ('a'=0, 'b'=1, ..., 'x'=23), 0 = full 24h. The 5 suffix, 3-suffix, etc.
# are CHC's way of handling multiple files per hour.
_SESSION_RE = re.compile(r"(\d{3})([A-Za-z]\d*)\.\d\d[OoNnPpGgLlCcQq]$")


def session_code(path: str | Path) -> str:
    m = _SESSION_RE.search(os.path.basename(str(path)))
    return m.group(2) if m else ""


@dataclass
class Session:
    """One continuous recording at a single physical point."""
    station_point: str     # unique name: "marker_sessioncode" or just "marker"
    marker_name: str
    session_code: str      # "I", "I5", "K", or "" if no code
    role: str              # "base" | "mobile"
    obs_file: str
    approx_xyz: Optional[tuple[float, float, float]]
    antenna_height: float
    interval_s: float
    start_utc: str


def discover_sessions(obs_files: Iterable[str],
                      base_marker_names: Iterable[str]) -> list[Session]:
    """Parse each OBS file and tag it as base-point or mobile-point.

    A marker is a *base* if its name (case-insensitive) matches any entry in
    ``base_marker_names``; everything else is a mobile. Bases get a single
    session per file (same point even across sessions). Mobile rovers get
    one session-point per file because each occupation is a different
    survey point.
    """
    base_lc = {n.lower() for n in base_marker_names}
    sessions: list[Session] = []
    for p in obs_files:
        h = parse_obs_header(p)
        is_base = h.marker_name.lower() in base_lc
        code = session_code(p)
        if is_base:
            # Bases don't vary across sessions — same physical point.
            point = h.marker_name
        else:
            # Each mobile session is a distinct point unless only one session.
            point = f"{h.marker_name}_{code}" if code else h.marker_name
        sessions.append(Session(
            station_point=point,
            marker_name=h.marker_name,
            session_code=code,
            role="base" if is_base else "mobile",
            obs_file=h.path,
            approx_xyz=h.approx_xyz,
            antenna_height=h.antenna_delta_hen[0],
            interval_s=h.interval,
            start_utc=h.time_first_obs,
        ))
    return sessions


# ═════════════════════════════  nav file grouping  ═════════════════════════

def pick_nav_files(obs_path: str, all_nav_files: list[str],
                   prefer_mixed: bool = True) -> list[str]:
    """Return nav files that are most relevant for a given observation file.

    CHC exports one nav file per constellation (G/R/E/C/P). We prefer the
    mixed (`.YYp` / sys='M') file if present, otherwise fall back to the
    per-constellation set. Files from the same folder or sharing the same
    basename prefix are preferred, but we accept any as fallback.
    """
    obs_stem = Path(obs_path).stem    # "moyen2006I"
    same_stem = [n for n in all_nav_files if Path(n).stem == obs_stem]

    if same_stem:
        if prefer_mixed:
            mixed = [n for n in same_stem if n.lower().endswith(("p", ".nav"))]
            if mixed:
                return mixed
        return same_stem
    # Fallback: any nav file in the same parent directory
    parent = Path(obs_path).parent
    same_dir = [n for n in all_nav_files if Path(n).parent == parent]
    if same_dir:
        return same_dir
    return list(all_nav_files)  # last resort


# ═════════════════════════════  rnx2rtkp driver  ═══════════════════════════

def _default_opts_conf(kinematic: bool = False) -> str:
    """rnx2rtkp option block.

    ``kinematic=False`` (default) gives one static position summary per run —
    used for inter-base lines and short occupations (≤ ~10 min).

    ``kinematic=True`` emits one solution per epoch, used when the rover
    moves between multiple survey points in a single RINEX file (stop-and-go
    PPK). The caller downstream is responsible for segmenting the resulting
    trajectory into stationary occupations.
    """
    shared = [
        "pos1-frequency     =l1+l2",
        "pos1-soltype       =forward",
        "pos1-elmask        =10",
        "pos1-ionoopt       =dual-freq",
        "pos1-tropopt       =saas",
        "pos1-sateph        =brdc",
        "pos1-navsys        =63",
        "pos2-armode        =continuous",
        "pos2-arthres       =2.0",    # integer validation threshold (ratio test). rnx2rtkp
                                       # default is 1.8 — produces many wrong-integer Fix on
                                       # short kinematic stops that break the LS adjustment.
                                       # 2.0 is a gentle tightening that keeps most stops as
                                       # Fix while rejecting the most marginal ones.
        "pos2-gloarmode     =on",
        "out-solformat      =xyz",
        "out-outhead        =off",
        "out-outopt         =off",
        "stats-eratio1      =100.0",
        "stats-eratio2      =100.0",
    ]
    mode = [
        "pos1-posmode       =kinematic",
        "out-solstatic      =all",
    ] if kinematic else [
        "pos1-posmode       =static",
        "out-solstatic      =single",
    ]
    return "\n".join(mode + shared + [""])


# Match an rnx2rtkp XYZ-ECEF solution line. rnx2rtkp output looks like:
#   2026/01/06 08:52:46.000   6250798.1907   -830364.9192    958687.6367   1   5   0.0049   0.0018   0.0019  -0.0020  -0.0008   0.0020   4.00    2.3
# (timestamp ·  X Y Z · Q · ns · sdx sdy sdz sdxy sdyz sdzx · age · ratio)
# X and Z are ECEF coords in metres → always ≥ 5-digit magnitudes. The
# negative-lookbehind stops the match from starting in the middle of the
# timestamp fractional seconds.
_EPOCH_LINE = re.compile(
    r"^(?P<ts>\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)"
    r"\s+(?P<x>-?\d+\.\d+)\s+(?P<y>-?\d+\.\d+)\s+(?P<z>-?\d+\.\d+)"
    r"\s+(?P<Q>\d+)\s+(?P<ns>\d+)"
    r"\s+(?P<sx>\d+\.\d+)\s+(?P<sy>\d+\.\d+)\s+(?P<sz>\d+\.\d+)"
    r"(?:\s+-?\d+\.\d+){3}"
    r"\s+(?P<age>-?\d+\.\d+)"
    r"\s+(?P<ratio>\d+\.\d+)"
)


def _parse_all_epochs(pos_text: str, proc=None) -> list[dict]:
    """Parse every non-comment line as a per-epoch solution dict."""
    import datetime as _dt
    out: list[dict] = []
    for line in pos_text.splitlines():
        if not line or line.startswith("%"):
            continue
        m = _EPOCH_LINE.match(line)
        if not m:
            continue
        ts = _dt.datetime.strptime(m["ts"][:19], "%Y/%m/%d %H:%M:%S").timestamp()
        out.append({
            "t":  ts,
            "x":  float(m["x"]), "y":  float(m["y"]), "z":  float(m["z"]),
            "sx": float(m["sx"]), "sy": float(m["sy"]), "sz": float(m["sz"]),
            "Q":  int(m["Q"]), "ns": int(m["ns"]),
            "ratio": float(m["ratio"]),
        })
    return out


_SOL_LINE = re.compile(
    r"(?<![\d.])(?P<x>-?\d{5,8}\.\d+)\s+"
    r"(?P<y>-?\d{1,8}\.\d+)\s+"
    r"(?P<z>-?\d{5,8}\.\d+)\s+"
    r"(?P<Q>[1-5])\s+"
    r"(?P<ns>\d+)\s+"
    r"(?P<sx>\d+\.\d+)\s+"
    r"(?P<sy>\d+\.\d+)\s+"
    r"(?P<sz>\d+\.\d+)"
    r"(?:\s+-?\d+\.\d+){3}"                 # sdxy sdyz sdzx (can be signed)
    r"\s+(?P<age>-?\d+\.\d+)"               # age may be negative (rnx2rtkp quirk)
    r"\s+(?P<ratio>\d+\.\d+)"
)


def _run_rnx2rtkp(base_obs: str, rover_obs: str, nav_files: list[str],
                  base_pos_xyz: tuple[float, float, float],
                  binary: str = _DEFAULT_RNX2RTKP,
                  kinematic: bool = False,
                  output_interval_s: int = 5) -> dict:
    # output_interval_s is only honoured in kinematic mode — static uses a
    # single summary solution. Default 5 s matches CHC's output cadence.
    """Run rnx2rtkp for a single baseline.

    In static mode (default) returns the single summary solution.
    In kinematic mode returns ``{"epochs": [...]}`` with one entry per epoch.

    rnx2rtkp convention:
      - First OBS arg = rover
      - Second OBS arg = base (reference)
      - -r X Y Z sets the known base ECEF
    """
    with tempfile.TemporaryDirectory() as tmp:
        conf_path = os.path.join(tmp, "opts.conf")
        pos_path  = os.path.join(tmp, "out.pos")
        with open(conf_path, "w") as f:
            f.write(_default_opts_conf(kinematic=kinematic))

        args = [
            binary,
            "-k", conf_path,
            "-o", pos_path,
            "-p", "2" if kinematic else "3",
            "-r", f"{base_pos_xyz[0]:.4f}",
                 f"{base_pos_xyz[1]:.4f}",
                 f"{base_pos_xyz[2]:.4f}",
        ]
        if kinematic:
            # Lock rnx2rtkp's output grid to the rover's actual cadence
            # (matches decimate.py). Mismatched -ti means most output
            # slots have no matching rover epoch → 0 Fix.
            args += ["-ti", str(output_interval_s)]
        args += [rover_obs, base_obs, *nav_files]
        proc = subprocess.run(args, capture_output=True, text=True, timeout=1800)
        if proc.returncode != 0:
            raise RuntimeError(
                f"rnx2rtkp exited {proc.returncode}\n"
                f"stderr: {proc.stderr[:500]}"
            )
        with open(pos_path) as f:
            pos_text = f.read()

    if kinematic:
        return {"epochs": _parse_all_epochs(pos_text, proc)}

    best: Optional[dict] = None
    for line in pos_text.splitlines():
        if not line or line.startswith("%"):
            continue
        m = _SOL_LINE.search(line)
        if not m:
            continue
        rec = {
            "x":  float(m["x"]), "y":  float(m["y"]), "z":  float(m["z"]),
            "sx": float(m["sx"]), "sy": float(m["sy"]), "sz": float(m["sz"]),
            "Q":  int(m["Q"]), "ns": int(m["ns"]),
            "age":   float(m.groupdict().get("age",   "0") or 0),
            "ratio": float(m.groupdict().get("ratio", "0") or 0),
            "raw":   line.strip(),
        }
        if best is None or rec["Q"] < best["Q"] or (rec["Q"] == best["Q"] and rec["ns"] >= best["ns"]):
            best = rec
    if not best:
        # Surface the raw output so we can debug format mismatches remotely
        sample = "\n".join(pos_text.splitlines()[:40])
        raise RuntimeError(
            f"no solution line parsed from rnx2rtkp output "
            f"(exit={proc.returncode}, stderr_head={proc.stderr[:200]!r}, "
            f"pos_head={sample[:800]!r})"
        )
    return best


# ═════════════════════════════  pipeline  ═══════════════════════════════════

@dataclass
class StopDetectorOpts:
    """Knobs for the kinematic stop detector. Defaults tuned against the
    2026-01-06 CHC dataset; projects with quieter rovers can tighten them,
    noisier ones can relax.
    """
    speed_threshold_ms: float = 0.10     # m/s, max step-to-step speed inside a stop
    min_duration_s:     float = 10.0     # seconds, min dwell time
    cluster_radius_m:   float = 0.10     # m, max spatial scatter within a cluster
    min_cluster_size:   int   = 2        # min Fix epochs per spatial cluster
    max_time_span_s:    float = 600.0    # s, split revisits older than this
    sigma_floor_m:      float = 0.05     # m, 2-epoch clusters need σ ≤ this to pass


@dataclass
class PipelineInput:
    obs_files: list[str]
    nav_files: list[str]
    base_marker_names: list[str]
    control_stations: list[Station]         # may be empty
    projection_hint_latlon_deg: Optional[tuple[float, float]] = None
    stop_opts: StopDetectorOpts = None  # type: ignore[assignment]

    def __post_init__(self):
        if self.stop_opts is None:
            self.stop_opts = StopDetectorOpts()


def _cluster_fix_positions(epochs: list[dict],
                           cluster_radius_m: float = 0.05,
                           min_cluster_size: int = 3,
                           max_time_span_s: float = 600.0) -> list[dict]:
    """Spatial-first clustering of Fix epochs.

    Groups epochs that land within ``cluster_radius_m`` of each other.
    A genuine static occupation has cm-level scatter; 5 cm is a generous
    but still tight bound that rejects moving rovers that happen to drift
    slowly.

    ``max_time_span_s`` splits a cluster if it would span more than N seconds
    — a rover that "returns" to the same point hours later is a separate
    occupation, not the same one. Each returned stop is therefore contiguous
    in time within about ``max_time_span_s``.
    """
    import math
    fix_epochs = [e for e in epochs if e["Q"] == 1]
    if len(fix_epochs) < min_cluster_size:
        return []

    # Simple greedy clustering: walk time-ordered epochs, add to an existing
    # cluster if its centroid is within the radius AND time span stays bounded.
    clusters: list[list[dict]] = []
    for e in fix_epochs:
        placed = False
        for c in clusters:
            cx = sum(x["x"] for x in c) / len(c)
            cy = sum(x["y"] for x in c) / len(c)
            cz = sum(x["z"] for x in c) / len(c)
            d = math.sqrt((e["x"]-cx)**2 + (e["y"]-cy)**2 + (e["z"]-cz)**2)
            time_span = e["t"] - c[0]["t"]
            if d <= cluster_radius_m and time_span <= max_time_span_s:
                c.append(e); placed = True; break
        if not placed:
            clusters.append([e])

    stops: list[dict] = []
    for c in clusters:
        if len(c) < min_cluster_size:
            continue
        xs = [e["x"] for e in c]; ys = [e["y"] for e in c]; zs = [e["z"] for e in c]
        mx, my, mz = sum(xs)/len(xs), sum(ys)/len(ys), sum(zs)/len(zs)
        def _sd(vals, m):
            if len(vals) < 2: return 0.0
            return (sum((v - m) ** 2 for v in vals) / (len(vals) - 1)) ** 0.5
        sx, sy, sz = _sd(xs, mx), _sd(ys, my), _sd(zs, mz)
        stops.append({
            "t_start":  c[0]["t"], "t_end": c[-1]["t"],
            "duration": c[-1]["t"] - c[0]["t"],
            "n_epochs": len(c),
            "fix_ratio": 1.0,      # all cluster members are Q=1 by construction
            "x": mx, "y": my, "z": mz,
            "sx": max(sx, 0.003), "sy": max(sy, 0.003), "sz": max(sz, 0.003),
            "ns":    round(sum(e["ns"] for e in c) / len(c)),
            "ratio": sum(e["ratio"] for e in c) / len(c),
        })
    stops.sort(key=lambda s: s["t_start"])
    return stops


def _detect_stops(epochs: list[dict],
                  speed_threshold_ms: float = 0.08,
                  min_duration_s: float = 10.0,
                  min_fix_epochs: int = 3,
                  min_fix_ratio: float = 0.15,
                  max_spread_m:   float = 0.40,
                  q_accept: set[int] = frozenset({1, 2})) -> list[dict]:
    """Segment a kinematic trajectory into stationary occupations.

    A "stop" is a run of consecutive accepted epochs whose inter-epoch
    distance stays below ``speed_threshold_ms`` for at least
    ``min_duration_s``. Both Fix (Q=1) and Float (Q=2) solutions are
    accepted by default so we don't lose occupations during periods where
    rnx2rtkp couldn't maintain an integer fix.

    A stop's ``fix_ratio`` reports the fraction of its epochs that were Q=1
    — the UI can decide to flag it as provisional below some threshold.
    """
    import math
    if not epochs:
        return []
    stops: list[dict] = []
    current: list[dict] = []

    def _flush():
        if len(current) < 2:
            return
        duration = current[-1]["t"] - current[0]["t"]
        if duration < min_duration_s:
            return
        # Quality gate 1 — minimum Fix count + Fix ratio. Stop must include
        # ≥ min_fix_epochs Q=1 observations AND ≥ min_fix_ratio of epochs
        # must be Fix. Pure-Float sequences get dropped.
        n_fix = sum(1 for e in current if e["Q"] == 1)
        if n_fix < min_fix_epochs:
            return
        if n_fix / len(current) < min_fix_ratio:
            return
        xs = [e["x"] for e in current]
        ys = [e["y"] for e in current]
        zs = [e["z"] for e in current]
        mx, my, mz = sum(xs)/len(xs), sum(ys)/len(ys), sum(zs)/len(zs)

        # Quality gate 2 — spatial spread. Real occupations are tight clusters
        # (a few cm); if the points are spread over more than max_spread_m the
        # rover was either drifting or we've captured a false plateau.
        max_diag = max(max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs))
        if max_diag > max_spread_m:
            return

        # Spread-based σ (1-sigma of the scatter)
        def _sd(vals, m):
            if len(vals) < 2: return 0.0
            return (sum((v - m) ** 2 for v in vals) / (len(vals) - 1)) ** 0.5
        sx, sy, sz = _sd(xs, mx), _sd(ys, my), _sd(zs, mz)
        # Also take the mean of per-epoch σ as a sanity floor
        esx = sum(e["sx"] for e in current) / len(current)
        esy = sum(e["sy"] for e in current) / len(current)
        esz = sum(e["sz"] for e in current) / len(current)
        n_fix = sum(1 for e in current if e["Q"] == 1)
        stops.append({
            "t_start":  current[0]["t"],
            "t_end":    current[-1]["t"],
            "duration": duration,
            "n_epochs": len(current),
            "fix_ratio": n_fix / len(current) if current else 0.0,
            "x": mx, "y": my, "z": mz,
            "sx": max(sx, esx), "sy": max(sy, esy), "sz": max(sz, esz),
            "ns":    round(sum(e["ns"] for e in current) / len(current)),
            "ratio": sum(e["ratio"] for e in current) / len(current),
        })

    prev: dict | None = None
    for e in epochs:
        if e["Q"] not in q_accept:
            _flush(); current = []; prev = None
            continue
        if prev is None:
            current = [e]; prev = e; continue
        dt = max(e["t"] - prev["t"], 1e-6)
        dx = e["x"] - prev["x"]; dy = e["y"] - prev["y"]; dz = e["z"] - prev["z"]
        dist = math.sqrt(dx*dx + dy*dy + dz*dz)
        speed = dist / dt
        # 60 s gap → new session chunk; > threshold → rover moved, split
        if dt > 60 or speed > speed_threshold_ms:
            _flush()
            current = [e]
        else:
            current.append(e)
        prev = e
    _flush()
    return stops


def _group_mobile_sessions_by_position(
    mobiles: list["Session"],
    merge_threshold_m: float = 5.0,
) -> dict[str, str]:
    """Group mobile sessions whose approximate positions (from the RINEX header
    APPROX POSITION XYZ) are within ``merge_threshold_m`` metres of each
    other. Returns a mapping session_point → merged_point_name.

    This mirrors what CHC Geomatics Office does automatically: if a rover is
    restarted at the same physical location (e.g. session I then I5 after a
    brief file rollover), both files should resolve to the same point name
    rather than two independent unknowns in the network.

    The APPROX POSITION XYZ in the RINEX header is the receiver's own SPP
    estimate — accurate to a few metres — which is more than enough to tell
    co-located sessions apart from sessions metres away.
    """
    by_marker: dict[str, list["Session"]] = {}
    for s in mobiles:
        if not s.approx_xyz:
            continue
        by_marker.setdefault(s.marker_name, []).append(s)

    mapping: dict[str, str] = {s.station_point: s.station_point for s in mobiles}
    for marker, sessions in by_marker.items():
        # Sort by start time so the earliest session claims the canonical name
        sessions.sort(key=lambda s: s.start_utc)
        clusters: list[list["Session"]] = []
        for s in sessions:
            placed = False
            for c in clusters:
                ref = c[0]
                if ref.approx_xyz is None:
                    continue
                d = sum((a - b) ** 2 for a, b in zip(s.approx_xyz, ref.approx_xyz)) ** 0.5
                if d <= merge_threshold_m:
                    c.append(s)
                    placed = True
                    break
            if not placed:
                clusters.append([s])

        for i, c in enumerate(clusters):
            canonical = c[0].marker_name if i == 0 else f"{c[0].marker_name}_{i}"
            for s in c:
                mapping[s.station_point] = canonical
    return mapping


def compute_all_baselines(pin: PipelineInput) -> tuple[list[Baseline], list[Station], list[str]]:
    """Run rnx2rtkp for every (base, rover-session) pair plus every pair of
    distinct bases. Returns baselines, the station list (with control coords
    filled in where provided), and human-readable warnings.
    """
    sessions = discover_sessions(pin.obs_files, pin.base_marker_names)
    bases   = [s for s in sessions if s.role == "base"]
    mobiles = [s for s in sessions if s.role == "mobile"]
    if not bases:
        raise ValueError(
            "No base stations found in the uploaded files. The marker name of "
            f"at least one OBS file must match one of: {pin.base_marker_names}"
        )
    if not mobiles and len(bases) < 2:
        raise ValueError(
            "Need at least one mobile session, or two bases to form an inter-base baseline."
        )

    # Accumulate diagnostic messages inline so both the mobile and base
    # dedup passes below can append to it.
    warnings: list[str] = []

    # Merge mobile sessions that belong to the same physical point (CHC does this).
    # For each resulting point, keep only ONE representative session so the network
    # doesn't end up with two parallel edges between the same pair of stations.
    point_map = _group_mobile_sessions_by_position(mobiles, merge_threshold_m=5.0)
    representative: dict[str, "Session"] = {}
    for s in mobiles:
        merged_name = point_map.get(s.station_point, s.station_point)
        s.station_point = merged_name
        prev = representative.get(merged_name)
        # Prefer the session with the longest recording window (more epochs = better Fix).
        # Fall back to session code ordering so results are stable.
        if prev is None:
            representative[merged_name] = s
        else:
            # Heuristic: keep the session whose obs file is larger (proxy for more epochs)
            import os as _o
            if _o.path.getsize(s.obs_file) > _o.path.getsize(prev.obs_file):
                representative[merged_name] = s
    mobiles = list(representative.values())

    # Deduplicate BASES by marker_name. A base is stationary by
    # definition — two obs files with the same MARKER NAME header
    # represent the same physical station, even if their APPROX XYZ
    # differs by several metres (common when one session is very short
    # and its SPP estimate hasn't converged). Position-based clustering
    # with a 5 m threshold would miss the "Moyen2008J (21 epochs) +
    # Moyen2008J5 (4967 epochs)" case because the 21-epoch APPROX XYZ
    # can be 10-20 m off.
    #
    # Rule: same marker_name → same station. Keep the obs file with the
    # most epochs (largest file is a good proxy) as the representative.
    base_by_marker: dict[str, "Session"] = {}
    for s in bases:
        key = s.marker_name.strip()
        prev = base_by_marker.get(key)
        if prev is None:
            base_by_marker[key] = s
        else:
            import os as _o
            if _o.path.getsize(s.obs_file) > _o.path.getsize(prev.obs_file):
                base_by_marker[key] = s
    if len(base_by_marker) < len(bases):
        dropped = len(bases) - len(base_by_marker)
        warnings.insert(0,
            f"Merged {dropped} same-marker base session{'s' if dropped > 1 else ''} "
            f"(kept the longest recording per station).")
    # Normalise station_point on all base sessions (not just representatives)
    # so subsequent references resolve consistently.
    for s in bases:
        s.station_point = s.marker_name.strip()
    bases = list(base_by_marker.values())

    baselines: list[Baseline] = []
    # Always emit the grouping for transparency
    grouping: dict[str, list[str]] = {}
    for k, v in point_map.items():
        grouping.setdefault(v, []).append(k)
    warnings.append("Session → point grouping: " +
                    " ; ".join(f"{v} ← [{', '.join(sorted(ks))}]" for v, ks in grouping.items()))
    # And which representative session was picked for each point
    warnings.append("Representatives: " +
                    " ; ".join(f"{n} = {os.path.basename(s.obs_file)}" for n, s in representative.items()))

    # Build a lookup of precise ECEF for any station the user provided as a
    # control point — we prefer these over the RINEX APPROX XYZ (SPP-level)
    # when seeding rnx2rtkp. A 2-3 m error on the base drastically hurts AR
    # on short sessions.
    control_ecef: dict[str, tuple[float, float, float]] = {
        s.name: (s.x, s.y, s.z)
        for s in pin.control_stations
        if s.x or s.y or s.z   # skip placeholder zeros
    }

    def _bl(b: Session, r: Session, bid: str,
            inter_base: bool = False) -> Optional[Baseline]:
        """Solve a baseline from base ``b`` to rover ``r``.

        ``inter_base=True`` means both sides are stationary bases — both
        obs files get pre-decimated to 30 s to cap rnx2rtkp's RAM at a
        fraction of the native-resolution peak. Decimation is safe for
        static receivers: no carrier-phase continuity is required because
        the position doesn't move between epochs.
        """
        # Prefer precise ECEF from control_stations, fall back to RINEX header.
        base_pos = control_ecef.get(b.station_point) or b.approx_xyz
        if base_pos is None:
            warnings.append(f"{bid} skipped — {b.station_point} has no reference position (neither precise nor APPROX POSITION XYZ)")
            return None
        precise_tag = "precise" if b.station_point in control_ecef else "approx"
        nav = pick_nav_files(r.obs_file, pin.nav_files)
        if not nav:
            warnings.append(f"{bid} skipped — no matching NAV file for {r.obs_file}")
            return None

        # For inter-base static pairs, pre-decimate both obs files to 30 s.
        # Long-duration base sessions (often 60+ MB at 1 Hz) otherwise blow
        # past Railway's container memory when rnx2rtkp loads them both at
        # once. 30 s spacing still leaves tens of minutes of redundant
        # observations for AR on stationary receivers.
        base_obs_path = b.obs_file
        rover_obs_path = r.obs_file
        if inter_base:
            for tag, orig in (("base", b.obs_file), ("rover", r.obs_file)):
                try:
                    size_mb = os.path.getsize(orig) / (1024 * 1024)
                    if size_mb > 20.0:
                        thinned = os.path.join(
                            os.path.dirname(orig) or ".",
                            "_thinned_static_" + os.path.basename(orig),
                        )
                        n_in, n_out = decimate_rinex_obs(orig, thinned, interval_s=30.0)
                        thin_mb = os.path.getsize(thinned) / (1024 * 1024)
                        warnings.append(
                            f"{bid} pre-decimated {tag} obs "
                            f"{size_mb:.1f}→{thin_mb:.1f} MB "
                            f"({n_in}→{n_out} epochs @ 30 s)"
                        )
                        if tag == "base":
                            base_obs_path = thinned
                        else:
                            rover_obs_path = thinned
                except Exception as e:
                    warnings.append(f"{bid}: static decimation skipped for {tag} ({type(e).__name__}: {e})")

        try:
            sol = _run_rnx2rtkp(
                base_obs=base_obs_path,
                rover_obs=rover_obs_path,
                nav_files=nav,
                base_pos_xyz=base_pos,
            )
        except Exception as e:
            warnings.append(f"{bid} failed: {e}")
            return None
        dx = sol["x"] - base_pos[0]
        dy = sol["y"] - base_pos[1]
        dz = sol["z"] - base_pos[2]
        sol_type = {1: "Fix", 2: "Float", 4: "DGPS", 5: "Single"}.get(sol["Q"], "Unknown")
        bl = Baseline(
            id=bid,
            start=b.station_point,
            end=r.station_point,
            dx=dx, dy=dy, dz=dz,
            sdx=sol["sx"], sdy=sol["sy"], sdz=sol["sz"],
            solution_type=sol_type,
            rms=(sol["sx"]**2 + sol["sy"]**2 + sol["sz"]**2) ** 0.5,
            ratio=sol["ratio"],
        )
        warnings.append(f"{bid} solved ({precise_tag} base): {sol_type} ratio={sol['ratio']:.1f} ns={sol['ns']} "
                        f"σ=({sol['sx']*1000:.1f},{sol['sy']*1000:.1f},{sol['sz']*1000:.1f})mm")
        return bl

    def _kinematic_stops(rover: Session, primary_base: Session) -> list[dict]:
        """Run rnx2rtkp in kinematic mode against the primary base, then
        segment the per-epoch trajectory into stationary occupations. The
        stops come out as absolute ECEF coordinates calibrated to
        ``primary_base``'s precise position."""
        base_pos = control_ecef.get(primary_base.station_point) or primary_base.approx_xyz
        if base_pos is None:
            warnings.append(f"Kinematic skipped ({rover.station_point}) — "
                            f"no reference position for {primary_base.station_point}")
            return []
        nav = pick_nav_files(rover.obs_file, pin.nav_files)
        if not nav:
            warnings.append(f"Kinematic skipped ({rover.station_point}) — no nav for {rover.obs_file}")
            return []
        # Rover MUST stay at native 1 Hz — thinning it breaks the
        # cycle-slip detector and drops every epoch to Float (see commit
        # bd0ce2a). But the BASE is stationary, so thinning it is safe
        # and slashes peak RAM in the kinematic run. 5 s base cadence
        # matches -ti 5 output: every output slot has a matching base
        # epoch for double-differencing, but rnx2rtkp only has to keep
        # 1/5 the base obs buffer resident.
        base_obs_for_rtk = primary_base.obs_file
        try:
            base_size_mb = os.path.getsize(primary_base.obs_file) / (1024 * 1024)
            if base_size_mb > 20.0:
                thinned_base = os.path.join(
                    os.path.dirname(primary_base.obs_file) or ".",
                    "_thinned_kine_" + os.path.basename(primary_base.obs_file),
                )
                n_in, n_out = decimate_rinex_obs(
                    primary_base.obs_file, thinned_base, interval_s=5.0,
                )
                thin_mb = os.path.getsize(thinned_base) / (1024 * 1024)
                warnings.append(
                    f"{rover.station_point}: pre-decimated kinematic base obs "
                    f"{base_size_mb:.1f}→{thin_mb:.1f} MB "
                    f"({n_in}→{n_out} epochs @ 5 s)"
                )
                base_obs_for_rtk = thinned_base
        except Exception as e:
            warnings.append(
                f"{rover.station_point}: base decimation skipped "
                f"({type(e).__name__}: {e})"
            )
        warnings.append(
            f"Kinematic {rover.station_point}: invoking rnx2rtkp "
            f"(rover={os.path.basename(rover.obs_file)}, "
            f"base={os.path.basename(base_obs_for_rtk)}, "
            f"nav={[os.path.basename(n) for n in nav]})"
        )
        try:
            sol = _run_rnx2rtkp(
                base_obs=base_obs_for_rtk, rover_obs=rover.obs_file,
                nav_files=nav, base_pos_xyz=base_pos, kinematic=True,
            )
        except Exception as e:
            warnings.append(f"Kinematic {rover.station_point}: {e}")
            return []
        epochs = sol.get("epochs", [])
        if not epochs:
            warnings.append(f"Kinematic {rover.station_point}: 0 epochs parsed")
            return []
        # Dual strategy:
        #   • consecutive-epoch segmentation (_detect_stops) captures clean
        #     occupations with mostly-Fix epochs in a row
        #   • spatial clustering (_cluster_fix_positions) groups scattered
        #     Fix epochs at the same physical location, useful when rnx2rtkp
        #     flickers between Fix and Float during long sessions
        # We run both and merge, de-duplicating by centroid proximity.
        stops_time  = _detect_stops(epochs,
            speed_threshold_ms=pin.stop_opts.speed_threshold_ms,
            min_duration_s=pin.stop_opts.min_duration_s,
        )
        stops_space = _cluster_fix_positions(epochs,
            cluster_radius_m=pin.stop_opts.cluster_radius_m,
            min_cluster_size=pin.stop_opts.min_cluster_size,
            max_time_span_s=pin.stop_opts.max_time_span_s,
        )
        merged = list(stops_time)
        import math as _m
        for s in stops_space:
            dup = any(
                _m.sqrt((s["x"]-t["x"])**2 + (s["y"]-t["y"])**2 + (s["z"]-t["z"])**2) < 3.0
                for t in merged
            )
            if not dup:
                merged.append(s)
        # Post-filter: require cluster to be geometrically tight AND have a
        # minimum number of epochs. Stops with ≥ 3 epochs are kept unconditionally
        # (they're evidence-rich). Stops with only 2 epochs must have σ ≤ 3 cm
        # per axis — this rejects slow-drift 2-point false positives while
        # keeping the K-session's thin but genuinely-stationary pairs.
        kept: list[dict] = []
        rejected = 0
        sigma_floor = pin.stop_opts.sigma_floor_m
        for s in merged:
            if s["n_epochs"] >= 3:
                kept.append(s)
            elif max(s["sx"], s["sy"], s["sz"]) <= sigma_floor:
                kept.append(s)
            else:
                rejected += 1
        if rejected:
            warnings.append(f"{rover.station_point}: filtered {rejected} 2-epoch stops "
                            f"with σ > {sigma_floor*100:.0f} cm scatter")
        kept.sort(key=lambda s: s["t_start"])
        stops = kept
        n_fix = sum(1 for e in epochs if e["Q"] == 1)
        warnings.append(
            f"Kinematic {rover.station_point}: {len(epochs)} epochs "
            f"({n_fix} Fix) → {len(stops)} stops (primary base: {primary_base.station_point})"
        )
        return stops

    def _is_kinematic(s: Session) -> bool:
        """Classify a mobile session as kinematic when it's long enough for
        stop-and-go PPK (interval ≤ 1 s AND obs file > 10 MB). Short
        occupations stay static — going kinematic with ``-ti 5`` would
        decimate the 4-min Tiahoue file down to ~50 epochs, which isn't
        enough for rnx2rtkp to fix integer ambiguities and we lose the
        session entirely (0 Fix → 0 stops)."""
        try:
            size_mb = os.path.getsize(s.obs_file) / (1024 * 1024)
        except OSError:
            size_mb = 0
        return s.interval_s <= 1.01 and size_mb > 10.0

    # Absolute ECEF positions we discover along the way — used to seed the
    # station_map for kinematic stops (their marker has no APPROX XYZ in any
    # RINEX header, so without this they'd land at (0,0,0) and the map tab
    # would render empty).
    stop_positions: dict[str, tuple[float, float, float]] = {}

    n = 0
    # Inter-base baselines (if ≥ 2 bases). Defensive: never pair two
    # sessions with the SAME station_point — that would be a receiver
    # declared as a base across multiple session files, and baselining
    # a station against itself is meaningless. Station_point is
    # case-sensitive (bases preserve the RINEX MARKER NAME exactly), so
    # two bases that differ only by case (e.g. "moyen2" vs "Moyen2") are
    # treated as distinct — they usually are distinct physical receivers,
    # and the coord file typically lists them both.
    # Also skip if the two bases sit within 5 m — that's the same
    # physical point with different marker spellings.
    import math as _math
    for i, a in enumerate(bases):
        for b in bases[i+1:]:
            if a.station_point == b.station_point:
                warnings.append(
                    f"Skipping same-station inter-base pair "
                    f"{a.station_point} × {b.station_point} — same station_point "
                    f"means the receiver was declared as a base but has "
                    f"multiple session files."
                )
                continue
            # Co-located check: if we have APPROX XYZ for both, see if
            # they're effectively the same physical point.
            if a.approx_xyz and b.approx_xyz:
                d = _math.sqrt(sum((p-q)**2 for p, q in zip(a.approx_xyz, b.approx_xyz)))
                if d < 5.0:
                    warnings.append(
                        f"Skipping co-located inter-base pair "
                        f"{a.station_point} × {b.station_point} ({d:.2f} m apart) "
                        f"— same physical point with different marker spelling."
                    )
                    continue
            n += 1
            bl = _bl(a, b, f"B{n:02d}", inter_base=True)
            if bl: baselines.append(bl)

    # Derive each base's position in the PRIMARY base's reference frame
    # from the inter-base baseline vectors. Critical for the secondary
    # kinematic runs below: if we told rnx2rtkp the secondary base was at
    # its APPROX XYZ (SPP-accurate to only ~3 m), every stop it computed
    # would be off by that same 3 m — the primary and secondary positions
    # wouldn't agree, and σ₀ in the LS adjustment would blow up. Feeding
    # rnx2rtkp the inter-base-derived position (mm accuracy) puts both
    # runs on the same absolute frame.
    primary_base = bases[0] if bases else None
    primary_anchor = None
    if primary_base is not None:
        primary_anchor = (
            control_ecef.get(primary_base.station_point) or primary_base.approx_xyz
        )
    derived_base_anchor: dict[str, tuple[float, float, float]] = {}
    if primary_base is not None and primary_anchor is not None:
        derived_base_anchor[primary_base.station_point] = primary_anchor
        for bl in baselines:
            if bl.start == primary_base.station_point and bl.end not in derived_base_anchor:
                derived_base_anchor[bl.end] = (
                    primary_anchor[0] + bl.dx,
                    primary_anchor[1] + bl.dy,
                    primary_anchor[2] + bl.dz,
                )
            elif bl.end == primary_base.station_point and bl.start not in derived_base_anchor:
                derived_base_anchor[bl.start] = (
                    primary_anchor[0] - bl.dx,
                    primary_anchor[1] - bl.dy,
                    primary_anchor[2] - bl.dz,
                )

    # Base-to-mobile baselines: every mobile session gets connected to every base.
    #
    # For STATIC rovers we run rnx2rtkp per (base, rover) pair — each
    # baseline is an independent rnx2rtkp solution.
    #
    # For KINEMATIC rovers (stop-and-go PPK) we need one rnx2rtkp run
    # PER BASE so each stop has truly redundant observations. The primary
    # run also drives stop detection (the position clustering logic); for
    # secondary bases we re-use the primary's stop time windows and just
    # average the secondary's fixed epochs within each window. This gives
    # the LS adjustment real geometric redundancy (σ₀ ≈ 1) without
    # running the stop-detector N times on slightly-different trajectories.
    for rover in mobiles:
        if _is_kinematic(rover):
            size_mb = os.path.getsize(rover.obs_file) / 1e6
            warnings.append(f"{rover.station_point}: kinematic mode "
                            f"(interval={rover.interval_s}s, file={size_mb:.1f} MB)")
            primary_base = bases[0]
            stops = _kinematic_stops(rover, primary_base)

            # Run rnx2rtkp kinematic against each SECONDARY base too, so
            # we have an independent trajectory per base. Averaging fixed
            # epochs within each stop's time window gives each stop an
            # independent rnx2rtkp-derived position per base.
            secondary_trajectories: dict[str, list[dict]] = {}
            nav_for_rover = pick_nav_files(rover.obs_file, pin.nav_files)
            # Reuse the same decimated rover file the primary pass already
            # computed (the primary pass calls _kinematic_stops which may
            # pre-decimate the base). We just need the rover's untouched
            # file here — it stays at native resolution to preserve AR.
            for base in bases[1:]:
                # Prefer the inter-base-derived position (mm-level) over
                # RINEX APPROX XYZ (3 m SPP error would poison the
                # adjustment).
                sec_pos = (
                    control_ecef.get(base.station_point)
                    or derived_base_anchor.get(base.station_point)
                    or base.approx_xyz
                )
                if sec_pos is None:
                    continue
                try:
                    sol = _run_rnx2rtkp(
                        base_obs=base.obs_file,
                        rover_obs=rover.obs_file,
                        nav_files=nav_for_rover,
                        base_pos_xyz=sec_pos,
                        kinematic=True,
                    )
                    eps = sol.get("epochs", [])
                    secondary_trajectories[base.station_point] = eps
                    n_fix = sum(1 for e in eps if e["Q"] == 1)
                    warnings.append(
                        f"Kinematic {base.station_point}→{rover.station_point}: "
                        f"{len(eps)} epochs ({n_fix} Fix) from secondary base"
                    )
                except Exception as e:
                    warnings.append(
                        f"Secondary kinematic {base.station_point}→{rover.station_point} failed: {e}"
                    )

            for i, st in enumerate(stops, start=1):
                point_name = f"{rover.station_point}_S{i}"
                # Absolute ECEF for the stop (from primary) — used by the
                # map tab even when adjustment doesn't run.
                stop_positions[point_name] = (st["x"], st["y"], st["z"])

                for base in bases:
                    n += 1
                    # Use the SAME anchor that was fed to rnx2rtkp above so
                    # the baseline vector (stop - base) reflects a consistent
                    # reference frame.
                    base_pos = (
                        control_ecef.get(base.station_point)
                        or derived_base_anchor.get(base.station_point)
                        or base.approx_xyz
                    )
                    if base_pos is None:
                        continue

                    if base.station_point == primary_base.station_point:
                        # Primary: use the stop position rnx2rtkp gave us
                        stop_x, stop_y, stop_z = st["x"], st["y"], st["z"]
                        stop_sx, stop_sy, stop_sz = st["sx"], st["sy"], st["sz"]
                        n_used = st.get("n_epochs", 0)
                    else:
                        # Secondary: average the Fix epochs that fall inside
                        # this stop's time window (from primary's detection).
                        traj = secondary_trajectories.get(base.station_point, [])
                        t0, t1 = st["t_start"], st["t_end"]
                        window = [e for e in traj
                                  if t0 <= e["t"] <= t1 and e["Q"] == 1]
                        if len(window) < 2:
                            # Fall back to all epochs if no Fix in the window
                            window = [e for e in traj
                                      if t0 <= e["t"] <= t1]
                        if not window:
                            # No secondary observation available — skip this
                            # specific (secondary base, stop) pair rather than
                            # fabricating a baseline from the primary's data.
                            n -= 1
                            continue
                        stop_x = sum(e["x"] for e in window) / len(window)
                        stop_y = sum(e["y"] for e in window) / len(window)
                        stop_z = sum(e["z"] for e in window) / len(window)
                        # σ: stdev of epoch positions in the window, with a
                        # 3 mm floor to avoid overconfident weights.
                        import statistics as _stats
                        def _sd(vals, fallback):
                            if len(vals) < 2:
                                return fallback
                            return max(_stats.stdev(vals), 0.003)
                        stop_sx = _sd([e["x"] for e in window], st["sx"])
                        stop_sy = _sd([e["y"] for e in window], st["sy"])
                        stop_sz = _sd([e["z"] for e in window], st["sz"])
                        n_used = len(window)

                    fix_ratio = st.get("fix_ratio", 0.0)
                    if fix_ratio >= 0.70:   sol_tag = "Kine Fix"
                    elif fix_ratio >= 0.20: sol_tag = "Kine Mixed"
                    else:                    sol_tag = "Kine Float"
                    baselines.append(Baseline(
                        id=f"B{n:02d}",
                        start=base.station_point,
                        end=point_name,
                        dx=stop_x - base_pos[0],
                        dy=stop_y - base_pos[1],
                        dz=stop_z - base_pos[2],
                        sdx=stop_sx, sdy=stop_sy, sdz=stop_sz,
                        solution_type=sol_tag,
                        rms=(stop_sx**2 + stop_sy**2 + stop_sz**2) ** 0.5,
                        ratio=st["ratio"],
                        duration_s=st.get("duration"),
                        n_epochs=n_used,
                        fix_ratio=st.get("fix_ratio"),
                        n_sat=st.get("ns"),
                    ))
        else:
            for base in bases:
                n += 1
                bl = _bl(base, rover, f"B{n:02d}")
                if bl: baselines.append(bl)

    # Build station list: one per unique endpoint referenced in baselines.
    # Priority order for the position seed:
    #   1. User-supplied control point (precise grid → ECEF via pyproj)
    #   2. Kinematic-stop absolute ECEF captured during _kinematic_stops
    #   3. RINEX APPROX XYZ header value (~3 m accurate)
    #   4. (0,0,0) placeholder — map will filter these out
    # Only mark a station as is_control=True when the user has supplied
    # PRECISE coordinates for it (via control_stations JSON, or indirectly
    # via base_coords_txt + crs_def_txt → parsed upstream into
    # pin.control_stations). A base declared only by name (without
    # precise coords) stays is_control=False because its RINEX APPROX XYZ
    # is SPP-accurate to ~3 m — pinning it there in a constrained
    # adjustment would pollute every other station's residuals. The free
    # adjustment's pivot falls back to the first station if no controls
    # exist, which is exactly what we want for an un-anchored network.
    station_map: dict[str, Station] = {}
    controls_by_name = {c.name: c for c in pin.control_stations}
    for bl in baselines:
        for name in (bl.start, bl.end):
            if name in station_map:
                continue
            if name in controls_by_name:
                # User-supplied precise coords → genuine control.
                station_map[name] = controls_by_name[name]
            elif name in stop_positions:
                x, y, z = stop_positions[name]
                station_map[name] = Station(name=name, x=x, y=y, z=z, is_control=False)
            else:
                seed = next((s for s in sessions if s.station_point == name), None)
                xyz = seed.approx_xyz if (seed and seed.approx_xyz) else (0.0, 0.0, 0.0)
                station_map[name] = Station(name=name, x=xyz[0], y=xyz[1], z=xyz[2], is_control=False)

    # Build tracking charts (one per unique observation file referenced by
    # the baselines). We do it here — inside compute_all_baselines — so the
    # obs files are still on disk (the caller's _tempfile.TemporaryDirectory
    # gets cleaned up right after we return). Charts come back as base64
    # PNG strings so the JSON response can carry them to the client.
    from .tracking import scan_rinex_obs
    from .charts import tracking_chart_png
    import base64
    tracking_charts: list[dict] = []
    obs_files_seen: set[str] = set()
    # One chart per session that shows up in the final station_map — that
    # keeps the chart count bounded by stations, not baselines.
    relevant_sessions = [s for s in sessions
                         if s.obs_file and s.obs_file not in obs_files_seen
                         and (s.marker_name in {x.marker_name for x in bases}
                              or s.station_point in station_map)]
    for s in relevant_sessions:
        obs_files_seen.add(s.obs_file)
        try:
            # Cap huge obs files at 64 MB of scan — the chart only needs
            # enough epochs to be representative, not every sample.
            timeline = scan_rinex_obs(s.obs_file, max_bytes=64 * 1024 * 1024)
            if timeline.total_epochs == 0:
                continue
            title = f"Suivi satellitaire — {s.station_point}"
            if s.session_code:
                title += f" (session {s.session_code})"
            png = tracking_chart_png(timeline, title=title)
            tracking_charts.append({
                "station":     s.station_point,
                "marker_name": s.marker_name,
                "session":     s.session_code or "",
                "n_sats":      len(timeline.sats),
                "n_epochs":    timeline.total_epochs,
                "interval_s":  timeline.interval_s,
                "png_b64":     base64.b64encode(png).decode("ascii"),
            })
        except Exception as e:
            warnings.append(f"tracking chart {s.station_point}: {type(e).__name__}: {e}")

    return baselines, list(station_map.values()), warnings, tracking_charts
