"""ETAFAT GNSS processing engine.

Three layers:
  - baselines: wrapper around RTKLIB rnx2rtkp for carrier-phase baseline
    solutions from RINEX files.
  - loops:     pure Python loop-closure checks on a network of baselines.
  - adjust:    pure Python least-squares network adjustment (free & constrained).
"""
from .models import Station, Baseline, Loop, AdjustedPoint, AdjustmentReport
from .loops import detect_loops, refine_closures_enu, loop_misclosure_enu
from .adjust import free_adjustment, constrained_adjustment
