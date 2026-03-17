"use client"

import { useScrollReveal } from "@/lib/hooks"
import { useTheme } from "@/lib/theme-context"
import { GraduationCap, BookOpen, Users, Award, ArrowRight, CheckCircle, Monitor, MapIcon } from "lucide-react"

const programs = [
  {
    icon: MapIcon,
    title: "Géomatique & SIG",
    duration: "5 jours",
    level: "Tous niveaux",
    description: "Maîtrise des outils SIG (QGIS, ArcGIS), création de cartes et analyse spatiale.",
    color: "#007BFF",
  },
  {
    icon: Monitor,
    title: "BIM & Scan-to-BIM",
    duration: "3 jours",
    level: "Intermédiaire",
    description: "Introduction au BIM, scan laser 3D et création de maquettes numériques avec Revit et Autodesk.",
    color: "#8b5cf6",
  },
  {
    icon: Award,
    title: "Topographie avancée",
    duration: "10 jours",
    level: "Professionnel",
    description: "Levés GPS/GNSS RTK, traitement de nuages de points et restitution topographique de précision.",
    color: "#10b981",
  },
  {
    icon: BookOpen,
    title: "Drone & Photogrammétrie",
    duration: "4 jours",
    level: "Tous niveaux",
    description: "Pilotage professionnel de drones, acquisition et traitement photogrammétrique pour la cartographie.",
    color: "#f97316",
  },
]

const benefits = [
  "Formateurs experts terrain avec 20+ ans d'expérience",
  "Travaux pratiques sur équipements réels",
  "Certifications reconnues par l'industrie",
  "Petits groupes — maximum 8 participants",
  "Support post-formation inclus",
  "Formations sur mesure pour entreprises",
]

export default function AcademySection() {
  const { isDark } = useTheme()
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal(0.12, true)
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollReveal(0.1, true)

  return (
    <section className="py-24 sec-bg-b relative overflow-hidden" id="académie">
      {/* Background decoration */}
      <div className="absolute inset-0 moroccan-pattern opacity-20" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none animate-blob" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#007BFF]/8 rounded-full blur-3xl pointer-events-none animate-blob" style={{ animationDelay: "4s" }} />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className={`text-center mb-16 transition-all duration-700 ${headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-4 py-1.5 text-xs text-yellow-400 uppercase tracking-widest mb-4">
            <GraduationCap className="w-3.5 h-3.5" />
            Etafat Académie
          </div>
          <h2 className="text-4xl sm:text-5xl font-black t-head mb-4">
            Développez votre expertise{" "}
            <span className="gradient-text-gold">géospatiale</span>
          </h2>
          <p className="t-body max-w-2xl mx-auto text-lg">
            L&apos;Académie Etafat propose des formations certifiantes en géomatique, topographie et technologies géospatiales, dispensées par nos experts terrain.
          </p>
        </div>

        {/* Two columns layout */}
        <div className="grid lg:grid-cols-5 gap-12 items-start">

          {/* Left: Programs */}
          <div ref={cardsRef} className="lg:col-span-3">
            <h3 className="t-head font-bold text-lg mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-yellow-400" />
              Programmes de formation
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {programs.map((p, i) => {
                const Icon = p.icon
                return (
                  <div key={p.title}
                    className={`reveal glass rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 group cursor-default ${cardsVisible ? "is-visible" : ""}`}
                    style={{ transitionDelay: `${i * 100}ms` }}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${p.color}20`, border: `1px solid ${p.color}30` }}>
                        <Icon className="w-5 h-5" style={{ color: p.color }} />
                      </div>
                      <div>
                        <h4 className="t-head font-bold text-sm">{p.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: `${p.color}15`, color: p.color, border: `1px solid ${p.color}25` }}>
                            {p.duration}
                          </span>
                          <span className="t-xmuted text-xs">{p.level}</span>
                        </div>
                      </div>
                    </div>
                    <p className="t-muted text-xs leading-relaxed">{p.description}</p>
                  </div>
                )
              })}
            </div>

            {/* Stats row */}
            <div className={`grid grid-cols-3 gap-4 mt-6 transition-all duration-700 delay-500 ${cardsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              {[
                { icon: Users, value: "500+", label: "Professionnels formés", color: "#007BFF" },
                { icon: Award, value: "20+", label: "Certifications délivrées", color: "#f97316" },
                { icon: BookOpen, value: "15+", label: "Programmes actifs", color: "#10b981" },
              ].map((s) => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="glass rounded-xl p-4 text-center">
                    <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: s.color }} />
                    <div className="t-head font-black text-xl">{s.value}</div>
                    <div className="t-xmuted text-xs">{s.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: Benefits + CTA */}
          <div className="lg:col-span-2">
            <div className={`glass-blue rounded-2xl p-8 mb-6 transition-all duration-800 delay-300 ${headerVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}`}>
              <h3 className="t-head font-bold text-lg mb-5">Pourquoi choisir Etafat Académie ?</h3>
              <ul className="space-y-3">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span className="t-body text-sm">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA card */}
            <div className={`relative overflow-hidden rounded-2xl p-8 transition-all duration-800 delay-500 ${headerVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}`}
              style={{
                background: "linear-gradient(135deg, #1a2e4a, #0d1f35)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}>
              {/* Decorative circles */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#007BFF]/10 rounded-full blur-xl" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-yellow-500/10 rounded-full blur-xl" />

              <GraduationCap className="w-10 h-10 text-yellow-400 mb-4" />
              <h4 className="text-white font-black text-xl mb-2">Inscrivez votre équipe</h4>
              <p className="text-white/75 text-sm mb-6">
                Formations inter et intra-entreprises disponibles. Devis personnalisé sous 48h.
              </p>
              <a href="#contact"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-all duration-300 hover:scale-105 shadow-lg shadow-yellow-500/30">
                Demander un devis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="section-divider mt-24" />
    </section>
  )
}
