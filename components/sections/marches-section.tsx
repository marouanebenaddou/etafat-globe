"use client"

import { useScrollReveal } from "@/lib/hooks"
import { useTheme } from "@/lib/theme-context"
import { InteractiveImageAccordion, AccordionItemData } from "@/components/ui/interactive-image-accordion"
import { ArrowRight } from "lucide-react"

const marches: AccordionItemData[] = [
  {
    id: 1,
    title: "Infrastructures",
    subtitle: "Routes, ouvrages d'art, aéroports",
    imageUrl: "https://images.unsplash.com/photo-1545296664-39db72996ca6?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Aménagement du Territoire",
    subtitle: "Urbanisme, patrimoine, foncier",
    imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "Énergie & Mines",
    subtitle: "Carrières, énergies renouvelables",
    imageUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: 4,
    title: "Agriculture",
    subtitle: "Agriculture de précision, télédétection",
    imageUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: 5,
    title: "Cartographie",
    subtitle: "Orthophotos, MNT, BIM, 3D",
    imageUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1600&auto=format&fit=crop",
  },
]

export default function MarchesSection() {
  const { ref, isVisible } = useScrollReveal()
  const { isDark } = useTheme()

  return (
    <section className="py-24 sec-bg-b relative overflow-hidden" id="marches">
      {/* Background pattern */}
      <div className="absolute inset-0 moroccan-pattern opacity-10" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div
          ref={ref}
          className={`reveal text-center mb-14 ${isVisible ? "visible" : ""}`}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-widest uppercase mb-4 border"
            style={{
              color: "#007BFF",
              borderColor: "#007BFF30",
              background: isDark ? "rgba(0,123,255,0.08)" : "rgba(0,123,255,0.06)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#007BFF] animate-pulse" />
            Nos Marchés
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4"
            style={{ color: isDark ? "#fff" : "#0a1628" }}
          >
            Des solutions adaptées à{" "}
            <span style={{ color: "#007BFF" }}>chaque secteur</span>
          </h2>

          <p
            className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#4a6a85" }}
          >
            ETAFAT accompagne les acteurs publics et privés dans cinq grands secteurs
            d'activité avec une expertise géomatique complète et des technologies de pointe.
          </p>
        </div>

        {/* Accordion */}
        <div className="reveal" style={{ transitionDelay: "150ms" }}>
          <InteractiveImageAccordion
            items={marches}
            defaultActive={0}
            accentColor="#007BFF"
            className="justify-center"
          />
        </div>

        {/* CTA */}
        <div className="text-center mt-10 reveal" style={{ transitionDelay: "250ms" }}>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 hover:gap-3"
            style={{
              background: "#007BFF",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(0,123,255,0.3)",
            }}
          >
            Discuter de votre projet
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="section-divider" />
    </section>
  )
}
