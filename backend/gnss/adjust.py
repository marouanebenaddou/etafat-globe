"""Least-squares network adjustment (free + constrained).

The mathematical model
──────────────────────
Each baseline observation between station A and B gives three scalar
measurements:

    ΔX_obs = X_B − X_A + v_X
    ΔY_obs = Y_B − Y_A + v_Y
    ΔZ_obs = Z_B − Z_A + v_Z

Because the relationship is *linear* in the unknowns (station ECEF
coordinates), there is no iteration — a single Gauss-Markov solve gives the
answer:

    x̂ = (Aᵀ P A)⁻¹ Aᵀ P L

with

    A  : design matrix (3 rows per baseline, −1/+1 entries)
    L  : observation vector (stacked ΔX, ΔY, ΔZ)
    P  : diagonal weight matrix = 1 / σ²
    x̂  : corrections/absolute coords for the unknowns

A priori sigma σ₀ is assumed = 1; the a posteriori unit-weight standard
error σ̂₀ = √(vᵀPv / dof) is reported — it should sit near 1 if the baseline
precisions were faithful, and its square is checked against χ² at 95 %.

Free vs constrained
───────────────────
A bare network has a 3-dim datum defect (you can translate every station
together without changing any baseline). Two ways to remove it:

* **Free**:   fix one arbitrary station's ECEF to its initial approximate
              value. All others float. Purpose: spot bad observations via
              residuals with no outside constraint biasing the result.

* **Constrained**: hold every ``is_control=True`` station rigidly at its
                   known ECEF. Purpose: final coordinates expressed in the
                   client's geodetic frame.
"""
from __future__ import annotations

from typing import Sequence

import numpy as np
from scipy.stats import chi2 as _chi2

from .models import Station, Baseline, AdjustedPoint, AdjustmentReport


# ───────────────────────────── helpers ──────────────────────────────────────

def _build_design(unknowns: list[str], baselines: Sequence[Baseline],
                  fixed_xyz: dict[str, tuple[float, float, float]]
                  ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Assemble (A, L, W) for the unknowns list order.

    A : (3n, 3m) design matrix
    L : (3n,)    observation vector = ΔXYZ_obs − (fixed contribution)
    W : (3n,)    diagonal weight vector = 1 / σ²
    """
    idx = {name: i for i, name in enumerate(unknowns)}
    n_obs = 3 * len(baselines)
    n_unk = 3 * len(unknowns)
    A = np.zeros((n_obs, n_unk), dtype=float)
    L = np.zeros(n_obs,           dtype=float)
    W = np.zeros(n_obs,           dtype=float)

    for k, b in enumerate(baselines):
        for c, (d_obs, sd) in enumerate([(b.dx, b.sdx), (b.dy, b.sdy), (b.dz, b.sdz)]):
            row = 3 * k + c
            # −1 on start (if unknown), +1 on end (if unknown); moves fixed to RHS.
            lhs_end_contrib = 0.0
            lhs_start_contrib = 0.0
            if b.end in idx:
                A[row, 3 * idx[b.end]   + c] = +1.0
            else:
                lhs_end_contrib = fixed_xyz[b.end][c]
            if b.start in idx:
                A[row, 3 * idx[b.start] + c] = -1.0
            else:
                lhs_start_contrib = fixed_xyz[b.start][c]
            L[row] = d_obs + lhs_start_contrib - lhs_end_contrib
            W[row] = 1.0 / max(sd * sd, 1e-12)
    return A, L, W


def _solve_lsq(A: np.ndarray, L: np.ndarray, W: np.ndarray
               ) -> tuple[np.ndarray, np.ndarray, float, int]:
    """Weighted LS: returns (x̂, Cov, sigma0_hat, dof).

    Cov is the (AᵀPA)⁻¹ matrix, *not* yet scaled by σ₀². Caller decides.
    """
    # Clip weights so inf/huge values don't poison np.linalg.lstsq; in practice
    # anything above 1e16 is numerically "infinite" (σ ≈ 0) and hard-fixes the
    # observation.
    W = np.clip(W, 1e-30, 1e16)
    sqrtW = np.sqrt(W)
    Aw = A * sqrtW[:, None]
    Lw = L * sqrtW
    # Least-squares solve
    x_hat, *_ = np.linalg.lstsq(Aw, Lw, rcond=None)
    # Weighted residuals
    vw = Aw @ x_hat - Lw
    dof = A.shape[0] - A.shape[1]
    sigma0_sq = float((vw @ vw) / dof) if dof > 0 else 1.0
    # Covariance: (AᵀPA)⁻¹ — use pseudo-inverse for safety
    N = Aw.T @ Aw
    try:
        Cov = np.linalg.inv(N)
    except np.linalg.LinAlgError:
        Cov = np.linalg.pinv(N)
    return x_hat, Cov, float(np.sqrt(max(sigma0_sq, 0.0))), dof


# ───────────────────────────── free ─────────────────────────────────────────

def free_adjustment(stations: list[Station], baselines: list[Baseline]
                    ) -> AdjustmentReport:
    """Free network adjustment — one station pinned to its initial XYZ.

    Rule: if any station is flagged ``is_control``, we pin the first such
    station. Otherwise we pin the first station in the list. All others float.
    """
    if len(stations) < 2 or len(baselines) < 1:
        raise ValueError("need at least 2 stations and 1 baseline")

    pivot = next((s for s in stations if s.is_control), stations[0])
    unknowns = [s.name for s in stations if s.name != pivot.name]
    fixed_xyz: dict[str, tuple[float, float, float]] = {
        pivot.name: (pivot.x, pivot.y, pivot.z)
    }

    A, L, W = _build_design(unknowns, baselines, fixed_xyz)
    x_hat, Cov, sigma0, dof = _solve_lsq(A, L, W)
    Cov_scaled = Cov * sigma0 * sigma0

    # Build AdjustedPoint list
    stations_by_name = {s.name: s for s in stations}
    points: list[AdjustedPoint] = []
    # pivot first (held)
    p = stations_by_name[pivot.name]
    points.append(AdjustedPoint(
        name=p.name, x=p.x, y=p.y, z=p.z,
        sx=0.0, sy=0.0, sz=0.0, is_control=p.is_control,
    ))
    for i, name in enumerate(unknowns):
        x, y, z = x_hat[3*i : 3*i+3]
        var = np.diag(Cov_scaled)[3*i : 3*i+3]
        sx, sy, sz = np.sqrt(np.maximum(var, 0.0))
        s = stations_by_name[name]
        points.append(AdjustedPoint(
            name=name, x=float(x), y=float(y), z=float(z),
            sx=float(sx), sy=float(sy), sz=float(sz),
            is_control=s.is_control,
        ))

    # χ² test (two-tailed, 95 %)
    lo, hi = _chi2.ppf(0.025, dof), _chi2.ppf(0.975, dof)
    chi2_val = sigma0 * sigma0 * dof

    # Overall 2-σ accuracies (RMS of horizontal/vertical σ across unknowns)
    if len(points) > 1:
        sh = np.array([(p.sx**2 + p.sy**2) ** 0.5 for p in points[1:]])
        sv = np.array([p.sz for p in points[1:]])
        h_mm = float(2.0 * np.sqrt(np.mean(sh * sh)) * 1000)
        v_mm = float(2.0 * np.sqrt(np.mean(sv * sv)) * 1000)
    else:
        h_mm = v_mm = 0.0

    return AdjustmentReport(
        type="free",
        points=points,
        chi2=chi2_val,
        chi2_range=(float(lo), float(hi)),
        chi2_pass=(lo <= chi2_val <= hi),
        sigma0=sigma0,
        horiz_accuracy_mm=h_mm,
        vert_accuracy_mm=v_mm,
        n_obs=A.shape[0],
        n_unk=A.shape[1],
        dof=dof,
    )


# ───────────────────────────── constrained ──────────────────────────────────

def constrained_adjustment(stations: list[Station], baselines: list[Baseline]
                           ) -> AdjustmentReport:
    """Constrained network adjustment — every ``is_control=True`` station is
    held rigidly at its given ECEF coordinates, the rest are solved."""
    controls = [s for s in stations if s.is_control]
    if not controls:
        raise ValueError("constrained adjustment needs ≥ 1 control station")

    unknowns = [s.name for s in stations if not s.is_control]
    fixed_xyz: dict[str, tuple[float, float, float]] = {
        s.name: (s.x, s.y, s.z) for s in controls
    }

    A, L, W = _build_design(unknowns, baselines, fixed_xyz)
    x_hat, Cov, sigma0, dof = _solve_lsq(A, L, W)
    Cov_scaled = Cov * sigma0 * sigma0

    stations_by_name = {s.name: s for s in stations}
    points: list[AdjustedPoint] = []
    # Controls first (σ = 0)
    for c in controls:
        points.append(AdjustedPoint(
            name=c.name, x=c.x, y=c.y, z=c.z,
            sx=0.0, sy=0.0, sz=0.0, is_control=True,
        ))
    for i, name in enumerate(unknowns):
        x, y, z = x_hat[3*i : 3*i+3]
        var = np.diag(Cov_scaled)[3*i : 3*i+3]
        sx, sy, sz = np.sqrt(np.maximum(var, 0.0))
        s = stations_by_name[name]
        points.append(AdjustedPoint(
            name=name, x=float(x), y=float(y), z=float(z),
            sx=float(sx), sy=float(sy), sz=float(sz),
            is_control=False,
        ))

    lo, hi = _chi2.ppf(0.025, dof), _chi2.ppf(0.975, dof)
    chi2_val = sigma0 * sigma0 * dof

    free_points = [p for p in points if not p.is_control]
    if free_points:
        sh = np.array([(p.sx**2 + p.sy**2) ** 0.5 for p in free_points])
        sv = np.array([p.sz for p in free_points])
        h_mm = float(2.0 * np.sqrt(np.mean(sh * sh)) * 1000)
        v_mm = float(2.0 * np.sqrt(np.mean(sv * sv)) * 1000)
    else:
        h_mm = v_mm = 0.0

    return AdjustmentReport(
        type="constrained",
        points=points,
        chi2=chi2_val,
        chi2_range=(float(lo), float(hi)),
        chi2_pass=(lo <= chi2_val <= hi),
        sigma0=sigma0,
        horiz_accuracy_mm=h_mm,
        vert_accuracy_mm=v_mm,
        n_obs=A.shape[0],
        n_unk=A.shape[1],
        dof=dof,
    )
