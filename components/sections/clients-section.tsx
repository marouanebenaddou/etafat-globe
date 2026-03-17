"use client"

import { useScrollReveal } from "@/lib/hooks"
import { Building, Quote } from "lucide-react"

const clients = [
  { name: "OCP", sector: "Mines & Phosphates", color: "#f59e0b" },
  { name: "ONCF", sector: "Ferroviaire", color: "#007BFF" },
  { name: "ADM", sector: "Autoroutes du Maroc", color: "#10b981" },
  { name: "ONDA", sector: "Aéroports", color: "#8b5cf6" },
  { name: "MASEN", sector: "Énergie solaire", color: "#f97316" },
  { name: "Al Omrane", sector: "Immobilier & habitat", color: "#22d3ee" },
  { name: "ANCFCC", sector: "Conservation foncière", color: "#f43f5e" },
  { name: "Addoha", sector: "Promotion immobilière", color: "#a78bfa" },
  { name: "Amendis", sector: "Services urbains", color: "#34d399" },
  { name: "REDAL", sector: "Distribution eau & énergie", color: "#4da6ff" },
  { name: "ONEE", sector: "Eau & électricité", color: "#fbbf24" },
  { name: "Ministère de l'Équipement", sector: "Infrastructures nationales", color: "#e879f9" },
]

const sectors = [
  { name: "Infrastructure", count: "45%", color: "#007BFF" },
  { name: "Planification territoriale", count: "20%", color: "#22d3ee" },
  { name: "Énergie & Mines", count: "18%", color: "#f97316" },
  { name: "Agriculture & Eau", count: "17%", color: "#10b981" },
]

// Double the array for infinite marquee
const marqueeClients = [...clients, ...clients]

export default function ClientsSection() {
  const { ref, isVisible } = useScrollReveal()
  const { ref: sectorRef, isVisible: sectorVisible } = useScrollReveal(0.1)

  return (
    <section className="py-24 sec-bg-a relative overflow-hidden" id="clients">
      <div className="absolute inset-0 moroccan-pattern opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#007BFF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div ref={ref} className={`text-center mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-4 py-1.5 text-xs text-yellow-400 uppercase tracking-widest mb-4">
            <Building className="w-3.5 h-3.5" />
            Ils nous font confiance
          </div>
          <h2 className="text-4xl sm:text-5xl font-black t-head mb-4">
            Les grands acteurs du{" "}
            <span className="gradient-text-gold">développement africain</span>
          </h2>
          <p className="t-body max-w-2xl mx-auto">
            Etafat est le partenaire géospatial privilégié des plus grandes institutions, opérateurs publics et groupes privés du Maroc et d&apos;Afrique.
          </p>
        </div>

        {/* Testimonial */}
        <div className={`max-w-3xl mx-auto mb-16 glass-blue rounded-2xl p-8 text-center transition-all duration-700 delay-200 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
          <Quote className="w-8 h-8 text-[#007BFF]/50 mx-auto mb-4" />
          <p className="t-body text-lg italic leading-relaxed mb-4">
            &ldquo;Etafat nous a fourni des données géospatiales d&apos;une précision remarquable pour nos projets d&apos;infrastructure, dans des délais qu&apos;aucun autre prestataire n&apos;aurait pu tenir.&rdquo;
          </p>
          <div className="text-[#007BFF] font-semibold text-sm">Direction Technique — Grand compte national</div>
        </div>

        {/* Infinite marquee */}
        <div className="relative mb-12 overflow-hidden">
          {/* Left fade */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#000510] to-transparent z-10 pointer-events-none" />
          {/* Right fade */}
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#000510] to-transparent z-10 pointer-events-none" />

          <div className="flex animate-marquee gap-4" style={{ width: "max-content" }}>
            {marqueeClients.map((client, i) => (
              <div key={`${client.name}-${i}`}
                className="flex-shrink-0 glass rounded-xl px-6 py-4 hover:scale-105 transition-transform duration-300 group cursor-default"
                style={{ minWidth: "200px" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${client.color}20`, border: `1px solid ${client.color}30` }}>
                    <span className="text-xs font-black" style={{ color: client.color }}>
                      {client.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="t-head font-bold text-sm">{client.name}</div>
                    <div className="t-xmuted text-xs">{client.sector}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Second row — reverse */}
        <div className="relative overflow-hidden mb-16">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#000510] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#000510] to-transparent z-10 pointer-events-none" />
          <div className="flex gap-4" style={{ width: "max-content", animation: "marquee 40s linear infinite reverse" }}>
            {[...marqueeClients].reverse().map((client, i) => (
              <div key={`rev-${client.name}-${i}`}
                className="flex-shrink-0 glass rounded-xl px-5 py-3 hover:scale-105 transition-transform duration-300 group"
                style={{ minWidth: "180px" }}>
                <div className="text-white font-semibold text-sm">{client.name}</div>
                <div className="t-xmuted text-xs">{client.sector}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector breakdown */}
        <div ref={sectorRef} className={`transition-all duration-700 ${sectorVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h3 className="text-white font-bold text-center mb-8 text-xl">Répartition par secteur</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sectors.map((s, i) => (
              <div key={s.name}
                className={`reveal glass rounded-2xl p-5 text-center ${sectorVisible ? "is-visible" : ""}`}
                style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="text-3xl font-black mb-2" style={{ color: s.color }}>{s.count}</div>
                <div className="t-body text-sm font-medium mb-2">{s.name}</div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{
                      background: `linear-gradient(90deg, ${s.color}, ${s.color}80)`,
                      width: sectorVisible ? s.count : "0%",
                      transitionDelay: `${i * 150 + 300}ms`,
                    }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-divider mt-24" />
    </section>
  )
}
