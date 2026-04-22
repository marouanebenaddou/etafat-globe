"use client"

/**
 * Leaflet-based network visualization for ETAFAT GNSS results.
 *
 * Renders the station network + baselines + closed loops on an
 * OpenStreetMap base layer. Every visual element is animated:
 *   - stations bounce in with a stagger
 *   - baselines draw from base to rover using stroke-dashoffset
 *   - loops fade in as filled polygons
 *   - hovered station gets a pulsing halo
 *
 * The map auto-fits to the network bounds and pans smoothly when the
 * user clicks a baseline row in the table (bus-propagated via the
 * `focusBaselineId` prop).
 */

import { useEffect, useMemo, useRef, useState } from "react"
import {
  MapContainer, TileLayer, CircleMarker, Polyline, Polygon,
  Tooltip, useMap,
} from "react-leaflet"
import L, { LatLngBoundsLiteral } from "leaflet"
import { motion, AnimatePresence } from "framer-motion"
import { maybeEcefToLLH, LLH } from "@/lib/ecef"
import "leaflet/dist/leaflet.css"

/* ─────────── public types ─────────── */
type Station = {
  name: string
  x: number; y: number; z: number
  is_control?: boolean
}
type BaselineDetail = {
  id: string
  start: string; end: string
  length_m: number
  solution_type: string
  rms_m: number
}
type LoopOut = {
  id: string
  baselines: string[]
  length_m: number
  dh_m: number; dv_m: number
  ppm: number
  conform: boolean
}
export type MapResult = {
  baselines_detail?: BaselineDetail[]
  loops?:            LoopOut[]
  free?:             { points?: Station[] }
  constrained?:      { points?: Station[] }
}

/* ─────────── helpers ─────────── */

// Colour by solution quality — green (Fix) > blue (Kine Fix) > amber (Float) > red (Single / Unknown).
function solutionColor(sol: string): string {
  const s = sol.toLowerCase()
  if (s.startsWith("fix")) return "#10b981"
  if (s.startsWith("kine fix") || s.startsWith("kine mixed")) return "#3b82f6"
  if (s.startsWith("float") || s.startsWith("kine float")) return "#f59e0b"
  return "#ef4444"
}

function stationColor(is_control: boolean | undefined, isRover: boolean): string {
  if (is_control) return "#007BFF"     // base — brand blue
  if (isRover)    return "#8b5cf6"     // rover — purple
  return "#0f172a"                      // unknown — slate
}

/* ─────────── sub-components ─────────── */

function FitToBounds({ points }: { points: LLH[] }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    const bounds: LatLngBoundsLiteral = points.map(p => [p.lat, p.lon])
    // Pad bounds so markers don't glue against the viewport edge
    map.fitBounds(L.latLngBounds(bounds).pad(0.2), {
      animate: true, duration: 0.8, easeLinearity: 0.15,
    })
  }, [map, points])
  return null
}

/** Invisible pane that injects a <style> tag so we can animate SVG
    paths drawn by Leaflet. Leaflet renders every polyline as an SVG
    <path> we can target by class. */
function MapAnimations() {
  return (
    <style jsx global>{`
      /* Stroke-dashoffset draw-on for baselines */
      @keyframes gnss-baseline-draw {
        from { stroke-dashoffset: var(--len); opacity: 0.2; }
        to   { stroke-dashoffset: 0;          opacity: 1;   }
      }
      .gnss-baseline-svg {
        --len: 1000;
        stroke-dasharray: var(--len);
        stroke-dashoffset: var(--len);
        animation: gnss-baseline-draw 1.2s cubic-bezier(.2,.8,.2,1) forwards;
      }
      /* Pulsing halo on hovered station */
      @keyframes gnss-station-pulse {
        0%   { transform: scale(1);   opacity: 0.7; }
        80%  { transform: scale(2.6); opacity: 0;   }
        100% { transform: scale(2.6); opacity: 0;   }
      }
      .gnss-station-halo {
        animation: gnss-station-pulse 1.6s ease-out infinite;
        transform-origin: center;
        transform-box: fill-box;
        pointer-events: none;
      }
      /* Custom Leaflet popup look */
      .leaflet-popup-content-wrapper {
        border-radius: 10px;
        box-shadow: 0 12px 30px rgba(0,0,0,0.18);
        border: 1px solid #e8edf3;
      }
      .leaflet-popup-content {
        margin: 10px 12px; font-size: 12.5px; color: #0f172a;
      }
      .leaflet-container {
        font-family: inherit;
        background: #f6f8fb;
      }
    `}</style>
  )
}

/* ─────────── main component ─────────── */

export default function NetworkMap({ result }: { result: MapResult | null }) {
  const [hovered, setHovered] = useState<string | null>(null)

  // Prefer constrained adjustment points (if present), otherwise free.
  const stationPoints = useMemo<Station[]>(() => {
    if (!result) return []
    return result.constrained?.points ?? result.free?.points ?? []
  }, [result])

  // Build a { name → LLH } map once.
  const stationLLH = useMemo(() => {
    const m = new Map<string, LLH & { is_control?: boolean }>()
    for (const s of stationPoints) {
      const llh = maybeEcefToLLH(s.x, s.y, s.z)
      if (!llh) continue
      m.set(s.name, { ...llh, is_control: s.is_control })
    }
    return m
  }, [stationPoints])

  // Collect baselines with both endpoints resolved on the map.
  const drawableBaselines = useMemo(() => {
    if (!result?.baselines_detail) return []
    return result.baselines_detail
      .map(b => {
        const a = stationLLH.get(b.start)
        const c = stationLLH.get(b.end)
        if (!a || !c) return null
        return { baseline: b, from: a, to: c }
      })
      .filter((v): v is { baseline: BaselineDetail; from: LLH; to: LLH } => Boolean(v))
  }, [result, stationLLH])

  // Loops as polygons (vertices = stations in order).
  const drawableLoops = useMemo(() => {
    if (!result?.loops || !result.baselines_detail) return []
    const blMap = new Map(result.baselines_detail.map(b => [b.id, b]))
    const out: { loop: LoopOut; vertices: LLH[] }[] = []
    for (const lp of result.loops) {
      const verts: LLH[] = []
      const seen = new Set<string>()
      for (const bid of lp.baselines) {
        const b = blMap.get(bid)
        if (!b) continue
        for (const name of [b.start, b.end]) {
          if (seen.has(name)) continue
          const p = stationLLH.get(name)
          if (!p) continue
          seen.add(name)
          verts.push(p)
        }
      }
      if (verts.length >= 3) out.push({ loop: lp, vertices: verts })
    }
    return out
  }, [result, stationLLH])

  const allPoints = useMemo(() => Array.from(stationLLH.values()), [stationLLH])

  if (!result || allPoints.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          padding: "48px 24px", textAlign: "center",
          background: "linear-gradient(180deg, #f6f8fb 0%, #fff 100%)",
          borderRadius: 12, border: "1px dashed #cbd5e1",
        }}
      >
        <div style={{ fontSize: 14, color: "#475569", marginBottom: 4 }}>
          Pas de positions à cartographier
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          La carte s'activera dès que le calcul produira des coordonnées ECEF ajustées.
        </div>
      </motion.div>
    )
  }

  // Pick center from the first station (FitToBounds does the rest).
  const center: [number, number] = [allPoints[0].lat, allPoints[0].lon]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        position: "relative",
        height: 520, width: "100%",
        borderRadius: 12, overflow: "hidden",
        border: "1px solid #e8edf3",
        boxShadow: "0 4px 14px rgba(10,22,40,0.05)",
      }}
    >
      <MapAnimations />
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitToBounds points={allPoints} />

        {/* Loops as tinted polygons — behind baselines */}
        {drawableLoops.map(({ loop, vertices }, i) => (
          <Polygon
            key={`lp-${loop.id}`}
            positions={vertices.map(v => [v.lat, v.lon] as [number, number])}
            pathOptions={{
              color: loop.conform ? "#10b981" : "#f59e0b",
              fillColor: loop.conform ? "#10b981" : "#f59e0b",
              fillOpacity: 0.08,
              weight: 1,
              dashArray: "4 6",
              className: "gnss-baseline-svg",
            }}
            eventHandlers={{
              add: (e) => {
                // Set --len for the draw-on animation based on polygon perimeter
                const el = (e.target as L.Polygon).getElement() as SVGPathElement | null
                if (el) {
                  const len = el.getTotalLength?.()
                  if (len) el.style.setProperty("--len", String(len))
                  el.style.setProperty("animation-delay", `${0.8 + i * 0.08}s`)
                }
              },
            }}
          >
            <Tooltip sticky>
              <div style={{ fontSize: 12 }}>
                <b>Boucle {loop.id}</b>
                <br />
                {loop.length_m.toFixed(1)} m · PPM {loop.ppm.toFixed(1)}<br />
                ΔH {(loop.dh_m * 1000).toFixed(1)} mm · ΔV {(loop.dv_m * 1000).toFixed(1)} mm<br />
                <span style={{
                  color: loop.conform ? "#10b981" : "#f59e0b",
                  fontWeight: 700,
                }}>
                  {loop.conform ? "Conforme" : "Hors tolérance"}
                </span>
              </div>
            </Tooltip>
          </Polygon>
        ))}

        {/* Baselines — animated stroke-dashoffset draw */}
        {drawableBaselines.map(({ baseline, from, to }, i) => {
          const color = solutionColor(baseline.solution_type)
          return (
            <Polyline
              key={baseline.id}
              positions={[[from.lat, from.lon], [to.lat, to.lon]]}
              pathOptions={{
                color,
                weight: 2.6,
                opacity: 0.9,
                className: "gnss-baseline-svg",
              }}
              eventHandlers={{
                add: (e) => {
                  const el = (e.target as L.Polyline).getElement() as SVGPathElement | null
                  if (el) {
                    const len = el.getTotalLength?.()
                    if (len) el.style.setProperty("--len", String(len))
                    // Stagger: all baselines start drawing over the first ~600ms
                    el.style.setProperty("animation-delay", `${0.2 + i * 0.03}s`)
                  }
                },
                mouseover: () => setHovered(`b:${baseline.id}`),
                mouseout:  () => setHovered(prev => prev === `b:${baseline.id}` ? null : prev),
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: 12 }}>
                  <b>{baseline.id}</b> · {baseline.start} → {baseline.end}<br />
                  {baseline.length_m.toFixed(3)} m<br />
                  <span style={{ color, fontWeight: 700 }}>{baseline.solution_type}</span>
                  {" · "}
                  RMS {(baseline.rms_m * 1000).toFixed(1)} mm
                </div>
              </Tooltip>
            </Polyline>
          )
        })}

        {/* Stations */}
        {Array.from(stationLLH.entries()).map(([name, p], i) => {
          const isRover = !p.is_control && /_S\d+$/i.test(name)
          const color = stationColor(p.is_control, isRover)
          const key = `s:${name}`
          return (
            <CircleMarker
              key={name}
              center={[p.lat, p.lon]}
              radius={hovered === key ? 8 : 6}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: color,
                fillOpacity: 1,
                className: "gnss-baseline-svg",
              }}
              eventHandlers={{
                add: (e) => {
                  const el = (e.target as L.CircleMarker).getElement() as SVGPathElement | null
                  if (el) {
                    // Circles have a small perimeter — set a fixed small dash-len
                    el.style.setProperty("--len", "50")
                    el.style.setProperty("animation-delay", `${1.0 + i * 0.05}s`)
                  }
                },
                mouseover: () => setHovered(key),
                mouseout:  () => setHovered(prev => prev === key ? null : prev),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={false}>
                <div style={{ fontSize: 12 }}>
                  <b>{name}</b>
                  <br />
                  {p.lat.toFixed(6)}°, {p.lon.toFixed(6)}°<br />
                  <span style={{ color: "#64748b" }}>Élév. {p.h.toFixed(2)} m</span>
                  {p.is_control && (
                    <><br /><span style={{
                      color: "#007BFF", fontWeight: 700, fontSize: 10,
                      letterSpacing: 0.6,
                    }}>BASE CONTRÔLE</span></>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Floating legend */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(255,255,255,0.95)", padding: "8px 12px",
            borderRadius: 10, border: "1px solid #e8edf3",
            boxShadow: "0 4px 12px rgba(10,22,40,0.08)",
            fontSize: 11, color: "#334155",
            backdropFilter: "blur(6px)",
            zIndex: 500,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 11.5, color: "#0f172a" }}>
            Légende
          </div>
          {[
            ["Fix",        "#10b981"],
            ["Kine Fix",   "#3b82f6"],
            ["Float",      "#f59e0b"],
            ["Single",     "#ef4444"],
          ].map(([label, c]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{
                display: "inline-block", width: 14, height: 3,
                background: c, borderRadius: 2,
              }} />
              <span>{label}</span>
            </div>
          ))}
          <div style={{ height: 1, background: "#e8edf3", margin: "6px 0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#007BFF", border: "1.5px solid #fff",
              boxShadow: "0 0 0 1px #007BFF33",
            }} />
            <span>Base contrôle</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#8b5cf6", border: "1.5px solid #fff",
              boxShadow: "0 0 0 1px #8b5cf633",
            }} />
            <span>Point levé</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
