"""Data models shared across the GNSS pipeline.

All vector components are in an Earth-Centered Earth-Fixed (ECEF) Cartesian
frame unless noted otherwise. Grid coordinates (Nord/Est/Élévation) are the
user-facing outputs after projection.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Station:
    """A GNSS station — either a known control point or an unknown to solve for."""
    name: str
    x: float = 0.0  # ECEF X (m) — initial approximate coordinates
    y: float = 0.0
    z: float = 0.0
    is_control: bool = False  # held fixed in constrained adjustment


@dataclass
class Baseline:
    """A computed baseline vector between two stations.

    ``dx, dy, dz`` are in ECEF metres, i.e. (end.xyz - start.xyz) as produced
    by rnx2rtkp. ``sdx, sdy, sdz`` are the 1-sigma standard deviations on
    each component, used to weight observations in the least-squares adjust.
    """
    id: str
    start: str  # station name
    end: str
    dx: float
    dy: float
    dz: float
    sdx: float = 0.005
    sdy: float = 0.005
    sdz: float = 0.005
    solution_type: str = "Fix"   # "Fix" | "Lc Fix" | "Kine Fix" | "Kine Mixed" | ...
    rms: float = 0.0
    ratio: float = 0.0
    # Optional — populated only for kinematic (stop-and-go) baselines so the
    # frontend can show dwell time, how many epochs the rover held still, and
    # how integer-clean those epochs were.
    duration_s: Optional[float] = None     # observation time at the stop
    n_epochs:   Optional[int]   = None     # Fix + Float epochs counted as "stopped"
    fix_ratio:  Optional[float] = None     # 0..1, share of epochs that were Q=1
    n_sat:      Optional[int]   = None     # mean satellite count over the stop

    @property
    def length(self) -> float:
        return (self.dx**2 + self.dy**2 + self.dz**2) ** 0.5


@dataclass
class Loop:
    """A closed loop formed by a sequence of baselines (with direction)."""
    id: str
    baseline_ids: list[str]         # IDs of baselines in order
    directions: list[int]           # +1 or -1 per baseline (forward or reversed)
    length: float = 0.0             # cumulative length (m)
    dh: float = 0.0                 # horizontal misclosure (m)
    dv: float = 0.0                 # vertical   misclosure (m)
    ppm: float = 0.0                # dh-to-length ratio in ppm
    conform: bool = True


@dataclass
class AdjustedPoint:
    name: str
    x: float              # ECEF X (m) after adjustment
    y: float
    z: float
    sx: float = 0.0       # 1-sigma (m)
    sy: float = 0.0
    sz: float = 0.0
    is_control: bool = False

    # Grid coords filled in after projection (North/East/Elev, metres)
    north: Optional[float] = None
    east:  Optional[float] = None
    elev:  Optional[float] = None
    sn:    Optional[float] = None
    se:    Optional[float] = None
    sh:    Optional[float] = None


@dataclass
class AdjustmentReport:
    """Full network-adjustment result."""
    type: str                       # "free" | "constrained"
    points: list[AdjustedPoint] = field(default_factory=list)
    chi2: float = 0.0               # χ² test value
    chi2_range: tuple[float, float] = (0.0, 0.0)
    chi2_pass: bool = True
    sigma0: float = 1.0             # a-posteriori unit-weight sigma
    horiz_accuracy_mm: float = 0.0  # overall 2-sigma H accuracy (mm)
    vert_accuracy_mm:  float = 0.0
    n_obs: int = 0                  # number of scalar observations
    n_unk: int = 0                  # number of unknowns
    dof:   int = 0                  # degrees of freedom
