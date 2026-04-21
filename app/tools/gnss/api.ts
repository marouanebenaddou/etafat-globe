/**
 * Thin client for the ETAFAT GNSS backend (FastAPI + RTKLIB).
 *
 * Base URL comes from NEXT_PUBLIC_GNSS_API_URL (defaults to localhost:8000
 * for local dev). Endpoints map 1:1 to the FastAPI routes in backend/app.py.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_GNSS_API_URL ?? "http://localhost:8000"

// ───────────────── wire types (must match backend/app.py) ─────────────────

export type BaselineIn = {
  id: string
  start: string
  end: string
  dx: number
  dy: number
  dz: number
  sdx?: number
  sdy?: number
  sdz?: number
  solution_type?: string
  rms?: number
  ratio?: number
}

export type StationIn = {
  name: string
  x?: number
  y?: number
  z?: number
  is_control?: boolean
}

export type PipelineIn = {
  baselines: BaselineIn[]
  stations:  StationIn[]
  projection_hint?: { lat_deg: number; lon_deg: number }
  h_limit_m?: number
  v_limit_m?: number
}

export type LoopOut = {
  id: string
  baselines: string[]
  length_m: number
  dh_m: number
  dv_m: number
  ppm: number
  conform: boolean
}

export type AdjustedPointOut = {
  name: string
  x: number;  y: number;  z: number
  sx: number; sy: number; sz: number
  is_control: boolean
}

export type AdjustmentOut = {
  type: "free" | "constrained"
  chi2: number
  chi2_range: [number, number]
  chi2_pass: boolean
  sigma0: number
  horiz_accuracy_mm: number
  vert_accuracy_mm: number
  n_obs: number
  n_unk: number
  dof: number
  points: AdjustedPointOut[]
}

export type PipelineOut = {
  n_baselines: number
  n_stations: number
  loops: LoopOut[]
  free: AdjustmentOut
  constrained: AdjustmentOut | null
}

// ───────────────── calls ─────────────────────────────────────────────────

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status} ${res.statusText} — ${text}`)
  }
  return res.json() as Promise<T>
}

export async function checkHealth(signal?: AbortSignal): Promise<{
  status: string
  rtklib_bundled: boolean
}> {
  return json(`${API_URL}/health`, { signal, method: "GET" })
}

export async function runPipeline(body: PipelineIn,
                                  signal?: AbortSignal): Promise<PipelineOut> {
  return json<PipelineOut>(`${API_URL}/pipeline/from-vectors`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  })
}


// ───────────────── from-RINEX ────────────────────────────────────────────
//
// Uploads RINEX observation + navigation files. The backend (Railway) runs
// rnx2rtkp for every (base, rover-session) pair, then loops + adjustments.

export type BaselineDetail = {
  id: string
  start: string
  end: string
  dx: number;  dy: number;  dz: number
  length_m: number
  solution_type: string
  rms_m: number
  sdx_m: number; sdy_m: number; sdz_m: number
}

export type PipelineFromRinexOut = PipelineOut & {
  baselines_detail: BaselineDetail[]
  warnings: string[]
}

export type RinexUploadConfig = {
  files: File[]
  base_marker_names: string[]
  control_stations?: StationIn[]
  projection_hint?: { lat_deg: number; lon_deg: number }
  h_limit_m?: number
  v_limit_m?: number
}

export async function runPipelineFromRinex(
  cfg: RinexUploadConfig,
  opts: { signal?: AbortSignal; onProgress?: (pct: number) => void } = {}
): Promise<PipelineFromRinexOut> {
  const fd = new FormData()
  for (const f of cfg.files) fd.append("files", f, f.name)
  fd.append("base_marker_names", JSON.stringify(cfg.base_marker_names))
  fd.append("control_stations",  JSON.stringify(cfg.control_stations ?? []))
  fd.append("projection_hint",   JSON.stringify(cfg.projection_hint ?? null))
  if (cfg.h_limit_m != null) fd.append("h_limit_m", String(cfg.h_limit_m))
  if (cfg.v_limit_m != null) fd.append("v_limit_m", String(cfg.v_limit_m))

  // Use XHR for upload progress (fetch() still has no browser progress API for
  // request bodies). We fall back to fetch() if there's no onProgress handler.
  if (opts.onProgress) {
    return await new Promise<PipelineFromRinexOut>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", `${API_URL}/pipeline/from-rinex`)
      xhr.responseType = "json"
      xhr.upload.addEventListener("progress", e => {
        if (e.lengthComputable) opts.onProgress!(Math.round((e.loaded / e.total) * 100))
      })
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
        else reject(new Error(`${xhr.status}: ${xhr.response?.detail ?? xhr.responseText}`))
      })
      xhr.addEventListener("error",   () => reject(new Error("network error")))
      xhr.addEventListener("abort",   () => reject(new DOMException("aborted", "AbortError")))
      opts.signal?.addEventListener("abort", () => xhr.abort())
      xhr.send(fd)
    })
  }
  const res = await fetch(`${API_URL}/pipeline/from-rinex`, {
    method: "POST", body: fd, signal: opts.signal,
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json() as Promise<PipelineFromRinexOut>
}


// ───────────────── file classification helpers ───────────────────────────

/** Returns true if the filename looks like a RINEX observation file. */
export function isRinexObs(name: string): boolean {
  const low = name.toLowerCase()
  // RINEX 2: .YYo (e.g. .26o, .05o)
  if (/\.\d\d[o]$/.test(low)) return true
  // RINEX 3 / generic: .obs, .rnx
  if (low.endsWith(".obs") || low.endsWith(".rnx")) return true
  return false
}

/** Returns true if the filename looks like a RINEX navigation file. */
export function isRinexNav(name: string): boolean {
  const low = name.toLowerCase()
  // RINEX 2: .YYn / .YYg / .YYl / .YYc / .YYp / .YYq
  if (/\.\d\d[nglpqc]$/.test(low)) return true
  if (low.endsWith(".nav")) return true
  return false
}


// ───────────────── PDF report ────────────────────────────────────────────
//
// Once /pipeline/from-* has returned a result, POST it back here to get a
// downloadable 4-section PDF report (cover, baselines, loops, adjustments).

export async function downloadPdfReport(
  result: PipelineOut | PipelineFromRinexOut,
  projectName: string,
  filename = "etafat_rapport_gnss.pdf",
): Promise<void> {
  const res = await fetch(`${API_URL}/pipeline/report.pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result, project_name: projectName }),
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  const blob = await res.blob()
  // Trigger the browser's native download
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ───────────────── CSV parsing helpers ───────────────────────────────────

/**
 * Parse a baseline CSV pasted by the user. One baseline per line:
 *
 *     id, start, end, dx, dy, dz[, sdx, sdy, sdz]
 *
 * Comments (# …) and blank lines are ignored. Returns parse errors alongside
 * the valid rows so the UI can show both.
 */
export function parseBaselinesCSV(text: string): {
  baselines: BaselineIn[]
  errors: { line: number; msg: string }[]
} {
  const out: BaselineIn[] = []
  const errors: { line: number; msg: string }[] = []
  const lines = text.split(/\r?\n/)
  lines.forEach((raw, i) => {
    const line = raw.split("#")[0].trim()
    if (!line) return
    const parts = line.split(/[,;\s]+/).filter(Boolean)
    if (parts.length < 6) {
      errors.push({ line: i + 1, msg: `ligne ignorée — ${parts.length} colonnes (6+ attendues)` })
      return
    }
    const nums = parts.slice(3).map(Number)
    if (nums.some(n => Number.isNaN(n))) {
      errors.push({ line: i + 1, msg: `valeurs numériques invalides` })
      return
    }
    out.push({
      id:    parts[0],
      start: parts[1],
      end:   parts[2],
      dx: nums[0], dy: nums[1], dz: nums[2],
      sdx: nums[3] ?? 0.005,
      sdy: nums[4] ?? 0.005,
      sdz: nums[5] ?? 0.005,
    })
  })
  return { baselines: out, errors }
}

/**
 * Collect the unique station names referenced by the baselines, preserving
 * order of first appearance. Used to auto-seed the stations array.
 */
export function stationsFromBaselines(baselines: BaselineIn[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const b of baselines) {
    for (const n of [b.start, b.end]) {
      if (!seen.has(n)) { seen.add(n); order.push(n) }
    }
  }
  return order
}

/** Reference dataset from the CHC Geomatics Office 2 report (2025-12-24). */
export const REFERENCE_DATASET = {
  lat_deg: 8.12,
  lon_deg: -7.93,
  control: {
    name: "Bou3",
    x: 6255021.8961, y: -873184.3240, z: 891145.0737,
  },
  csv: `# CHC project 2025-12-24  —  Bou3/Tia2 bases + mobile 4813379 visiting 13 points
# columns: id, start, end, dx, dy, dz, sdx, sdy, sdz    (all metres)
B01, Bou3, Tia2, -97.5765,   6939.8432,  7715.4264, 0.0035, 0.0018, 0.0019
B02, Bou3, P1,    415.8936,  7058.6103,  3879.5691, 0.0139, 0.0166, 0.0083
B03, Tia2, P1,    513.5156,  118.7916,  -3835.8418, 0.0139, 0.0166, 0.0081
B04, Bou3, P2,    396.3308,  6966.1949,  3929.6602, 0.0139, 0.0164, 0.0084
B05, Tia2, P2,    493.9283,  26.3898,   -3785.7512, 0.0139, 0.0164, 0.0082
B06, Bou3, P3,    383.7472,  6918.8137,  3977.4189, 0.0138, 0.0163, 0.0085
B07, Tia2, P3,    481.3448, -20.9900,   -3737.9973, 0.0138, 0.0163, 0.0083
B08, Bou3, P4,    362.0236,  6867.7558,  4085.4766, 0.0138, 0.0162, 0.0088
B09, Tia2, P4,    459.6426, -72.0549,   -3629.9562, 0.0138, 0.0162, 0.0086
B10, Bou3, P5,    331.1259,  6782.4651,  4222.4889, 0.0137, 0.0161, 0.0091
B11, Tia2, P5,    428.7426, -157.3481,  -3492.9196, 0.0137, 0.0160, 0.0089
B12, Bou3, P6,    322.5194,  6732.7116,  4234.7803, 0.0137, 0.0160, 0.0091
B13, Tia2, P6,    420.1251, -207.0969,  -3480.6332, 0.0137, 0.0159, 0.0089
B14, Bou3, P7,    313.1234,  6661.3135,  4236.7520, 0.0137, 0.0158, 0.0091
B15, Tia2, P7,    410.7658, -278.5030,  -3478.6392, 0.0137, 0.0158, 0.0089
B16, Bou3, P8,    305.9980,  6561.6155,  4206.1996, 0.0137, 0.0156, 0.0090
B17, Tia2, P8,    403.6207, -378.1932,  -3509.2081, 0.0137, 0.0155, 0.0089
B19, Tia2, P9,    524.4061,  116.9165,  -3914.9832, 0.0196, 0.0186, 0.0083
B21, Tia2, P10,   545.8780,  104.9082,  -4087.7844, 0.0197, 0.0186, 0.0078
B23, Tia2, P11,   549.9915,  43.7557,   -4176.4396, 0.0197, 0.0184, 0.0076
B26, Bou3, P13,   437.2309,  6681.9462,  3421.2381, 0.0139, 0.0159, 0.0073
B27, Tia2, P13,   534.8449, -257.8481,  -4294.1791, 0.0139, 0.0158, 0.0070`,
}
