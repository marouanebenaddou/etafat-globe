"use client"

import dynamic from "next/dynamic"
import { useScrollReveal } from "@/lib/hooks"

const ZoomParallax = dynamic(
  () => import("@/components/ui/zoom-parallax").then(m => m.ZoomParallax),
  { ssr: false }
)

const media = [
  // index 0 — center, zooms deepest: drone video of Morocco/Rabat
  {
    type: "video" as const,
    src: "/morocco.mp4",
    alt: "Vue aérienne du Maroc",
  },
  // index 1 — top-left wide: drone in flight over terrain
  {
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&h=600&fit=crop&auto=format&q=80",
    alt: "Drone en vol",
  },
  // index 2 — top-left tall: GPS surveying in the field
  {
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&h=900&fit=crop&auto=format&q=80",
    alt: "Relevé topographique GPS",
  },
  // index 3 — center-right: Morocco aerial city view
  {
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=900&h=600&fit=crop&auto=format&q=80",
    alt: "Vue aérienne Marrakech",
  },
  // index 4 — bottom-left: field surveying team
  {
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=700&h=500&fit=crop&auto=format&q=80",
    alt: "Équipe de terrain",
  },
  // index 5 — bottom wide: atlas mountains Morocco
  {
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1553603227-2358aabe821e?w=900&h=500&fit=crop&auto=format&q=80",
    alt: "Montagne Atlas Maroc",
  },
  // index 6 — bottom-right small: technical engineering
  {
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop&auto=format&q=80",
    alt: "Ingénierie géospatiale",
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
