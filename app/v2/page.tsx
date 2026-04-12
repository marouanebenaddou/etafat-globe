"use client"

import { useState, useEffect, useRef } from "react"
import ImageGallery from "@/components/ui/image-gallery"
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
    img: "https://etafat.ma/wp-content/uploads/2020/12/foncier-1.png",
  },
  {
    Icon: Layers,
    title: "Systèmes d'Information Géographique",
    desc: "Plateformes SIG sur-mesure qui transforment vos données spatiales en outils de décision et de pilotage.",
    result: "Décisions éclairées, pilotage simplifié",
    color: "#0057b8",
    img: "https://etafat.ma/wp-content/uploads/2020/12/sig.png",
  },
  {
    Icon: ScanLine,
    title: "Acquisition Aérienne & LiDAR",
    desc: "Cartographie à grande échelle par drone et capteur laser aéroporté. Précision centimétrique garantie.",
    result: "Couverture rapide, données fiables",
    color: "#00669D",
    img: "https://etafat.ma/wp-content/uploads/2021/01/drone_acquisition.jpg",
  },
  {
    Icon: Briefcase,
    title: "Conseil & Ingénierie",
    desc: "Accompagnement en AMO, études de faisabilité et pilotage de projets d'infrastructure pour maîtres d'ouvrage.",
    result: "Projets maîtrisés, délais respectés",
    color: "#007BFF",
    img: "https://etafat.ma/wp-content/uploads/2021/01/ingenieurie_infrastructure.jpg",
  },
  {
    Icon: Box,
    title: "Modélisation 3D & BIM",
    desc: "Jumeaux numériques, maquettes BIM et modèles 3D pour visualiser, coordonner et exécuter vos projets.",
    result: "Erreurs réduites, coûts maîtrisés",
    color: "#0057b8",
    img: "https://etafat.ma/wp-content/uploads/2021/01/bim-batiment.jpg",
  },
  {
    Icon: Database,
    title: "Ingénierie des Données",
    desc: "Structuration, exploitation et valorisation de vos données géospatiales via des pipelines robustes.",
    result: "Données exploitables, valeur créée",
    color: "#00669D",
    img: "https://etafat.ma/wp-content/uploads/2021/01/traitement.jpg",
  },
]

const domaines = [
  { Icon: Route,      label: "Infrastructures",          sub: "Routes, ouvrages d'art, aéroports, ports",       color: "#007BFF", img: "https://etafat.ma/wp-content/uploads/2021/01/ingenieurie_infrastructure.jpg" },
  { Icon: Building2,  label: "Aménagement du territoire", sub: "Urbanisme, patrimoine, planification foncière",   color: "#0057b8", img: "https://etafat.ma/wp-content/uploads/2020/12/foncier-1.png" },
  { Icon: Zap,        label: "Énergie & Mines",           sub: "Énergies renouvelables, carrières, réseaux",      color: "#00669D", img: "https://etafat.ma/wp-content/uploads/2021/01/georadar-1.jpg" },
  { Icon: Sprout,     label: "Agriculture & Eau",         sub: "Agriculture de précision, irrigation, hydrologie",color: "#007BFF", img: "https://etafat.ma/wp-content/uploads/2021/01/drone_acquisition.jpg" },
  { Icon: Landmark,   label: "Bâtiment & Patrimoine",     sub: "Réhabilitation, conservation, scan bâtiment",    color: "#0057b8", img: "https://etafat.ma/wp-content/uploads/2021/03/scanner2.jpg" },
  { Icon: Globe,      label: "International",             sub: "Maroc, Côte d'Ivoire, Sénégal, Mali",            color: "#00669D", img: "https://etafat.ma/wp-content/uploads/2021/01/pva_lidar.jpg" },
]

const stats = [
  { value: 40,  prefix: "+", suffix: " ans", label: "d'expertise",       sub: "Fondée à Rabat en 1983" },
  { value: 170, prefix: "",  suffix: "",      label: "collaborateurs",    sub: "Ingénieurs & techniciens" },
  { value: 4,   prefix: "",  suffix: "",      label: "entités du groupe", sub: "Maroc, CI, Sénégal, Mali" },
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

/* ─── MENU OVERLAY ──────────────────────────────────────── */
const menuGroups = [
  {
    heading: "Le Groupe",
    items: [
      { label: "À propos", id: "stats" },
      { label: "Nos entités", id: "references" },
      { label: "Nos engagements", id: "engagements" },
      { label: "Carrières", id: "contact" },
    ],
  },
  {
    heading: "Notre offre",
    items: [
      { label: "Savoir-faire", id: "savoir-faire" },
      { label: "Domaines d'activité", id: "domaines" },
      { label: "Références", id: "references" },
      { label: "Nous contacter", id: "contact" },
    ],
  },
]

function MenuOverlay({ open, onClose, scrollTo }: { open: boolean; onClose: () => void; scrollTo: (id: string) => void }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "#07101f",
      transform: open ? "translateY(0)" : "translateY(-100%)",
      transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1)",
      overflow: "hidden",
    }}>
      {/* Decorative globe watermark */}
      <img
        src="/etafat-globe.png"
        alt="" aria-hidden
        style={{
          position: "absolute",
          right: "-12%",
          top: "50%",
          transform: "translateY(-52%)",
          width: "clamp(520px, 72vw, 920px)",
          opacity: 0.07,
          filter: "brightness(0) invert(1)",
          pointerEvents: "none", userSelect: "none",
          objectFit: "contain",
        }}
      />

      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-[76px]">
          <img src="https://etafat.ma/wp-content/themes/etafat/assets/images/logo.png"
            alt="Etafat" className="h-11" style={{ filter: "brightness(0) invert(1)" }} />
          <button onClick={onClose}
            className="flex items-center gap-2.5 text-[13px] font-semibold px-5 py-2.5 rounded-full text-white"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
            Fermer <X size={15} />
          </button>
        </div>
      </div>

      {/* Nav grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-32">
          {menuGroups.map((group, gi) => (
            <div key={group.heading}>
              {/* Group heading */}
              <p className="text-white/35 text-[11px] font-bold tracking-[0.22em] uppercase mb-8"
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? "none" : "translateY(20px)",
                  transition: `all 0.5s ease ${0.25 + gi * 0.05}s`,
                }}>
                {group.heading}
              </p>
              {/* Items */}
              <div className="space-y-1">
                {group.items.map((item, i) => (
                  <div key={item.label}
                    style={{
                      opacity: open ? 1 : 0,
                      transform: open ? "none" : "translateY(28px)",
                      transition: `all 0.55s cubic-bezier(0.16,1,0.3,1) ${0.3 + gi * 0.05 + i * 0.07}s`,
                    }}>
                    <button onClick={() => scrollTo(item.id)}
                      className="group flex items-center gap-4 py-3 w-full text-left"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <span className="text-white font-bold transition-all duration-300 group-hover:text-[#007BFF] group-hover:pl-2"
                        style={{ fontSize: "clamp(1.4rem,3vw,2.2rem)", lineHeight: 1.1 }}>
                        {item.label}
                      </span>
                      <ChevronRight size={18} className="text-white/20 transition-all duration-300 group-hover:text-[#007BFF] group-hover:translate-x-1 ml-auto flex-shrink-0" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom contact strip */}
        <div className="mt-16 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            opacity: open ? 1 : 0,
            transition: `opacity 0.5s ease ${0.65}s`,
          }}>
          <p className="text-white/30 text-xs">Casablanca, Maroc — contact@etafat.ma</p>
          <div className="flex gap-6">
            {["Maroc", "Côte d'Ivoire", "Sénégal", "Mali"].map(c => (
              <span key={c} className="text-white/25 text-xs hover:text-white/55 cursor-pointer transition-colors">{c}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── CHALLENGE SECTION ─────────────────────────────────── */
function ChallengeSection() {
  const { ref, visible } = useReveal(0.2)

  return (
    <section className="py-36 bg-white relative overflow-hidden">
      <style>{`
        @keyframes v2-circle-in {
          from { opacity: 0; transform: translateY(-50%) scale(0.72); }
          to   { opacity: 1; transform: translateY(-50%) scale(1); }
        }
        @keyframes v2-circle-drift {
          0%,100% { margin-top: 0px; }
          50%      { margin-top: -18px; }
        }
        .v2-chal-circle {
          position: absolute; left: -140px; top: 50%;
          width: 520px; height: 520px; border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, rgba(0,123,255,0.10), rgba(0,87,184,0.04));
          pointer-events: none;
        }
        .v2-chal-circle.in {
          animation: v2-circle-in 1.1s cubic-bezier(0.16,1,0.3,1) forwards,
                     v2-circle-drift 5s ease-in-out infinite 1.2s;
        }
        .v2-underline-path {
          stroke-dasharray: 290;
          stroke-dashoffset: 290;
          transition: stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1) 0.55s;
        }
        .v2-underline-path.drawn { stroke-dashoffset: 0; }
      `}</style>

      {/* Floating decorative circle */}
      <div className={`v2-chal-circle ${visible ? "in" : ""}`} />

      <div ref={ref} className="max-w-7xl mx-auto px-6 lg:px-10 relative">
        <div className="max-w-2xl">

          {/* Line 1 */}
          <div style={{ overflow: "hidden", marginBottom: "0.2em" }}>
            <span className="block" style={{
              fontSize: "clamp(2.4rem,5vw,4rem)", fontWeight: 900, color: "#0f172a", lineHeight: 1.08,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(110%)",
              transition: "opacity 0.7s ease 0.05s, transform 0.75s cubic-bezier(0.16,1,0.3,1) 0.05s",
            }}>Vous bâtissez,</span>
          </div>

          {/* Line 2 — with SVG underline */}
          <div style={{ overflow: "visible", marginBottom: "2.5rem", display: "inline-block" }}>
            <span className="inline-block relative" style={{
              fontSize: "clamp(2.4rem,5vw,4rem)", fontWeight: 900, color: "#0f172a", lineHeight: 1.08,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(110%)",
              transition: "opacity 0.7s ease 0.18s, transform 0.75s cubic-bezier(0.16,1,0.3,1) 0.18s",
              paddingBottom: "0.2em",
            }}>
              nous cartographions.
              {/* SVG brush-stroke underline */}
              <svg viewBox="0 0 340 20" style={{ position: "absolute", bottom: -2, left: 0, width: "100%", height: 20, overflow: "visible" }} aria-hidden>
                <path
                  className={`v2-underline-path ${visible ? "drawn" : ""}`}
                  d="M 3 14 Q 55 5 110 13 Q 170 20 230 11 Q 285 4 337 13"
                  stroke="#007BFF" strokeWidth="3.5" fill="none" strokeLinecap="round"
                />
              </svg>
            </span>
          </div>

          {/* Subtitle */}
          <p className="text-slate-500 leading-relaxed mb-10 text-[15px]" style={{
            maxWidth: 400,
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(16px)",
            transition: "all 0.65s ease 0.38s",
          }}>
            De la donnée brute au livrable final, Etafat transforme chaque territoire en opportunité — avec précision, fiabilité et engagement depuis 1983.
          </p>

          {/* CTA link */}
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(14px)", transition: "all 0.6s ease 0.5s" }}>
            <button
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-3 text-[13px] font-semibold text-[#007BFF] group">
              Découvrir nos solutions
              <span className="w-9 h-9 rounded-full border-2 border-[#007BFF] flex items-center justify-center transition-all duration-300 group-hover:bg-[#007BFF] group-hover:scale-110">
                <ChevronRight size={15} className="transition-colors duration-300 group-hover:text-white" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── VISION SECTION ────────────────────────────────────── */
function CultureSection() {
  return (
    <section className="py-24" style={{ background: "#fff" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <RevealSection>
          <SectionLabel text="Rejoignez l'aventure" />
        </RevealSection>
        <div className="grid md:grid-cols-2 gap-5" style={{ minHeight: 540 }}>

          {/* LEFT — tall photo card */}
          <RevealSection className="h-full">
            <div className="relative rounded-2xl overflow-hidden h-full" style={{ minHeight: 480 }}>
              {/* Background image */}
              <img
                src="https://etafat.ma/wp-content/uploads/2021/01/drone_acquisition.jpg"
                alt="Terrain"
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%",
                  objectFit: "cover",
                }}
              />
              {/* Dark gradient */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(160deg, rgba(5,14,32,0.3) 0%, rgba(5,14,32,0.82) 100%)",
              }} />
              {/* Content */}
              <div style={{ position: "relative", zIndex: 1, padding: "clamp(2rem,4vw,2.8rem)", display: "flex", flexDirection: "column", height: "100%", justifyContent: "flex-end" }}>
                <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-white/60 mb-4">Culture</span>
                <h3 style={{ fontSize: "clamp(1.7rem,3vw,2.2rem)", fontWeight: 900, color: "#fff", lineHeight: 1.15, marginBottom: "1.1rem" }}>
                  Notre culture<br />d'entreprise
                </h3>
                <p className="text-white/65 text-[15px] leading-relaxed mb-8" style={{ maxWidth: 380 }}>
                  Chez Etafat, la rigueur technique s'allie à l'esprit d'équipe. Nos ingénieurs interviennent sur le terrain et en laboratoire, portés par la conviction que la donnée géospatiale transforme les territoires.
                </p>
                <button
                  onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-white border border-white/40 rounded-full px-6 py-3 hover:bg-white hover:text-[#07101f] transition-all duration-300 group"
                  style={{ alignSelf: "flex-start" }}>
                  Découvrir nos valeurs
                  <span className="transition-transform duration-300 group-hover:translate-x-1"><ArrowRight size={14} /></span>
                </button>
              </div>
            </div>
          </RevealSection>

          {/* RIGHT — two stacked cards */}
          <div className="flex flex-col gap-5">

            {/* Top white card — L'expérience collaborateur */}
            <RevealSection delay={100} className="flex-1">
              <div className="rounded-2xl p-8 h-full flex flex-col justify-between" style={{ background: "#f4f7fc", border: "1px solid #e8edf5" }}>
                <div>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-6" style={{ background: "#007BFF10" }}>
                    <Users size={20} color="#007BFF" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3 leading-snug">
                    L'expérience<br />collaborateur
                  </h3>
                  <p className="text-slate-500 text-[14px] leading-relaxed">
                    Formations continues, projets internationaux, évolution interne — nous investissons dans chaque talent pour qu'il grandisse avec le groupe.
                  </p>
                </div>
                <button
                  onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#007BFF] mt-7 group"
                  style={{ alignSelf: "flex-start" }}>
                  En savoir plus
                  <span className="transition-transform duration-300 group-hover:translate-x-1"><ArrowRight size={14} /></span>
                </button>
              </div>
            </RevealSection>

            {/* Bottom colored card — Rejoignez-nous */}
            <RevealSection delay={200} className="flex-1">
              <div className="rounded-2xl p-8 h-full flex flex-col justify-between" style={{ background: "#007BFF" }}>
                <div>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <Award size={20} color="#fff" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-xl font-black text-white mb-3 leading-snug">
                    Rejoignez-nous
                  </h3>
                  <p className="text-white/75 text-[14px] leading-relaxed">
                    Vous êtes ingénieur, technicien ou expert en géospatiale ? Rejoignez une équipe passionnée et contribuez à des projets structurants au Maroc et en Afrique.
                  </p>
                </div>
                <button
                  onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-white mt-7 group"
                  style={{ alignSelf: "flex-start" }}>
                  Voir nos offres d'emploi
                  <span className="transition-transform duration-300 group-hover:translate-x-1"><ChevronRight size={14} /></span>
                </button>
              </div>
            </RevealSection>

          </div>
        </div>
      </div>
    </section>
  )
}

function VisionSection() {
  const { ref, visible } = useReveal(0.15)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  return (
    <section className="py-24" style={{ background: "#eef1f6" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <RevealSection>
            <SectionLabel text="Notre vision" />
            <h2 style={{ fontSize: "clamp(2rem,3.5vw,2.8rem)", fontWeight: 900, color: "#0f172a", lineHeight: 1.1, marginBottom: "2rem" }}>
              Ce qui donne du sens<br />à nos engagements
            </h2>
            <p className="text-slate-500 leading-relaxed mb-10 text-[15px]" style={{ maxWidth: 420 }}>
              Depuis 1983, Etafat place l'humain et le territoire au cœur de chaque mission. Chaque levé, chaque donnée, chaque carte produite contribue à bâtir un Maroc et une Afrique mieux aménagés, mieux connectés, mieux décidés.
            </p>
            <button
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-3 text-[13px] font-semibold text-[#007BFF] border border-[#007BFF] rounded-full px-6 py-3 hover:bg-[#007BFF] hover:text-white transition-all duration-300 group">
              Notre mission
              <span className="transition-transform duration-300 group-hover:translate-x-1"><ArrowRight size={14} /></span>
            </button>
          </RevealSection>

          {/* Right — video */}
          <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(28px)", transition: "all 0.75s ease 0.15s" }}>
            <div className="relative rounded-2xl overflow-hidden cursor-pointer group"
              style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.13)" }}
              onClick={togglePlay}>
              <video
                ref={videoRef}
                src="/videos/drone-uav.mp4"
                className="w-full object-cover"
                style={{ aspectRatio: "16/9", display: "block" }}
                loop
                playsInline
                muted={false}
                onEnded={() => setPlaying(false)}
              />
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
                style={{ background: playing ? "transparent" : "rgba(5,14,32,0.28)", opacity: playing ? 0 : 1, pointerEvents: playing ? "none" : "auto" }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ background: "#007BFF", boxShadow: "0 0 0 8px rgba(0,123,255,0.2)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 3 }}>
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── PAGE ───────────────────────────────────────────────── */
export default function EtafatV2() {
  const [menuOpen, setMenuOpen] = useState(false)
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

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }) }

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

        /* ── Image hover cards ── */
        .v2-imgcard { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .v2-imgcard:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.18) !important; }
        .v2-imgcard .v2-bg { opacity:0; transform:scale(1); transition: opacity 0.45s cubic-bezier(0.25,1,0.2,1), transform 0.55s cubic-bezier(0.25,1,0.2,1); }
        .v2-imgcard:hover .v2-bg { opacity:1; transform:scale(1.08); }
        .v2-imgcard .v2-overlay { opacity:0; transition: opacity 0.45s cubic-bezier(0.25,1,0.2,1); }
        .v2-imgcard:hover .v2-overlay { opacity:1; }
        .v2-imgcard .v2-ic-wrap { transition: background 0.35s ease, border-color 0.35s ease; }
        .v2-imgcard:hover .v2-ic-wrap { background: rgba(255,255,255,0.15) !important; border-color: rgba(255,255,255,0.25) !important; }
        .v2-imgcard:hover .v2-ic-svg { filter: brightness(0) invert(1); }
        .v2-imgcard .v2-title { transition: color 0.35s ease; }
        .v2-imgcard:hover .v2-title { color: #fff !important; }
        .v2-imgcard .v2-desc { transition: color 0.35s ease; }
        .v2-imgcard:hover .v2-desc { color: rgba(255,255,255,0.72) !important; }
        .v2-imgcard .v2-result { transition: color 0.35s ease, border-color 0.35s ease; }
        .v2-imgcard:hover .v2-result { color: rgba(255,255,255,0.55) !important; border-color: rgba(255,255,255,0.12) !important; }
        .v2-imgcard:hover .v2-chevron { color: rgba(255,255,255,0.8) !important; }

        /* ── Domain hover cards ── */
        .v2-domain { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .v2-domain:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(0,0,0,0.14) !important; }
        .v2-domain .v2-bg { opacity:0; transform:scale(1); transition: opacity 0.45s cubic-bezier(0.25,1,0.2,1), transform 0.55s cubic-bezier(0.25,1,0.2,1); }
        .v2-domain:hover .v2-bg { opacity:1; transform:scale(1.08); }
        .v2-domain .v2-overlay { opacity:0; transition: opacity 0.45s cubic-bezier(0.25,1,0.2,1); }
        .v2-domain:hover .v2-overlay { opacity:1; }
        .v2-domain .v2-ic-wrap { transition: background 0.35s ease; }
        .v2-domain:hover .v2-ic-wrap { background: rgba(255,255,255,0.15) !important; }
        .v2-domain:hover .v2-ic-svg { filter: brightness(0) invert(1); }
        .v2-domain .v2-title { transition: color 0.35s ease; }
        .v2-domain:hover .v2-title { color: #fff !important; }
        .v2-domain .v2-sub { transition: color 0.35s ease; }
        .v2-domain:hover .v2-sub { color: rgba(255,255,255,0.6) !important; }
        .v2-domain .v2-savoir { transition: opacity 0.3s ease, color 0.35s ease; }
        .v2-domain:hover .v2-savoir { opacity:1 !important; color: rgba(255,255,255,0.8) !important; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? "rgba(255,255,255,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,0.07)" : "1px solid transparent",
        boxShadow: scrolled ? "0 2px 24px rgba(0,0,0,0.07)" : "none",
        transition: "background 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease",
      }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-[76px]">
            <img src="https://etafat.ma/wp-content/themes/etafat/assets/images/logo.png"
              alt="Etafat" className="h-11"
              style={{ filter: scrolled ? "none" : "brightness(0) invert(1)", transition: "filter 0.4s ease" }} />
            {/* Menu pill button — GeoFit style */}
            <button onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2.5 text-[13px] font-semibold px-5 py-2.5 rounded-full transition-all duration-300"
              style={scrolled
                ? { background: "#007BFF", color: "#fff" }
                : { background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)" }}>
              Menu <Menu size={15} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── MENU OVERLAY ── */}
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} scrollTo={(id) => { scrollTo(id); setMenuOpen(false) }} />

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
        {/* Parallax BG */}
        <div className="absolute inset-0" style={{ transform: `translateY(${scrollY * 0.3}px)` }}>
          <img src="/hero-aerial.jpg"
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
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ opacity: heroVisible ? 0.5 : 0, transition: "opacity 1s ease 1.3s", animation: heroVisible ? "v2-float 2.8s ease-in-out infinite 1.5s" : "none" }}>
          <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent" />
        </div>

        {/* Bottom curve */}
        <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 88" preserveAspectRatio="none"
            style={{ display: "block", width: "100%", height: 88 }}>
            <path d="M0,72 Q360,0 720,40 Q1080,80 1440,20 L1440,88 L0,88 Z" fill="#f8fafc" />
          </svg>
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
                <div key={sf.title} ref={ref}
                  className="v2-imgcard relative rounded-xl overflow-hidden cursor-pointer"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0)" : "translateY(28px)",
                    transition: `opacity 0.6s ease ${i * 75}ms, transform 0.6s ease ${i * 75}ms`,
                    border: "1px solid #e8edf3",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.03)",
                    background: "#fff",
                    minHeight: 260,
                  }}>
                  {/* BG image layer */}
                  <div className="v2-bg absolute inset-0"
                    style={{ backgroundImage: `url(${sf.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                  {/* Dark overlay */}
                  <div className="v2-overlay absolute inset-0"
                    style={{ background: "linear-gradient(160deg, rgba(5,14,32,0.78) 0%, rgba(0,30,70,0.88) 100%)" }} />
                  {/* Content */}
                  <div className="relative z-10 p-7 flex flex-col h-full">
                    <div className="v2-ic-wrap w-12 h-12 rounded-lg flex items-center justify-center mb-6"
                      style={{ background: `${sf.color}14`, border: `1px solid ${sf.color}28` }}>
                      <sf.Icon className="v2-ic-svg" size={22} color={sf.color} strokeWidth={1.75} />
                    </div>
                    <h3 className="v2-title text-[15px] font-bold text-slate-900 mb-3 leading-snug">{sf.title}</h3>
                    <p className="v2-desc text-slate-500 text-sm leading-relaxed mb-7 flex-1">{sf.desc}</p>
                    <div className="v2-result flex items-center justify-between pt-5 border-t border-slate-100">
                      <span className="text-xs text-slate-400 leading-snug">{sf.result}</span>
                      <span className="v2-chevron text-[#007BFF]"><ChevronRight size={16} strokeWidth={2.5} /></span>
                    </div>
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
                <div key={d.label} ref={ref}
                  className="v2-domain relative rounded-xl overflow-hidden cursor-pointer"
                  style={{
                    border: "1px solid #e8edf3",
                    borderLeft: `3.5px solid ${d.color}`,
                    opacity: visible ? 1 : 0,
                    transform: visible ? "none" : "translateY(20px)",
                    transition: `opacity 0.55s ease ${i * 65}ms, transform 0.55s ease ${i * 65}ms`,
                    background: "#fff",
                    minHeight: 160,
                  }}>
                  {/* BG image */}
                  <div className="v2-bg absolute inset-0"
                    style={{ backgroundImage: `url(${d.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                  {/* Dark overlay */}
                  <div className="v2-overlay absolute inset-0"
                    style={{ background: "linear-gradient(160deg, rgba(5,14,32,0.80) 0%, rgba(0,30,70,0.90) 100%)" }} />
                  {/* Content */}
                  <div className="relative z-10 p-6">
                    <div className="v2-ic-wrap w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                      style={{ background: `${d.color}12` }}>
                      <d.Icon className="v2-ic-svg" size={18} color={d.color} strokeWidth={1.75} />
                    </div>
                    <h3 className="v2-title font-bold text-slate-900 text-[14px] mb-1.5">{d.label}</h3>
                    <p className="v2-sub text-[12px] text-slate-400 leading-relaxed">{d.sub}</p>
                    <div className="v2-savoir flex items-center gap-1 mt-4 text-xs font-semibold" style={{ opacity: 0, color: d.color }}>
                      En savoir plus <ChevronRight size={12} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CHALLENGE ── */}
      <ChallengeSection />

      {/* ── STATS ── */}
      <section id="stats" className="py-28 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #07101f 0%, #0a1f3d 40%, #003580 75%, #0057b8 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 60%, rgba(0,123,255,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(0,87,184,0.15) 0%, transparent 55%)" }} />
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
                <div className="relative min-h-[280px] md:min-h-0 overflow-hidden">
                  <video
                    src="/rabat-aerial.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to left, transparent 60%, rgba(248,250,252,0.2))" }} />
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

      {/* ── CULTURE ── */}
      <CultureSection />

      {/* ── GALLERY ── */}
      <ImageGallery />

      {/* ── VISION ── */}
      <VisionSection />

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
                  { Icon: MapPin, label: "Siège social", val: "Casablanca, Maroc" },
                  { Icon: Phone,  label: "Téléphone",    val: "+212 522 79 87 00" },
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
              <img src="https://etafat.ma/wp-content/themes/etafat/assets/images/logo.png" alt="Etafat" className="h-9 mb-5 brightness-0 invert opacity-70" />
              <p className="text-white/30 text-xs leading-relaxed">Géospatiale & aménagement du territoire depuis 1983.</p>
              <p className="text-white/30 text-xs mt-1.5">Maroc · Côte d'Ivoire · Sénégal · Mali</p>
            </div>
            {[
              { title: "Savoir-faire", items: ["Topographie & Foncier", "SIG", "Acquisition Aérienne", "Conseil & AMO", "BIM & 3D", "Ingénierie des données"] },
              { title: "Domaines",    items: ["Infrastructures", "Aménagement", "Énergie & Mines", "Agriculture", "Bâtiment", "International"] },
              { title: "Groupe",      items: ["Etafat Maroc", "Etafat ING", "Etafat Afrique", "Etafat Sénégal", "Etafat Mali", "Carrières"] },
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
            <span className="text-white/18 text-xs">Casablanca, Maroc — contact@etafat.ma</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
