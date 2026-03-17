"use client"

import { ArrowRight, MapPin } from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import ThemeToggle from "@/components/ui/theme-toggle"
import { Hero } from "@/components/ui/hero-1"
import { useCountUp } from "@/lib/hooks"

// ── Hero stats ───────────────────────────────────────────────
const heroStats = [
  { target: 40,  suffix: "+", label: "Années d'expertise" },
  { target: 170, suffix: "",  label: "Experts & ingénieurs" },
  { target: 4,   suffix: "",  label: "Unités métier" },
  { target: 8,   suffix: "+", label: "Pays d'intervention" },
]

function HeroStatCard({ stat, isDark }: { stat: typeof heroStats[0]; isDark: boolean }) {
  const count = useCountUp(stat.target, 2000, true)
  return (
    <div className="text-center glass rounded-2xl p-5">
      <div
        className={`font-black mb-1 ${isDark ? "text-white" : "text-[#003d6b]"}`}
        style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
      >
        {count}{stat.suffix}
      </div>
      <div className={`text-xs ${isDark ? "text-white/50" : "text-[#3d5a75]"}`}>
        {stat.label}
      </div>
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────
export default function EtafatHero() {
  const { isDark } = useTheme()

  return (
    <div className="relative w-full overflow-hidden" id="home">

      {/* ── Navbar ── */}
      <nav className={`absolute top-0 left-0 right-0 z-20 w-full border-b transition-colors duration-500 ${isDark ? "border-white/5 bg-black/20 backdrop-blur-md" : "border-[#007BFF]/10 bg-white/60 backdrop-blur-md"}`}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <a href="#home" className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://etafat.ma/wp-content/themes/etafat/assets/images/logo.png"
                alt="Etafat"
                className={`h-12 w-auto object-contain transition-all duration-500 ${isDark ? "brightness-0 invert" : ""}`}
              />
            </a>

            {/* Nav pills */}
            <div className={`hidden lg:flex items-center space-x-1 rounded-full p-1 backdrop-blur-xl border transition-colors duration-500 ${isDark ? "bg-white/5 border-white/10" : "bg-white/70 border-blue-100 shadow-sm"}`}>
              {["Accueil", "Services", "Technologies", "À Propos", "Académie", "Contact"].map(item => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(" ", "").replace("à", "a")}`}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${isDark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-[#007BFF]/5 hover:text-[#007BFF]"}`}
                >
                  {item}
                </a>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a
                href="#contact"
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#007BFF] hover:bg-[#00669D] text-white text-sm font-semibold transition-all duration-300 shadow-lg shadow-[#007BFF]/30 hover:scale-105"
              >
                Contactez-nous <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero section ── */}
      <Hero
        eyebrow="Maroc & Afrique — Depuis 1983"
        title="Révélons le potentiel de vos territoires"
        subtitle="Leader en solutions géospatiales, topographie et SIG. Nous transformons les données territoriales en décisions stratégiques — du drone au rapport final."
        ctaLabel="Découvrir nos solutions"
        ctaHref="#services"
      />

      {/* ── Stats row ── */}
      <div className={`relative z-10 pb-20 pt-4 transition-colors duration-500 ${isDark ? "bg-black" : "bg-[#eef4ff]"}`}>
        <div className="mx-auto max-w-3xl px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {heroStats.map(s => (
              <HeroStatCard key={s.label} stat={s} isDark={isDark} />
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
