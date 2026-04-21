"use client"

import { useState, useRef } from "react"
import {
  ChevronRight, Upload, FileArchive, FileText, MapPin, Globe2,
  PlayCircle, Download, CheckCircle2, AlertTriangle, XCircle,
  Layers, Activity, Satellite, Radio, Anchor, Target,
  Loader2, ArrowRight, Info, Trash2, FileDown, Eye,
} from "lucide-react"

/* ── UI primitives ── */
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; padding?: number }> = ({ children, style, padding = 24 }) => (
  <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8edf3", padding, ...style }}>{children}</div>
)

const SectionTitle: React.FC<{ step: number; title: string; sub?: string; done?: boolean }> = ({ step, title, sub, done }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      background: done ? "#10b981" : "#007BFF14",
      color: done ? "#fff" : "#007BFF",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 800, flexShrink: 0,
    }}>
      {done ? <CheckCircle2 size={15} /> : step}
    </div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
)

type UploadedFile = { name: string; size: number; type: string }

const PROJECTIONS = [
  { code: "Merchich / Nord Maroc",   epsg: "26191" },
  { code: "Merchich / Sud Maroc",    epsg: "26192" },
  { code: "Merchich / Sahara Nord",  epsg: "26193" },
  { code: "Merchich / Sahara Sud",   epsg: "26194" },
  { code: "WGS 84 / UTM zone 29N",   epsg: "32629" },
  { code: "WGS 84 / UTM zone 30N",   epsg: "32630" },
  { code: "RGM 2020 / Zone 1",       epsg: "10301" },
  { code: "ETRS89",                  epsg: "4258" },
]

export default function GnssPage() {
  const obsRef  = useRef<HTMLInputElement>(null)
  const baseRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  const [obsFiles, setObsFiles]   = useState<UploadedFile[]>([])
  const [baseFiles, setBaseFiles] = useState<UploadedFile[]>([])
  const [projection, setProjection] = useState("")
  const [baseCoords, setBaseCoords] = useState<{ name: string; x: string; y: string; z: string }[]>([
    { name: "BASE_01", x: "", y: "", z: "" },
  ])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [activeTab, setActiveTab] = useState<"baselines" | "loops" | "free" | "constrained">("baselines")

  const handleFiles = (list: FileList | null, setter: (f: UploadedFile[]) => void, current: UploadedFile[]) => {
    if (!list) return
    const arr = Array.from(list).map(f => ({ name: f.name, size: f.size, type: f.type }))
    setter([...current, ...arr])
  }

  const removeFile = (i: number, arr: UploadedFile[], setter: (f: UploadedFile[]) => void) => {
    setter(arr.filter((_, idx) => idx !== i))
  }

  const addBase = () => setBaseCoords([...baseCoords, { name: `BASE_${String(baseCoords.length + 1).padStart(2, "0")}`, x: "", y: "", z: "" }])
  const removeBase = (i: number) => setBaseCoords(baseCoords.filter((_, idx) => idx !== i))
  const updateBase = (i: number, field: "name" | "x" | "y" | "z", v: string) => {
    const arr = [...baseCoords]; arr[i][field] = v; setBaseCoords(arr)
  }

  const canRun = obsFiles.length > 0 && baseFiles.length > 0 && projection && baseCoords.some(b => b.x && b.y)

  const run = () => {
    setProcessing(true); setProgress(0); setDone(false)
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(t); setProcessing(false); setDone(true); return 100 }
        return p + 2.5
      })
    }, 140)
  }

  const reset = () => {
    setObsFiles([]); setBaseFiles([]); setProjection("")
    setBaseCoords([{ name: "BASE_01", x: "", y: "", z: "" }])
    setProgress(0); setDone(false)
  }

  const step1Done = obsFiles.length > 0
  const step2Done = baseFiles.length > 0
  const step3Done = !!projection && baseCoords.some(b => b.x && b.y)

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b", marginBottom: 16 }}>
        <span>Outils</span>
        <ChevronRight size={11} />
        <span style={{ color: "#0f172a", fontWeight: 600 }}>Traitement GNSS</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#007BFF14", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Satellite size={22} color="#007BFF" strokeWidth={1.75} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: -0.4 }}>Traitement GNSS</h1>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Automatisation du calcul de lignes de base et des ajustements</p>
            </div>
          </div>
        </div>
        {done && (
          <button onClick={reset}
            style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b", border: "1px solid #e2e8f0", padding: "9px 16px", borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", gap: 7 }}>
            <Trash2 size={13} /> Nouveau calcul
          </button>
        )}
      </div>

      {/* ── RESULTS VIEW ── */}
      {done && (
        <>
          {/* Summary card */}
          <Card style={{ marginBottom: 20, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", color: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle2 size={28} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 3 }}>Calcul terminé avec succès</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  {obsFiles.length} fichier{obsFiles.length > 1 ? "s" : ""} traité{obsFiles.length > 1 ? "s" : ""} · {baseCoords.length} base{baseCoords.length > 1 ? "s" : ""} · Tolérances respectées
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "9px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                  <Eye size={14} /> Aperçu
                </button>
                <button style={{ background: "#fff", color: "#10b981", padding: "9px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
                  <FileDown size={14} /> Télécharger rapport PDF
                </button>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Card padding={0} style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: "1px solid #e8edf3", padding: "0 6px" }}>
              {[
                { id: "baselines",   label: "Lignes de base",  Icon: Activity, count: 12 },
                { id: "loops",       label: "Fermeture boucles", Icon: Radio,    count: 4  },
                { id: "free",        label: "Ajustement libre",  Icon: Target,   count: 6  },
                { id: "constrained", label: "Ajustement contraint", Icon: Anchor, count: 6 },
              ].map(t => (
                <button key={t.id}
                  onClick={() => setActiveTab(t.id as typeof activeTab)}
                  style={{
                    padding: "16px 20px",
                    display: "flex", alignItems: "center", gap: 8,
                    borderBottom: `2px solid ${activeTab === t.id ? "#007BFF" : "transparent"}`,
                    color: activeTab === t.id ? "#007BFF" : "#64748b",
                    fontSize: 13, fontWeight: 600,
                    transition: "all 0.2s ease",
                  }}>
                  <t.Icon size={14} strokeWidth={2} />
                  {t.label}
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: activeTab === t.id ? "#007BFF14" : "#f1f5f9",
                    color: activeTab === t.id ? "#007BFF" : "#64748b",
                    padding: "2px 7px", borderRadius: 10,
                  }}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: 24 }}>
              {activeTab === "baselines" && <BaselinesTable />}
              {activeTab === "loops"     && <LoopsTable />}
              {activeTab === "free"      && <AdjustmentTable type="free" />}
              {activeTab === "constrained" && <AdjustmentTable type="constrained" />}
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
              <SectionTitle step={1} title="Données brutes d'observation" sub="Fichiers HCN (format CHCNAV) — bases et mobiles" done={step1Done} />
              <input ref={obsRef} type="file" multiple accept=".hcn,.HCN,.rinex,.obs,.zip" style={{ display: "none" }}
                onChange={e => handleFiles(e.target.files, setObsFiles, obsFiles)} />
              <DropZone
                onClick={() => obsRef.current?.click()}
                onDrop={files => handleFiles(files, setObsFiles, obsFiles)}
                icon={FileArchive}
                title="Glissez vos fichiers HCN ici"
                sub="ou cliquez pour parcourir · formats: .hcn, .rinex, .obs"
              />
              <FileList files={obsFiles} onRemove={i => removeFile(i, obsFiles, setObsFiles)} />
            </Card>

            {/* Step 2 — Coords */}
            <Card>
              <SectionTitle step={2} title="Coordonnées des bases" sub="Fichier TXT contenant les coordonnées de référence" done={step2Done} />
              <input ref={baseRef} type="file" multiple accept=".txt,.csv,.asc" style={{ display: "none" }}
                onChange={e => handleFiles(e.target.files, setBaseFiles, baseFiles)} />
              <DropZone
                onClick={() => baseRef.current?.click()}
                onDrop={files => handleFiles(files, setBaseFiles, baseFiles)}
                icon={FileText}
                title="Glissez votre fichier de coordonnées"
                sub="ou cliquez pour parcourir · formats: .txt, .csv"
              />
              <FileList files={baseFiles} onRemove={i => removeFile(i, baseFiles, setBaseFiles)} />

              {/* Photo OCR option */}
              <div style={{ marginTop: 14, padding: 14, background: "#f6f8fb", borderRadius: 9, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: "#007BFF14", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Info size={14} color="#007BFF" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>Notes manuscrites ?</div>
                  <div style={{ fontSize: 11.5, color: "#64748b" }}>Prenez en photo vos relevés terrain, l'app détectera les points automatiquement.</div>
                </div>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} />
                <button onClick={() => photoRef.current?.click()}
                  style={{ fontSize: 12, fontWeight: 600, color: "#007BFF", border: "1px solid #007BFF40", padding: "7px 13px", borderRadius: 7 }}>
                  Importer photo
                </button>
              </div>
            </Card>

            {/* Step 3 — Projection & base coords */}
            <Card>
              <SectionTitle step={3} title="Projection & coordonnées de référence" sub="Système de projection et points de base connus" done={step3Done} />

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6, display: "block" }}>Système de projection</label>
                <div style={{ position: "relative" }}>
                  <Globe2 size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <select value={projection} onChange={e => setProjection(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 12px 11px 36px",
                      border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a",
                      background: "#fff", appearance: "none",
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'><polyline points='6 9 12 15 18 9'/></svg>")`,
                      backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                    }}>
                    <option value="">Sélectionnez une projection…</option>
                    {PROJECTIONS.map(p => (
                      <option key={p.epsg} value={p.epsg}>{p.code} · EPSG:{p.epsg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Coordonnées des bases</label>
                  <button onClick={addBase} style={{ fontSize: 11.5, fontWeight: 600, color: "#007BFF" }}>+ Ajouter une base</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {baseCoords.map((b, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                      <input value={b.name} onChange={e => updateBase(i, "name", e.target.value)} placeholder="BASE_01"
                        style={inputStyle} />
                      <input value={b.x} onChange={e => updateBase(i, "x", e.target.value)} placeholder="X (E)" type="number"
                        style={inputStyle} />
                      <input value={b.y} onChange={e => updateBase(i, "y", e.target.value)} placeholder="Y (N)" type="number"
                        style={inputStyle} />
                      <input value={b.z} onChange={e => updateBase(i, "z", e.target.value)} placeholder="Z (H)" type="number"
                        style={inputStyle} />
                      <button onClick={() => removeBase(i)} disabled={baseCoords.length === 1}
                        style={{ color: baseCoords.length === 1 ? "#cbd5e1" : "#ef4444", padding: 8 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Run */}
            <Card style={{ background: processing ? "#f6f8fb" : "#fff" }}>
              {!processing ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>
                      {canRun ? "Prêt à lancer le calcul" : "Complétez les étapes ci-dessus"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Le traitement prend généralement 30 secondes à 3 minutes selon le volume de données.
                    </div>
                  </div>
                  <button
                    onClick={run} disabled={!canRun}
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
                        {progress < 25 ? "Lecture des fichiers HCN" :
                         progress < 50 ? "Calcul des lignes de base" :
                         progress < 75 ? "Fermeture des boucles" :
                         progress < 95 ? "Ajustements libre et contraint" : "Génération du rapport"}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#007BFF" }}>{Math.round(progress)} %</div>
                  </div>
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 100, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #007BFF, #3b9bff)", transition: "width 0.3s ease", borderRadius: 100 }} />
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
                <SummaryRow label="Fichiers bruts"        value={obsFiles.length}    Icon={FileArchive} />
                <SummaryRow label="Fichiers coordonnées"  value={baseFiles.length}   Icon={FileText} />
                <SummaryRow label="Bases définies"        value={baseCoords.filter(b => b.x && b.y).length} Icon={MapPin} />
                <SummaryRow label="Projection"            value={projection ? `EPSG:${projection}` : "—"} Icon={Globe2} />
              </div>
            </Card>

            <Card style={{ background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Layers size={15} color="#007BFF" />
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Pipeline automatisé</div>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16, lineHeight: 1.55 }}>
                Chaque étape est validée automatiquement selon les tolérances des normes géodésiques.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  { label: "Lecture HCN & conversion RINEX",  Icon: FileArchive },
                  { label: "Calcul des lignes de base",        Icon: Activity },
                  { label: "Fermeture des boucles",            Icon: Radio },
                  { label: "Ajustement libre",                 Icon: Target },
                  { label: "Ajustement contraint",             Icon: Anchor },
                  { label: "Génération du rapport PDF",        Icon: FileText },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fff", borderRadius: 7, border: "1px solid #e8edf3" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: "#007BFF10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <s.Icon size={11} color="#007BFF" />
                    </div>
                    <span style={{ fontSize: 11.5, color: "#475569", fontWeight: 500 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        </div>
      )}

      <style>{`
        @keyframes gnssSpin { to { transform: rotate(360deg); } }
        @media (max-width: 1100px) {
          .gnss-split { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ───── Sub-components ───── */

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12.5, color: "#0f172a",
  background: "#fff", outline: "none", width: "100%",
}

function DropZone({ onClick, onDrop, icon: Icon, title, sub }: {
  onClick: () => void
  onDrop: (f: FileList | null) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  title: string
  sub: string
}) {
  const [over, setOver] = useState(false)
  return (
    <div
      onClick={onClick}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(e.dataTransfer.files) }}
      style={{
        border: `2px dashed ${over ? "#007BFF" : "#cbd5e1"}`,
        background: over ? "#f0f7ff" : "#fafbfc",
        borderRadius: 10,
        padding: "30px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: over ? "#007BFF" : "#fff", border: `1px solid ${over ? "transparent" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={20} color={over ? "#fff" : "#64748b"} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "#64748b" }}>{sub}</div>
      </div>
    </div>
  )
}

function FileList({ files, onRemove }: { files: UploadedFile[]; onRemove: (i: number) => void }) {
  if (files.length === 0) return null
  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
      {files.map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#f6f8fb", borderRadius: 7 }}>
          <FileArchive size={13} color="#007BFF" />
          <span style={{ flex: 1, fontSize: 12, color: "#0f172a", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{(f.size / 1024).toFixed(1)} Ko</span>
          <button onClick={() => onRemove(i)} style={{ color: "#94a3b8", padding: 3 }}>
            <XCircle size={13} />
          </button>
        </div>
      ))}
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

/* ───── Mock result tables ───── */

function BaselinesTable() {
  const rows = [
    { from: "BASE_01", to: "MOBILE_A", length: "1 247.82", ratio: "12.4", sd: "0.003", status: "ok" },
    { from: "BASE_01", to: "MOBILE_B", length: "2 105.67", ratio: "9.8",  sd: "0.005", status: "ok" },
    { from: "BASE_01", to: "MOBILE_C", length: "945.21",   ratio: "15.1", sd: "0.002", status: "ok" },
    { from: "BASE_02", to: "MOBILE_A", length: "1 850.44", ratio: "11.2", sd: "0.004", status: "ok" },
    { from: "BASE_02", to: "MOBILE_B", length: "1 430.10", ratio: "4.2",  sd: "0.012", status: "warn" },
    { from: "BASE_02", to: "MOBILE_D", length: "3 210.88", ratio: "8.7",  sd: "0.006", status: "ok" },
  ]
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f6f8fb" }}>
            {["De", "Vers", "Longueur (m)", "Ratio", "Écart-type (m)", "Statut"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px 14px", color: "#0f172a", fontWeight: 600 }}>{r.from}</td>
              <td style={{ padding: "12px 14px", color: "#0f172a" }}>{r.to}</td>
              <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "ui-monospace" }}>{r.length}</td>
              <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "ui-monospace" }}>{r.ratio}</td>
              <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "ui-monospace" }}>{r.sd}</td>
              <td style={{ padding: "12px 14px" }}>
                {r.status === "ok" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#10b981", background: "#10b98112", padding: "3px 8px", borderRadius: 5 }}>
                    <CheckCircle2 size={11} /> Validée
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "#f59e0b14", padding: "3px 8px", borderRadius: 5 }}>
                    <AlertTriangle size={11} /> À vérifier
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LoopsTable() {
  const rows = [
    { name: "Boucle 1", points: "BASE_01 → MOBILE_A → MOBILE_B → BASE_01", dx: "0.004", dy: "0.002", dz: "0.007", status: "ok" },
    { name: "Boucle 2", points: "BASE_01 → MOBILE_B → MOBILE_C → BASE_01", dx: "0.002", dy: "0.005", dz: "0.003", status: "ok" },
    { name: "Boucle 3", points: "BASE_02 → MOBILE_A → MOBILE_D → BASE_02", dx: "0.008", dy: "0.011", dz: "0.006", status: "warn" },
    { name: "Boucle 4", points: "BASE_01 → BASE_02 → MOBILE_A → BASE_01", dx: "0.003", dy: "0.004", dz: "0.002", status: "ok" },
  ]
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f6f8fb" }}>
            {["Boucle", "Points", "ΔX (m)", "ΔY (m)", "ΔZ (m)", "Statut"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px 14px", color: "#0f172a", fontWeight: 700 }}>{r.name}</td>
              <td style={{ padding: "12px 14px", color: "#475569", fontSize: 11.5 }}>{r.points}</td>
              <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "ui-monospace" }}>{r.dx}</td>
              <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "ui-monospace" }}>{r.dy}</td>
              <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "ui-monospace" }}>{r.dz}</td>
              <td style={{ padding: "12px 14px" }}>
                {r.status === "ok" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#10b981", background: "#10b98112", padding: "3px 8px", borderRadius: 5 }}>
                    <CheckCircle2 size={11} /> Fermée
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "#f59e0b14", padding: "3px 8px", borderRadius: 5 }}>
                    <AlertTriangle size={11} /> Tolérance
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdjustmentTable({ type }: { type: "free" | "constrained" }) {
  const rows = [
    { name: "BASE_01",   x: "345 289.124", y: "502 118.882", z: "128.45", sx: "0.002", sy: "0.002", sz: "0.004" },
    { name: "BASE_02",   x: "346 512.803", y: "501 827.145", z: "134.12", sx: "0.003", sy: "0.003", sz: "0.005" },
    { name: "MOBILE_A",  x: "345 978.441", y: "502 342.560", z: "131.22", sx: "0.004", sy: "0.004", sz: "0.006" },
    { name: "MOBILE_B",  x: "346 111.267", y: "502 041.332", z: "129.88", sx: "0.005", sy: "0.005", sz: "0.007" },
    { name: "MOBILE_C",  x: "345 455.902", y: "502 560.088", z: "127.14", sx: "0.004", sy: "0.003", sz: "0.005" },
    { name: "MOBILE_D",  x: "346 840.655", y: "501 503.217", z: "138.77", sx: "0.006", sy: "0.005", sz: "0.008" },
  ]
  return (
    <>
      <div style={{
        background: type === "free" ? "#f0f7ff" : "#ecfdf5",
        border: `1px solid ${type === "free" ? "#bfdbfe" : "#a7f3d0"}`,
        borderRadius: 8, padding: 12, marginBottom: 16,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <Info size={14} color={type === "free" ? "#007BFF" : "#10b981"} />
        <span style={{ fontSize: 12, color: "#0f172a" }}>
          {type === "free"
            ? "Ajustement libre — détection d'erreurs internes du réseau (aucune contrainte extérieure appliquée)."
            : "Ajustement contraint — coordonnées finales calées sur les bases de référence connues."}
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f8fb" }}>
              {["Point", "X (m)", "Y (m)", "Z (m)", "σX", "σY", "σZ"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 14px", color: "#0f172a", fontWeight: 700 }}>{r.name}</td>
                <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "ui-monospace" }}>{r.x}</td>
                <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "ui-monospace" }}>{r.y}</td>
                <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "ui-monospace" }}>{r.z}</td>
                <td style={{ padding: "12px 14px", color: "#94a3b8", fontFamily: "ui-monospace" }}>{r.sx}</td>
                <td style={{ padding: "12px 14px", color: "#94a3b8", fontFamily: "ui-monospace" }}>{r.sy}</td>
                <td style={{ padding: "12px 14px", color: "#94a3b8", fontFamily: "ui-monospace" }}>{r.sz}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
