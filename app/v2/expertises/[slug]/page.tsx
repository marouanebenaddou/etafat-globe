"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Crosshair, Layers, ScanLine, Briefcase, Box, Database,
  ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, MapPin, Phone, Mail,
} from "lucide-react"
import { expertises, getExpertise } from "../data"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, any> = {
  "topographie-foncier":  Crosshair,
  "sig":                  Layers,
  "acquisition-aerienne": ScanLine,
  "conseil-ingenierie":   Briefcase,
  "modelisation-3d-bim":  Box,
  "ingenierie-donnees":   Database,
}

function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold, rootMargin: "0px 0px 60px 0px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

export default function ExpertisePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const expertise = getExpertise(slug)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!expertise) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07101f" }}>
        <div className="text-center">
          <p className="text-white/50 mb-4">Expertise introuvable</p>
          <button onClick={() => router.push("/v2")} className="text-[#007BFF] underline">Retour</button>
        </div>
      </div>
    )
  }

  const Icon = iconMap[slug] ?? Crosshair
  const currentIndex = expertises.findIndex(e => e.slug === slug)
  const prev = expertises[currentIndex - 1]
  const next = expertises[currentIndex + 1]

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? "rgba(255,255,255,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,0.07)" : "none",
        transition: "all 0.4s ease",
        padding: "0 clamp(1.5rem,4vw,2.5rem)",
        height: 68, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={() => router.push("/v2")}
          className="flex items-center gap-2 text-sm font-semibold transition-colors duration-200"
          style={{ color: scrolled ? "#0f172a" : "#fff" }}>
          <ArrowLeft size={16} />
          Retour
        </button>
        <img
          src="/etafat-globe.png" alt="Etafat"
          style={{ height: 36, filter: scrolled ? "none" : "brightness(0) invert(1)", transition: "filter 0.4s ease", cursor: "pointer" }}
          onClick={() => router.push("/v2")}
        />
        <button
          onClick={() => router.push("/v2#contact")}
          className="text-[13px] font-semibold px-5 py-2.5 rounded-full transition-all duration-200"
          style={scrolled
            ? { background: "#007BFF", color: "#fff" }
            : { background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>
          Nous contacter
        </button>
      </nav>

      {/* ── HERO ── */}
      <div className="relative overflow-hidden" style={{
        background: "linear-gradient(135deg, #07101f 0%, #0a1f3d 50%, #003580 100%)",
        minHeight: "clamp(500px, 70vh, 700px)",
        display: "flex", alignItems: "center",
      }}>
        {/* BG image */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${expertise.heroImg})`,
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: 0.12,
        }} />
        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(5,14,32,0.95) 45%, rgba(5,14,32,0.4) 100%)" }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 w-full pt-24 pb-16 grid md:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-8 text-white/40 text-xs font-medium">
              <span className="hover:text-white/70 cursor-pointer transition-colors" onClick={() => router.push("/v2")}>Accueil</span>
              <ChevronRight size={12} />
              <span className="hover:text-white/70 cursor-pointer transition-colors" onClick={() => router.push("/v2#savoir-faire")}>Expertises</span>
              <ChevronRight size={12} />
              <span className="text-white/70">{expertise.title}</span>
            </div>

            {/* Icon badge */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6"
              style={{ background: `${expertise.color}22`, border: `1px solid ${expertise.color}44` }}>
              <Icon size={28} color={expertise.color} strokeWidth={1.5} />
            </div>

            <h1 style={{ fontSize: "clamp(2.2rem,4.5vw,3.4rem)", fontWeight: 900, color: "#fff", lineHeight: 1.1, marginBottom: "1.2rem" }}>
              {expertise.title}
            </h1>
            <p className="text-white/60 text-[17px] leading-relaxed" style={{ maxWidth: 480 }}>
              {expertise.tagline}
            </p>

            <button
              onClick={() => router.push("/v2#contact")}
              className="inline-flex items-center gap-2.5 mt-10 text-[13px] font-semibold px-7 py-3.5 rounded-full transition-all duration-300 hover:-translate-y-px group"
              style={{ background: expertise.color, color: "#fff", boxShadow: `0 8px 30px ${expertise.color}50` }}>
              Discuter de votre projet
              <span className="transition-transform duration-300 group-hover:translate-x-1"><ArrowRight size={15} /></span>
            </button>
          </div>

          {/* Right — floating image card */}
          <div className="hidden md:block">
            <div className="relative rounded-2xl overflow-hidden" style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.5)", aspectRatio: "4/3" }}>
              <img src={expertise.heroImg} alt={expertise.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,14,32,0.5) 0%, transparent 60%)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── INTRO ── */}
      <section className="py-24" style={{ background: "#fff" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid md:grid-cols-2 gap-16 items-center">
          <Reveal>
            <div className="flex items-center gap-3 mb-6">
              <div style={{ width: 28, height: 2, background: expertise.color }} />
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: expertise.color }}>Notre expertise</span>
            </div>
            <div className="space-y-5">
              {expertise.intro.map((p, i) => (
                <p key={i} className="text-slate-600 text-[16px] leading-relaxed">{p}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.1)", aspectRatio: "4/3" }}>
              <img src={expertise.heroImg} alt={expertise.title} className="w-full h-full object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── MÉTHODES ── */}
      <section className="py-24" style={{ background: "#f4f7fc" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-14">
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 28, height: 2, background: expertise.color }} />
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: expertise.color }}>Nos interventions</span>
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>
              Ce que nous réalisons<br />pour vous
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {expertise.methods.map((m, i) => (
              <Reveal key={m} delay={i * 50}>
                <div className="flex items-start gap-3.5 bg-white rounded-xl px-5 py-4 border border-slate-100 hover:border-[#007BFF]/20 hover:shadow-md transition-all duration-200 group">
                  <CheckCircle2 size={16} strokeWidth={2} style={{ color: expertise.color, flexShrink: 0, marginTop: 2 }} />
                  <span className="text-slate-700 text-[13.5px] font-medium leading-snug group-hover:text-slate-900 transition-colors">{m}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHT STAT ── */}
      <section className="py-28 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #07101f 0%, #0a1f3d 50%, #003580 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(0,123,255,0.15) 0%, transparent 60%)" }} />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal>
            <div className="max-w-2xl">
              <div style={{ fontSize: "clamp(4rem,10vw,7rem)", fontWeight: 900, color: "#fff", lineHeight: 1, marginBottom: "0.4rem" }}>
                {expertise.highlight.stat}
              </div>
              <div className="text-[#007BFF] text-xl font-bold mb-5">{expertise.highlight.label}</div>
              <p className="text-white/55 text-[16px] leading-relaxed" style={{ maxWidth: 500 }}>
                {expertise.highlight.desc}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── RÉFÉRENCES ── */}
      <section className="py-24" style={{ background: "#fff" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-14">
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 28, height: 2, background: expertise.color }} />
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: expertise.color }}>Références</span>
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>
              Ils nous ont fait confiance
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {expertise.references.map((ref, i) => (
              <Reveal key={ref.title} delay={i * 80}>
                <div className="rounded-2xl border border-slate-100 p-8 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full w-fit mb-5"
                    style={{ background: `${expertise.color}12`, color: expertise.color }}>
                    {ref.client}
                  </span>
                  <h3 className="text-[15px] font-black text-slate-900 mb-3 leading-snug flex-1">{ref.title}</h3>
                  <p className="text-slate-500 text-[13px] leading-relaxed">{ref.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20" style={{ background: "#f4f7fc" }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-4 leading-tight">
              Un projet en {expertise.title.toLowerCase()} ?
            </h2>
            <p className="text-slate-500 text-[15px] leading-relaxed mb-10">
              Nos ingénieurs sont disponibles pour étudier votre besoin et vous proposer une réponse sur-mesure.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => router.push("/v2#contact")}
                className="inline-flex items-center gap-2.5 text-[13px] font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:-translate-y-px group"
                style={{ background: expertise.color, color: "#fff", boxShadow: `0 8px 30px ${expertise.color}40` }}>
                Nous contacter
                <span className="transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>
              </button>
              <button
                onClick={() => router.push("/v2#savoir-faire")}
                className="inline-flex items-center gap-2 text-[13px] font-semibold px-8 py-4 rounded-full border border-slate-200 text-slate-600 hover:bg-white hover:shadow-md transition-all duration-300">
                Voir toutes nos expertises
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PREV / NEXT ── */}
      <div className="border-t border-slate-100" style={{ background: "#fff" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex items-center justify-between gap-4">
          {prev ? (
            <button onClick={() => router.push(`/v2/expertises/${prev.slug}`)}
              className="flex items-center gap-3 group text-left">
              <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-[#007BFF] group-hover:bg-[#007BFF] transition-all duration-200">
                <ArrowLeft size={15} className="text-slate-400 group-hover:text-white transition-colors" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Précédent</div>
                <div className="text-[13px] font-semibold text-slate-700 group-hover:text-[#007BFF] transition-colors">{prev.title}</div>
              </div>
            </button>
          ) : <div />}

          {next ? (
            <button onClick={() => router.push(`/v2/expertises/${next.slug}`)}
              className="flex items-center gap-3 group text-right ml-auto">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Suivant</div>
                <div className="text-[13px] font-semibold text-slate-700 group-hover:text-[#007BFF] transition-colors">{next.title}</div>
              </div>
              <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-[#007BFF] group-hover:bg-[#007BFF] transition-all duration-200">
                <ArrowRight size={15} className="text-slate-400 group-hover:text-white transition-colors" />
              </div>
            </button>
          ) : <div />}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="py-8 border-t border-slate-100 text-center" style={{ background: "#07101f" }}>
        <p className="text-white/25 text-xs">© {new Date().getFullYear()} Etafat · Tous droits réservés · Casablanca, Maroc</p>
      </footer>
    </div>
  )
}
