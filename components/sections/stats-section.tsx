"use client"

import { useScrollReveal, useCountUp } from "@/lib/hooks"
import { useTheme } from "@/lib/theme-context"

const stats = [
  { value: 40,   suffix: "+", label: "Années d'expertise",   sublabel: "Fondée en 1983",             color: "from-[#007BFF] to-[#00669D]",    glow: "rgba(0,123,255,0.3)" },
  { value: 170,  suffix: "",  label: "Collaborateurs",        sublabel: "Ingénieurs & techniciens",    color: "from-cyan-400 to-cyan-600",       glow: "rgba(34,211,238,0.3)" },
  { value: 4,    suffix: "",  label: "Unités métier",         sublabel: "ETAFAT, ING, AFRIQUE, SÉNÉGAL", color: "from-purple-400 to-purple-600", glow: "rgba(139,92,246,0.3)" },
  { value: 8,    suffix: "+", label: "Pays d'intervention",   sublabel: "Maroc & Afrique",             color: "from-emerald-400 to-emerald-600", glow: "rgba(16,185,129,0.3)" },
  { value: 7,    suffix: "",  label: "Domaines d'expertise",  sublabel: "SIG, Foncier, BIM & plus",    color: "from-orange-400 to-orange-600",   glow: "rgba(249,115,22,0.3)" },
  { value: 1000, suffix: "+", label: "Projets réalisés",      sublabel: "À travers le continent",      color: "from-rose-400 to-rose-600",       glow: "rgba(244,63,94,0.3)" },
]

function StatCard({ stat, index }: { stat: typeof stats[0]; index: number }) {
  const { ref, isVisible } = useScrollReveal(0.15)
  const { isDark } = useTheme()
  const count = useCountUp(stat.value, 2400, isVisible)

  return (
    <div
      ref={ref}
      className="reveal"
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <div
        className="group relative rounded-2xl text-center overflow-hidden transition-all duration-500 hover:scale-105 cursor-default"
        style={{
          padding: "2.5rem 1.5rem",
          background: isDark
            ? "rgba(255,255,255,0.03)"
            : "rgba(255,255,255,0.85)",
          border: `1px solid ${isVisible ? stat.glow.replace("0.3", "0.25") : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
          boxShadow: isVisible ? `0 0 40px ${stat.glow.replace("0.3", "0.12")}` : "none",
          transition: "box-shadow 0.6s ease, border-color 0.6s ease, transform 0.3s ease",
        }}
      >
        {/* Top accent line */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-gradient-to-r ${stat.color} transition-all duration-700`}
          style={{ width: isVisible ? "80%" : "0%" }}
        />

        {/* Ambient glow blob */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${stat.color} rounded-2xl transition-opacity duration-500`}
          style={{ opacity: isVisible ? 0.05 : 0 }}
        />

        {/* Number */}
        <div
          className={`relative font-black bg-gradient-to-br ${stat.color} bg-clip-text text-transparent leading-none mb-3`}
          style={{
            fontSize: "clamp(3.5rem, 6vw, 5rem)",
            textShadow: "none",
            filter: isVisible ? `drop-shadow(0 0 24px ${stat.glow})` : "none",
            transition: "filter 0.8s ease",
          }}
        >
          {isVisible ? count : 0}{stat.suffix}
        </div>

        {/* Label */}
        <div className="t-head font-bold text-base mb-2 leading-tight">{stat.label}</div>

        {/* Sublabel */}
        <div className="t-xmuted text-xs leading-relaxed">{stat.sublabel}</div>

        {/* Bottom pulse line on hover */}
        <div
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-px rounded-full bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-60 transition-all duration-500`}
          style={{ width: "60%" }}
        />
      </div>
    </div>
  )
}

export default function StatsSection() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <section className="pt-20 pb-10 sm:pb-32 sec-bg-a relative overflow-hidden" id="stats">
      {/* Background */}
      <div className="absolute inset-0 moroccan-pattern opacity-30" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#007BFF]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div
          ref={ref}
          className={`text-center mb-20 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-[#007BFF]/10 border border-[#007BFF]/20 px-4 py-1.5 text-xs text-[#007BFF] uppercase tracking-widest mb-5">
            Etafat en chiffres
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black t-head mb-5">
            4 décennies de{" "}
            <span className="gradient-text">confiance</span>
          </h2>
          <p className="t-body max-w-2xl mx-auto text-lg">
            Depuis 1983, nous bâtissons une expertise reconnue sur le continent africain, servant les plus grands acteurs publics et privés.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </div>
      </div>

      <div className="section-divider mt-10 sm:mt-32" />
    </section>
  )
}
