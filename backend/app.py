"""ETAFAT GNSS processing API.

A FastAPI service that accepts GNSS observation data (RINEX files or a
pre-computed baseline manifest) and returns the full pipeline output:

  * ``POST /pipeline/from-vectors`` — given pre-computed baseline ECEF
    vectors and (optionally) control station coordinates, run loop closures
    + free + constrained adjustments. Useful for clients that already have
    baselines computed elsewhere.

  * ``POST /pipeline/from-rinex`` — given zipped RINEX files and a base
    station layout, run RTKLIB rnx2rtkp to compute baselines, then the
    rest of the pipeline. Heavy; runs server-side.

  * ``GET  /health``                 — liveness probe.
  * ``GET  /rtklib/version``         — echoes the bundled rnx2rtkp version.

The service is intentionally stateless: no database, no auth, no queue.
Each request runs synchronously in a temp dir that is cleaned up at the end.
For multi-minute baseline computations, clients should run the heavy endpoint
in the background and poll their own state — we'll add that if it's ever
needed.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from gnss.models import Baseline, Station
from gnss.adjust import free_adjustment, constrained_adjustment
from gnss.loops import detect_loops, refine_closures_enu


def _find_rtklib_binary() -> Path:
    """Support both Linux/macOS (`rnx2rtkp`) and Windows (`rnx2rtkp.exe`)."""
    base = Path(__file__).resolve().parent / "rtklib_bin"
    for name in ("rnx2rtkp", "rnx2rtkp.exe"):
        candidate = base / name
        if candidate.is_file():
            return candidate
    return base / "rnx2rtkp"  # default (health endpoint will report missing)

RTKLIB_BIN = _find_rtklib_binary()

app = FastAPI(
    title="ETAFAT GNSS Processing API",
    version="0.1.0",
    description=(
        "Baseline calculation, loop-closure checks, and network adjustment "
        "for the ETAFAT internal GNSS workflow."
    ),
)

# CORS — allow the Next.js frontend (etafat-v2.vercel.app) to call us from
# the browser. Broader than we'd like in prod; tighten once the frontend
# domain is stable.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ═══════════════════════════════  schemas  ═════════════════════════════════

class BaselineIn(BaseModel):
    """Client-supplied baseline vector (ECEF, metres)."""
    id: str = Field(..., description="Unique baseline identifier, e.g. 'B01'")
    start: str
    end: str
    dx: float
    dy: float
    dz: float
    sdx: float = 0.005
    sdy: float = 0.005
    sdz: float = 0.005
    solution_type: str = "Fix"
    rms: float = 0.0
    ratio: float = 0.0


class StationIn(BaseModel):
    """Approximate or exact station coords (ECEF, metres)."""
    name: str
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    is_control: bool = False


class ProjectionHint(BaseModel):
    """Where the network lives, for proper ENU rotation on loop closures."""
    lat_deg: float
    lon_deg: float


class PipelineIn(BaseModel):
    baselines: list[BaselineIn]
    stations:  list[StationIn]
    projection_hint: Optional[ProjectionHint] = None
    h_limit_m: float = 1.0
    v_limit_m: float = 2.0


class PipelineOut(BaseModel):
    n_baselines: int
    n_stations:  int
    loops:       list[dict[str, Any]]
    free:        dict[str, Any]
    constrained: Optional[dict[str, Any]] = None


# ═══════════════════════════════  endpoints  ═══════════════════════════════

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "rtklib_bundled": RTKLIB_BIN.is_file()}


@app.get("/rtklib/version")
def rtklib_version() -> dict:
    if not RTKLIB_BIN.is_file():
        raise HTTPException(500, "rnx2rtkp binary not bundled with the API")
    try:
        proc = subprocess.run([str(RTKLIB_BIN), "-?"],
                              capture_output=True, text=True, timeout=5)
    except subprocess.TimeoutExpired:
        raise HTTPException(500, "rnx2rtkp timed out")
    # First line is usually the banner
    banner = (proc.stdout or proc.stderr).splitlines()[0:3]
    return {"ok": True, "banner": banner}


@app.post("/pipeline/from-vectors", response_model=PipelineOut)
def pipeline_from_vectors(inp: PipelineIn) -> PipelineOut:
    """Full pipeline from pre-computed baseline vectors.

    Steps:
      1. Convert request → domain models.
      2. Build the baseline graph, detect fundamental loops.
      3. Compute closures in ECEF then refine in local ENU using the
         projection hint (if provided).
      4. Run free adjustment (always).
      5. If any station is flagged as control, run constrained adjustment.
    """
    if len(inp.baselines) < 1:
        raise HTTPException(400, "at least one baseline is required")
    if len(inp.stations) < 2:
        raise HTTPException(400, "at least two stations are required")

    stations = [Station(**s.model_dump()) for s in inp.stations]
    baselines = [Baseline(**b.model_dump()) for b in inp.baselines]

    # Loops
    loops = detect_loops(baselines)
    if inp.projection_hint:
        import math
        refine_closures_enu(
            loops, {b.id: b for b in baselines},
            math.radians(inp.projection_hint.lat_deg),
            math.radians(inp.projection_hint.lon_deg),
            h_limit=inp.h_limit_m, v_limit=inp.v_limit_m,
        )
    loops_out = [
        {
            "id":        str(lp.id),
            "baselines": list(lp.baseline_ids),
            "length_m":  float(lp.length),
            "dh_m":      float(lp.dh),
            "dv_m":      float(lp.dv),
            "ppm":       float(lp.ppm),
            "conform":   bool(lp.conform),
        }
        for lp in loops
    ]

    # Free adjustment
    free = free_adjustment(stations, baselines)
    free_out = _report_to_dict(free)

    # Constrained adjustment (only if any control station)
    constrained_out: Optional[dict[str, Any]] = None
    if any(s.is_control for s in stations):
        constrained = constrained_adjustment(stations, baselines)
        constrained_out = _report_to_dict(constrained)

    return PipelineOut(
        n_baselines=len(baselines),
        n_stations=len(stations),
        loops=loops_out,
        free=free_out,
        constrained=constrained_out,
    )


# ═══════════════════════════════  helpers  ═════════════════════════════════

def _report_to_dict(rep) -> dict[str, Any]:
    """Convert an AdjustmentReport to a JSON-serialisable dict.

    Numpy scalars leak out of the LS solver; cast everything to Python
    primitives so pydantic's serializer is happy.
    """
    return {
        "type":              str(rep.type),
        "chi2":              float(rep.chi2),
        "chi2_range":        [float(rep.chi2_range[0]), float(rep.chi2_range[1])],
        "chi2_pass":         bool(rep.chi2_pass),
        "sigma0":            float(rep.sigma0),
        "horiz_accuracy_mm": float(rep.horiz_accuracy_mm),
        "vert_accuracy_mm":  float(rep.vert_accuracy_mm),
        "n_obs":             int(rep.n_obs),
        "n_unk":             int(rep.n_unk),
        "dof":               int(rep.dof),
        "points": [
            {
                "name":       str(p.name),
                "x":          float(p.x),  "y":  float(p.y),  "z":  float(p.z),
                "sx":         float(p.sx), "sy": float(p.sy), "sz": float(p.sz),
                "is_control": bool(p.is_control),
            }
            for p in rep.points
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0",
                port=int(os.getenv("PORT", "8000")),
                reload=True)
