"use client"

import { useScrollReveal } from "@/lib/hooks"
import { useTheme } from "@/lib/theme-context"
import { CheckCircle2, Globe, Users, Award, TrendingUp } from "lucide-react"

const milestones = [
  { year: "1983", title: "Fondation", desc: "Création d'Etafat à Rabat par des ingénieurs topographes visionnaires", color: "#007BFF" },
  { year: "1995", title: "Expansion nationale", desc: "Ouverture d'agences à travers tout le Maroc et premiers grands projets d'infrastructure", color: "#00669D" },
  { year: "2005", title: "Révolution SIG", desc: "Intégration des systèmes d'information géographique et technologies GPS avancées", color: "#8b5cf6" },
  { year: "2012", title: "Etafat Afrique", desc: "Expansion continentale avec l'ouverture d'Etafat Côte d'Ivoire et développement en Afrique subsaharienne", color: "#10b981" },
  { year: "2018", title: "Innovation LiDAR & Drones", desc: "Adoption massive des technologies LiDAR, drones et mobile mapping, positionnant Etafat à l'avant-garde", color: "#f97316" },
  { year: "2024", title: "Etafat Sénégal & BIM", desc: "Nouvelle expansion sénégalaise et lancement de l'offre BIM digital et jumeaux numériques", color: "#f43f5e" },
  { year: "2025", title: "Premier projet en Asie", desc: "Franchissement d'une nouvelle frontière avec le premier projet géospatial d'Etafat déployé en Asie", color: "#22d3ee" },
]

const strengths = [
  "170 ingénieurs et techniciens spécialisés",
  "Parc instrumental de dernière génération",
  "Certifications internationales ISO",
  "Partenariats avec les plus grands groupes",
  "Académie de formation intégrée",
  "Présence dans 8+ pays africains",
]

const units = [
  { name: "ETAFAT", desc: "Géomatique & topographie", banner: "/images/flag-morocco.png", color: "#007BFF" },
  { name: "ETAFAT ING", desc: "Ingénierie & conseil", banner: "/images/banner-ing.png", color: "#00669D" },
  { name: "ETAFAT AFRIQUE", desc: "Côte d'Ivoire & Afrique", banner: "/images/flag-ivory-coast.png", color: "#10b981" },
  { name: "ETAFAT SÉNÉGAL", desc: "Sénégal & Afrique de l'Ouest", banner: "/images/flag-senegal.png", color: "#f97316" },
]

export default function AboutSection() {
  const { isDark } = useTheme()
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal(0.12, true)
  const { ref: leftRef, isVisible: leftVisible } = useScrollReveal(0.1, true)
  const { ref: rightRef, isVisible: rightVisible } = useScrollReveal(0.1, true)

  return (
    <section className="py-24 sec-bg-b relative overflow-hidden" id="about">
      <div className="absolute inset-0 moroccan-pattern opacity-20" />
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#007BFF]/5 to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className={`text-center mb-20 transition-all duration-700 ${headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-xs text-emerald-400 uppercase tracking-widest mb-4">
            Notre histoire
          </div>
          <h2 className="text-4xl sm:text-5xl font-black t-head mb-4">
            40 ans de passion pour{" "}
            <span className="gradient-text">la géographie</span>
          </h2>
          <p className="t-body max-w-2xl mx-auto">
            Fondée en 1983, Etafat s&apos;est imposée comme le leader marocain et africain des solutions géospatiales, en combinant expertise humaine et innovation technologique.
          </p>
        </div>

        {/* Two columns: left = strengths + units, right = timeline */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left column */}
          <div
            ref={leftRef}
            className={`transition-all duration-800 ${leftVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"}`}
          >
            {/* Mission statement */}
            <div className="glass-blue rounded-2xl p-8 mb-8">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                  <Globe className="w-6 h-6 text-[#007BFF]" />
                </div>
                <div>
                  <h3 className="t-head font-bold text-xl mb-2">Notre mission</h3>
                  <p className="t-body text-sm leading-relaxed">
                    Révéler le potentiel des territoires africains grâce à des solutions géospatiales de précision, contribuant ainsi au développement durable du continent.
                  </p>
                </div>
              </div>
              <blockquote className="border-l-2 border-blue-500/40 pl-4 t-muted text-sm italic">
                &ldquo;Nous ne faisons pas que cartographier des territoires — nous construisons les fondations digitales de leur avenir.&rdquo;
              </blockquote>
            </div>

            {/* Strengths */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-yellow-400" />
                <h3 className="t-head font-bold">Nos atouts</h3>
              </div>
              <ul className="space-y-2.5">
                {strengths.map((s, i) => (
                  <li key={i} className={`flex items-center gap-3 reveal ${leftVisible ? "is-visible" : ""}`}
                    style={{ transitionDelay: `${i * 80 + 200}ms` }}>
                    <CheckCircle2 className="w-4 h-4 text-[#007BFF] flex-shrink-0" />
                    <span className="t-body text-sm">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Business units */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <h3 className="t-head font-bold">Nos 4 unités métier</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {units.map((u, i) => (
                  <div key={u.name}
                    className={`reveal glass rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300 ${leftVisible ? "is-visible" : ""}`}
                    style={{ transitionDelay: `${i * 100 + 400}ms` }}>
                    <img src={u.banner} alt={u.name} className="w-full h-12 object-cover" />
                    <div className="p-3">
                      <div className="t-head font-bold text-xs">{u.name}</div>
                      <div className="t-xmuted text-xs">{u.desc}</div>
                      <div className="mt-2 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${u.color}, transparent)` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Timeline */}
          <div
            ref={rightRef}
            className={`transition-all duration-800 ${rightVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}`}
          >
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-purple-400" />
              <h3 className="t-head font-bold">Notre parcours</h3>
            </div>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-purple-500/30 to-transparent" />

              <div className="space-y-6">
                {milestones.map((m, i) => (
                  <div key={m.year}
                    className={`reveal flex gap-5 ${rightVisible ? "is-visible" : ""}`}
                    style={{ transitionDelay: `${i * 100 + 100}ms` }}>
                    {/* Dot */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 hover:scale-110"
                        style={{
                          background: `${m.color}15`,
                          borderColor: `${m.color}50`,
                        }}>
                        <span className="text-xs font-black" style={{ color: m.color }}>{m.year}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="glass rounded-xl p-4 flex-1 hover:border-white/15 transition-all duration-300 hover:-translate-y-0.5">
                      <div className="font-bold t-head text-sm mb-1">{m.title}</div>
                      <div className="t-muted text-xs leading-relaxed">{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-divider mt-24" />
    </section>
  )
}
