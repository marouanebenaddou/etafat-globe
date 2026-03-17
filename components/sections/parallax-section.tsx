"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
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

const cyclingWords = ["la précision", "la fiabilité", "l'innovation", "l'expertise"]

export default function ParallaxSection() {
  const { ref, isVisible } = useScrollReveal()
  const { isDark } = useTheme()
  const [wordIndex, setWordIndex] = useState(0)

  useEffect(() => {
    const id = setTimeout(() => {
      setWordIndex(i => (i + 1) % cyclingWords.length)
    }, 2200)
    return () => clearTimeout(id)
  }, [wordIndex])

  const brandGrad = {
    background: "linear-gradient(135deg,#007BFF,#00669D)",
    WebkitBackgroundClip: "text" as const,
    WebkitTextFillColor: "transparent" as const,
    backgroundClip: "text" as const,
  }

  return (
    <section id="parallax" className="relative" style={{ background: isDark ? "linear-gradient(to bottom, transparent 0%, #07101f 55%)" : "linear-gradient(to bottom, #c5d9ec 0%, #dce8f5 15%, #eef4fb 40%, #f8fbff 70%, #ffffff 100%)" }}>
      <div className="relative">
        <div
          ref={ref}
          className={`relative z-10 pt-10 sm:pt-20 pb-16 text-center px-6 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className={`text-4xl sm:text-5xl font-black mb-4 ${isDark ? "text-white" : "text-slate-800"}`} style={isDark ? { textShadow: "0 2px 24px rgba(0,0,0,0.5)" } : undefined}>
            <span className="block">Partout où</span>
            {/* Animated cycling word — own centered line */}
            <span className="block relative" style={{ height: "1.25em", overflow: "hidden" }}>
              {cyclingWords.map((word, i) => (
                <motion.span
                  key={word}
                  className="absolute inset-0 flex items-center justify-center font-black"
                  style={brandGrad}
                  initial={{ opacity: 0, y: 40 }}
                  animate={
                    wordIndex === i
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: wordIndex > i ? -40 : 40 }
                  }
                  transition={{ type: "spring", stiffness: 80, damping: 18 }}
                >
                  {word}
                </motion.span>
              ))}
            </span>
            <span className="block">fait la{" "}<span style={brandGrad}>différence</span></span>
          </h2>
          <p className={`max-w-2xl mx-auto ${isDark ? "text-white/75" : "text-slate-500"}`}>
            Topographie, drone, scan 3D, GPR — nos ingénieurs déploient les technologies géospatiales les plus avancées sur chaque type de terrain pour transformer vos projets en données fiables et exploitables.
          </p>
        </div>
      </div>

      <ZoomParallax images={media} />

      <div className="section-divider" />
    </section>
  )
}
