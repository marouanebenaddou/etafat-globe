"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"

const tiles = [
  {
    src: "https://images.unsplash.com/photo-1628158145409-9e222b56cc0b?q=80&w=1200&auto=format&fit=crop",
    label: "Sur le terrain",
    quote: "Nos ingénieurs arpentent chaque territoire, par tous les temps, pour que vos données soient justes.",
    sub: "Levé & acquisition",
  },
  {
    src: "https://images.unsplash.com/photo-1764983254831-1559ff0870d3?q=80&w=1200&auto=format&fit=crop",
    label: "Une équipe engagée",
    quote: "170 collaborateurs animés d'une même conviction : la géographie est au service de l'humain.",
    sub: "Nos hommes & femmes",
  },
  {
    src: "https://images.unsplash.com/photo-1538230575309-59dfc388ae36?q=80&w=1200&auto=format&fit=crop",
    label: "40 ans d'histoire",
    quote: "Quatre décennies de confiance bâties projet après projet, territoire après territoire.",
    sub: "Depuis 1983",
  },
  {
    src: "https://images.unsplash.com/photo-1618265317491-8b7b2324320e?q=80&w=1200&auto=format&fit=crop",
    label: "Présents à vos côtés",
    quote: "Du Maroc au Mali, de Dakar à Abidjan — là où vous avez besoin de nous, nous sommes.",
    sub: "4 pays · Afrique & au-delà",
  },
  {
    src: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1200&auto=format&fit=crop",
    label: "Transmettre le savoir",
    quote: "Former les jeunes ingénieurs africains, c'est investir dans les territoires de demain.",
    sub: "Académie Etafat",
  },
  {
    src: "https://images.unsplash.com/photo-1476385822777-70eabacbd41f?q=80&w=1200&auto=format&fit=crop",
    label: "Cartographier l'avenir",
    quote: "Chaque carte produite est une promesse : un territoire mieux compris, mieux décidé.",
    sub: "Notre vision",
  },
]

export default function ImageGallery() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section className="w-full py-24" style={{ background: "#07101f" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Header */}
        <div className="max-w-2xl mb-14">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-0.5 bg-[#007BFF]" />
            <span className="text-[#007BFF] text-[11px] font-bold tracking-[0.22em] uppercase">Qui nous sommes</span>
          </div>
          <h2 style={{ fontSize: "clamp(2rem,3.5vw,2.75rem)", fontWeight: 900, color: "#fff", lineHeight: 1.1, marginBottom: "1.1rem" }}>
            Des hommes et des femmes<br />au service du territoire
          </h2>
          <p className="text-white/45 text-[15px] leading-relaxed" style={{ maxWidth: 480 }}>
            Derrière chaque levé, chaque carte, chaque modèle 3D, il y a une équipe qui s'investit. Voici quelques-uns de leurs visages.
          </p>
        </div>

        {/* Gallery */}
        <div className="flex items-stretch gap-2.5 w-full" style={{ height: "clamp(340px, 46vw, 520px)" }}>
          {tiles.map((tile, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "relative rounded-xl overflow-hidden cursor-pointer flex-shrink-0",
                "transition-all duration-500 ease-[cubic-bezier(0.25,1,0.2,1)]",
              )}
              style={{
                flexGrow: hovered === idx ? 5 : 1,
                minWidth: 56,
              }}
            >
              {/* Image */}
              <img
                src={tile.src}
                alt={tile.label}
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700"
                style={{ transform: hovered === idx ? "scale(1.06)" : "scale(1)" }}
              />

              {/* Always-on dark scrim */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,14,32,0.85) 0%, rgba(5,14,32,0.15) 60%, transparent 100%)" }} />

              {/* Collapsed label — vertical text */}
              <div
                className="absolute inset-0 flex items-end justify-center pb-5 transition-opacity duration-300"
                style={{ opacity: hovered === idx ? 0 : 1 }}
              >
                <span
                  className="text-white/70 text-[11px] font-semibold tracking-[0.18em] uppercase whitespace-nowrap"
                  style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
                >
                  {tile.label}
                </span>
              </div>

              {/* Expanded content */}
              <div
                className="absolute inset-0 flex flex-col justify-end p-7 transition-all duration-400"
                style={{
                  opacity: hovered === idx ? 1 : 0,
                  transform: hovered === idx ? "translateY(0)" : "translateY(12px)",
                  transitionDuration: "350ms",
                }}
              >
                <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/50 mb-2">{tile.sub}</span>
                <h3 className="text-white font-black mb-2.5" style={{ fontSize: "clamp(1rem,1.6vw,1.25rem)", lineHeight: 1.2 }}>
                  {tile.label}
                </h3>
                <p className="text-white/65 text-[13px] leading-relaxed" style={{ maxWidth: 260 }}>
                  {tile.quote}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
