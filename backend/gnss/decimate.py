"""In-place RINEX observation decimator.

rnx2rtkp reads the entire observation file into memory before processing,
so a 332 MB 1 Hz obs file peaks ~1 GB during kinematic runs and OOMs the
server. We don't need 1 Hz data for stop-and-go PPK — surveyors dwell on
each point for ≥30 s, so a 15 s output interval still captures every
stop with multiple Fix epochs.

This module writes a thinned copy of a RINEX 3.x observation file that's
byte-for-byte compatible with rnx2rtkp but ~15× smaller. Only kinematic
(mobile) files get decimated; bases stay at native resolution because they
drive the ambiguity resolution.

The header is copied verbatim. Epoch records are identified by the
``> YYYY MM DD HH MM SS.fffffff`` marker (RINEX 3 convention); every data
line that follows belongs to the most recent epoch. We keep an epoch iff
its timestamp is ≥ ``interval_s`` seconds after the last kept epoch.
"""
from __future__ import annotations

import datetime as _dt
import re
from pathlib import Path

# RINEX 3.x epoch header. Example:
#   > 2026  1  6  8 52 46.0000000  0 35
_EPOCH3_RE = re.compile(
    r"^>\s+(?P<Y>\d{4})\s+(?P<mo>\d+)\s+(?P<d>\d+)\s+"
    r"(?P<h>\d+)\s+(?P<mi>\d+)\s+(?P<s>\d+\.\d+)\s+"
    r"(?P<flag>\d+)\s+(?P<nsat>\d+)"
)


def decimate_rinex_obs(src: str | Path, dst: str | Path,
                       interval_s: float = 15.0) -> tuple[int, int]:
    """Write a decimated copy of a RINEX 3.x observation file.

    Returns ``(epochs_in, epochs_out)`` for logging/diagnostics.

    If the input is already coarser than ``interval_s`` (or every epoch is
    unparseable), the output is effectively identical to the input. When
    the input is RINEX 2.x (no ``> `` epoch markers) we also fall back to
    a straight byte copy — we'd rather let rnx2rtkp try than produce a
    broken file.
    """
    src = str(src); dst = str(dst)
    last_kept: _dt.datetime | None = None
    keep_current = True
    n_in = n_out = 0
    saw_any_epoch = False

    with open(src, "r", errors="replace") as fin, \
         open(dst, "w", newline="") as fout:
        in_header = True
        for line in fin:
            if in_header:
                fout.write(line)
                if "END OF HEADER" in line:
                    in_header = False
                continue

            m = _EPOCH3_RE.match(line)
            if m:
                saw_any_epoch = True
                n_in += 1
                try:
                    ts = _dt.datetime(
                        int(m["Y"]), int(m["mo"]), int(m["d"]),
                        int(m["h"]), int(m["mi"]), int(float(m["s"])),
                        int((float(m["s"]) % 1) * 1_000_000),
                    )
                except ValueError:
                    keep_current = True
                else:
                    if last_kept is None:
                        keep_current = True
                    else:
                        keep_current = (ts - last_kept).total_seconds() >= interval_s - 0.5
                    if keep_current:
                        last_kept = ts
                if keep_current:
                    fout.write(line)
                    n_out += 1
                continue

            # Non-epoch line. If we didn't see a `> ` marker yet this is
            # RINEX 2.x — just write it through; the fallback below catches
            # us. Otherwise, write iff the current epoch is being kept.
            if not saw_any_epoch or keep_current:
                fout.write(line)

    # If we didn't recognise any RINEX 3 epoch markers, the file is probably
    # RINEX 2.x and our streaming write above lost all the observations.
    # Re-do as a straight byte copy so rnx2rtkp at least sees the original.
    if not saw_any_epoch:
        import shutil
        shutil.copyfile(src, dst)

    return n_in, n_out
