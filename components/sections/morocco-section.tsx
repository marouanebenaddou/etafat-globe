"use client"

import dynamic from "next/dynamic"
import { MapPin } from "lucide-react"

const HeroScrollVideo = dynamic(
  () => import("@/components/ui/scroll-animated-video"),
  { ssr: false }
)

export default function MoroccoSection() {
  return (
    <section id="morocco" className="sec-bg-a">
      <HeroScrollVideo
        title="Le Maroc, notre territoire"
        subtitle="Présence nationale · 40 ans d'expertise"
        meta="Rabat · Casablanca · Marrakech · Agadir"
        media="/morocco.mp4"
        initialBoxSize={380}
        targetSize="fullscreen"
        scrollHeightVh={260}
        showHeroExitAnimation={true}
        smoothScroll={false}
        overlay={{
          caption: "ETAFAT · MAROC",
          heading: "De Tanger à Lagouira",
          paragraphs: [
            "Depuis 1983, Etafat couvre l'ensemble du territoire marocain avec ses équipes de géomètres, ingénieurs et experts géospatials.",
            "170 professionnels déployés sur le terrain pour cartographier, mesurer et numériser le Maroc de demain.",
          ],
          extra: (
            <div className="flex items-center justify-center gap-2 mt-2 text-sm font-mono text-white/70">
              <MapPin className="w-3.5 h-3.5 text-[#4da6ff]" />
              <span>8+ pays · 500+ projets · 40 ans d&apos;expertise</span>
            </div>
          ),
        }}
        eases={{ container: "expo.out", overlay: "expo.out", text: "power3.inOut" }}
      />
    </section>
  )
}
