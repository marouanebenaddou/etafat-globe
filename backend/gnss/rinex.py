"""RINEX 3.x header parsing.

We only need the metadata that identifies each observation file and its
approximate position — enough to group files into stations and to seed
rnx2rtkp with the right rover / base roles. The actual observation decoding
is left to RTKLIB.

A RINEX 3.04 header looks like::

         3.04           OBSERVATION DATA    M: Mixed            RINEX VERSION / TYPE
    CHC                 CHC                 20260106 083431 UTC PGM / RUN BY / DATE
    moyen2                                                      MARKER NAME
    ...
      6250835.2698  -829800.5895   958709.9861                  APPROX POSITION XYZ
            2.0292        0.0000        0.0000                  ANTENNA: DELTA H/E/N
    ...
         5.000                                                  INTERVAL
      2026     1     6     8    34   50.0000000     GPS         TIME OF FIRST OBS

Each line is fixed-column: label at columns 60-80, values at columns 0-60.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class RinexObsHeader:
    """The header fields we care about from a RINEX observation file."""
    path: str
    version: str = ""
    file_type: str = ""          # 'O' (observation)
    system: str = ""             # 'G', 'R', 'E', 'J', 'C', 'M' (mixed)
    marker_name: str = ""
    marker_number: str = ""
    receiver_sn: str = ""
    receiver_type: str = ""
    antenna_sn: str = ""
    antenna_type: str = ""
    approx_xyz: Optional[tuple[float, float, float]] = None
    antenna_delta_hen: tuple[float, float, float] = (0.0, 0.0, 0.0)
    interval: float = 0.0
    time_first_obs: str = ""     # e.g. "2026/01/06 08:34:50"
    start_gps_seconds: float = 0.0


@dataclass
class RinexNavHeader:
    path: str
    version: str = ""
    system: str = ""             # 'G' GPS, 'R' GLO, 'E' GAL, 'J' QZS, 'C' BDS, 'M' mixed


def _label(line: str) -> str:
    return line[60:].strip() if len(line) > 60 else ""


def parse_obs_header(path: str | Path, max_lines: int = 200) -> RinexObsHeader:
    """Parse the header of a RINEX observation file.

    Reads at most ``max_lines`` lines — the header normally ends by line 40
    but multi-GNSS files with many SYS / # / OBS TYPES records can stretch.
    """
    h = RinexObsHeader(path=str(path))
    with open(path, "r", errors="replace") as f:
        for i, line in enumerate(f):
            if i >= max_lines:
                break
            label = _label(line)
            body  = line[:60]

            if label == "RINEX VERSION / TYPE":
                h.version   = body[:20].strip()
                h.file_type = body[20:21].strip() or body[20:40].strip()[:1]
                # The satellite system is encoded at col 40: 'G', 'R', 'E', 'J', 'C', 'M'
                h.system    = body[40:41].strip() or (body[40:60].strip()[:1] if body[40:60].strip() else "")
            elif label == "MARKER NAME":
                h.marker_name = body.strip()
            elif label == "MARKER NUMBER":
                h.marker_number = body.strip()
            elif label == "REC # / TYPE / VERS":
                h.receiver_sn   = body[0:20].strip()
                h.receiver_type = body[20:40].strip()
            elif label == "ANT # / TYPE":
                h.antenna_sn   = body[0:20].strip()
                h.antenna_type = body[20:40].strip()
            elif label == "APPROX POSITION XYZ":
                try:
                    h.approx_xyz = (
                        float(body[0:14]),
                        float(body[14:28]),
                        float(body[28:42]),
                    )
                except ValueError:
                    pass
            elif label == "ANTENNA: DELTA H/E/N":
                try:
                    h.antenna_delta_hen = (
                        float(body[0:14]),
                        float(body[14:28]),
                        float(body[28:42]),
                    )
                except ValueError:
                    pass
            elif label == "INTERVAL":
                try: h.interval = float(body[0:10])
                except ValueError: pass
            elif label == "TIME OF FIRST OBS":
                # "  2026     1     6     8    34   50.0000000     GPS"
                try:
                    y = int(body[0:6]);   m = int(body[6:12])
                    d = int(body[12:18]); H = int(body[18:24])
                    M = int(body[24:30]); S = float(body[30:43])
                    h.time_first_obs = f"{y:04d}/{m:02d}/{d:02d} {H:02d}:{M:02d}:{S:06.3f}"
                    h.start_gps_seconds = (
                        (y - 2026) * 365.25 * 86400
                        + (m - 1) * 30.4 * 86400
                        + (d - 1) * 86400
                        + H * 3600 + M * 60 + S
                    )
                except ValueError:
                    pass
            elif label == "END OF HEADER":
                break
    return h


def parse_nav_header(path: str | Path) -> RinexNavHeader:
    """Parse just the RINEX version + satellite system of a NAV file."""
    h = RinexNavHeader(path=str(path))
    with open(path, "r", errors="replace") as f:
        for i, line in enumerate(f):
            if i >= 30:
                break
            label = _label(line)
            body  = line[:60]
            if label == "RINEX VERSION / TYPE":
                h.version = body[:20].strip()
                h.system  = body[40:41].strip()
            elif label == "END OF HEADER":
                break
    return h


# ───────────────────────────── file discovery ──────────────────────────────

# RINEX file extensions:
# .YYo / .YYO  → observation
# .YYn         → GPS nav
# .YYg         → GLONASS nav
# .YYl         → Galileo nav
# .YYc         → BeiDou nav
# .YYq         → QZSS nav
# .YYp         → mixed nav (RINEX 3.x)
# .rnx / .obs  → version-agnostic
_OBS_EXTS = {"o", "obs", "rnx"}
_NAV_EXTS = {"n", "g", "l", "c", "q", "p", "nav"}


def is_obs(path: str | Path) -> bool:
    ext = Path(path).suffix.lower().lstrip(".")
    # Handle RINEX 2 style with year: .26o
    if len(ext) == 3 and ext[:2].isdigit():
        return ext[2] in "oO"
    return ext in _OBS_EXTS


def is_nav(path: str | Path) -> bool:
    ext = Path(path).suffix.lower().lstrip(".")
    if len(ext) == 3 and ext[:2].isdigit():
        return ext[2] in _NAV_EXTS
    return ext in _NAV_EXTS
