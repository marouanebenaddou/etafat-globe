"use client"

import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { useTheme } from "@/lib/theme-context"

export default function PlatformPreviewSection() {
  const { isDark } = useTheme()

  return (
    <section className="sec-bg-b overflow-hidden">
      <ContainerScroll
        titleComponent={
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#007BFF]/10 border border-[#007BFF]/20 px-4 py-1.5 text-xs text-[#007BFF] uppercase tracking-widest mb-5">
              Plateforme géospatiale
            </div>
            <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight ${isDark ? "text-white" : "text-[#003d6b]"}`}>
              Des données terrain à{" "}
              <span className={isDark ? "gradient-text" : "text-[#007BFF]"}>
                la décision
              </span>
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? "text-white/60" : "text-[#3d5a75]"}`}>
              Visualisez, analysez et exploitez vos données géographiques avec nos outils de pointe — du drone au SIG, tout en un.
            </p>
          </div>
        }
      >
        {/* Map/platform interface mockup */}
        <div className="relative w-full h-full overflow-hidden rounded-xl" style={{
          background: isDark
            ? "linear-gradient(135deg, #000d1a 0%, #001a33 50%, #000d20 100%)"
            : "linear-gradient(135deg, #eef4ff 0%, #dbeafe 50%, #eff6ff 100%)"
        }}>
          {/* Grid overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="map-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#007BFF" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-grid)"/>
          </svg>

          {/* Simulated map satellite image */}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Maroc_sat.jpg/1280px-Maroc_sat.jpg"
            alt="Carte géospatiale du Maroc"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />

          {/* UI overlay panels */}
          <div className="absolute inset-0 p-4 flex flex-col justify-between">
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                style={{ background: isDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,123,255,0.2)" }}>
                <div className="w-2 h-2 rounded-full bg-[#007BFF] animate-pulse"/>
                <span className="text-xs font-mono font-semibold" style={{ color: isDark ? "#4da6ff" : "#007BFF" }}>
                  ETAFAT SIG Platform
                </span>
              </div>
              <div className="flex gap-2">
                {["SIG", "LiDAR", "BIM", "Drone"].map(tag => (
                  <span key={tag} className="text-[10px] font-mono px-2 py-1 rounded"
                    style={{ background: "rgba(0,123,255,0.15)", color: "#4da6ff", border: "1px solid rgba(0,123,255,0.25)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Center coordinates display */}
            <div className="flex items-center justify-center gap-8">
              {[
                { label: "LAT", value: "31.7917° N" },
                { label: "LON", value: "7.0926° W" },
                { label: "ALT", value: "545 m" },
              ].map(({ label, value }) => (
                <div key={label} className="text-center rounded-lg px-4 py-2"
                  style={{ background: isDark ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,123,255,0.2)" }}>
                  <div className="text-[10px] font-mono text-[#007BFF] uppercase tracking-widest">{label}</div>
                  <div className={`text-sm font-mono font-bold ${isDark ? "text-white" : "text-[#003d6b]"}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Bottom stats bar */}
            <div className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: isDark ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,123,255,0.15)" }}>
              {[
                { label: "Points LiDAR", value: "2.4M" },
                { label: "Précision", value: "±2 cm" },
                { label: "Surface couverte", value: "1,240 ha" },
                { label: "Levés drones", value: "186" },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className={`text-base font-black ${isDark ? "text-white" : "text-[#003d6b]"}`}>{value}</div>
                  <div className="text-[10px] font-mono" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "#3d5a75" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Corner brackets */}
          {(["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"] as const).map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-6 h-6 pointer-events-none`}
              style={{ borderColor: "#007BFF", opacity: 0.6, borderStyle: "solid",
                borderWidth: i === 0 ? "2px 0 0 2px" : i === 1 ? "2px 2px 0 0" : i === 2 ? "0 0 2px 2px" : "0 2px 2px 0" }} />
          ))}
        </div>
      </ContainerScroll>
    </section>
  )
}
