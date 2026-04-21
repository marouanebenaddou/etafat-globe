# ETAFAT GNSS Processing Backend

Python service that runs the geodetic side of the ETAFAT GNSS tool. Three
responsibilities, in order of cost:

1. **Network adjustment** — pure NumPy/SciPy least-squares (free + constrained).
   Fast, deterministic, no external binaries required. Validated against the
   CHC Geomatics Office 2 reference reports to:
   - **ΔH loop closure: 0.12 mm** max deviation
   - **PPM: 0.68 %** max relative error
2. **Loop closure detection** — spanning-tree cycle basis in pure Python.
3. **Baseline computation** (optional) — wraps RTKLIB `rnx2rtkp` as a subprocess
   when a RINEX pipeline is requested. `rnx2rtkp` is compiled from source
   inside the Docker image.

## Layout

```
backend/
├── app.py                ← FastAPI entrypoint
├── gnss/
│   ├── models.py         ← Station, Baseline, Loop, AdjustedPoint
│   ├── loops.py          ← spanning-tree cycle detection + ENU closure
│   ├── adjust.py         ← free + constrained weighted LS
│   └── baselines.py      ← rnx2rtkp subprocess wrapper
├── rtklib_bin/           ← local compiled binaries (Docker rebuilds these)
├── tests/
│   └── test_adjustment.py   ← validation against CHC reference PDFs
├── requirements.txt
├── Dockerfile            ← multi-stage; compiles RTKLIB, ships with service
└── README.md
```

## Local development

```bash
# 1. deps
pip install -r requirements.txt

# 2. run validation tests (should print both passes)
python3 tests/test_adjustment.py

# 3. run the API
uvicorn app:app --reload --port 8000
# → http://localhost:8000/docs (Swagger UI)
```

## Docker

```bash
docker build -t etafat-gnss-api .
docker run -p 8000:8000 etafat-gnss-api
```

The multi-stage Dockerfile:
1. Clones `tomojitakasu/RTKLIB` and compiles `rnx2rtkp` + `convbin` in a
   `debian:bookworm-slim` builder.
2. Copies the two binaries into a `python:3.11-slim` runtime layer.

Final image is ~250 MB and ships everything needed.

## Endpoints

| Method | Path                          | Description                      |
|--------|-------------------------------|----------------------------------|
| GET    | `/health`                     | Liveness + rnx2rtkp presence     |
| GET    | `/rtklib/version`             | First 3 lines of rnx2rtkp banner |
| POST   | `/pipeline/from-vectors`      | Full pipeline from given vectors |

### `POST /pipeline/from-vectors`

Request:
```json
{
  "baselines": [
    {"id": "B01", "start": "Bou3", "end": "Tia2",
     "dx": -97.5765, "dy": 6939.8432, "dz": 7715.4264,
     "sdx": 0.0035, "sdy": 0.0018, "sdz": 0.0019}
  ],
  "stations": [
    {"name": "Bou3", "x": 6255021.8961, "y": -873184.3240, "z": 891145.0737,
     "is_control": true},
    {"name": "Tia2"}
  ],
  "projection_hint": {"lat_deg": 8.12, "lon_deg": -7.93}
}
```

Response: per-loop closures + free/constrained adjustment reports with point
ECEF, standard deviations and χ² statistics.

## Why no HCN → RINEX?

The CHC HCN format is proprietary and has no open-source Linux converter.
CHC's official `CGORinex.exe` is Windows-only. Modern CHC receivers (IBASE,
I73+, i93+) can export RINEX directly via their web UI — that's the intended
intake for this API. If a Windows conversion step is ever needed, we'd add a
Wine layer or a dedicated Windows converter sidecar.
