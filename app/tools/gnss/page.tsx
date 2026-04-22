"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  ChevronRight, FileArchive, FileText, MapPin, Globe2,
  PlayCircle, CheckCircle2, AlertTriangle, XCircle,
  Layers, Activity, Satellite, Radio, Anchor, Target,
  Loader2, Info, Trash2, FileDown,
  Clock, Signal, Cpu, Database, Wifi, WifiOff, Calculator, Wand2,
} from "lucide-react"
import {
  checkHealth, runPipeline, runPipelineFromRinex, downloadPdfReport,
  parseBaselinesCSV, stationsFromBaselines,
  REFERENCE_DATASET, API_URL,
  isRinexObs, isRinexNav,
  type PipelineOut, type BaselineIn, type PipelineFromRinexOut,
} from "./api"

/* ── Types ── */
type ParsedHCNFile = {
  name: string
  size: number
  markerName?: string
  receiverId?: string
  model?: string
  antHigh?: number
  interval?: number
  firstObs?: string
  date?: string
}

type BaseCoord = { name: string; north: string; east: string; elev: string }
type ParsedCRS = { ellipsoid: string; projection: string; datum: string; geoid: string }

/* ── HCN ASCII header parser ── */
function parseHCNHeader(text: string): Partial<ParsedHCNFile> {
  const r: Partial<ParsedHCNFile> = {}
  const lines = text.split("\n").slice(0, 30)
  for (const line of lines) {
    const [key, ...rest] = line.split(":")
    const val = rest.join(":").trim()
    if (key === "ReceiverID")       r.receiverId  = val
    if (key === "Date")             r.date        = val
    if (key === "Model")            r.model       = val
    if (key === "AntHigh")          r.antHigh     = parseFloat(val)
    if (key === "MARKER NAME")      r.markerName  = val
    if (key === "INTERVAL")         r.interval    = parseFloat(val)
    if (key === "TIME OF FIRST OBS") {
      const p = val.split("/")
      if (p.length >= 6)
        r.firstObs = `${p[0]}/${p[1]}/${p[2]}  ${p[3].padStart(2,"0")}:${p[4].padStart(2,"0")}:${Math.round(parseFloat(p[5]||"0")).toString().padStart(2,"0")}`
    }
  }
  return r
}

/* ── RINEX 2.x / 3.x observation header parser ──
   Fixed-column format: the value sits in cols 0-59, the record label in
   cols 60-79 of each line. We only need enough metadata to tell station
   groups apart in the upload UI (MARKER NAME, INTERVAL, first-obs time).
*/
function parseRinexHeader(text: string): Partial<ParsedHCNFile> {
  const r: Partial<ParsedHCNFile> = {}
  const lines = text.split("\n").slice(0, 200)   // headers end well before 200 lines
  for (const raw of lines) {
    if (raw.length < 60) continue
    const body  = raw.slice(0, 60)
    const label = raw.slice(60).trim()
    if (label === "MARKER NAME") {
      r.markerName = body.trim()
    } else if (label === "INTERVAL") {
      const n = parseFloat(body.trim())
      if (!Number.isNaN(n)) r.interval = n
    } else if (label === "TIME OF FIRST OBS") {
      // columns: YYYY mm dd hh MM SS.SSSS  (6-wide integers, then float seconds)
      const y = body.slice(0,6).trim()
      const m = body.slice(6,12).trim()
      const d = body.slice(12,18).trim()
      const H = body.slice(18,24).trim()
      const M = body.slice(24,30).trim()
      const S = body.slice(30,43).trim()
      if (y && m && d && H && M) {
        r.firstObs = `${y}/${m.padStart(2,"0")}/${d.padStart(2,"0")}  ${H.padStart(2,"0")}:${M.padStart(2,"0")}:${Math.round(parseFloat(S || "0")).toString().padStart(2,"0")}`
      }
    } else if (label === "END OF HEADER") {
      break
    }
  }
  return r
}

/* ── TXT coordinate parser  (Nom  Nord  Est  Elev) ── */
function parseCoordsTXT(text: string): BaseCoord[] {
  return text
    .trim()
    .split("\n")
    .filter(l => l.trim() && !/^Nom/i.test(l))
    .map(line => {
      const p = line.trim().split(/\s+/)
      if (p.length < 3) return null
      return { name: p[0], north: p[1] ?? "", east: p[2] ?? "", elev: p[3] ?? "" }
    })
    .filter(Boolean) as BaseCoord[]
}

/* ── CRS file parser ── */
function parseCRS(text: string): ParsedCRS | null {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return null
  const grab = (l: string, prefix: string) =>
    l.replace(new RegExp(`^${prefix}\\s*`, "i"), "").trim()
  return {
    ellipsoid:  grab(lines[0] ?? "", "Ellipsoide"),
    projection: grab(lines[1] ?? "", "Projection"),
    datum:      grab(lines[2] ?? "", "Datum Transform"),
    geoid:      grab(lines[3] ?? "", "Geoid Model"),
  }
}

/* ── Read File as UTF-8 text ── */
function readAsText(file: File): Promise<string> {
  return new Promise(resolve => {
    const r = new FileReader()
    r.onload  = e => resolve((e.target?.result as string) ?? "")
    r.onerror = () => resolve("")
    r.readAsText(file, "utf-8")
  })
}

/* ── Recursively collect Files from a DataTransfer drop event ────────────────
   Works when the user drops individual files (flat) OR an entire folder
   (we walk subfolders via webkitGetAsEntry + FileSystemDirectoryReader).
   Browser coverage: Chrome, Safari, Firefox, Edge — all support the entry
   API on drop events. We fall back to the flat `dataTransfer.files` when
   the entry API isn't available (rare).
*/
async function readAllEntries(dirEntry: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = []
  const reader = dirEntry.createReader()
  // readEntries is paginated (typically 100/batch). Loop until we get an
  // empty batch — otherwise very deep folders silently truncate at 100 files.
  while (true) {
    const batch: FileSystemEntry[] = await new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })
    if (batch.length === 0) break
    for (const entry of batch) {
      if (entry.isFile) {
        const file: File = await new Promise((resolve, reject) =>
          (entry as FileSystemFileEntry).file(resolve, reject)
        )
        files.push(file)
      } else if (entry.isDirectory) {
        const sub = await readAllEntries(entry as FileSystemDirectoryEntry)
        files.push(...sub)
      }
    }
  }
  return files
}

async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const out: File[] = []
  const items = dt.items
  // Entry API path — supports folder traversal
  if (items && items.length && typeof (items[0] as unknown as {
    webkitGetAsEntry?: () => FileSystemEntry | null
  }).webkitGetAsEntry === "function") {
    const promises: Promise<void>[] = []
    for (let i = 0; i < items.length; i++) {
      const entry = (items[i] as unknown as {
        webkitGetAsEntry(): FileSystemEntry | null
      }).webkitGetAsEntry()
      if (!entry) {
        const f = items[i].getAsFile()
        if (f) out.push(f)
        continue
      }
      if (entry.isFile) {
        promises.push(new Promise<void>((resolve) => {
          (entry as FileSystemFileEntry).file((file) => {
            out.push(file); resolve()
          })
        }))
      } else if (entry.isDirectory) {
        promises.push((async () => {
          const sub = await readAllEntries(entry as FileSystemDirectoryEntry)
          out.push(...sub)
        })())
      }
    }
    await Promise.all(promises)
    return out
  }
  // Fallback: flat FileList
  return Array.from(dt.files)
}

/* ── UI primitives ── */
const Card = ({ children, style, padding = 24 }: { children: React.ReactNode; style?: React.CSSProperties; padding?: number }) => (
  <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8edf3", padding, ...style }}>{children}</div>
)

const SectionTitle = ({ step, title, sub, done }: { step: number; title: string; sub?: string; done?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      background: done ? "#10b981" : "#007BFF14", color: done ? "#fff" : "#007BFF",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0,
    }}>
      {done ? <CheckCircle2 size={15} /> : step}
    </div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
)

const PROJECTIONS = [
  { code: "Merchich / Nord Maroc",   epsg: "26191" },
  { code: "Merchich / Sud Maroc",    epsg: "26192" },
  { code: "Merchich / Sahara Nord",  epsg: "26193" },
  { code: "Merchich / Sahara Sud",   epsg: "26194" },
  { code: "WGS 84 / UTM zone 29N",   epsg: "32629" },
  { code: "WGS 84 / UTM zone 30N",   epsg: "32630" },
  { code: "RGM 2020 / Zone 1",       epsg: "10301" },
  { code: "ETRS89",                  epsg: "4258"  },
  { code: "Locale / CRS personnalisé", epsg: "custom" },
]

/* ══════════════════════════════════════════════════════ */
export default function GnssPage() {
  const obsRef   = useRef<HTMLInputElement>(null)
  const baseRef  = useRef<HTMLInputElement>(null)
  const crsRef   = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  const [obsFiles,   setObsFiles]   = useState<ParsedHCNFile[]>([])
  const [obsFilesRaw, setObsFilesRaw] = useState<File[]>([])    // original Files so we can upload
  const [baseFiles,  setBaseFiles]  = useState<{ name: string; size: number }[]>([])
  const [projection, setProjection] = useState("")
  const [crsInfo,    setCrsInfo]    = useState<ParsedCRS | null>(null)
  const [crsRawText, setCrsRawText] = useState<string>("")
  const [basesCoordsRawText, setBasesCoordsRawText] = useState<string>("")
  const [baseCoords, setBaseCoords] = useState<BaseCoord[]>([
    { name: "BASE_01", north: "", east: "", elev: "" },
  ])

  const [processing, setProcessing] = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [uploadPct,  setUploadPct]  = useState(0)
  const [done,       setDone]       = useState(false)
  const [activeTab,  setActiveTab]  = useState<"baselines" | "loops" | "free" | "constrained">("baselines")

  /* ── Backend integration state ── */
  const [apiHealth, setApiHealth] = useState<"checking" | "online" | "offline">("checking")
  const [baselinesCSV, setBaselinesCSV] = useState<string>("")
  const [csvErrors, setCsvErrors] = useState<{ line: number; msg: string }[]>([])
  const [apiResult, setApiResult] = useState<PipelineOut | PipelineFromRinexOut | null>(null)
  const [apiError,  setApiError]  = useState<string | null>(null)
  const [pdfDownloading, setPdfDownloading] = useState<boolean>(false)
  const [projectLabel,  setProjectLabel]   = useState<string>("")

  /* Ping the backend on mount (and when API URL changes) */
  useEffect(() => {
    const ctrl = new AbortController()
    setApiHealth("checking")
    checkHealth(ctrl.signal)
      .then(() => setApiHealth("online"))
      .catch(() => setApiHealth("offline"))
    return () => ctrl.abort()
  }, [])

  /* Parsed baseline vectors — derived, not stored, to avoid state drift */
  const parsedCSV = baselinesCSV.trim()
    ? parseBaselinesCSV(baselinesCSV)
    : { baselines: [] as BaselineIn[], errors: [] as { line: number; msg: string }[] }
  const parsedVectors = parsedCSV.baselines

  /* ── Handle observation files (HCN or RINEX).
         Accepts:
           • FileList            (flat <input> selection or single-file drop)
           • File[]              (already-walked tree from filesFromDrop())
         When a folder is dropped we get hundreds of files — .DS_Store,
         images, PDFs, etc. Filter to GNSS-relevant extensions so the user
         doesn't have to curate. HCN stays allowed because ETAFAT receivers
         emit them as an alternative to RINEX.
  */
  const handleObsFiles = useCallback(async (list: FileList | File[] | null) => {
    if (!list) return
    const all: File[] = Array.isArray(list) ? list : Array.from(list)
    const newRaw: File[] = all.filter(f => {
      const lower = f.name.toLowerCase()
      return isRinexObs(f.name) || isRinexNav(f.name) ||
             lower.endsWith(".hcn")
    })
    const parsed: ParsedHCNFile[] = []
    for (const file of newRaw) {
      const lower = file.name.toLowerCase()
      if (lower.endsWith(".hcn")) {
        const text = await readAsText(file)
        parsed.push({ name: file.name, size: file.size, ...parseHCNHeader(text) })
      } else if (isRinexObs(file.name)) {
        // Read only the first 16 KB — RINEX headers always end within that.
        const text = await readAsText(file.slice(0, 16 * 1024) as File)
        parsed.push({ name: file.name, size: file.size, ...parseRinexHeader(text) })
      } else {
        // NAV files or unknown — no client-side metadata to extract.
        parsed.push({ name: file.name, size: file.size })
      }
    }
    setObsFiles(prev    => [...prev, ...parsed])
    setObsFilesRaw(prev => [...prev, ...newRaw])
    // NB: auto-populate of Étape 2 happens in a useEffect below that
    // watches obsFiles. That way we work with the COMMITTED state, not
    // whatever the closure captured — which matters when folder drops
    // deliver 15+ files that go through multiple internal state commits.
  }, [])

  /* ── Auto-populate Étape 2 whenever the observation file list changes.
         Runs AFTER state commit so we always see the committed obsFiles,
         unlike the previous useCallback closure that captured stale state
         on large folder drops. Heuristic: markers seen in exactly one
         OBS file → likely static base. Markers seen in 2+ files → likely
         roving rover, not added. User can still type bases manually.   */
  useEffect(() => {
    setBaseCoords(prev => {
      const isPlaceholderRow = (b: BaseCoord) =>
        b.name === "BASE_01" && !b.north && !b.east && !b.elev
      const counts = new Map<string, number>()
      const originalCase = new Map<string, string>()   // lower → as-typed
      for (const f of obsFiles) {
        const m = (f.markerName || "").trim()
        if (!m) continue
        const k = m.toLowerCase()
        counts.set(k, (counts.get(k) || 0) + 1)
        if (!originalCase.has(k)) originalCase.set(k, m)
      }
      const bases = Array.from(counts.entries())
        .filter(([, n]) => n === 1)
        .map(([k]) => originalCase.get(k)!)
      const start = (prev.length === 1 && isPlaceholderRow(prev[0])) ? [] : prev
      const existingLower = new Set(start.map(b => b.name.trim().toLowerCase()))
      const next = [...start]
      for (const name of bases) {
        if (!existingLower.has(name.toLowerCase())) {
          next.push({ name, north: "", east: "", elev: "" })
          existingLower.add(name.toLowerCase())
        }
      }
      // Auto-demote rows whose marker now appears in 2+ files (rover).
      // Preserve rows the user manually edited coords on.
      const filtered = next.filter(b => {
        const k = b.name.trim().toLowerCase()
        const count = counts.get(k) || 0
        const hasCoords = Boolean(b.north || b.east || b.elev)
        if (count >= 2 && !hasCoords) return false
        return true
      })
      // Avoid pointless state churn if nothing changed
      if (filtered.length === prev.length &&
          filtered.every((b, i) => b.name === prev[i]?.name &&
                                   b.north === prev[i]?.north &&
                                   b.east  === prev[i]?.east  &&
                                   b.elev  === prev[i]?.elev)) {
        return prev
      }
      return filtered
    })
  }, [obsFiles])

  /* ── Handle base coordinate TXT files ── */
  const handleBaseFiles = useCallback(async (list: FileList | File[] | null) => {
    if (!list) return
    const infos: { name: string; size: number }[] = []
    const allCoords: BaseCoord[] = []
    const all: File[] = Array.isArray(list) ? list : Array.from(list)
    // Only .txt / .csv / .xyz are valid coord files — skip anything else the
    // user may have dropped (e.g. a whole project folder).
    const filtered = all.filter(f => /\.(txt|csv|xyz)$/i.test(f.name))
    for (const file of filtered) {
      infos.push({ name: file.name, size: file.size })
      const text = await readAsText(file)
      const coords = parseCoordsTXT(text)
      allCoords.push(...coords)
    }
    setBaseFiles(prev => [...prev, ...infos])
    if (allCoords.length > 0) setBaseCoords(allCoords)
    // The backend re-parses the raw TXT to build precise control-point
    // ECEF via pyproj — re-read the filtered files and concat.
    const texts: string[] = []
    for (const file of filtered) {
      const t = await readAsText(file)
      texts.push(t)
    }
    if (texts.length) setBasesCoordsRawText(texts.join("\n"))
  }, [])

  /* ── Handle CRS / projection file ── */
  const handleCRSFile = useCallback(async (list: FileList | null) => {
    if (!list || list.length === 0) return
    const file = list[0]
    const text = await readAsText(file)
    setCrsRawText(text)   // raw content → backend uses pyproj to convert
    const crs = parseCRS(text)
    setCrsInfo(crs)
    setProjection("custom")
  }, [])

  const removeObs  = (i: number) => {
    setObsFiles(prev   => prev.filter((_, idx) => idx !== i))
    setObsFilesRaw(prev => prev.filter((_, idx) => idx !== i))
  }
  const removeBase = (i: number) => setBaseFiles(prev => prev.filter((_, idx) => idx !== i))

  const addBase    = () => setBaseCoords(prev => [...prev, { name: `BASE_${String(prev.length + 1).padStart(2,"0")}`, north: "", east: "", elev: "" }])
  const removeBaseCoord = (i: number) => setBaseCoords(prev => prev.filter((_, idx) => idx !== i))
  const updateBase = (i: number, field: keyof BaseCoord, v: string) => {
    setBaseCoords(prev => { const a = [...prev]; a[i] = { ...a[i], [field]: v }; return a })
  }

  /* Three possible pipelines, picked in order of priority:
     1. RINEX upload   → /pipeline/from-rinex (we compute baselines)
     2. Pasted vectors → /pipeline/from-vectors
     3. Demo mode      → hardcoded reference data
  */
  const rinexObsFiles = obsFilesRaw.filter(f => isRinexObs(f.name))
  const rinexNavFiles = obsFilesRaw.filter(f => isRinexNav(f.name))
  const hasRinex      = rinexObsFiles.length >= 2 && rinexNavFiles.length >= 1
  const useRinexEngine  = hasRinex && apiHealth === "online"
  const useVectorEngine = !hasRinex && parsedVectors.length > 0 && apiHealth === "online"
  const useRealEngine   = useRinexEngine || useVectorEngine
  const canRun = useRinexEngine
    ? true
    : useVectorEngine
    ? true
    : (obsFiles.length > 0 && projection !== "" && baseCoords.some(b => b.north && b.east))

  const run = async () => {
    setProcessing(true); setProgress(0); setUploadPct(0); setDone(false)
    setApiError(null); setApiResult(null)

    if (useRinexEngine) {
      /* ── RINEX upload pipeline ── */
      try {
        // Derive base marker names from Étape 2. Grid coords are OPTIONAL —
        // when they're absent, the backend seeds the base from the RINEX
        // APPROX POSITION XYZ header (~3 m accurate, fine for relative
        // baselines). All we require is the name, so the pipeline knows
        // which uploaded OBS file is the base vs. rover.
        const baseNames = baseCoords
          .map(b => (b.name || "").trim())
          .filter(Boolean)
        if (baseNames.length === 0) {
          setProcessing(false)
          setApiError("Déclarez au moins un nom de base (Étape 2) pour que le moteur sache quels fichiers RINEX sont des bases")
          return
        }
        // Pass the grid coords through as control stations when the user has entered them.
        // The API expects ECEF — but grid-to-ECEF is hard without projection lib on the
        // client, so we mark them as "is_control=false" for now; free adjustment only.
        const result = await runPipelineFromRinex(
          {
            files: [...rinexObsFiles, ...rinexNavFiles],
            base_marker_names: baseNames,
            control_stations: [],   // backend converts from base_coords_txt
            projection_hint: { lat_deg: REFERENCE_DATASET.lat_deg, lon_deg: REFERENCE_DATASET.lon_deg },
            base_coords_txt: basesCoordsRawText || undefined,
            crs_def_txt:     crsRawText         || undefined,
          },
          {
            onProgress: pct => {
              setUploadPct(pct)
              // Upload phase = 0-55% of the overall progress bar
              setProgress(Math.round(pct * 0.55))
            },
          }
        )
        setProgress(100)
        setApiResult(result)
        setTimeout(() => { setProcessing(false); setDone(true) }, 250)
      } catch (err) {
        setProcessing(false)
        setApiError(err instanceof Error ? err.message : String(err))
      }
      return
    }

    if (useVectorEngine) {
      /* ── Pre-computed vectors pipeline ── */
      try {
        const fake = setInterval(() => setProgress(p => Math.min(p + 4, 92)), 150)
        const stations = stationsFromBaselines(parsedVectors).map(name => {
          if (name === REFERENCE_DATASET.control.name) {
            return { name, x: REFERENCE_DATASET.control.x, y: REFERENCE_DATASET.control.y,
                     z: REFERENCE_DATASET.control.z, is_control: true }
          }
          return { name }
        })
        const result = await runPipeline({
          baselines: parsedVectors,
          stations,
          projection_hint: { lat_deg: REFERENCE_DATASET.lat_deg, lon_deg: REFERENCE_DATASET.lon_deg },
        })
        clearInterval(fake)
        setProgress(100)
        setApiResult(result)
        setTimeout(() => { setProcessing(false); setDone(true) }, 250)
      } catch (err) {
        setProcessing(false)
        setApiError(err instanceof Error ? err.message : String(err))
      }
      return
    }

    /* ── DEMO MODE ── */
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(t); setProcessing(false); setDone(true); return 100 }
        return p + 2
      })
    }, 120)
  }

  const reset = () => {
    setObsFiles([]); setObsFilesRaw([])
    setBaseFiles([]); setProjection(""); setCrsInfo(null)
    setBaseCoords([{ name: "BASE_01", north: "", east: "", elev: "" }])
    setBaselinesCSV(""); setCsvErrors([]); setApiResult(null); setApiError(null)
    setProgress(0); setUploadPct(0); setDone(false)
  }

  const loadReferenceDataset = () => {
    setBaselinesCSV(REFERENCE_DATASET.csv)
    setCsvErrors([])
  }

  const step1Done = obsFiles.length > 0
  const step2Done = baseFiles.length > 0 || baseCoords.some(b => b.north && b.east)
  const step3Done = !!projection

  /* Station names for result tables */
  const stationNames = obsFiles.map(f => f.markerName || f.name.replace(/\.HCN$/i, ""))

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b", marginBottom: 16 }}>
        <span>Outils</span>
        <ChevronRight size={11} />
        <span style={{ color: "#0f172a", fontWeight: 600 }}>Traitement GNSS</span>
      </div>

      {/* Header */}
      <div className="gnss-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#007BFF14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Satellite size={22} color="#007BFF" strokeWidth={1.75} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: -0.4 }}>Traitement GNSS</h1>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Calcul automatique · Lignes de base · Fermeture des boucles · Ajustements</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ApiBadge health={apiHealth} />
          {done && (
            <button onClick={reset}
              style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b", border: "1px solid #e2e8f0", padding: "9px 16px", borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", gap: 7 }}>
              <Trash2 size={13} /> Nouveau calcul
            </button>
          )}
        </div>
      </div>

      {/* ── RESULTS VIEW ── */}
      {done && (
        <>
          <Card style={{ marginBottom: 20, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", color: "#fff" }}>
            <div className="gnss-success" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle2 size={28} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 3, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  Calcul terminé avec succès
                  {apiResult && (
                    <span style={{ fontSize: 10, fontWeight: 800, background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: 5, letterSpacing: 0.4 }}>
                      <Calculator size={9} style={{ display: "inline", marginRight: 4 }} />MOTEUR RÉEL
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  {apiResult
                    ? `${apiResult.n_baselines} lignes de base · ${apiResult.loops.length} boucles · σ₀ ajust. libre = ${apiResult.free.sigma0.toFixed(3)} · précision H/V = ${apiResult.free.horiz_accuracy_mm.toFixed(1)}/${apiResult.free.vert_accuracy_mm.toFixed(1)} mm (2σ)`
                    : `${obsFiles.length} fichier${obsFiles.length > 1 ? "s" : ""} · ${baseCoords.filter(b => b.north && b.east).length} base${baseCoords.filter(b=>b.north&&b.east).length > 1 ? "s" : ""} · Tolérances respectées`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  value={projectLabel}
                  onChange={e => setProjectLabel(e.target.value)}
                  placeholder="Nom du projet (optionnel)"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                    padding: "8px 12px",
                    borderRadius: 7,
                    fontSize: 12.5,
                    outline: "none",
                    width: 200,
                  }}
                />
                <button
                  onClick={async () => {
                    if (!apiResult) return
                    try {
                      setPdfDownloading(true)
                      await downloadPdfReport(
                        apiResult,
                        projectLabel || "Projet GNSS",
                        `etafat_rapport_${new Date().toISOString().slice(0, 10)}.pdf`,
                      )
                    } catch (e) {
                      setApiError(e instanceof Error ? e.message : String(e))
                    } finally {
                      setPdfDownloading(false)
                    }
                  }}
                  disabled={!apiResult || pdfDownloading}
                  style={{
                    background: apiResult ? "#fff" : "rgba(255,255,255,0.3)",
                    color: apiResult ? "#10b981" : "rgba(255,255,255,0.7)",
                    padding: "9px 16px", borderRadius: 8,
                    fontSize: 12.5, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 7,
                    cursor: apiResult && !pdfDownloading ? "pointer" : "not-allowed",
                    opacity: pdfDownloading ? 0.7 : 1,
                    transition: "all 0.2s ease",
                  }}>
                  {pdfDownloading
                    ? <><Loader2 size={14} style={{ animation: "gnssSpin 1s linear infinite" }} /> Génération…</>
                    : <><FileDown size={14} /> Télécharger rapport PDF</>}
                </button>
              </div>
            </div>
          </Card>

          <Card padding={0} style={{ overflow: "hidden" }}>
            <div className="gnss-tabs" style={{ display: "flex", borderBottom: "1px solid #e8edf3", padding: "0 6px", overflowX: "auto" }}>
              {([
                { id: "baselines",   label: "Lignes de base",     Icon: Activity, count: apiResult?.n_baselines ?? 22 },
                { id: "loops",       label: "Fermeture boucles",  Icon: Radio,    count: apiResult?.loops.length ?? 9 },
                { id: "free",        label: "Ajustement libre",   Icon: Target,   count: apiResult?.free.points.length ?? 14 },
                { id: "constrained", label: "Ajust. contraint",   Icon: Anchor,   count: apiResult?.constrained?.points.length ?? 14 },
              ] as const).map(t => (
                <button key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: "16px 18px", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                    borderBottom: `2px solid ${activeTab === t.id ? "#007BFF" : "transparent"}`,
                    color: activeTab === t.id ? "#007BFF" : "#64748b",
                    fontSize: 13, fontWeight: 600, transition: "all 0.2s ease",
                  }}>
                  <t.Icon size={14} strokeWidth={2} />
                  {t.label}
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: activeTab === t.id ? "#007BFF14" : "#f1f5f9",
                    color: activeTab === t.id ? "#007BFF" : "#64748b",
                    padding: "2px 7px", borderRadius: 10,
                  }}>{Math.round(t.count)}</span>
                </button>
              ))}
            </div>
            <div style={{ padding: 24 }}>
              {activeTab === "baselines"   && <BaselinesTable apiResult={apiResult} inputVectors={parsedVectors} stations={stationNames} bases={baseCoords.filter(b=>b.north&&b.east)} />}
              {activeTab === "loops"       && <LoopsTable     apiResult={apiResult} stations={stationNames} bases={baseCoords.filter(b=>b.north&&b.east)} />}
              {activeTab === "free"        && <AdjustmentTable type="free"        apiResult={apiResult} stations={stationNames} bases={baseCoords.filter(b=>b.north&&b.east)} />}
              {activeTab === "constrained" && <AdjustmentTable type="constrained" apiResult={apiResult} stations={stationNames} bases={baseCoords.filter(b=>b.north&&b.east)} />}
            </div>
          </Card>
        </>
      )}

      {/* ── FORM VIEW ── */}
      {!done && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }} className="gnss-split">

          {/* LEFT — steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Step 1 — Raw obs */}
            <Card>
              <SectionTitle
                step={1}
                title="Données brutes d'observation"
                sub={hasRinex
                  ? `RINEX détecté : ${rinexObsFiles.length} obs + ${rinexNavFiles.length} nav — le moteur calculera les baselines automatiquement`
                  : "Fichiers HCN (lecture des en-têtes) ou RINEX (calcul complet via backend)"}
                done={step1Done}
              />
              <input ref={obsRef} type="file" multiple
                accept=".hcn,.HCN,.rinex,.obs,.nav,.rnx,.22o,.22n,.22p,.22g,.22l,.22c,.23o,.23n,.23p,.23g,.23l,.23c,.24o,.24n,.24p,.24g,.24l,.24c,.25o,.25n,.25p,.25g,.25l,.25c,.26o,.26n,.26p,.26g,.26l,.26c"
                style={{ display: "none" }}
                onChange={e => handleObsFiles(e.target.files)} />
              <DropZone
                onClick={() => obsRef.current?.click()}
                onDrop={files => handleObsFiles(files)}
                onFolderPick={files => handleObsFiles(files)}
                icon={FileArchive}
                title={hasRinex ? "Ajouter d'autres fichiers RINEX" : "Glissez vos fichiers HCN / RINEX ou un dossier entier"}
                sub={hasRinex
                  ? "Le backend va lancer rnx2rtkp pour chaque paire (base, mobile)"
                  : "formats: .hcn · .26o/.26n/.26p (RINEX 2) · .obs/.nav/.rnx (RINEX 3). Dossier avec sous-dossiers supporté."}
              />
              {obsFiles.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  {obsFiles.map((f, i) => {
                    // Classify via declared bases (Étape 2). Fallback to the
                    // legacy HCN-receiverId heuristic when neither is known.
                    const declaredBases = new Set(
                      baseCoords.map(b => b.name.trim().toLowerCase()).filter(Boolean)
                    )
                    const marker = (f.markerName || "").trim().toLowerCase()
                    let isBase: boolean
                    if (marker && declaredBases.size) {
                      isBase = declaredBases.has(marker)
                    } else {
                      isBase = !f.receiverId?.startsWith("4813")
                    }
                    return (
                      <HCNFileCard key={i} file={f} isBase={isBase} onRemove={() => removeObs(i)} />
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Step 2 — Coords */}
            <Card>
              <SectionTitle step={2} title="Coordonnées des bases" sub="Fichier TXT — colonnes : Nom  Nord  Est  Élévation" done={step2Done} />
              <input ref={baseRef} type="file" multiple accept=".txt,.csv,.asc" style={{ display: "none" }}
                onChange={e => handleBaseFiles(e.target.files)} />
              <DropZone
                onClick={() => baseRef.current?.click()}
                onDrop={files => handleBaseFiles(files)}
                icon={FileText}
                title="Glissez votre fichier de coordonnées"
                sub="ou cliquez pour parcourir · format: Nom  Nord(N)  Est(E)  Élév"
              />
              {baseFiles.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {baseFiles.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#f0fdf4", borderRadius: 7, border: "1px solid #bbf7d0" }}>
                      <FileText size={13} color="#10b981" />
                      <span style={{ flex: 1, fontSize: 12, color: "#0f172a", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                      <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>
                        {baseCoords.filter(b => b.north && b.east).length} point{baseCoords.filter(b=>b.north&&b.east).length > 1 ? "s" : ""} détecté{baseCoords.filter(b=>b.north&&b.east).length > 1 ? "s" : ""}
                      </span>
                      <button onClick={() => removeBase(i)} style={{ color: "#94a3b8", padding: 3 }}><XCircle size={13} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Base coord table */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Coordonnées des bases <span style={{ color: "#94a3b8", fontWeight: 400 }}>(saisie manuelle ou auto-rempli)</span></label>
                  <button onClick={addBase} style={{ fontSize: 11.5, fontWeight: 600, color: "#007BFF" }}>+ Ajouter</button>
                </div>
                <div className="gnss-coords" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="gnss-coords-head" style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr 80px auto", gap: 6 }}>
                    {["Nom", "Nord (N)", "Est (E)", "Élév.", ""].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, paddingLeft: 2 }}>{h}</div>
                    ))}
                  </div>
                  {baseCoords.map((b, i) => (
                    <div key={i} className="gnss-coords-row" style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr 80px auto", gap: 6, alignItems: "center" }}>
                      <input value={b.name}  onChange={e => updateBase(i, "name",  e.target.value)} placeholder="BASE_01"    style={inputStyle} />
                      <input value={b.north} onChange={e => updateBase(i, "north", e.target.value)} placeholder="902235.673" style={{ ...inputStyle, fontFamily: "ui-monospace" }} />
                      <input value={b.east}  onChange={e => updateBase(i, "east",  e.target.value)} placeholder="237230.320" style={{ ...inputStyle, fontFamily: "ui-monospace" }} />
                      <input value={b.elev}  onChange={e => updateBase(i, "elev",  e.target.value)} placeholder="521.969"    style={{ ...inputStyle, fontFamily: "ui-monospace" }} />
                      <button onClick={() => removeBaseCoord(i)}
                        style={{ color: "#ef4444", padding: 8 }} aria-label="Supprimer cette base">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo OCR hint */}
              <div style={{ marginTop: 14, padding: 12, background: "#f6f8fb", borderRadius: 9, display: "flex", alignItems: "center", gap: 12 }}>
                <Info size={13} color="#007BFF" />
                <div style={{ flex: 1, fontSize: 11.5, color: "#64748b" }}>
                  Notes manuscrites ? Importez une photo — l'app lira les valeurs automatiquement.
                </div>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} />
                <button onClick={() => photoRef.current?.click()}
                  style={{ fontSize: 11.5, fontWeight: 600, color: "#007BFF", border: "1px solid #007BFF40", padding: "6px 12px", borderRadius: 7, whiteSpace: "nowrap" }}>
                  Importer photo
                </button>
              </div>
            </Card>

            {/* Step 3 — Projection */}
            <Card>
              <SectionTitle step={3} title="Système de coordonnées" sub="Sélectionnez la projection ou importez un fichier .txt CRS" done={step3Done} />

              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                {/* Dropdown */}
                <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
                  <Globe2 size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <select value={projection} onChange={e => { setProjection(e.target.value); if (e.target.value !== "custom") setCrsInfo(null) }}
                    style={{
                      width: "100%", padding: "11px 12px 11px 36px",
                      border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a",
                      background: "#fff", appearance: "none",
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'><polyline points='6 9 12 15 18 9'/></svg>")`,
                      backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                    }}>
                    <option value="">Sélectionnez une projection…</option>
                    {PROJECTIONS.map(p => (
                      <option key={p.epsg} value={p.epsg}>{p.code}{p.epsg !== "custom" ? ` · EPSG:${p.epsg}` : ""}</option>
                    ))}
                  </select>
                </div>

                {/* CRS file import */}
                <input ref={crsRef} type="file" accept=".txt,.prj" style={{ display: "none" }}
                  onChange={e => handleCRSFile(e.target.files)} />
                <button onClick={() => crsRef.current?.click()}
                  style={{
                    fontSize: 12.5, fontWeight: 600, color: crsInfo ? "#10b981" : "#64748b",
                    border: `1px solid ${crsInfo ? "#bbf7d0" : "#e2e8f0"}`,
                    background: crsInfo ? "#f0fdf4" : "#fff",
                    padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
                  }}>
                  {crsInfo ? <CheckCircle2 size={13} color="#10b981" /> : <Database size={13} />}
                  {crsInfo ? "CRS chargé" : "Importer fichier CRS"}
                </button>
              </div>

              {/* CRS details panel */}
              {crsInfo && (
                <div style={{ padding: 14, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Paramètres CRS détectés</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Ellipsoïde",  value: crsInfo.ellipsoid  },
                      { label: "Projection",  value: crsInfo.projection  },
                      { label: "Datum",       value: crsInfo.datum       },
                      { label: "Géoïde",      value: crsInfo.geoid       },
                    ].map(row => (
                      <div key={row.label}>
                        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{row.label}</div>
                        <div style={{ fontSize: 11.5, color: "#0f172a", fontWeight: 500, marginTop: 2 }}>{row.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Step 4 — Baseline vectors (real engine input) */}
            <Card>
              <SectionTitle
                step={4}
                title="Vecteurs de lignes de base"
                sub="Collez les vecteurs ECEF calculés par CHC (ou votre logiciel de baseline). Sans vecteurs, le calcul utilise le jeu de démonstration."
                done={parsedVectors.length > 0}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <button onClick={loadReferenceDataset}
                  style={{
                    fontSize: 12, fontWeight: 600, color: "#8b5cf6",
                    border: "1px solid #8b5cf640", background: "#8b5cf610",
                    padding: "8px 14px", borderRadius: 7,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                  <Wand2 size={13} /> Charger le jeu de test (24/12/2025)
                </button>
                {parsedVectors.length > 0 && (
                  <span style={{
                    fontSize: 11.5, color: "#10b981", fontWeight: 600, background: "#10b98114",
                    padding: "5px 10px", borderRadius: 6,
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <CheckCircle2 size={11} /> {parsedVectors.length} vecteur{parsedVectors.length > 1 ? "s" : ""} détecté{parsedVectors.length > 1 ? "s" : ""}
                  </span>
                )}
                {parsedCSV.errors.length > 0 && (
                  <span style={{
                    fontSize: 11.5, color: "#f59e0b", fontWeight: 600, background: "#f59e0b14",
                    padding: "5px 10px", borderRadius: 6,
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <AlertTriangle size={11} /> {parsedCSV.errors.length} ligne{parsedCSV.errors.length > 1 ? "s" : ""} invalide{parsedCSV.errors.length > 1 ? "s" : ""}
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#94a3b8", fontFamily: "ui-monospace" }}>
                  format : <code>id, start, end, dx, dy, dz [, sdx, sdy, sdz]</code>
                </span>
              </div>

              <textarea
                value={baselinesCSV}
                onChange={e => { setBaselinesCSV(e.target.value); setCsvErrors([]) }}
                placeholder={`B01, Bou3, Tia2, -97.5765, 6939.8432, 7715.4264, 0.0035, 0.0018, 0.0019
B02, Bou3, P1,    415.8936,  7058.6103, 3879.5691, 0.0139, 0.0166, 0.0083
# une ligne par ligne de base — # pour commentaire`}
                rows={8}
                style={{
                  width: "100%", fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 11.5, lineHeight: 1.6,
                  padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8,
                  background: "#fafbfc", color: "#0f172a", outline: "none", resize: "vertical",
                }}
              />

              {apiHealth === "offline" && parsedVectors.length > 0 && (
                <div style={{ marginTop: 10, padding: 12, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <WifiOff size={14} color="#d97706" style={{ marginTop: 1, flexShrink: 0 }} />
                  <div style={{ fontSize: 11.5, color: "#92400e", lineHeight: 1.5 }}>
                    Le moteur de calcul n&apos;est pas accessible à <code style={{ fontFamily: "ui-monospace" }}>{API_URL}</code>.
                    Démarrez le backend&nbsp;: <code style={{ fontFamily: "ui-monospace", background: "#fff", padding: "1px 5px", borderRadius: 4 }}>cd backend && uvicorn app:app --port 8000</code>
                  </div>
                </div>
              )}
            </Card>

            {/* Run */}
            <Card style={{ background: processing ? "#f6f8fb" : "#fff" }}>
              {!processing ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginBottom: 3, display: "flex", alignItems: "center", gap: 8 }}>
                      {canRun ? "Prêt à lancer le calcul" : "Complétez les étapes ci-dessus"}
                      {useRinexEngine && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: "#10b98114", color: "#10b981", padding: "2px 8px", borderRadius: 5, letterSpacing: 0.4 }}>
                          RINEX · MOTEUR COMPLET
                        </span>
                      )}
                      {useVectorEngine && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: "#10b98114", color: "#10b981", padding: "2px 8px", borderRadius: 5, letterSpacing: 0.4 }}>
                          VECTEURS · AJUSTEMENT
                        </span>
                      )}
                      {!useRealEngine && canRun && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: "#8b5cf614", color: "#8b5cf6", padding: "2px 8px", borderRadius: 5, letterSpacing: 0.4 }}>
                          DÉMO
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {useRinexEngine
                        ? `Le backend va traiter ${rinexObsFiles.length} obs + ${rinexNavFiles.length} nav via rnx2rtkp, puis calculer loops + ajustement.`
                        : useVectorEngine
                        ? `Moindres carrés sur ${parsedVectors.length} lignes de base pré-calculées.`
                        : "Traitement automatique : lignes de base → fermeture → ajustements."}
                    </div>
                    {apiError && (
                      <div style={{ marginTop: 8, fontSize: 11.5, color: "#dc2626", fontFamily: "ui-monospace" }}>
                        {apiError}
                      </div>
                    )}
                  </div>
                  <button onClick={run} disabled={!canRun}
                    style={{
                      background: canRun ? "linear-gradient(135deg, #007BFF, #0057b8)" : "#e2e8f0",
                      color: canRun ? "#fff" : "#94a3b8",
                      padding: "13px 26px", borderRadius: 9, fontSize: 13.5, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 9,
                      cursor: canRun ? "pointer" : "not-allowed",
                      boxShadow: canRun ? "0 8px 24px rgba(0,123,255,0.28)" : "none",
                      transition: "all 0.25s ease",
                    }}>
                    <PlayCircle size={16} /> Lancer le calcul
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <Loader2 size={20} color="#007BFF" style={{ animation: "gnssSpin 1s linear infinite" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>Traitement en cours…</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {useRinexEngine
                          ? (uploadPct < 100
                              ? `Téléversement RINEX vers le backend… ${uploadPct}%`
                              : progress < 70 ? "Calcul des lignes de base via rnx2rtkp (peut prendre 1-2 min)…"
                              : progress < 92 ? "Fermeture des boucles…"
                              : "Ajustements…")
                          : (progress < 20 ? "Lecture des fichiers HCN…" :
                             progress < 42 ? "Calcul des lignes de base…" :
                             progress < 62 ? "Fermeture des boucles…" :
                             progress < 82 ? "Ajustement libre…" :
                             progress < 96 ? "Ajustement contraint…" : "Génération du rapport…")}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#007BFF" }}>{Math.round(progress)} %</div>
                  </div>
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 100, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #007BFF, #3b9bff)", transition: "width 0.2s ease", borderRadius: 100 }} />
                  </div>
                  <div style={{ display: "flex", marginTop: 14, gap: 4 }}>
                    {[20, 42, 62, 82, 96].map((threshold, idx) => (
                      <div key={idx} style={{
                        flex: 1, height: 3, borderRadius: 3,
                        background: progress >= threshold ? "#007BFF" : "#e2e8f0",
                        transition: "background 0.3s ease",
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT — summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Résumé du projet</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <SummaryRow label="Fichiers HCN"         value={obsFiles.length}  Icon={FileArchive} />
                <SummaryRow label="Stations détectées"   value={obsFiles.filter(f => f.markerName).length} Icon={Signal} />
                <SummaryRow label="Bases de référence"   value={baseCoords.filter(b => b.north && b.east).length} Icon={MapPin} />
                <SummaryRow label="Projection"           value={projection === "custom" ? "CRS local" : projection ? `EPSG:${projection}` : "—"} Icon={Globe2} />
                <SummaryRow label="Fichiers coords."     value={baseFiles.length} Icon={FileText} />
              </div>
            </Card>

            {/* Station details */}
            {obsFiles.some(f => f.markerName) && (
              <Card>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Stations identifiées</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {obsFiles.filter(f => f.markerName).map((f, i) => (
                    <div key={i} style={{ padding: "10px 12px", background: "#f6f8fb", borderRadius: 8, border: "1px solid #e8edf3" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <Satellite size={12} color="#007BFF" strokeWidth={2} />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>{f.markerName}</span>
                        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, background: "#007BFF14", color: "#007BFF", padding: "2px 7px", borderRadius: 5 }}>
                          {f.receiverId?.startsWith("4813") ? "MOBILE" : "BASE"}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        {[
                          { label: "Récepteur", value: f.model },
                          { label: "H. antenne", value: f.antHigh != null ? `${f.antHigh.toFixed(4)} m` : undefined },
                          { label: "Intervalle", value: f.interval != null ? `${f.interval} s` : undefined },
                          { label: "Début obs.", value: f.firstObs },
                        ].filter(r => r.value).map(r => (
                          <div key={r.label}>
                            <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{r.label}</div>
                            <div style={{ fontSize: 11, color: "#475569", fontWeight: 500, marginTop: 1 }}>{r.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card style={{ background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Layers size={15} color="#007BFF" />
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Pipeline automatisé</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Lecture HCN & extraction header",   Icon: FileArchive, done: step1Done },
                  { label: "Calcul des lignes de base",          Icon: Activity,    done: false },
                  { label: "Fermeture des boucles",              Icon: Radio,       done: false },
                  { label: "Ajustement libre",                   Icon: Target,      done: false },
                  { label: "Ajustement contraint",               Icon: Anchor,      done: false },
                  { label: "Génération du rapport PDF",          Icon: FileText,    done: false },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                    background: s.done ? "#f0fdf4" : "#fff",
                    borderRadius: 7, border: `1px solid ${s.done ? "#bbf7d0" : "#e8edf3"}`,
                  }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: s.done ? "#10b98114" : "#007BFF10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {s.done ? <CheckCircle2 size={11} color="#10b981" /> : <s.Icon size={11} color="#007BFF" />}
                    </div>
                    <span style={{ fontSize: 11.5, color: s.done ? "#10b981" : "#475569", fontWeight: 500 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        </div>
      )}

      <style>{`
        @keyframes gnssSpin { to { transform: rotate(360deg); } }
        @media (max-width: 1100px) { .gnss-split { grid-template-columns: 1fr !important; } }

        /* ── Mobile / narrow screens ────────────────────────────────── */
        @media (max-width: 640px) {
          /* Coord input rows: stack as labelled mini-form with Name+Trash on top row */
          .gnss-coords-head { display: none !important; }
          .gnss-coords-row {
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
            padding: 10px;
            border: 1px solid #e8edf3;
            border-radius: 8px;
            background: #fafbfc;
          }
          .gnss-coords-row > input:nth-child(1) { grid-column: 1 / -2; }  /* Nom full width */
          .gnss-coords-row > button { grid-column: -2 / -1; grid-row: 1; justify-self: end; }
          .gnss-coords-row > input:nth-child(2)::placeholder { content: "Nord"; }

          /* Tab counts shrink */
          .gnss-tabs button { padding: 14px 10px !important; font-size: 12px !important; }

          /* Result table cells: smaller padding and text */
          .gnss-result-table th,
          .gnss-result-table td { padding: 8px 10px !important; font-size: 11.5px !important; }
        }

        /* Fine-tune the page header + step buttons for small phones */
        @media (max-width: 480px) {
          .gnss-header h1 { font-size: 18px !important; }
          .gnss-header p  { font-size: 11.5px !important; }
        }
      `}</style>
    </div>
  )
}

/* ───── Sub-components ───── */
const inputStyle: React.CSSProperties = {
  padding: "9px 10px",
  border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12.5, color: "#0f172a",
  background: "#fff", outline: "none", width: "100%",
}

/* ── Backend health indicator ── */
function ApiBadge({ health }: { health: "checking" | "online" | "offline" }) {
  const spec = {
    checking: { color: "#94a3b8", bg: "#f1f5f9", label: "Connexion…",    Icon: Loader2,  spin: true  },
    online:   { color: "#10b981", bg: "#10b98114", label: "Moteur en ligne", Icon: Wifi,     spin: false },
    offline:  { color: "#d97706", bg: "#f59e0b14", label: "Mode démo",      Icon: WifiOff, spin: false },
  }[health]
  return (
    <div title={`Backend: ${API_URL}`} style={{
      display: "flex", alignItems: "center", gap: 7,
      fontSize: 11.5, fontWeight: 600, color: spec.color, background: spec.bg,
      padding: "6px 12px", borderRadius: 8, border: `1px solid ${spec.color}30`,
    }}>
      <spec.Icon size={12} style={spec.spin ? { animation: "gnssSpin 1s linear infinite" } : undefined} />
      {spec.label}
    </div>
  )
}

function DropZone({ onClick, onDrop, icon: Icon, title, sub, onFolderPick }: {
  onClick: () => void
  onDrop: (f: File[]) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  title: string
  sub: string
  /** Optional handler invoked when the user picks a folder via the
      native "Sélectionner un dossier" button. Called with the flat list
      of File objects found by walking the folder tree. */
  onFolderPick?: (f: File[]) => void
}) {
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const folderRef = useRef<HTMLInputElement>(null)
  return (
    <div
      onClick={onClick}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={async e => {
        e.preventDefault(); setOver(false)
        setBusy(true)
        try {
          const files = await filesFromDrop(e.dataTransfer)
          onDrop(files)
        } finally {
          setBusy(false)
        }
      }}
      style={{
        border: `2px dashed ${over ? "#007BFF" : "#cbd5e1"}`,
        background: over ? "#f0f7ff" : "#fafbfc",
        borderRadius: 10, padding: "28px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        cursor: "pointer", transition: "all 0.2s ease",
      }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: over ? "#007BFF" : "#fff", border: `1px solid ${over ? "transparent" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={19} color={over ? "#fff" : "#64748b"} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "#64748b" }}>{sub}</div>
        {busy && (
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4 }}>
            Lecture du dossier…
          </div>
        )}
      </div>
      {onFolderPick && (
        <>
          <input ref={folderRef} type="file"
                 /* webkitdirectory + directory tells Chrome/Safari/FF to
                    open a folder picker and include every descendant file. */
                 // @ts-expect-error — non-standard but widely supported
                 webkitdirectory=""
                 directory=""
                 multiple
                 style={{ display: "none" }}
                 onChange={e => {
                   const files = e.target.files
                   if (!files) return
                   onFolderPick(Array.from(files))
                   e.target.value = "" // allow re-picking the same folder
                 }} />
          <button
            onClick={e => { e.stopPropagation(); folderRef.current?.click() }}
            style={{
              marginTop: 4, padding: "6px 14px",
              background: over ? "#fff" : "#f1f5f9",
              border: "1px solid #e2e8f0", borderRadius: 7,
              fontSize: 11.5, fontWeight: 600, color: "#334155",
              cursor: "pointer",
            }}
          >
            Sélectionner un dossier…
          </button>
        </>
      )}
    </div>
  )
}

function HCNFileCard({ file, isBase: isBaseProp, onRemove }: {
  file: ParsedHCNFile; isBase?: boolean; onRemove: () => void
}) {
  // Prefer the caller-provided classification (derived from Étape 2's
  // declared base list). Fall back to the legacy HCN-receiverId heuristic
  // for older HCN uploads where markerName isn't matched against anything.
  const isBase   = isBaseProp ?? !file.receiverId?.startsWith("4813")
  const roleColor = isBase ? "#007BFF" : "#8b5cf6"
  const roleBg    = isBase ? "#007BFF14" : "#8b5cf614"

  return (
    <div style={{ padding: "12px 14px", background: "#f6f8fb", borderRadius: 8, border: "1px solid #e8edf3" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: file.markerName ? 8 : 0 }}>
        <FileArchive size={13} color={roleColor} />
        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.markerName || file.name}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, background: roleBg, color: roleColor, padding: "2px 7px", borderRadius: 5 }}>
          {isBase ? "BASE" : "MOBILE"}
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{(file.size / 1024).toFixed(0)} Ko</span>
        <button onClick={onRemove} style={{ color: "#94a3b8", padding: 3 }}><XCircle size={13} /></button>
      </div>
      {file.markerName && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { Icon: Cpu,   v: file.model       },
            { Icon: Signal,v: file.antHigh != null ? `Ant: ${file.antHigh}m` : undefined },
            { Icon: Clock, v: file.firstObs    },
          ].filter(r => r.v).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <r.Icon size={10} color="#94a3b8" />
              <span style={{ fontSize: 10.5, color: "#64748b" }}>{r.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryRow({ label, value, Icon }: { label: string; value: React.ReactNode; Icon: any }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: 6, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={12} color="#64748b" />
      </div>
      <span style={{ flex: 1, fontSize: 12, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{value}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Real result tables — data extracted from reference
   reports (CHC Geomatics Office 2, project 2025-12-24)
───────────────────────────────────────────────────── */

const BASELINES_DATA = [
  { id:"B01", from:"Bou3",  to:"Tia2",  dist:"10 377.8008", type:"Lc Fix", ratio:"1/8 119 450", rms:"0.0117", ok:true  },
  { id:"B02", from:"Bou3",  to:"Pt 1",  dist:"8 065.2342",  type:"Fix",    ratio:"1/433 404",   rms:"—",      ok:true  },
  { id:"B03", from:"Tia2",  to:"Pt 1",  dist:"3 871.8848",  type:"Fix",    ratio:"1/209 483",   rms:"—",      ok:true  },
  { id:"B04", from:"Bou3",  to:"Pt 2",  dist:"8 007.9447",  type:"Fix",    ratio:"1/433 030",   rms:"—",      ok:true  },
  { id:"B05", from:"Tia2",  to:"Pt 2",  dist:"3 817.9279",  type:"Fix",    ratio:"1/207 882",   rms:"—",      ok:true  },
  { id:"B06", from:"Bou3",  to:"Pt 3",  dist:"7 989.8126",  type:"Fix",    ratio:"1/432 910",   rms:"—",      ok:true  },
  { id:"B07", from:"Tia2",  to:"Pt 3",  dist:"3 768.9199",  type:"Fix",    ratio:"1/205 628",   rms:"—",      ok:true  },
  { id:"B08", from:"Bou3",  to:"Pt 4",  dist:"7 999.2656",  type:"Fix",    ratio:"1/432 962",   rms:"—",      ok:true  },
  { id:"B09", from:"Tia2",  to:"Pt 4",  dist:"3 659.6510",  type:"Fix",    ratio:"1/199 447",   rms:"—",      ok:true  },
  { id:"B10", from:"Bou3",  to:"Pt 5",  dist:"7 996.3047",  type:"Fix",    ratio:"1/432 954",   rms:"—",      ok:true  },
  { id:"B11", from:"Tia2",  to:"Pt 5",  dist:"3 522.6504",  type:"Fix",    ratio:"1/192 044",   rms:"—",      ok:true  },
  { id:"B12", from:"Bou3",  to:"Pt 6",  dist:"7 960.3260",  type:"Fix",    ratio:"1/432 742",   rms:"—",      ok:true  },
  { id:"B13", from:"Tia2",  to:"Pt 6",  dist:"3 512.0082",  type:"Fix",    ratio:"1/192 248",   rms:"—",      ok:true  },
  { id:"B14", from:"Bou3",  to:"Pt 7",  dist:"7 900.7096",  type:"Fix",    ratio:"1/432 390",   rms:"—",      ok:true  },
  { id:"B15", from:"Tia2",  to:"Pt 7",  dist:"3 513.8616",  type:"Fix",    ratio:"1/193 666",   rms:"—",      ok:true  },
  { id:"B16", from:"Bou3",  to:"Pt 8",  dist:"7 800.0352",  type:"Fix",    ratio:"1/431 786",   rms:"—",      ok:true  },
  { id:"B17", from:"Tia2",  to:"Pt 8",  dist:"3 552.5317",  type:"Fix",    ratio:"1/198 090",   rms:"—",      ok:true  },
  { id:"B19", from:"Tia2",  to:"Pt 9",  dist:"3 951.6787",  type:"Fix",    ratio:"1/139 681",   rms:"—",      ok:true  },
  { id:"B21", from:"Tia2",  to:"Pt 10", dist:"4 125.4054",  type:"Fix",    ratio:"1/146 381",   rms:"—",      ok:true  },
  { id:"B23", from:"Tia2",  to:"Pt 11", dist:"4 212.7251",  type:"Fix",    ratio:"1/150 323",   rms:"—",      ok:true  },
  { id:"B26", from:"Bou3",  to:"Pt 13", dist:"7 519.6041",  type:"Fix",    ratio:"1/336 836",   rms:"—",      ok:true  },
  { id:"B27", from:"Tia2",  to:"Pt 13", dist:"4 335.0339",  type:"Fix",    ratio:"1/195 160",   rms:"—",      ok:true  },
]

const LOOPS_DATA = [
  { id:"C1", pts:"Bou3 → Tia2 → Pt 1 → Bou3",  len:"22 314.9198", dh:"0.0320",  dv:"-0.0788", ppm:"2.418", ok:true  },
  { id:"C2", pts:"Bou3 → Tia2 → Pt 2 → Bou3",  len:"22 203.6734", dh:"0.0426",  dv:"-0.1048", ppm:"2.072", ok:true  },
  { id:"C3", pts:"Bou3 → Tia2 → Pt 3 → Bou3",  len:"22 136.5333", dh:"0.0428",  dv:"-0.1055", ppm:"2.074", ok:true  },
  { id:"C4", pts:"Bou3 → Tia2 → Pt 4 → Bou3",  len:"22 036.7174", dh:"0.0398",  dv:"-0.0855", ppm:"2.462", ok:true  },
  { id:"C5", pts:"Bou3 → Tia2 → Pt 5 → Bou3",  len:"21 896.7559", dh:"0.0375",  dv:"-0.0845", ppm:"2.431", ok:true  },
  { id:"C6", pts:"Bou3 → Tia2 → Pt 6 → Bou3",  len:"21 850.1350", dh:"0.0394",  dv:"-0.0966", ppm:"2.152", ok:true  },
  { id:"C7", pts:"Bou3 → Tia2 → Pt 7 → Bou3",  len:"21 792.3719", dh:"0.0442",  dv:"-0.0563", ppm:"3.641", ok:true  },
  { id:"C8", pts:"Bou3 → Tia2 → Pt 8 → Bou3",  len:"21 730.3676", dh:"0.0424",  dv:"-0.0791", ppm:"2.786", ok:true  },
  { id:"C9", pts:"Bou3 → Tia2 → Pt 13 → Bou3", len:"22 232.4388", dh:"0.0538",  dv:"-0.0908", ppm:"2.802", ok:true  },
]

const FREE_ADJ_DATA = [
  { name:"Bou3",  north:"894 488.9697", east:"230 321.4468", elev:"484.3327", sn:"0.0027", se:"0.0044", sh:"0.0043", isControl:false },
  { name:"Tia2",  north:"902 237.7068", east:"237 230.7129", elev:"532.3939", sn:"0.0021", se:"0.0042", sh:"0.0040", isControl:true  },
  { name:"Pt 1",  north:"898 368.3257", east:"237 396.0813", elev:"476.8239", sn:"0.0079", se:"0.0159", sh:"0.0132", isControl:false },
  { name:"Pt 2",  north:"898 419.4349", east:"237 302.1289", elev:"477.2488", sn:"0.0080", se:"0.0157", sh:"0.0132", isControl:false },
  { name:"Pt 3",  north:"898 467.8564", east:"237 253.7364", elev:"478.0879", sn:"0.0081", se:"0.0156", sh:"0.0132", isControl:false },
  { name:"Pt 4",  north:"898 577.2183", east:"237 200.7995", elev:"478.9924", sn:"0.0084", se:"0.0155", sh:"0.0132", isControl:false },
  { name:"Pt 5",  north:"898 716.1208", east:"237 112.8572", elev:"479.6368", sn:"0.0086", se:"0.0154", sh:"0.0131", isControl:false },
  { name:"Pt 6",  north:"898 728.8270", east:"237 062.4513", elev:"479.6841", sn:"0.0086", se:"0.0153", sh:"0.0131", isControl:false },
  { name:"Pt 7",  north:"898 731.1520", east:"236 990.4209", elev:"480.4672", sn:"0.0087", se:"0.0151", sh:"0.0131", isControl:false },
  { name:"Pt 8",  north:"898 700.5336", east:"236 890.4736", elev:"482.6918", sn:"0.0086", se:"0.0150", sh:"0.0131", isControl:false },
  { name:"Pt 9",  north:"898 288.3898", east:"237 395.2552", elev:"476.5988", sn:"0.0083", se:"0.0177", sh:"0.0184", isControl:false },
  { name:"Pt 10", north:"898 114.0749", east:"237 385.2772", elev:"474.8815", sn:"0.0079", se:"0.0177", sh:"0.0185", isControl:false },
  { name:"Pt 11", north:"898 024.8692", east:"237 324.7191", elev:"474.6992", sn:"0.0077", se:"0.0176", sh:"0.0185", isControl:false },
  { name:"Pt 13", north:"897 906.3139", east:"237 023.0623", elev:"484.1634", sn:"0.0070", se:"0.0152", sh:"0.0133", isControl:false },
]

const CONSTRAINED_ADJ_DATA = [
  { name:"Bou3",  north:"894 486.9230", east:"230 321.0437", elev:"473.9107", sn:"0.0019", se:"0.0019", sh:"0.0034", isControl:false },
  { name:"Tia2",  north:"902 235.6730", east:"237 230.3210", elev:"521.9690", sn:"0.0000", se:"0.0000", sh:"0.0000", isControl:true  },
  { name:"Pt 1",  north:"898 366.2855", east:"237 395.6897", elev:"466.4003", sn:"0.0083", se:"0.0165", sh:"0.0138", isControl:false },
  { name:"Pt 2",  north:"898 417.3948", east:"237 301.7372", elev:"466.8252", sn:"0.0084", se:"0.0164", sh:"0.0138", isControl:false },
  { name:"Pt 3",  north:"898 465.8164", east:"237 253.3446", elev:"467.6643", sn:"0.0085", se:"0.0163", sh:"0.0138", isControl:false },
  { name:"Pt 4",  north:"898 575.1785", east:"237 200.4076", elev:"468.5687", sn:"0.0087", se:"0.0162", sh:"0.0137", isControl:false },
  { name:"Pt 5",  north:"898 714.0813", east:"237 112.4651", elev:"469.2131", sn:"0.0090", se:"0.0160", sh:"0.0137", isControl:false },
  { name:"Pt 6",  north:"898 726.7874", east:"237 062.0592", elev:"469.2604", sn:"0.0091", se:"0.0159", sh:"0.0136", isControl:false },
  { name:"Pt 7",  north:"898 729.1125", east:"236 990.0287", elev:"470.0434", sn:"0.0091", se:"0.0157", sh:"0.0136", isControl:false },
  { name:"Pt 8",  north:"898 698.4939", east:"236 890.0812", elev:"472.2681", sn:"0.0090", se:"0.0155", sh:"0.0136", isControl:false },
  { name:"Pt 9",  north:"898 286.3495", east:"237 394.8636", elev:"466.1752", sn:"0.0087", se:"0.0186", sh:"0.0194", isControl:false },
  { name:"Pt 10", north:"898 112.0343", east:"237 384.8856", elev:"464.4580", sn:"0.0082", se:"0.0186", sh:"0.0195", isControl:false },
  { name:"Pt 11", north:"898 022.8284", east:"237 324.3274", elev:"464.2756", sn:"0.0080", se:"0.0185", sh:"0.0195", isControl:false },
  { name:"Pt 13", north:"897 904.2730", east:"237 022.6480", elev:"473.7406", sn:"0.0073", se:"0.0152", sh:"0.0133", isControl:false },
]

/* ── Baselines table ── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BaselinesTable({ apiResult, inputVectors, stations, bases }: {
  apiResult: PipelineOut | PipelineFromRinexOut | null
  inputVectors: BaselineIn[]
  stations: string[]
  bases: BaseCoord[]
}) {
  const [page, setPage] = useState(0)
  const PER_PAGE = 10

  /* The from-rinex response ships with baselines_detail (full metadata from
     rnx2rtkp); the from-vectors response uses the user-submitted CSV as the
     authoritative baseline list. Demo mode falls back to hardcoded rows. */
  const fromRinex = apiResult && "baselines_detail" in apiResult
    ? (apiResult as PipelineFromRinexOut).baselines_detail
    : null

  const rows = fromRinex
    ? fromRinex.map(b => ({
        id:   b.id,
        from: b.start,
        to:   b.end,
        dist: b.length_m.toLocaleString("fr-FR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
        type: b.solution_type,
        ratio: "—",
        rms:   (b.rms_m * 1000).toFixed(1) + " mm",
        ok:    b.solution_type.includes("Fix"),
      }))
    : (apiResult && inputVectors.length > 0)
    ? inputVectors.map(v => {
        const len = Math.hypot(v.dx, v.dy, v.dz)
        return {
          id:   v.id,
          from: v.start,
          to:   v.end,
          dist: len.toLocaleString("fr-FR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
          type: v.solution_type ?? "Fix",
          ratio: v.ratio ? v.ratio.toFixed(1) : "—",
          rms:   v.rms   ? (v.rms * 1000).toFixed(1) + " mm" : "—",
          ok:    true,
        }
      })
    : BASELINES_DATA

  const paged = rows.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const pages = Math.ceil(rows.length / PER_PAGE)
  const longest = rows.reduce((m, r) => {
    const v = parseFloat(r.dist.replace(/[\s ]/g, "").replace(",", "."))
    return v > m ? v : m
  }, 0)

  return (
    <>
      {/* Stats bar */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Total lignes de base",  value: rows.length,                       color: "#007BFF" },
          { label: "Validées",              value: rows.filter(r => r.ok).length,     color: "#10b981" },
          { label: "À vérifier",            value: rows.filter(r => !r.ok).length,    color: "#f59e0b" },
          { label: "Plus longue base",      value: longest.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " m", color: "#8b5cf6" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 120, padding: "10px 14px", background: "#f6f8fb", borderRadius: 8, border: "1px solid #e8edf3" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="gnss-result-table" style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f8fb" }}>
              {["ID", "De", "Vers", "Dist. ellipsoïde (m)", "Type", "Précision", "RMS", "Statut"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: r.id === "B01" ? "#fafbff" : "#fff" }}>
                <td style={{ padding: "10px 12px", color: "#94a3b8", fontFamily: "ui-monospace", fontSize: 11.5, fontWeight: 700 }}>{r.id}</td>
                <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 700 }}>{r.from}</td>
                <td style={{ padding: "10px 12px", color: "#475569" }}>{r.to}</td>
                <td style={{ padding: "10px 12px", color: "#475569", fontFamily: "ui-monospace", fontWeight: 600 }}>{r.dist}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, background: r.type === "Lc Fix" ? "#8b5cf614" : "#007BFF14", color: r.type === "Lc Fix" ? "#8b5cf6" : "#007BFF", padding: "2px 7px", borderRadius: 5 }}>{r.type}</span>
                </td>
                <td style={{ padding: "10px 12px", color: "#475569", fontFamily: "ui-monospace", fontSize: 11.5 }}>{r.ratio}</td>
                <td style={{ padding: "10px 12px", color: "#475569", fontFamily: "ui-monospace" }}>{r.rms}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: "#10b981", background: "#10b98112", padding: "3px 8px", borderRadius: 5 }}>
                    <CheckCircle2 size={10} /> Validée
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>Page {page + 1} / {pages}</span>
          <button disabled={page === 0}        onClick={() => setPage(p => p - 1)} style={{ fontSize: 12, fontWeight: 600, color: page === 0 ? "#cbd5e1" : "#007BFF", padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>← Préc</button>
          <button disabled={page === pages - 1} onClick={() => setPage(p => p + 1)} style={{ fontSize: 12, fontWeight: 600, color: page === pages - 1 ? "#cbd5e1" : "#007BFF", padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>Suiv →</button>
        </div>
      )}
    </>
  )
}

/* ── Loop closure table ── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LoopsTable({ apiResult, stations, bases }: {
  apiResult: PipelineOut | null
  stations: string[]
  bases: BaseCoord[]
}) {
  /* Map API loops to row shape, fall back to hardcoded data otherwise. */
  const rows = apiResult
    ? apiResult.loops.map(lp => ({
        id:  lp.id,
        pts: lp.baselines.join(" → "),
        len: lp.length_m.toLocaleString("fr-FR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
        dh:  lp.dh_m.toFixed(4),
        dv:  lp.dv_m.toFixed(4),
        ppm: lp.ppm.toFixed(3),
        ok:  lp.conform,
      }))
    : LOOPS_DATA

  const conform = rows.filter(r => r.ok).length
  const fail    = rows.length - conform

  return (
    <>
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Boucles calculées", value: rows.length, color: "#007BFF" },
          { label: "Conformes",         value: conform,     color: "#10b981" },
          { label: "Hors tolérance",    value: fail,        color: fail ? "#ef4444" : "#64748b" },
          { label: "Limite ΔH (m)",     value: "1.000",     color: "#64748b" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 110, padding: "10px 14px", background: "#f6f8fb", borderRadius: 8, border: "1px solid #e8edf3" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="gnss-result-table" style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f8fb" }}>
              {["Boucle","Stations","Longueur (m)","ΔH (m)","ΔV (m)","PPM","Statut"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 700 }}>{r.id}</td>
                <td style={{ padding: "10px 12px", color: "#475569", fontSize: 11.5 }}>{r.pts}</td>
                <td style={{ padding: "10px 12px", color: "#475569", fontFamily: "ui-monospace" }}>{r.len}</td>
                <td style={{ padding: "10px 12px", color: "#475569", fontFamily: "ui-monospace" }}>{r.dh}</td>
                <td style={{ padding: "10px 12px", color: "#475569", fontFamily: "ui-monospace" }}>{r.dv}</td>
                <td style={{ padding: "10px 12px", color: "#475569", fontFamily: "ui-monospace" }}>{r.ppm}</td>
                <td style={{ padding: "10px 12px" }}>
                  {r.ok ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: "#10b981", background: "#10b98112", padding: "3px 8px", borderRadius: 5 }}>
                      <CheckCircle2 size={10} /> Conforme
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: "#f59e0b", background: "#f59e0b14", padding: "3px 8px", borderRadius: 5 }}>
                      <AlertTriangle size={10} /> Tolérance
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ── Adjustment table (free or constrained) ── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AdjustmentTable({ type, apiResult, stations, bases }: {
  type: "free" | "constrained"
  apiResult: PipelineOut | null
  stations: string[]
  bases: BaseCoord[]
}) {
  const isFree = type === "free"
  const apiRep = apiResult ? (isFree ? apiResult.free : apiResult.constrained) : null

  /* Map API points (ECEF) into the table row shape. Grid projection isn't
     done client-side yet, so we show ECEF XYZ and their σ when API data is
     used. Demo mode keeps showing the published grid Nord/Est/Élév. */
  const data = apiRep
    ? apiRep.points.map(p => ({
        name: p.name,
        north: p.x.toLocaleString("fr-FR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
        east:  p.y.toLocaleString("fr-FR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
        elev:  p.z.toLocaleString("fr-FR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
        sn:    p.sx.toFixed(4),
        se:    p.sy.toFixed(4),
        sh:    p.sz.toFixed(4),
        isControl: p.is_control,
      }))
    : (isFree ? FREE_ADJ_DATA : CONSTRAINED_ADJ_DATA)

  const statsH = apiRep ? apiRep.horiz_accuracy_mm.toFixed(1) : (isFree ? "19.6" : "20.5")
  const statsV = apiRep ? apiRep.vert_accuracy_mm.toFixed(1)  : (isFree ? "18.5" : "19.5")
  const chi2Val = apiRep ? apiRep.chi2.toFixed(3)  : "28.977"
  const chi2Pass = apiRep ? apiRep.chi2_pass        : true
  const coordLabel = apiRep ? ["X ECEF (m)", "Y ECEF (m)", "Z ECEF (m)"] : ["Nord (m)", "Est (m)", "Élév. (m)"]

  return (
    <>
      {/* Info banner */}
      <div style={{
        background: isFree ? "#f0f7ff" : "#ecfdf5",
        border: `1px solid ${isFree ? "#bfdbfe" : "#a7f3d0"}`,
        borderRadius: 8, padding: 12, marginBottom: 16,
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <Info size={14} color={isFree ? "#007BFF" : "#10b981"} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>
            {isFree ? "Ajustement libre" : "Ajustement contraint — point de contrôle : Tia2"}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b" }}>
            {isFree
              ? `Aucune contrainte extérieure. χ² = ${chi2Val} (test ${chi2Pass ? "validé" : "échoué"}) · Précision planimétrique : ${statsH} mm · Altimétrique : ${statsV} mm`
              : `Calé sur le(s) point(s) de contrôle. χ² = ${chi2Val} (test ${chi2Pass ? "validé" : "échoué"}) · Précision planimétrique : ${statsH} mm · Altimétrique : ${statsV} mm`
            }
            {apiRep && (
              <div style={{ marginTop: 4, fontSize: 10.5, color: "#94a3b8", fontFamily: "ui-monospace" }}>
                σ₀ = {apiRep.sigma0.toFixed(3)} · n_obs = {apiRep.n_obs} · n_unk = {apiRep.n_unk} · dof = {apiRep.dof}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="gnss-result-table" style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f8fb" }}>
              {["Point", coordLabel[0], coordLabel[1], coordLabel[2], "σ₁ (m)", "σ₂ (m)", "σ₃ (m)"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: r.isControl ? "#fffbeb" : "#fff" }}>
                <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 700 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {r.name}
                    {r.isControl && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: "#f59e0b14", color: "#d97706", padding: "1px 6px", borderRadius: 4 }}>CONTRÔLE</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "10px 12px", color: "#475569", fontFamily: "ui-monospace" }}>{r.north}</td>
                <td style={{ padding: "10px 12px", color: "#475569", fontFamily: "ui-monospace" }}>{r.east}</td>
                <td style={{ padding: "10px 12px", color: "#475569", fontFamily: "ui-monospace" }}>{r.elev}</td>
                <td style={{ padding: "10px 12px", color: r.sn === "0.0000" ? "#cbd5e1" : "#94a3b8", fontFamily: "ui-monospace" }}>{r.sn}</td>
                <td style={{ padding: "10px 12px", color: r.se === "0.0000" ? "#cbd5e1" : "#94a3b8", fontFamily: "ui-monospace" }}>{r.se}</td>
                <td style={{ padding: "10px 12px", color: r.sh === "0.0000" ? "#cbd5e1" : "#94a3b8", fontFamily: "ui-monospace" }}>{r.sh}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
