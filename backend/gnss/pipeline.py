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

def _default_opts_conf() -> str:
    """CHC-equivalent static processing defaults.

    Tuned against the 2026-01-06 dataset: these yielded 5-6 mm RMS Fix
    solutions on the Tiahoue_I / I5 sessions. Stricter settings (arthres=3,
    fix-and-hold) mis-converged on the long K session — kept back off.
    """
    return "\n".join([
        "pos1-posmode       =static",
        "pos1-frequency     =l1+l2",
        "pos1-soltype       =forward",
        "pos1-elmask        =10",
        "pos1-ionoopt       =dual-freq",
        "pos1-tropopt       =saas",
        "pos1-sateph        =brdc",
        "pos1-navsys        =63",
        "pos2-armode        =continuous",
        "pos2-arthres       =1.8",
        "pos2-gloarmode     =on",
        "out-solformat      =xyz",
        "out-outhead        =off",
        "out-outopt         =off",
        "out-solstatic      =single",
        "stats-eratio1      =100.0",
        "stats-eratio2      =100.0",
        "",
    ])


# Match an rnx2rtkp XYZ-ECEF solution line. rnx2rtkp output looks like:
#   2026/01/06 08:52:46.000   6250798.1907   -830364.9192    958687.6367   1   5   0.0049   0.0018   0.0019  -0.0020  -0.0008   0.0020   4.00    2.3
# (timestamp ·  X Y Z · Q · ns · sdx sdy sdz sdxy sdyz sdzx · age · ratio)
# X and Z are ECEF coords in metres → always ≥ 5-digit magnitudes. The
# negative-lookbehind stops the match from starting in the middle of the
# timestamp fractional seconds.
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
                  binary: str = _DEFAULT_RNX2RTKP) -> dict:
    """Run rnx2rtkp for a single baseline. Returns the parsed final solution.

    rnx2rtkp convention:
      - First OBS arg = rover
      - Second OBS arg = base (reference)
      - -r X Y Z sets the known base ECEF
    """
    with tempfile.TemporaryDirectory() as tmp:
        conf_path = os.path.join(tmp, "opts.conf")
        pos_path  = os.path.join(tmp, "out.pos")
        with open(conf_path, "w") as f:
            f.write(_default_opts_conf())

        args = [
            binary,
            "-k", conf_path,
            "-o", pos_path,
            "-p", "3",
            "-r", f"{base_pos_xyz[0]:.4f}",
                 f"{base_pos_xyz[1]:.4f}",
                 f"{base_pos_xyz[2]:.4f}",
            rover_obs,
            base_obs,
            *nav_files,
        ]
        proc = subprocess.run(args, capture_output=True, text=True, timeout=1200)
        if proc.returncode != 0:
            raise RuntimeError(
                f"rnx2rtkp exited {proc.returncode}\n"
                f"stderr: {proc.stderr[:500]}"
            )
        with open(pos_path) as f:
            pos_text = f.read()

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
class PipelineInput:
    obs_files: list[str]
    nav_files: list[str]
    base_marker_names: list[str]
    control_stations: list[Station]         # may be empty
    projection_hint_latlon_deg: Optional[tuple[float, float]] = None


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

    baselines: list[Baseline] = []
    warnings:  list[str] = []
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

    def _bl(b: Session, r: Session, bid: str) -> Optional[Baseline]:
        """Solve a baseline from base ``b`` to rover ``r``."""
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
        try:
            sol = _run_rnx2rtkp(
                base_obs=b.obs_file,
                rover_obs=r.obs_file,
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

    n = 0
    # Inter-base baselines (if ≥ 2 bases)
    for i, a in enumerate(bases):
        for b in bases[i+1:]:
            n += 1
            bl = _bl(a, b, f"B{n:02d}")
            if bl: baselines.append(bl)

    # Base-to-mobile baselines: every mobile session gets connected to every base
    for rover in mobiles:
        for base in bases:
            n += 1
            bl = _bl(base, rover, f"B{n:02d}")
            if bl: baselines.append(bl)

    # Build station list: one per unique endpoint referenced in baselines
    station_map: dict[str, Station] = {}
    controls_by_name = {c.name: c for c in pin.control_stations}
    for bl in baselines:
        for name in (bl.start, bl.end):
            if name in station_map:
                continue
            if name in controls_by_name:
                station_map[name] = controls_by_name[name]
            else:
                # Seed with RINEX APPROX XYZ if we have it, else zero
                seed = next((s for s in sessions if s.station_point == name), None)
                xyz = seed.approx_xyz if (seed and seed.approx_xyz) else (0.0, 0.0, 0.0)
                station_map[name] = Station(name=name, x=xyz[0], y=xyz[1], z=xyz[2])
    return baselines, list(station_map.values()), warnings
