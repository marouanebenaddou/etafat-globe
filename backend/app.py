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

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from gnss.models import Baseline, Station
from gnss.adjust import free_adjustment, constrained_adjustment
from gnss.loops import detect_loops, refine_closures_enu
from gnss.pipeline import PipelineInput, compute_all_baselines
from gnss.rinex import is_obs, is_nav


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


def _run_pipeline_after_baselines(
    baselines: list[Baseline],
    stations:  list[Station],
    projection_hint: Optional["ProjectionHint"] = None,
    h_limit_m: float = 1.0,
    v_limit_m: float = 2.0,
    extra: Optional[dict] = None,
) -> PipelineOut:
    """The part of the pipeline that runs on already-computed baseline vectors.

    Used by both `/pipeline/from-vectors` (client supplies vectors) and
    `/pipeline/from-rinex` (we compute vectors via rnx2rtkp first).
    """
    if len(baselines) < 1:
        raise HTTPException(400, "at least one baseline is required")
    if len(stations) < 2:
        raise HTTPException(400, "at least two stations are required")

    loops = detect_loops(baselines)
    if projection_hint is not None:
        import math
        refine_closures_enu(
            loops, {b.id: b for b in baselines},
            math.radians(projection_hint.lat_deg),
            math.radians(projection_hint.lon_deg),
            h_limit=h_limit_m, v_limit=v_limit_m,
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

    free = free_adjustment(stations, baselines)
    free_out = _report_to_dict(free)

    constrained_out: Optional[dict[str, Any]] = None
    if any(s.is_control for s in stations):
        constrained = constrained_adjustment(stations, baselines)
        constrained_out = _report_to_dict(constrained)

    out = PipelineOut(
        n_baselines=len(baselines),
        n_stations=len(stations),
        loops=loops_out,
        free=free_out,
        constrained=constrained_out,
    )
    if extra:
        # pydantic v2 lets us attach extra data via model_copy(update=...)
        return out.model_copy(update={"extra": extra}) if "extra" in out.model_fields else out
    return out


@app.post("/pipeline/from-vectors", response_model=PipelineOut)
def pipeline_from_vectors(inp: PipelineIn) -> PipelineOut:
    """Full pipeline from pre-computed baseline vectors."""
    stations  = [Station(**s.model_dump()) for s in inp.stations]
    baselines = [Baseline(**b.model_dump()) for b in inp.baselines]
    return _run_pipeline_after_baselines(
        baselines, stations,
        projection_hint=inp.projection_hint,
        h_limit_m=inp.h_limit_m, v_limit_m=inp.v_limit_m,
    )


# ───── from-rinex ──────────────────────────────────────────────────────────
import json as _json
import os as _os
import tempfile as _tempfile


@app.post("/pipeline/from-rinex")
async def pipeline_from_rinex(
    files: list[UploadFile] = File(..., description="RINEX observation + navigation files"),
    base_marker_names: str = Form(..., description="JSON array of marker names treated as base stations, e.g. [\"moyen2\",\"Moyen3\"]"),
    control_stations: str = Form("[]", description="JSON array of {name, x, y, z, is_control} for known control points"),
    projection_hint: str = Form("null", description="Optional JSON {lat_deg, lon_deg} for proper ENU loop closures"),
    h_limit_m: float = Form(1.0),
    v_limit_m: float = Form(2.0),
):
    """Upload RINEX files → we run rnx2rtkp for every (base, rover-session)
    pair → then the usual loops + adjustments pipeline.

    The multipart body carries RINEX obs and nav files mixed in one `files`
    list; we sort them by extension. At least two observation files and one
    navigation file are required.
    """
    # Parse JSON form fields
    try:
        base_names = _json.loads(base_marker_names)
        controls_raw = _json.loads(control_stations)
        proj_raw = _json.loads(projection_hint)
    except _json.JSONDecodeError as e:
        raise HTTPException(400, f"malformed JSON in form field: {e}")
    if not isinstance(base_names, list) or not base_names:
        raise HTTPException(400, "base_marker_names must be a non-empty JSON array")

    control_list = [Station(
        name=str(c["name"]),
        x=float(c.get("x", 0.0)),
        y=float(c.get("y", 0.0)),
        z=float(c.get("z", 0.0)),
        is_control=bool(c.get("is_control", True)),
    ) for c in controls_raw]

    hint_obj: Optional[ProjectionHint] = None
    if proj_raw:
        hint_obj = ProjectionHint(**proj_raw)

    # Save uploads, preserving original filename (rnx2rtkp looks at the extension)
    with _tempfile.TemporaryDirectory() as tmp:
        obs_paths: list[str] = []
        nav_paths: list[str] = []
        for up in files:
            dest = _os.path.join(tmp, _os.path.basename(up.filename or ""))
            if not dest:
                continue
            data = await up.read()
            with open(dest, "wb") as f:
                f.write(data)
            if   is_obs(dest): obs_paths.append(dest)
            elif is_nav(dest): nav_paths.append(dest)

        if len(obs_paths) < 2:
            raise HTTPException(400, f"need ≥ 2 observation files (got {len(obs_paths)})")
        if not nav_paths:
            raise HTTPException(400, "need at least one navigation file")

        pin = PipelineInput(
            obs_files=obs_paths,
            nav_files=nav_paths,
            base_marker_names=base_names,
            control_stations=control_list,
            projection_hint_latlon_deg=(hint_obj.lat_deg, hint_obj.lon_deg) if hint_obj else None,
        )
        try:
            baselines, stations, warnings = compute_all_baselines(pin)
        except ValueError as e:
            raise HTTPException(400, str(e))
        except RuntimeError as e:
            raise HTTPException(500, f"baseline computation failed: {e}")

    if not baselines:
        raise HTTPException(
            500,
            "rnx2rtkp produced no baselines — check the server logs. "
            f"Warnings: {warnings}"
        )

    out = _run_pipeline_after_baselines(
        baselines, stations,
        projection_hint=hint_obj,
        h_limit_m=h_limit_m, v_limit_m=v_limit_m,
    )
    # Surface the warnings + per-baseline metadata to the client
    return {
        **out.model_dump(),
        "baselines_detail": [
            {
                "id":            b.id,
                "start":         b.start,
                "end":           b.end,
                "dx":            b.dx, "dy": b.dy, "dz": b.dz,
                "length_m":      b.length,
                "solution_type": b.solution_type,
                "rms_m":         b.rms,
                "sdx_m":         b.sdx, "sdy_m": b.sdy, "sdz_m": b.sdz,
            }
            for b in baselines
        ],
        "warnings": warnings,
    }


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
