"""Per-satellite observation-timeline extraction from RINEX observation files.

For each `> YYYY MM DD HH MM SS.SSSS` epoch header (RINEX 3.x) we read the
satellite IDs on the same line (cols 33-35, 36-38, …) and in the
continuation lines. The result is a mapping
``{sat_prn: [(epoch_seconds, ...)]}`` which downstream code renders as a
tracking Gantt chart — the headline CHC "4 Tracking Summary" section.

We intentionally keep this parser minimal and streaming (one pass, no
full-file buffer) because real observation files go up to 300+ MB and we
already beat the OOM ceiling on the upload side; the chart generator
doesn't need epoch-level precision, only aggregated ranges.
"""
from __future__ import annotations

import datetime as _dt
import re
from dataclasses import dataclass
from typing import Iterable

# RINEX 3.x epoch marker
_EPOCH3_RE = re.compile(
    r"^>\s+(?P<Y>\d{4})\s+(?P<mo>\d+)\s+(?P<d>\d+)\s+"
    r"(?P<h>\d+)\s+(?P<mi>\d+)\s+(?P<s>\d+\.\d+)\s+"
    r"(?P<flag>\d+)\s+(?P<nsat>\d+)"
)
# RINEX 2.x epoch marker: " YY MM DD HH MM SS.SSSS  0 NN<satlist>"
_EPOCH2_RE = re.compile(
    r"^ (?P<yy>\d\d) +(?P<mo>\d+) +(?P<d>\d+) +(?P<h>\d+) +"
    r"(?P<mi>\d+) +(?P<s>\d+\.\d+) +(?P<flag>\d+) +(?P<nsat>\d+)(?P<sats>.*)"
)

# Short mapping for constellation colours in the plot
_CONST_COLOR = {
    "G": "#1976d2",   # GPS — blue
    "R": "#e65100",   # GLONASS — orange
    "E": "#7b1fa2",   # Galileo — purple
    "C": "#c62828",   # BeiDou — red
    "J": "#2e7d32",   # QZSS — green
    "I": "#00838f",   # IRNSS — teal
    "S": "#546e7a",   # SBAS — grey
}


@dataclass
class TrackingTimeline:
    """Per-satellite observation intervals.

    ``sats`` maps PRN ("G05", "R12", "E03", …) to a list of epoch seconds
    (Unix timestamps) at which that satellite was observed. Downstream the
    chart generator condenses these into contiguous bar segments.
    """
    sats: dict[str, list[float]]
    first_epoch: float | None
    last_epoch:  float | None
    interval_s:  float
    total_epochs: int


def _parse_line_sats_rinex2(sats_field: str) -> list[str]:
    """Extract satellite IDs from the RINEX 2.x epoch line's trailing field.

    The sat list is densely packed, 3 chars per sat ("G05R11E14…"). We
    chunk to 3 chars until non-digit/letter content appears.
    """
    out: list[str] = []
    s = sats_field
    i = 0
    while i + 3 <= len(s):
        chunk = s[i:i + 3]
        # Valid only if starts with a constellation letter + 2 digits
        if chunk[0] in _CONST_COLOR and chunk[1:].strip().isdigit():
            out.append(chunk.strip().replace(" ", "0"))
        else:
            break
        i += 3
    return out


def scan_rinex_obs(path: str, max_bytes: int | None = None) -> TrackingTimeline:
    """Walk a RINEX observation file and collect per-satellite epoch stamps.

    ``max_bytes`` lets the caller bound the scan (reading only the first
    N bytes) — useful for very large 1 Hz files where a chart that reflects
    the first 30 min of observations is already representative and saves
    ~300 MB of I/O. None means scan the whole file.
    """
    sats: dict[str, list[float]] = {}
    first_t: float | None = None
    last_t:  float | None = None
    total_epochs = 0
    intervals: list[float] = []
    prev_ts: float | None = None

    bytes_read = 0
    in_header = True
    current_sats: list[str] = []
    current_ts:   float | None = None
    epoch_cont_pending = 0   # for RINEX 2 continuation lines

    def _store(ts: float, sat_ids: list[str]):
        nonlocal first_t, last_t, total_epochs, prev_ts
        if first_t is None:
            first_t = ts
        last_t = ts
        total_epochs += 1
        if prev_ts is not None:
            intervals.append(ts - prev_ts)
        prev_ts = ts
        for s in sat_ids:
            sats.setdefault(s, []).append(ts)

    with open(path, "r", errors="replace") as f:
        for line in f:
            if max_bytes is not None:
                bytes_read += len(line)
                if bytes_read > max_bytes:
                    break

            if in_header:
                if "END OF HEADER" in line:
                    in_header = False
                continue

            # RINEX 3.x
            m3 = _EPOCH3_RE.match(line)
            if m3:
                try:
                    ts = _dt.datetime(
                        int(m3["Y"]), int(m3["mo"]), int(m3["d"]),
                        int(m3["h"]), int(m3["mi"]),
                        int(float(m3["s"])),
                        int((float(m3["s"]) % 1) * 1_000_000),
                    ).timestamp()
                except ValueError:
                    continue
                # RINEX 3 lists satellite IDs on the data lines (not the epoch
                # header itself). The data lines start with a PRN like "G05".
                current_ts   = ts
                current_sats = []
                epoch_cont_pending = int(m3["nsat"])
                continue

            # RINEX 2.x
            m2 = _EPOCH2_RE.match(line)
            if m2 and current_ts is None:
                try:
                    yy = int(m2["yy"]); yr = 2000 + yy if yy < 80 else 1900 + yy
                    ts = _dt.datetime(
                        yr, int(m2["mo"]), int(m2["d"]),
                        int(m2["h"]), int(m2["mi"]),
                        int(float(m2["s"])),
                        int((float(m2["s"]) % 1) * 1_000_000),
                    ).timestamp()
                except ValueError:
                    continue
                sat_field = (m2["sats"] or "")
                parsed = _parse_line_sats_rinex2(sat_field)
                current_ts = ts
                current_sats = list(parsed)
                n_sat = int(m2["nsat"])
                # 12 sats per line in RINEX 2 — more require continuation.
                if n_sat > 12:
                    epoch_cont_pending = n_sat - len(current_sats)
                else:
                    _store(ts, current_sats)
                    current_ts = None
                    current_sats = []
                continue

            # Continuation / data lines
            if current_ts is not None:
                # RINEX 2 satellite continuation (indented, 3-char chunks)
                stripped = line.rstrip("\n")
                if stripped.startswith(" " * 32) and epoch_cont_pending > 0:
                    more = _parse_line_sats_rinex2(stripped[32:])
                    current_sats.extend(more)
                    epoch_cont_pending -= len(more)
                    if epoch_cont_pending <= 0:
                        _store(current_ts, current_sats)
                        current_ts = None; current_sats = []
                    continue
                # RINEX 3 data line: "G05  21528431.454 ..." → PRN at cols 0-3
                if len(stripped) > 3 and stripped[0] in _CONST_COLOR:
                    prn = stripped[:3].strip()
                    if prn and prn not in current_sats:
                        current_sats.append(prn)
                    epoch_cont_pending -= 1
                    if epoch_cont_pending <= 0:
                        _store(current_ts, current_sats)
                        current_ts = None; current_sats = []

    # Median sampling interval — robust to outliers at start/end
    interval = 0.0
    if intervals:
        s = sorted(intervals)
        interval = s[len(s) // 2]

    return TrackingTimeline(
        sats=sats,
        first_epoch=first_t,
        last_epoch=last_t,
        interval_s=interval,
        total_epochs=total_epochs,
    )


def constellation_of(prn: str) -> str:
    """'G05' → 'G', 'R12' → 'R', etc. Unknown → ''."""
    return prn[:1] if prn and prn[:1] in _CONST_COLOR else ""


def color_of(prn: str) -> str:
    """Matplotlib hex colour based on the constellation prefix."""
    return _CONST_COLOR.get(constellation_of(prn), "#9e9e9e")
