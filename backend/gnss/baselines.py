"""Thin wrapper around RTKLIB's ``rnx2rtkp`` for baseline solutions.

Usage
─────
    from gnss.baselines import compute_baseline
    bl = compute_baseline(
        base_obs  = "path/to/BOU3358J4.obs",
        rover_obs = "path/to/TIA2358J3.obs",
        nav_files = ["path/to/BRDC00IGS_R_20253580000_01D_MN.rnx"],
        base_pos  = (6255021.676, -873184.052, 891145.769),  # approx ECEF
    )

``rnx2rtkp`` is invoked in static mode with Lc (ionosphere-free) solution.
Output is a single position record we parse into a :class:`Baseline`.
"""
from __future__ import annotations

import os
import re
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from .models import Baseline

def _resolve_rnx2rtkp() -> str:
    """Locate the rnx2rtkp binary — tries unix name first, then Windows .exe."""
    base = Path(__file__).resolve().parent.parent / "rtklib_bin"
    for candidate in ("rnx2rtkp", "rnx2rtkp.exe"):
        p = base / candidate
        if p.is_file():
            return str(p)
    return str(base / "rnx2rtkp")  # fall back to unix name (will error on call)

_DEFAULT_RNX2RTKP = _resolve_rnx2rtkp()


@dataclass
class RTKLibConfig:
    """rnx2rtkp options mapped to what CHC Geomatics Office does by default."""
    pos_mode:    int   = 3         # 3 = static
    frequency:   int   = 2         # 2 = L1+L2 (Lc when iono-free), 0 = L1 only
    elev_mask:   float = 10.0      # degrees
    snr_mask:    float = 0.0
    sample_int:  float = 60.0      # output sampling (s)
    ion_mode:    int   = 3         # 3 = Lc (iono-free combination) — matches "Lc Fix"
    tro_mode:    int   = 1         # 1 = Saastamoinen
    ar_mode:     int   = 1         # 1 = continuous ambiguity resolution (LAMBDA)
    ratio_thres: float = 1.80      # matches CHC default
    systems:     str   = "GREJCI"  # GPS+GLONASS+GALILEO+QZSS+BEIDOU+IRNSS

    def to_conf(self) -> str:
        return "\n".join([
            "# rnx2rtkp options — ETAFAT default",
            f"pos1-posmode       ={self.pos_mode}",
            f"pos1-frequency     ={self.frequency}",
            f"pos1-elmask        ={self.elev_mask}",
            f"pos1-snrmask_r     ={self.snr_mask}",
            f"pos1-ionoopt       ={self.ion_mode}",
            f"pos1-tropopt       ={self.tro_mode}",
            f"pos2-armode        ={self.ar_mode}",
            f"pos2-arthres       ={self.ratio_thres}",
            f"out-solformat      =0",       # 0 = XYZ-ECEF (what we want)
            f"out-outhead        =0",
            f"out-outopt         =0",
            f"out-timesys        =0",
            f"out-timeform       =1",
            f"stats-eratio1      =100.0",
            f"stats-eratio2      =100.0",
            f"stats-prnaccelh    =3.0",
            f"stats-prnaccelv    =1.0",
            ""
        ])


# ───────────────────────────── run rnx2rtkp ────────────────────────────────

_POS_LINE = re.compile(
    r"^\s*\d{4}/\d{2}/\d{2}"           # date
    r"\s+\d{2}:\d{2}:\d{2}\.\d+"      # time
    r"\s+(?P<x>-?\d+\.\d+)"           # X
    r"\s+(?P<y>-?\d+\.\d+)"           # Y
    r"\s+(?P<z>-?\d+\.\d+)"           # Z
    r"\s+(?P<Q>\d+)"                  # Q = quality (1=fix, 2=float, ...)
    r"\s+(?P<ns>\d+)"                 # NS
    r"\s+(?P<sx>\d+\.\d+)"
    r"\s+(?P<sy>\d+\.\d+)"
    r"\s+(?P<sz>\d+\.\d+)"
    r"\s+\S+\s+\S+\s+\S+"
    r"\s+(?P<age>\d+\.\d+)"
    r"\s+(?P<ratio>\d+\.\d+)"
)


def run_rnx2rtkp(base_obs: str, rover_obs: str, nav_files: Sequence[str],
                 base_pos_xyz: tuple[float, float, float],
                 cfg: RTKLibConfig | None = None,
                 binary: str = _DEFAULT_RNX2RTKP) -> str:
    """Invoke rnx2rtkp, return the raw solution text (.pos content)."""
    cfg = cfg or RTKLibConfig()

    with tempfile.TemporaryDirectory() as tmp:
        conf_path = os.path.join(tmp, "opts.conf")
        pos_path  = os.path.join(tmp, "out.pos")
        with open(conf_path, "w") as f:
            f.write(cfg.to_conf())

        args = [
            binary,
            "-k", conf_path,
            "-o", pos_path,
            "-p", str(cfg.pos_mode),
            "-r", f"{base_pos_xyz[0]}", f"{base_pos_xyz[1]}", f"{base_pos_xyz[2]}",
            rover_obs,
            base_obs,
            *nav_files,
        ]
        proc = subprocess.run(args, capture_output=True, text=True, timeout=1200)
        if proc.returncode != 0:
            raise RuntimeError(f"rnx2rtkp failed: {proc.stderr}")
        with open(pos_path) as f:
            return f.read()


def parse_static_solution(pos_text: str) -> dict:
    """Parse a static rnx2rtkp solution (expect a single final line)."""
    best: dict | None = None
    for line in pos_text.splitlines():
        m = _POS_LINE.match(line)
        if not m:
            continue
        rec = {k: float(m[k]) for k in ("x","y","z","sx","sy","sz","age","ratio")}
        rec["Q"]  = int(m["Q"])
        rec["ns"] = int(m["ns"])
        # In static mode only the last line matters (it's the final solution);
        # keep the one with best ratio as a tiebreaker.
        if best is None or rec["ratio"] >= best["ratio"]:
            best = rec
    if not best:
        raise RuntimeError("no solution line found in rnx2rtkp output")
    return best


def compute_baseline(base_obs: str, rover_obs: str, nav_files: Sequence[str],
                     base_pos: tuple[float, float, float],
                     base_name: str, rover_name: str,
                     baseline_id: str = "B01",
                     cfg: RTKLibConfig | None = None) -> Baseline:
    """End-to-end: call rnx2rtkp and return a populated :class:`Baseline`.

    rnx2rtkp emits absolute ECEF of the rover; we subtract the known base
    position to get the baseline vector.
    """
    pos_text = run_rnx2rtkp(base_obs, rover_obs, nav_files, base_pos, cfg)
    sol = parse_static_solution(pos_text)
    dx = sol["x"] - base_pos[0]
    dy = sol["y"] - base_pos[1]
    dz = sol["z"] - base_pos[2]
    sol_type = {1: "Fix", 2: "Float", 4: "DGPS", 5: "Single"}.get(sol["Q"], "Unknown")
    if (cfg or RTKLibConfig()).ion_mode == 3 and sol["Q"] == 1:
        sol_type = "Lc Fix"
    return Baseline(
        id=baseline_id,
        start=base_name,
        end=rover_name,
        dx=dx, dy=dy, dz=dz,
        sdx=sol["sx"], sdy=sol["sy"], sdz=sol["sz"],
        solution_type=sol_type,
        rms=(sol["sx"]**2 + sol["sy"]**2 + sol["sz"]**2) ** 0.5,
        ratio=sol["ratio"],
    )
