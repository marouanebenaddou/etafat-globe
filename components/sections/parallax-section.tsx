"use client"

import dynamic from "next/dynamic"
import { useScrollReveal } from "@/lib/hooks"
import { useTheme } from "@/lib/theme-context"

const ZoomParallax = dynamic(
  () => import("@/components/ui/zoom-parallax").then(m => m.ZoomParallax),
  { ssr: false }
)

const media = [
  // index 0 — CENTER (unchanged): Morocco/Rabat aerial drone
  {
    type: "video" as const,
    src: "/morocco.mp4",
    alt: "Vue aérienne du Maroc",
  },
  // index 1 — top, right: Africa drone flyover
  {
    type: "video" as const,
    src: "/africa-drone.mp4",
    alt: "Survol drone Afrique",
  },
  // index 2 — left tall: Etafat operator scanning historic Moroccan site
  {
    type: "image" as const,
    src: "/etafat-scan.jpg",
    alt: "Scan patrimoine historique",
  },
  // index 3 — right center: Rabat aerial city
  {
    type: "video" as const,
    src: "/rabat-aerial.mp4",
    alt: "Vue aérienne Rabat",
  },
  // index 4 — lower left: Etafat GPS survey near wind turbines
  {
    type: "image" as const,
    src: "/etafat-wind.jpg",
    alt: "Relevé GPS éolien",
  },
  // index 5 — lower wide: field survey / construction footage
  {
    type: "video" as const,
    src: "/survey-field.mp4",
    alt: "Relevé terrain",
  },
  // index 6 — lower right small: ETAFAT branded plane at airport
  {
    type: "image" as const,
    src: "/etafat-plane.jpg",
    alt: "Avion ETAFAT",
  },
]

export default function ParallaxSection() {
  const { ref, isVisible } = useScrollReveal()
  const { isDark } = useTheme()

  // Always transition into the dark parallax canvas.
  // In light mode, we pick up from the light section bg (#f0f6ff) and
  // fade to #07101f so there's no jarring white block.
  const sectionBg = isDark
    ? "linear-gradient(to bottom, transparent 0%, #07101f 55%)"
    : "linear-gradient(to bottom, #f0f6ff 0%, #07101f 65%)"

  return (
    <section id="parallax" className="relative" style={{ background: sectionBg }}>
      {/* Header — always on dark-ish gradient, so text is always white */}
      <div className="relative">
        <div
          ref={ref}
          className={`relative z-10 pt-20 pb-16 text-center px-6 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className={`text-4xl sm:text-5xl font-black mb-4 ${isDark ? "text-white" : "text-slate-900"}`} style={isDark ? { textShadow: "0 2px 20px rgba(0,0,0,0.4)" } : undefined}>
            Partout où la précision<br className="hidden sm:block" /> fait la différence
          </h2>
          <p className={`max-w-2xl mx-auto ${isDark ? "text-white/70" : "text-slate-600"}`}>
            Topographie, drone, scan 3D, GPR — nos ingénieurs déploient les technologies géospatiales les plus avancées sur chaque type de terrain pour transformer vos projets en données fiables et exploitables.
          </p>
        </div>
      </div>

      <ZoomParallax images={media} />

      <div className="section-divider" />
    </section>
  )
}
