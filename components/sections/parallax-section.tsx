"use client"

import dynamic from "next/dynamic"
import { useScrollReveal } from "@/lib/hooks"

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

  return (
    <section id="parallax" className="relative">
      {/* Header above the parallax */}
      <div
        ref={ref}
        className={`relative z-10 py-20 text-center px-6 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-[#007BFF]/10 border border-[#007BFF]/20 px-4 py-1.5 text-xs text-[#007BFF] uppercase tracking-widest mb-4">
          Notre terrain
        </div>
        <h2 className="text-4xl sm:text-5xl font-black t-head mb-4">
          Le Maroc de bout en bout
        </h2>
        <p className="t-body max-w-xl mx-auto">
          Faites défiler pour découvrir notre présence sur l&apos;ensemble du territoire marocain.
        </p>
      </div>

      <ZoomParallax images={media} />

      <div className="section-divider" />
    </section>
  )
}
