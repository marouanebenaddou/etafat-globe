"use client"

import { useScrollReveal, useCenterFocus } from "@/lib/hooks"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { useTheme } from "@/lib/theme-context"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  Map, Layers, Database, Settings, Eye, Building2, GraduationCap, ArrowRight, Sparkles, X, ChevronRight, MapPin
} from "lucide-react"

const services = [
  {
    icon: Map,
    title: "Systèmes d'Information Géographique",
    abbr: "SIG",
    description: "Conception et déploiement de SIG pour la gestion territoriale, l'urbanisme et la planification stratégique. Nous transformons vos données spatiales en outils de décision.",
    details: "Nos équipes SIG conçoivent et déploient des plateformes géospatiales sur mesure pour les collectivités, les ministères et les entreprises. De la collecte de données terrain à la diffusion via des portails web cartographiques, nous couvrons l'ensemble de la chaîne SIG avec des solutions open source et propriétaires.",
    features: ["Cartographie numérique", "Analyse spatiale", "Tableaux de bord SIG", "Intégration données"],
    color: "from-blue-500 to-blue-700",
    glow: "rgba(59,130,246,0.25)",
    accent: "#3b82f6",
    signal: "GIS · WebGL · PostGIS",
    coord: "33°59′N 006°51′W",
    image: "https://etafat.ma/wp-content/uploads/2020/12/sig.png",
    video: "/videos/sig.mp4",
  },
  {
    icon: Layers,
    title: "Foncier & Topographie",
    abbr: "FONCIER",
    description: "Levés topographiques de précision, bornage, morcellement et gestion foncière. Une expertise terrain de plus de 40 ans au service de vos projets.",
    details: "Avec plus de 40 ans d'expertise en topographie foncière, Etafat réalise des levés de précision, des bornages contradictoires et des opérations de morcellement conformes à la réglementation marocaine. Nos géomètres-topographes interviennent sur tout le territoire national pour les opérations cadastrales et foncières.",
    features: ["Levés topographiques", "Bornage & morcellement", "Conservation foncière", "Délimitation"],
    color: "from-emerald-500 to-emerald-700",
    glow: "rgba(16,185,129,0.25)",
    accent: "#10b981",
    signal: "RTK · CORS · EDM",
    coord: "31°09′N 007°59′W",
    image: "https://etafat.ma/wp-content/uploads/2020/12/foncier-1.png",
    video: "/videos/foncier.mp4",
  },
  {
    icon: Database,
    title: "Ingénierie des Données",
    abbr: "DATA",
    description: "Acquisition, traitement et structuration de grandes masses de données géospatiales. Pipelines de données robustes pour une exploitation optimale.",
    details: "Nous concevons des architectures de données géospatiales performantes : acquisition multi-sources (LiDAR, drone, GPS), traitement automatisé et structuration en bases de données spatiales. Nos pipelines cloud garantissent une disponibilité et une qualité des données conformes aux standards internationaux.",
    features: ["Acquisition terrain", "Traitement données", "Data engineering", "Cloud spatial"],
    color: "from-purple-500 to-purple-700",
    glow: "rgba(139,92,246,0.25)",
    accent: "#8b5cf6",
    signal: "ETL · PostGIS · GDAL",
    coord: "34°01′N 005°00′W",
    image: "https://etafat.ma/wp-content/uploads/2021/01/traitement.jpg",
    video: "/videos/ingenierie-donnees.mp4",
  },
  {
    icon: Settings,
    title: "Conseil en Ingénierie",
    abbr: "CONSEIL",
    description: "Assistance à maîtrise d'ouvrage, études techniques et conseil stratégique pour vos projets d'infrastructure et d'aménagement territorial.",
    details: "Notre division conseil accompagne maîtres d'ouvrage publics et privés dans la définition, le pilotage et l'évaluation de leurs projets d'infrastructure. Schémas directeurs, audits spatiaux, études de faisabilité : nous apportons une expertise pluridisciplinaire à chaque étape de vos projets.",
    features: ["AMO projets", "Études techniques", "Schémas directeurs", "Audit spatial"],
    color: "from-orange-500 to-orange-700",
    glow: "rgba(249,115,22,0.25)",
    accent: "#f97316",
    signal: "AMO · PMBOK · ISO",
    coord: "33°35′N 007°35′W",
    image: "https://etafat.ma/wp-content/uploads/2021/01/ingenieurie_infrastructure.jpg",
    video: "/videos/conseil.mp4",
  },
  {
    icon: Eye,
    title: "Inspection d'Infrastructures",
    abbr: "INSPECTION",
    description: "Inspection par drones, LiDAR et mobile mapping des réseaux et ouvrages. Détection précoce des défauts pour une maintenance proactive.",
    details: "Nos missions d'inspection combinent capteurs avancés (drones FPV, LiDAR, caméras thermiques) et intelligence artificielle pour détecter, quantifier et localiser les désordres structurels sur les ponts, barrages, réseaux et bâtiments. Chaque mission se conclut par un rapport 3D interactif et un plan de maintenance priorisé.",
    features: ["Inspection par drone", "LiDAR terrestre", "Mobile mapping", "Rapports 3D"],
    color: "from-cyan-500 to-cyan-700",
    glow: "rgba(6,182,212,0.25)",
    accent: "#06b6d4",
    signal: "UAS · IR · UT",
    coord: "35°46′N 005°48′W",
    image: "https://etafat.ma/wp-content/uploads/2020/12/inspection.png",
  },
  {
    icon: Building2,
    title: "BIM & Digital",
    abbr: "BIM",
    description: "Modélisation BIM, scan-to-BIM et jumeaux numériques pour la gestion du cycle de vie des bâtiments et des infrastructures.",
    details: "Etafat accompagne la transition numérique de l'acte de construire grâce à la modélisation BIM, au scan-to-BIM et à la création de jumeaux numériques. Nos maquettes BIM multi-usages (AEC, MEP, infrastructure) sont conformes aux niveaux de détail LOD 200 à LOD 500 et s'intègrent dans les workflows Revit, ArchiCAD et Civil 3D.",
    features: ["Scan-to-BIM", "Jumeaux numériques", "Maquettes 3D", "Coordination BIM"],
    color: "from-rose-500 to-rose-700",
    glow: "rgba(244,63,94,0.25)",
    accent: "#f43f5e",
    signal: "IFC · LOD 500 · COBie",
    coord: "34°01′N 006°49′W",
    image: "https://etafat.ma/wp-content/uploads/2021/01/bim-batiment.jpg",
    video: "/videos/bim.mp4",
  },
  {
    icon: GraduationCap,
    title: "Académie Etafat",
    abbr: "ACADÉMIE",
    description: "Formations certifiantes en géomatique, topographie et technologies géospatiales. Développez les compétences de vos équipes avec nos experts terrain.",
    details: "L'Académie Etafat propose des formations professionnelles certifiantes en géomatique, topographie, LiDAR, drone et SIG. Dispensées par nos ingénieurs seniors, elles combinent théorie et mise en pratique sur le terrain avec nos équipements professionnels. Des programmes sur mesure sont disponibles pour les entreprises et organismes publics.",
    features: ["Formations certifiantes", "Ateliers pratiques", "E-learning", "Accompagnement"],
    color: "from-yellow-500 to-yellow-700",
    glow: "rgba(234,179,8,0.25)",
    accent: "#eab308",
    signal: "OFPPT · CPF · ISO 29990",
    coord: "31°38′N 008°00′W",
    image: "https://etafat.ma/wp-content/uploads/2020/12/etafat_academie-e1610024624338.png",
    video: "/videos/formation.mp4",
  },
]

// ─── Service Modal ─────────────────────────────────────────────────────────────
function ServiceModal({ service, onClose }: { service: typeof services[0]; onClose: () => void }) {
  const { isDark } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [dragY, setDragY] = useState(0)
  const touchStartY = useRef(0)
  const isDragging = useRef(false)
  const Icon = service.icon

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  const handleClose = () => {
    setMounted(false)
    setTimeout(onClose, 300)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    isDragging.current = true
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setDragY(delta)
  }
  const onTouchEnd = () => {
    isDragging.current = false
    if (dragY > 80) handleClose()
    else setDragY(0)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{
        background: mounted ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0)",
        backdropFilter: mounted ? "blur(8px)" : "blur(0px)",
        transition: "background 0.3s ease, backdrop-filter 0.3s ease",
      }}
      onClick={handleClose}
    >
      <div
        className="modal-surface relative w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-none sm:block"
        style={{
          border: `1px solid ${service.accent}35`,
          borderRadius: "4px",
          boxShadow: `0 0 0 1px ${service.accent}15, 0 40px 80px rgba(0,0,0,0.6), 0 0 80px ${service.accent}15`,
          transform: mounted
            ? `scale(1) translateY(${dragY}px)`
            : "scale(0.88) translateY(24px)",
          opacity: mounted ? Math.max(0, 1 - dragY / 200) : 0,
          transition: dragY > 0 ? "none" : "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        }}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: `${service.accent}60` }} />
        </div>
        {/* Background geo grid */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.06 }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="svc-geo-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={service.accent} strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#svc-geo-grid)" />
          </svg>
        </div>

        {/* Corner brackets */}
        {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-5 h-5 pointer-events-none z-10`}
            style={{ borderColor: service.accent, opacity: 0.8, borderStyle: "solid",
              borderWidth: i === 0 ? "2px 0 0 2px" : i === 1 ? "2px 2px 0 0" : i === 2 ? "0 0 2px 2px" : "0 2px 2px 0" }} />
        ))}

        {/* Header bar */}
        <div className="relative flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: `${service.accent}25`, background: `${service.accent}08` }}>
          <div className="flex items-center gap-3">
            <div className="relative w-2 h-2">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: service.accent, opacity: 0.4 }} />
              <div className="w-2 h-2 rounded-full" style={{ background: service.accent }} />
            </div>
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: service.accent }}>
              {service.abbr}
            </span>
          </div>
          <button onClick={handleClose}
            className="modal-close-btn w-7 h-7 flex items-center justify-center rounded transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content — mobile only */}
        <div className="overflow-y-auto sm:overflow-visible overscroll-contain flex-1 sm:flex-none">
          {/* Image slot */}
          <div className="relative w-full overflow-hidden max-h-48 sm:max-h-80" style={{ aspectRatio: "16 / 9" }}>
            {(service as any).video ? (
              <video
                src={(service as any).video}
                autoPlay loop playsInline
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.85) saturate(1.05)" }}
                ref={el => { if (el) { el.muted = true; el.play().catch(() => {}) } }}
              />
            ) : service.image ? (
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.85) saturate(1.05)" }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, #050c1a 0%, ${service.accent}18 100%)` }}>
                {[0, 1, 2, 3].map(r => (
                  <div key={r} className="absolute rounded-full border"
                    style={{
                      width: `${80 + r * 60}px`, height: `${80 + r * 60}px`,
                      borderColor: `${service.accent}${["30", "20", "15", "08"][r]}`,
                      animation: `radar-sweep ${6 + r * 2}s linear infinite`,
                      animationDelay: `${r * -1.5}s`,
                    }} />
                ))}
                <div className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: `${service.accent}18`, border: `1px solid ${service.accent}40`,
                    boxShadow: `0 0 40px ${service.accent}30` }}>
                  <Icon className="w-10 h-10" style={{ color: service.accent }} />
                </div>
              </div>
            )}
            {/* Gradient fade into body */}
            <div className="modal-img-fade absolute bottom-0 left-0 right-0 h-16 pointer-events-none" />
          </div>

          {/* Body */}
          <div className="p-6 pt-4">
            {/* Icon + Title */}
            <div className="flex items-start gap-4 mb-5">
              <div className="relative flex-shrink-0">
                <div className="absolute animate-spin-slow pointer-events-none"
                  style={{ inset: "-6px", border: `1px dashed ${service.accent}30`, borderRadius: "50%" }} />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${service.accent}15`, border: `1px solid ${service.accent}35` }}>
                  <Icon className="w-6 h-6" style={{ color: service.accent }} />
                </div>
              </div>
              <div>
                <h2 className="t-head text-xl font-black mb-1">{service.title}</h2>
                <p className="t-muted text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>

            {/* Detail paragraph */}
            <div className="modal-detail-box mb-5 p-4 rounded">
              <div className="flex items-center gap-2 mb-2">
                <ChevronRight className="w-3 h-3" style={{ color: service.accent }} />
                <span className="text-xs font-mono tracking-widest uppercase" style={{ color: service.accent }}>
                  Description
                </span>
              </div>
              <p className="t-muted text-sm leading-relaxed">{service.details}</p>
            </div>

            {/* Features chips */}
            <div className="hidden sm:flex flex-wrap gap-2 mb-5">
              {service.features.map((f) => (
                <span key={f} className="text-xs font-mono px-3 py-1 rounded-full"
                  style={{
                    background: `${service.accent}12`,
                    border: `1px solid ${service.accent}30`,
                    color: `${service.accent}cc`,
                  }}>
                  {f}
                </span>
              ))}
            </div>

            {/* Coordinates row */}
            <div className="modal-coord-border flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" style={{ color: service.accent }} />
                <span className="modal-coord-text text-xs font-mono">{service.coord}</span>
              </div>
              <span className="text-lg font-black tracking-widest" style={{ color: isDark ? "#ffffff" : "#007BFF" }}>ETAFAT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Card ──────────────────────────────────────────────────────────────────────
function ServiceCard({ service, index, onOpen }: { service: typeof services[0]; index: number; onOpen: () => void }) {
  const { ref: revealRef, isVisible } = useScrollReveal(0.1)
  const { ref: focusRef, centered } = useCenterFocus()
  const [hovered, setHovered] = useState(false)
  const { isDark } = useTheme()
  const Icon = service.icon
  const active = hovered || centered

  const setRefs = useCallback((el: HTMLDivElement | null) => {
    ;(revealRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    ;(focusRef as React.MutableRefObject<HTMLDivElement | null>).current = el
  }, [])

  return (
    <div ref={setRefs} id={`service-${service.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "")}`} className="reveal" style={{ transitionDelay: `${index * 80}ms` }}>
      <div
        data-open-id={`service-${service.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "")}`}
        className="group relative rounded-2xl p-6 h-full cursor-pointer transition-all duration-400 overflow-hidden flex flex-col"
        style={{
          background: active
            ? isDark
              ? `linear-gradient(135deg, rgba(0,5,16,0.9), rgba(0,5,16,0.7))`
              : `linear-gradient(135deg, rgba(255,255,255,1), ${service.accent}0d)`
            : isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.97)",
          border: `1px solid ${active ? service.accent + (isDark ? "50" : "40") : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,90,200,0.18)"}`,
          boxShadow: active ? `0 20px 60px ${service.glow}` : isDark ? "none" : "0 4px 20px rgba(0,80,180,0.1)",
          transform: active ? "translateY(-6px)" : "translateY(0)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && onOpen()}
      >
        <GlowingEffect
          spread={40}
          glow={false}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
          variant="blue"
        />
        {/* Corner brackets on hover/focus */}
        {active && (
          <>
            <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
              style={{ borderTop: `2px solid ${service.accent}`, borderLeft: `2px solid ${service.accent}`, borderRadius: "2px 0 0 0" }} />
            <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none"
              style={{ borderBottom: `2px solid ${service.accent}`, borderRight: `2px solid ${service.accent}`, borderRadius: "0 0 2px 0" }} />
          </>
        )}

        {/* Background gradient on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 rounded-2xl"
          style={{ background: `radial-gradient(circle at 30% 30%, ${service.accent}08, transparent 70%)` }}
        />

        {/* Abbr badge */}
        <div className="absolute top-4 right-4">
          <span className="text-xs font-bold tracking-widest opacity-30" style={{ color: isDark ? "#fff" : "#000" }}>{service.abbr}</span>
        </div>

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
          style={{
            background: active
              ? `linear-gradient(135deg, ${service.accent}30, ${service.accent}15)`
              : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,90,200,0.06)",
            border: `1px solid ${active ? service.accent + "40" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,90,200,0.15)"}`,
          }}
        >
          <Icon className="w-6 h-6 transition-colors duration-300"
            style={{ color: active ? service.accent : isDark ? "#94a3b8" : "#4a6a85" }} />
        </div>

        {/* Title */}
        <h3 className="t-head font-bold text-base mb-3 leading-tight">{service.title}</h3>

        {/* Description */}
        <p className="t-muted text-sm leading-relaxed mb-5">{service.description}</p>

        {/* Features */}
        <ul className="space-y-1.5 mb-5">
          {service.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs t-muted">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-300"
                style={{ background: active ? service.accent : isDark ? "#4b5563" : "#94a3b8" }} />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="flex items-center gap-1.5 text-xs font-semibold transition-all duration-300 mb-4"
          style={{ color: active ? service.accent : isDark ? "rgba(255,255,255,0.3)" : "rgba(0,60,140,0.4)" }}>
          En savoir plus
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
        </div>

        {/* Preview image */}
        <div className="relative w-full overflow-hidden rounded-xl mt-auto"
          style={{ height: "140px" }}>
          <div className="absolute inset-0 z-10 rounded-xl"
            style={{
              background: isDark
                ? `linear-gradient(to bottom, rgba(0,5,16,0.3) 0%, rgba(0,5,16,0) 30%, rgba(0,5,16,0) 60%, rgba(0,5,16,0.7) 100%)`
                : `linear-gradient(to bottom, rgba(240,246,255,0.2) 0%, rgba(240,246,255,0) 30%, rgba(240,246,255,0) 60%, rgba(240,246,255,0.6) 100%)`,
            }} />
          {/* Accent tint on hover */}
          <div className="absolute inset-0 z-10 rounded-xl transition-opacity duration-300"
            style={{
              background: `linear-gradient(135deg, ${service.accent}18, transparent)`,
              opacity: active ? 1 : 0,
            }} />
          {(service as any).video ? (
            <video
              src={(service as any).video}
              autoPlay loop playsInline
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ filter: isDark ? "brightness(0.75) saturate(0.9)" : "brightness(0.95) saturate(1.05)" }}
              ref={el => { if (el) { el.muted = true; el.play().catch(() => {}) } }}
            />
          ) : (
            <img
              src={service.image}
              alt={service.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ filter: isDark ? "brightness(0.75) saturate(0.9)" : "brightness(0.95) saturate(1.05)" }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Section ───────────────────────────────────────────────────────────────────
export default function ServicesSection() {
  const { ref, isVisible } = useScrollReveal()
  const [selected, setSelected] = useState<typeof services[0] | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id
      if (!id) return
      const btn = document.querySelector<HTMLElement>(`[data-open-id="${id}"]`)
      btn?.click()
    }
    window.addEventListener("etafat:open", handler)
    return () => window.removeEventListener("etafat:open", handler)
  }, [])

  return (
    <section className="py-24 sec-bg-b relative overflow-hidden" id="services">
      <div className="absolute inset-0 moroccan-pattern opacity-30" />
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#007BFF]/10 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#00669D]/8 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div ref={ref} className={`text-center mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#007BFF]/10 border border-[#007BFF]/20 px-4 py-1.5 text-xs text-[#007BFF] uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Nos domaines d&apos;expertise
          </div>
          <h2 className="text-4xl sm:text-5xl font-black t-head mb-4">
            7 expertises au service de{" "}
            <span className="gradient-text">vos territoires</span>
          </h2>
          <p className="t-body max-w-2xl mx-auto text-lg">
            Des solutions géospatiales complètes, de la collecte terrain à la restitution numérique, pour tous vos enjeux d&apos;aménagement et de gestion.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {services.slice(0, 4).map((s, i) => (
            <ServiceCard key={s.abbr} service={s} index={i} onOpen={() => setSelected(s)} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 lg:max-w-3xl lg:mx-auto xl:max-w-none xl:grid-cols-3">
          {services.slice(4).map((s, i) => (
            <ServiceCard key={s.abbr} service={s} index={i + 4} onOpen={() => setSelected(s)} />
          ))}
        </div>
      </div>

      {selected && <ServiceModal service={selected} onClose={() => setSelected(null)} />}

      <div className="section-divider mt-24" />
    </section>
  )
}
