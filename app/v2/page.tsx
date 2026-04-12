"use client"

import { useState, useEffect, useRef } from "react"
import {
  Crosshair, Layers, ScanLine, Briefcase, Box, Database,
  Route, Building2, Zap, Sprout, Landmark, Globe,
  Target, SlidersHorizontal, ShieldCheck,
  MapPin, Phone, Mail, ArrowRight,
  ChevronRight, Menu, X, Award, Users,
} from "lucide-react"

/* ─── DATA ──────────────────────────────────────────────── */
const savoirFaire = [
  {
    Icon: Crosshair,
    title: "Topographie & Foncier",
    desc: "Levés de précision, bornages et opérations cadastrales pour sécuriser votre patrimoine territorial.",
    result: "Litiges fonciers évités, patrimoine sécurisé",
    color: "#007BFF",
  },
  {
    Icon: Layers,
    title: "Systèmes d'Information Géographique",
    desc: "Plateformes SIG sur-mesure qui transforment vos données spatiales en outils de décision et de pilotage.",
    result: "Décisions éclairées, pilotage simplifié",
    color: "#0057b8",
  },
  {
    Icon: ScanLine,
    title: "Acquisition Aérienne & LiDAR",
    desc: "Cartographie à grande échelle par drone et capteur laser aéroporté. Précision centimétrique garantie.",
    result: "Couverture rapide, données fiables",
    color: "#00669D",
  },
  {
    Icon: Briefcase,
    title: "Conseil & Ingénierie",
    desc: "Accompagnement en AMO, études de faisabilité et pilotage de projets d'infrastructure pour maîtres d'ouvrage.",
    result: "Projets maîtrisés, délais respectés",
    color: "#007BFF",
  },
  {
    Icon: Box,
    title: "Modélisation 3D & BIM",
    desc: "Jumeaux numériques, maquettes BIM et modèles 3D pour visualiser, coordonner et exécuter vos projets.",
    result: "Erreurs réduites, coûts maîtrisés",
    color: "#0057b8",
  },
  {
    Icon: Database,
    title: "Ingénierie des Données",
    desc: "Structuration, exploitation et valorisation de vos données géospatiales via des pipelines robustes.",
    result: "Données exploitables, valeur créée",
    color: "#00669D",
  },
]

const domaines = [
  { Icon: Route,      label: "Infrastructures",          sub: "Routes, ouvrages d'art, aéroports, ports",         color: "#007BFF" },
  { Icon: Building2,  label: "Aménagement du territoire", sub: "Urbanisme, patrimoine, planification foncière",      color: "#0057b8" },
  { Icon: Zap,        label: "Énergie & Mines",           sub: "Énergies renouvelables, carrières, réseaux",         color: "#00669D" },
  { Icon: Sprout,     label: "Agriculture & Eau",         sub: "Agriculture de précision, irrigation, hydrologie",   color: "#007BFF" },
  { Icon: Landmark,   label: "Bâtiment & Patrimoine",     sub: "Réhabilitation, conservation, scan bâtiment",        color: "#0057b8" },
  { Icon: Globe,      label: "International",             sub: "Maroc, Côte d'Ivoire, Sénégal, Asie",               color: "#00669D" },
]

const stats = [
  { value: 40,  prefix: "+", suffix: " ans", label: "d'expertise",       sub: "Fondée à Rabat en 1983" },
  { value: 170, prefix: "",  suffix: "",      label: "collaborateurs",    sub: "Ingénieurs & techniciens" },
  { value: 4,   prefix: "",  suffix: "",      label: "entités du groupe", sub: "Maroc, CI, Sénégal, Asie" },
  { value: 500, prefix: "+", suffix: "",      label: "projets réalisés",  sub: "En Afrique et au-delà" },
]

const clients = ["OCP", "ONCF", "ADM", "ONDA", "MASEN", "Al Omrane", "ANCFCC", "Addoha", "Amendis", "REDAL", "ONEE", "Min. Équipement"]

const engagements = [
  { Icon: Target,            title: "Expertise locale, vision globale",  desc: "40 ans d'ancrage au Maroc et en Afrique, avec des standards internationaux et des partenariats avec les leaders mondiaux de la géospatiale." },
  { Icon: SlidersHorizontal, title: "Solutions sur-mesure",              desc: "Chaque projet est unique. Nos équipes conçoivent des réponses adaptées à vos contraintes terrain, réglementaires et budgétaires." },
  { Icon: ShieldCheck,       title: "Engagement qualité",                desc: "Certifiés et agréés, nos livrables respectent les normes les plus strictes. Précision, fiabilité et traçabilité sont nos garanties." },
]

/* ─── HOOKS ─────────────────────────────────────────────── */
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold, rootMargin: "0px 0px 80px 0px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function useCountUp(target: number, active: boolean, duration = 1800) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(step)
      else setCount(target)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])
  return count
}

/* ─── COMPONENTS ─────────────────────────────────────────── */
function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ text, center = false }: { text: string; center?: boolean }) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} className={`flex items-center gap-3 mb-5 ${center ? "justify-center" : ""}`}>
      <div style={{
        width: visible ? 28 : 0, height: 2, background: "#007BFF",
        transition: "width 0.55s cubic-bezier(0.16,1,0.3,1)",
      }} />
      <span className="text-[#007BFF] text-[11px] font-bold tracking-[0.22em] uppercase" style={{
        opacity: visible ? 1 : 0, transition: "opacity 0.5s ease 0.28s",
      }}>{text}</span>
      {center && <div style={{
        width: visible ? 28 : 0, height: 2, background: "#007BFF",
        transition: "width 0.55s cubic-bezier(0.16,1,0.3,1) 0.08s",
      }} />}
    </div>
  )
}

function StatCard({ value, prefix, suffix, label, sub, active }: { value: number; prefix: string; suffix: string; label: string; sub: string; active: boolean }) {
  const counted = useCountUp(value, active)
  return (
    <div className="text-center" style={{ opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
      <div className="text-5xl lg:text-6xl font-black text-white mb-2">{prefix}{counted}{suffix}</div>
      <div className="text-base font-semibold text-white/90 mb-1">{label}</div>
      <div className="text-sm text-white/45">{sub}</div>
    </div>
  )
}

/* ─── PAGE ───────────────────────────────────────────────── */
export default function EtafatV2() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [heroVisible, setHeroVisible] = useState(false)
  const { ref: statsRef, visible: statsVisible } = useReveal(0.25)

  useEffect(() => {
    const onScroll = () => { setScrolled(window.scrollY > 30); setScrollY(window.scrollY) }
    window.addEventListener("scroll", onScroll, { passive: true })
    const t = setTimeout(() => setHeroVisible(true), 80)
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(t) }
  }, [])

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMobileOpen(false) }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif" }}>

      {/* ── GLOBAL KEYFRAMES ── */}
      <style>{`
        @keyframes v2-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes v2-marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes v2-pulse   { 0%{opacity:.5;transform:scale(1)} 100%{opacity:0;transform:scale(1.9)} }
        @keyframes v2-fadeup  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .v2-link:hover .v2-arrow { transform: translateX(4px); }
        .v2-arrow { transition: transform 0.2s ease; display: inline-block; }
        .v2-card { transition: box-shadow 0.3s ease, border-color 0.3s ease, transform 0.25s ease; }
        .v2-card:hover { transform: translateY(-3px); border-color: rgba(0,123,255,0.2) !important; box-shadow: 0 12px 48px rgba(0,123,255,0.10); }
        .v2-domain:hover { background: linear-gradient(135deg, rgba(0,123,255,0.04), rgba(0,123,255,0.01)); }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.98)",
        backdropFilter: "blur(14px)",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,0.07)" : "1px solid transparent",
        boxShadow: scrolled ? "0 2px 24px rgba(0,0,0,0.06)" : "none",
        transition: "all 0.35s ease",
      }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-[72px]">
            <img src="https://etafat.ma/wp-content/themes/etafat/assets/images/logo.png" alt="Etafat" className="h-8" />
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: "Savoir-faire", id: "savoir-faire" },
                { label: "Domaines", id: "domaines" },
                { label: "Références", id: "references" },
                { label: "À propos", id: "stats" },
                { label: "Contact", id: "contact" },
              ].map(item => (
                <button key={item.id} onClick={() => scrollTo(item.id)}
                  className="relative text-[13px] font-medium text-slate-600 hover:text-[#007BFF] transition-colors duration-200 group py-1">
                  {item.label}
                  <span className="absolute -bottom-0 left-0 w-0 h-[1.5px] bg-[#007BFF] group-hover:w-full transition-all duration-300 rounded-full" />
                </button>
              ))}
              <button onClick={() => scrollTo("contact")}
                className="bg-[#007BFF] hover:bg-[#0057b8] text-white text-[13px] font-semibold px-5 py-2.5 rounded-md transition-all duration-200 hover:shadow-lg hover:shadow-[#007BFF]/20 hover:-translate-y-px">
                Nous contacter
              </button>
            </div>
            <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-72" : "max-h-0"}`}>
          <div className="bg-white border-t border-slate-100 px-6 py-4 space-y-0.5">
            {[{ label: "Savoir-faire", id: "savoir-faire" }, { label: "Domaines", id: "domaines" }, { label: "Références", id: "references" }, { label: "À propos", id: "stats" }, { label: "Contact", id: "contact" }].map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)} className="block w-full text-left text-sm font-medium text-slate-700 py-3 hover:text-[#007BFF] transition-colors border-b border-slate-50 last:border-0">
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
        {/* Parallax BG */}
        <div className="absolute inset-0" style={{ transform: `translateY(${scrollY * 0.3}px)` }}>
          <img src="https://etafat.ma/wp-content/uploads/2021/01/ingenieurie_infrastructure.jpg"
            alt="" className="w-full h-full object-cover scale-110" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(5,14,32,0.93) 0%, rgba(5,14,32,0.78) 45%, rgba(5,14,32,0.35) 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,14,32,0.55), transparent 55%)" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-24 w-full">
          <div className="max-w-[640px]">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-10" style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(14px)", transition: "all 0.65s ease 0.08s" }}>
              <div className="relative w-2 h-2">
                <div className="absolute inset-0 rounded-full bg-[#007BFF]" />
                <div className="absolute inset-0 rounded-full bg-[#007BFF]" style={{ animation: "v2-pulse 2s ease-out infinite" }} />
              </div>
              <span className="text-white/70 text-[11px] font-semibold tracking-[0.22em] uppercase">Depuis 1983 — Maroc & Afrique</span>
            </div>

            {/* Headline */}
            <h1 style={{ fontSize: "clamp(2.6rem,5vw,4.2rem)", fontWeight: 900, lineHeight: 1.05, color: "#fff", marginBottom: "1.5rem" }}>
              {["Vos territoires,", "notre"].map((line, i) => (
                <span key={i} className="block" style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(22px)", transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${0.18 + i * 0.11}s` }}>
                  {line}
                </span>
              ))}
              <span className="block" style={{ color: "#007BFF", opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(22px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s" }}>
                expertise.
              </span>
            </h1>

            <p className="text-white/65 leading-relaxed mb-10 text-[1.05rem]" style={{ maxWidth: 520, opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(14px)", transition: "all 0.7s ease 0.52s" }}>
              Etafat accompagne institutions, opérateurs et entreprises dans la mesure, l'analyse et la valorisation de leurs données géospatiales — pour des décisions mieux fondées et des projets mieux maîtrisés.
            </p>

            <div className="flex flex-wrap gap-4" style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(14px)", transition: "all 0.7s ease 0.62s" }}>
              <button onClick={() => scrollTo("savoir-faire")}
                className="bg-[#007BFF] hover:bg-[#0057b8] text-white font-semibold px-8 py-[14px] rounded-md text-sm transition-all duration-200 hover:shadow-xl hover:shadow-[#007BFF]/30 hover:-translate-y-px flex items-center gap-2">
                Découvrir notre savoir-faire <ArrowRight size={15} />
              </button>
              <button onClick={() => scrollTo("contact")}
                className="border border-white/25 hover:border-white/55 hover:bg-white/8 text-white font-semibold px-8 py-[14px] rounded-md text-sm transition-all duration-200">
                Nous contacter
              </button>
            </div>

            {/* Mini stats */}
            <div className="flex flex-wrap gap-10 mt-16 pt-10 border-t border-white/10" style={{ opacity: heroVisible ? 1 : 0, transition: "opacity 0.8s ease 0.8s" }}>
              {[{ val: "+40 ans", lbl: "d'expertise terrain" }, { val: "170", lbl: "collaborateurs experts" }, { val: "4 pays", lbl: "de présence" }].map((s, i) => (
                <div key={s.val} style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(10px)", transition: `all 0.6s ease ${0.85 + i * 0.1}s` }}>
                  <div className="text-2xl font-black text-white">{s.val}</div>
                  <div className="text-xs text-white/40 mt-0.5">{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ opacity: heroVisible ? 0.5 : 0, transition: "opacity 1s ease 1.3s", animation: heroVisible ? "v2-float 2.8s ease-in-out infinite 1.5s" : "none" }}>
          <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

      {/* ── SAVOIR-FAIRE ── */}
      <section id="savoir-faire" className="py-28" style={{ background: "#f8fafc" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <RevealSection className="mb-16">
            <SectionLabel text="Nos expertises" />
            <h2 style={{ fontSize: "clamp(2rem,3.5vw,2.8rem)", fontWeight: 900, color: "#0f172a", lineHeight: 1.1, marginBottom: "1rem" }}>
              Un savoir-faire au service<br />de vos projets
            </h2>
            <p className="text-slate-500 max-w-lg leading-relaxed text-[15px]">
              Nos équipes pluridisciplinaires mobilisent compétences terrain et technologies de pointe pour répondre à chaque besoin — de la donnée brute à la décision stratégique.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savoirFaire.map((sf, i) => {
              const { ref, visible } = useReveal()
              return (
                <div key={sf.title} ref={ref} className="v2-card v2-link bg-white rounded-xl p-7 border border-slate-150 cursor-pointer"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0)" : "translateY(28px)",
                    transition: `opacity 0.6s ease ${i * 75}ms, transform 0.6s ease ${i * 75}ms`,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.03)",
                    border: "1px solid #e8edf3",
                  }}>
                  {/* Icon container */}
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6"
                    style={{ background: `${sf.color}12`, border: `1px solid ${sf.color}22` }}>
                    <sf.Icon size={22} color={sf.color} strokeWidth={1.75} />
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-3 leading-snug">{sf.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-7 flex-1">{sf.desc}</p>
                  <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                    <span className="text-xs text-slate-400 leading-snug">{sf.result}</span>
                    <span className="v2-arrow text-[#007BFF]"><ChevronRight size={16} strokeWidth={2.5} /></span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── DOMAINES ── */}
      <section id="domaines" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <RevealSection className="mb-16">
            <SectionLabel text="Domaines d'activité" />
            <h2 style={{ fontSize: "clamp(2rem,3.5vw,2.8rem)", fontWeight: 900, color: "#0f172a", lineHeight: 1.1, marginBottom: "1rem" }}>
              Des solutions adaptées<br />à chaque secteur
            </h2>
            <p className="text-slate-500 max-w-lg leading-relaxed text-[15px]">
              Que vous soyez un opérateur public, un bureau d'études ou une entreprise privée, Etafat dispose de l'expertise sectorielle pour répondre à vos enjeux.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {domaines.map((d, i) => {
              const { ref, visible } = useReveal()
              return (
                <div key={d.label} ref={ref} className="v2-domain group rounded-xl p-6 cursor-pointer transition-all duration-300"
                  style={{
                    border: "1px solid #e8edf3",
                    borderLeft: `3.5px solid ${d.color}`,
                    opacity: visible ? 1 : 0,
                    transform: visible ? "none" : "translateY(20px)",
                    transition: `opacity 0.55s ease ${i * 65}ms, transform 0.55s ease ${i * 65}ms`,
                    background: "#fff",
                  }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors duration-300"
                    style={{ background: `${d.color}10` }}>
                    <d.Icon size={18} color={d.color} strokeWidth={1.75} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-[14px] mb-1.5 group-hover:text-[#007BFF] transition-colors duration-200">{d.label}</h3>
                  <p className="text-[12px] text-slate-400 leading-relaxed">{d.sub}</p>
                  <div className="flex items-center gap-1 mt-4 text-xs font-semibold transition-colors duration-200"
                    style={{ color: d.color, opacity: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
                    En savoir plus <ChevronRight size={12} strokeWidth={2.5} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats" className="py-28 relative overflow-hidden" style={{ background: "#007BFF" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 15% 50%, rgba(255,255,255,0.09) 0%, transparent 55%), radial-gradient(ellipse at 85% 50%, rgba(0,0,0,0.08) 0%, transparent 55%)" }} />
        <div ref={statsRef} className="max-w-7xl mx-auto px-6 lg:px-10">
          <RevealSection className="text-center mb-20">
            <SectionLabel text="Etafat en chiffres" center />
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">Un acteur de référence</h2>
            <p className="text-white/55 max-w-md mx-auto text-[15px] leading-relaxed">Présent en Afrique depuis plus de 40 ans, avec une présence internationale en croissance continue.</p>
          </RevealSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16">
            {stats.map((s, i) => (
              <div key={s.label} style={{ transitionDelay: `${i * 110}ms` }}>
                <StatCard {...s} active={statsVisible} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RÉFÉRENCES ── */}
      <section id="references" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <RevealSection className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <SectionLabel text="Ils nous font confiance" />
              <h2 style={{ fontSize: "clamp(2rem,3.5vw,2.8rem)", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>
                Nos clients &<br />partenaires
              </h2>
            </div>
            <p className="text-slate-500 max-w-xs leading-relaxed text-sm">Institutions publiques, opérateurs stratégiques et groupes privés font confiance à Etafat pour leurs projets les plus exigeants.</p>
          </RevealSection>

          {/* Marquee */}
          <RevealSection className="relative overflow-hidden mb-16 py-7 border-y border-slate-100">
            <div className="absolute left-0 top-0 bottom-0 w-28 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, white, transparent)" }} />
            <div className="absolute right-0 top-0 bottom-0 w-28 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, white, transparent)" }} />
            <div className="flex gap-14" style={{ width: "max-content", animation: "v2-marquee 20s linear infinite" }}>
              {[...clients, ...clients].map((c, i) => (
                <span key={i} className="text-[11px] font-bold text-slate-300 tracking-[0.22em] uppercase whitespace-nowrap hover:text-[#007BFF] transition-colors cursor-pointer">{c}</span>
              ))}
            </div>
          </RevealSection>

          {/* Featured project */}
          <RevealSection>
            <div className="rounded-2xl overflow-hidden border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/80 transition-shadow duration-500">
              <div className="grid md:grid-cols-2">
                <div className="p-10 lg:p-14 flex flex-col justify-center" style={{ background: "#f8fafc" }}>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-[#007BFF] uppercase bg-[#007BFF]/10 px-3 py-1.5 rounded-full w-fit mb-7">
                    <Award size={12} strokeWidth={2.5} /> Projet de référence
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 mb-4 leading-snug">Cartographie LiDAR<br />du réseau autoroutier</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-9">Mission de levé aérien et terrestre pour l'inventaire patrimonial de 1 800 km d'autoroutes marocaines. Livraison d'un modèle numérique de terrain centimétrique et d'une base de données d'ouvrages géoréférencés.</p>
                  <div className="flex gap-8">
                    {[{ val: "1 800 km", lbl: "couverts" }, { val: "ADM", lbl: "client" }, { val: "±2 cm", lbl: "précision" }].map(s => (
                      <div key={s.lbl}>
                        <div className="text-xl font-black text-[#007BFF]">{s.val}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{s.lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative min-h-[280px] md:min-h-0 overflow-hidden group">
                  <img src="https://etafat.ma/wp-content/uploads/2021/01/ingenieurie_infrastructure.jpg"
                    alt="Projet ADM" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to left, transparent 60%, rgba(248,250,252,0.15))" }} />
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── ENGAGEMENTS ── */}
      <section id="engagements" className="py-28" style={{ background: "#f8fafc" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <RevealSection className="mb-16 text-center">
            <SectionLabel text="Nos engagements" center />
            <h2 style={{ fontSize: "clamp(2rem,3.5vw,2.8rem)", fontWeight: 900, color: "#0f172a", lineHeight: 1.1, marginBottom: "1rem" }}>
              Pourquoi choisir Etafat ?
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto leading-relaxed text-[15px]">
              Notre différence tient à l'alliance d'une expertise terrain éprouvée, d'équipes pluridisciplinaires engagées et d'une proximité réelle avec nos clients.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {engagements.map((e, i) => {
              const { ref, visible } = useReveal()
              return (
                <div key={e.title} ref={ref} className="bg-white rounded-xl p-8 border border-slate-100 text-center group"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? "none" : "translateY(24px)",
                    transition: `all 0.65s ease ${i * 110}ms`,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform duration-500 group-hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, #007BFF15, #007BFF08)",
                      border: "1px solid #007BFF22",
                      animation: visible ? `v2-float ${2.8 + i * 0.4}s ease-in-out infinite ${i * 0.4}s` : "none",
                    }}>
                    <e.Icon size={24} color="#007BFF" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-3">{e.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{e.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-28" style={{ background: "#07101f" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <RevealSection>
              <SectionLabel text="Parlons de votre projet" />
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
                Vous avez un projet ?<br />Contactez-nous.
              </h2>
              <p className="text-white/50 leading-relaxed mb-10 text-[15px]">
                Nos équipes d'ingénieurs sont disponibles pour étudier votre besoin et vous proposer une réponse adaptée — en Maroc, en Afrique et à l'international.
              </p>
              <div className="space-y-5">
                {[
                  { Icon: MapPin, label: "Siège social", val: "Rabat, Maroc" },
                  { Icon: Phone,  label: "Téléphone",    val: "+212 537 ..." },
                  { Icon: Mail,   label: "Email",         val: "contact@etafat.ma" },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-4 group cursor-pointer">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 group-hover:bg-[#007BFF]/20"
                      style={{ background: "rgba(255,255,255,0.05)" }}>
                      <c.Icon size={16} color="rgba(255,255,255,0.55)" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">{c.label}</div>
                      <div className="text-white/75 text-sm font-medium group-hover:text-white transition-colors">{c.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </RevealSection>

            <RevealSection delay={150}>
              <div className="bg-white rounded-2xl p-8 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Envoyez-nous un message</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {["Prénom", "Nom"].map(f => (
                      <div key={f}>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">{f}</label>
                        <input type="text" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/10 transition-all"
                          placeholder={f === "Prénom" ? "Jean" : "Dupont"} />
                      </div>
                    ))}
                  </div>
                  {[
                    { label: "Organisation", type: "text",  placeholder: "Votre entreprise" },
                    { label: "Email",         type: "email", placeholder: "vous@exemple.com" },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">{f.label}</label>
                      <input type={f.type} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/10 transition-all" placeholder={f.placeholder} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">Votre besoin</label>
                    <textarea rows={4} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/10 transition-all resize-none" placeholder="Décrivez brièvement votre projet..." />
                  </div>
                  <button className="w-full bg-[#007BFF] hover:bg-[#0057b8] text-white font-semibold py-4 rounded-lg transition-all duration-200 text-sm hover:shadow-lg hover:shadow-[#007BFF]/30 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                    Envoyer ma demande <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-14 border-t border-white/5" style={{ background: "#050d1a" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <img src="https://etafat.ma/wp-content/themes/etafat/assets/images/logo.png" alt="Etafat" className="h-7 mb-5 brightness-0 invert opacity-70" />
              <p className="text-white/30 text-xs leading-relaxed">Géospatiale & aménagement du territoire depuis 1983.</p>
              <p className="text-white/30 text-xs mt-1.5">Maroc · Côte d'Ivoire · Sénégal · Asie</p>
            </div>
            {[
              { title: "Savoir-faire", items: ["Topographie & Foncier", "SIG", "Acquisition Aérienne", "Conseil & AMO", "BIM & 3D", "Ingénierie des données"] },
              { title: "Domaines",    items: ["Infrastructures", "Aménagement", "Énergie & Mines", "Agriculture", "Bâtiment", "International"] },
              { title: "Groupe",      items: ["Etafat Maroc", "Etafat ING", "Etafat Afrique", "Etafat Sénégal", "Contact", "Carrières"] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.22em] mb-5">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.items.map(item => (
                    <li key={item}><span className="text-white/25 text-xs hover:text-white/55 cursor-pointer transition-colors duration-200">{item}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-white/18 text-xs">© 2025 Etafat. Tous droits réservés.</span>
            <span className="text-white/18 text-xs">Rabat, Maroc — contact@etafat.ma</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
