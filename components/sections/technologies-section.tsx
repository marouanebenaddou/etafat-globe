"use client"

import { useScrollReveal, useCenterFocus } from "@/lib/hooks"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { useTheme } from "@/lib/theme-context"
import { useState, useEffect, useRef, useCallback } from "react"
import { Plane, ScanLine, MapPin, Car, Waves, Radio, Zap, Camera, Crosshair, X, ChevronRight } from "lucide-react"

const technologies = [
  {
    icon: Plane,
    name: "Drones & UAV",
    category: "Acquisition aérienne",
    description: "Photogrammétrie et orthophotographies haute résolution. Couverture rapide de grandes surfaces pour cartographie et inspection.",
    details: "Nos flottes de drones professionnels effectuent des missions de cartographie complètes avec traitement photogrammétrique automatisé. Chaque vol est planifié avec précision pour garantir une couverture optimale et une reconstruction 3D fidèle du terrain.",
    specs: ["Très haute résolution", "Grandes surfaces", "Vol autonome GPS", "Traitement IA"],
    coord: "31°09′N 007°59′W",
    signal: "GNSS RTK · Multi-satellite",
    color: "#007BFF",
    bg: "rgba(0,123,255,0.08)",
    image: "https://etafat.ma/wp-content/uploads/2021/01/drone_acquisition.jpg" as string | null,
    video: "/videos/drone-uav.mp4" as string | null,
  },
  {
    icon: ScanLine,
    name: "LiDAR",
    category: "Numérisation 3D",
    description: "Acquisition de nuages de points 3D haute densité pour la modélisation du terrain et des ouvrages avec une précision centimétrique.",
    details: "La technologie LiDAR permet d'acquérir des millions de points 3D par seconde avec une précision centimétrique. Idéal pour la modélisation de terrain, l'inspection d'ouvrages, et la création de jumeaux numériques précis.",
    specs: ["Très haute densité", "Précision centimétrique", "Longue portée", "Temps réel"],
    coord: "33°59′N 006°51′W",
    signal: "LIDAR · Infrarouge · Classe 1",
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.08)",
    image: "https://etafat.ma/wp-content/uploads/2021/01/pva_lidar.jpg" as string | null,
    video: "/videos/lidar.mp4" as string | null,
  },
  {
    icon: MapPin,
    name: "GPS / GNSS",
    category: "Positionnement",
    description: "Systèmes de positionnement géodésique RTK et réseau de stations permanentes pour une précision millimétrique sur le terrain.",
    details: "Notre infrastructure GNSS comprend des récepteurs multi-constellation de haute précision et un réseau de stations de référence CORS couvrant le Maroc. La technique RTK assure une précision centimétrique en temps réel sur le terrain.",
    specs: ["Précision millimétrique", "Multi-constellation", "RTK & PPP", "Réseau CORS"],
    coord: "30°25′N 009°36′W",
    signal: "GPS+GLONASS+Galileo+BeiDou",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    image: "https://etafat.ma/wp-content/uploads/2021/01/gps-1.jpg" as string | null,
    video: "/videos/gps-gnss.mp4" as string | null,
  },
  {
    icon: Car,
    name: "Mobile Mapping",
    category: "Relevé mobile",
    description: "Acquisition de données géospatiales depuis des véhicules en mouvement. Cartographie rapide des réseaux linéaires et infrastructures routières.",
    details: "Les systèmes de Mobile Mapping combinent LiDAR, caméras panoramiques et GNSS embarqués pour cartographier rapidement les corridors routiers, les réseaux urbains et les infrastructures linéaires à grande vitesse.",
    specs: ["Grande vitesse", "Haute précision", "LiDAR + caméras", "Grands linéaires"],
    coord: "34°01′N 005°00′W",
    signal: "IMU · LiDAR · Caméras 360°",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    image: "https://etafat.ma/wp-content/uploads/2021/01/mms-e1609684489385.jpg" as string | null,
    video: "/videos/mobile-mapping.mp4" as string | null,
  },
  {
    icon: Waves,
    name: "Bathymétrie",
    category: "Relevé sous-marin",
    description: "Cartographie du fond des plans d'eau par sondeur multi-faisceaux. Essentiel pour les projets portuaires, barrages et gestion des ressources en eau.",
    details: "Nos levés bathymétriques utilisent des sondeurs multi-faisceaux de dernière génération pour cartographier les fonds sous-marins avec une haute résolution. Application aux ports, barrages, lacs et zones côtières.",
    specs: ["Multi-faisceaux", "Très haute résolution", "Intégration GNSS", "Traitement 3D"],
    coord: "35°46′N 005°48′W",
    signal: "MBES · Haute fréquence · SVP",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.08)",
    image: "https://etafat.ma/wp-content/uploads/2021/01/bathymetrie.jpg" as string | null,
    video: "/videos/bathymetrie.mp4" as string | null,
  },
  {
    icon: Radio,
    name: "Géoradar GPR",
    category: "Détection souterraine",
    description: "Détection et localisation des réseaux enterrés et des cavités souterraines sans fouilles. Technologie non-destructive pour l'investigation du sous-sol.",
    details: "Le géoradar (Ground Penetrating Radar) émet des impulsions électromagnétiques dans le sol pour détecter et localiser les structures enterrées sans excavation. Réseaux, câbles, cavités, dalles — tout est cartographié avec précision.",
    specs: ["Grande profondeur", "Non destructif", "Haute fréquence", "Cartographie 3D"],
    coord: "32°52′N 009°02′W",
    signal: "GPR · Multi-fréquence",
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    image: "https://etafat.ma/wp-content/uploads/2021/01/georadar-1.jpg" as string | null,
    video: "/videos/georadar.mp4" as string | null,
  },
  {
    icon: Zap,
    name: "Détection EM",
    category: "Électromagnétique",
    description: "Détection électromagnétique des canalisations et câbles enfouis. Localisation précise des réseaux concessionnaires avant travaux.",
    details: "La détection électromagnétique (EM) permet de localiser avec précision les canalisations métalliques, câbles électriques et réseaux de télécommunications enfouis. Indispensable avant tout terrassement ou travaux de voirie.",
    specs: ["Grande profondeur", "Tous métaux", "Haute précision", "Certification"],
    coord: "33°35′N 007°35′W",
    signal: "EM · Multi-fréquence",
    color: "#eab308",
    bg: "rgba(234,179,8,0.08)",
    image: "https://etafat.ma/wp-content/uploads/2021/01/detecteur_electromagnetique.jpg" as string | null,
  },
  {
    icon: Camera,
    name: "Laser Scanning",
    category: "Numérisation BIM",
    description: "Scan 3D haute précision de bâtiments et ouvrages pour la production de plans as-built et maquettes BIM. Idéal pour la rénovation et le patrimoine.",
    details: "Le scan laser 3D capture des milliards de points avec une précision millimétrique pour numériser des bâtiments, ouvrages d'art et patrimoine historique. Le nuage de points résultant permet la production de plans as-built et de maquettes BIM.",
    specs: ["Précision millimétrique", "360° complet", "Milliards de points", "Scan-to-BIM"],
    coord: "34°01′N 006°49′W",
    signal: "TLS · Infrarouge · Haute précision",
    color: "#f43f5e",
    bg: "rgba(244,63,94,0.08)",
    image: "https://etafat.ma/wp-content/uploads/2021/03/scanner2.jpg" as string | null,
    video: "/videos/laser-scanning.mp4" as string | null,
  },
  {
    icon: Crosshair,
    name: "Stations Totales",
    category: "Topographie classique",
    description: "Levés topographiques de précision au théodolite et distancemètre. La base de notre expertise depuis 40 ans, toujours indispensable pour les projets complexes.",
    details: "Les stations totales robotisées constituent le cœur de la topographie traditionnelle. Avec une précision angulaire et linéaire de pointe, elles restent indispensables pour les implantations, les contrôles et les levés de précision.",
    specs: ["Très haute précision", "Longue portée", "Mesure directe", "ISO certifié"],
    coord: "31°38′N 008°00′W",
    signal: "EDM · ISO certifié",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.08)",
    image: "https://etafat.ma/wp-content/uploads/2021/01/station_totale.jpg" as string | null,
    video: "/videos/station-totale.mp4" as string | null,
  },
]

// ─── Geomatic Modal ────────────────────────────────────────────────────────────
function TechModal({ tech, onClose }: { tech: typeof technologies[0]; onClose: () => void }) {
  const { isDark } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [dragY, setDragY] = useState(0)
  const touchStartY = useRef(0)
  const isDragging = useRef(false)
  const Icon = tech.icon

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
      {/* Modal panel */}
      <div
        className="modal-surface relative w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-none sm:block"
        style={{
          border: `1px solid ${tech.color}35`,
          borderRadius: "4px",
          boxShadow: `0 0 0 1px ${tech.color}15, 0 40px 80px rgba(0,0,0,0.6), 0 0 80px ${tech.color}15`,
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
          <div className="w-10 h-1 rounded-full" style={{ background: `${tech.color}60` }} />
        </div>
        {/* ── Background geo grid ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.06 }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="geo-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={tech.color} strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#geo-grid)" />
          </svg>
        </div>

        {/* ── Corner brackets ── */}
        {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-5 h-5 pointer-events-none z-10`}
            style={{ borderColor: tech.color, opacity: 0.8, borderStyle: "solid",
              borderWidth: i === 0 ? "2px 0 0 2px" : i === 1 ? "2px 2px 0 0" : i === 2 ? "0 0 2px 2px" : "0 2px 2px 0" }} />
        ))}

        {/* ── Header bar ── */}
        <div className="relative flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: `${tech.color}25`, background: `${tech.color}08` }}>
          <div className="flex items-center gap-3">
            <div className="relative w-2 h-2">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: tech.color, opacity: 0.4 }} />
              <div className="w-2 h-2 rounded-full" style={{ background: tech.color }} />
            </div>
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: tech.color }}>
              {tech.category}
            </span>
            <span className="modal-header-slash text-xs font-mono">//</span>
            <span className="modal-header-signal text-xs font-mono hidden sm:inline">{tech.signal}</span>
          </div>
          <button onClick={handleClose}
            className="modal-close-btn w-7 h-7 flex items-center justify-center rounded transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content — mobile only */}
        <div className="overflow-y-auto sm:overflow-visible overscroll-contain flex-1 sm:flex-none">
          {/* ── Image / Video slot ── */}
          <div className="relative w-full overflow-hidden max-h-48 sm:max-h-80" style={{ aspectRatio: "16 / 9" }}>
            {"video" in tech && tech.video ? (
              <video
                src={tech.video}
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.9) saturate(1.05)" }}
                ref={el => { if (el) { el.muted = true; el.play().catch(() => {}) } }}
              />
            ) : tech.image ? (
              <img
                src={tech.image}
                alt={tech.name}
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.85) saturate(1.05)" }}
              />
            ) : (
              /* Styled placeholder — replace with AI-generated image */
              <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, #050c1a 0%, ${tech.color}18 100%)` }}>
                {/* Animated concentric rings */}
                {[0, 1, 2, 3].map(r => (
                  <div key={r} className="absolute rounded-full border"
                    style={{
                      width: `${80 + r * 60}px`, height: `${80 + r * 60}px`,
                      borderColor: `${tech.color}${["30", "20", "15", "08"][r]}`,
                      animation: `radar-sweep ${6 + r * 2}s linear infinite`,
                      animationDelay: `${r * -1.5}s`,
                    }} />
                ))}
                {/* Sweep */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 animate-radar origin-center relative">
                    <div className="absolute top-1/2 left-1/2 w-24 h-px origin-left"
                      style={{ background: `linear-gradient(90deg, ${tech.color}90, transparent)` }} />
                  </div>
                </div>
                {/* Center icon */}
                <div className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: `${tech.color}18`, border: `1px solid ${tech.color}40`,
                    boxShadow: `0 0 40px ${tech.color}30` }}>
                  <Icon className="w-10 h-10" style={{ color: tech.color }} />
                </div>
                {/* Grid overlay */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(${tech.color}08 1px, transparent 1px), linear-gradient(90deg, ${tech.color}08 1px, transparent 1px)`,
                    backgroundSize: "30px 30px",
                  }} />
                {/* Image slot label */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded"
                  style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${tech.color}25` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: tech.color }} />
                  <span className="text-xs font-mono" style={{ color: `${tech.color}80` }}>IMAGE SLOT</span>
                </div>
              </div>
            )}
            {/* Gradient fade into body */}
            <div className="modal-img-fade absolute bottom-0 left-0 right-0 h-16 pointer-events-none" />
          </div>

          {/* ── Body ── */}
          <div className="p-6 pt-4">
            {/* Icon + Title */}
            <div className="flex items-start gap-4 mb-5">
              <div className="relative flex-shrink-0">
                <div className="absolute animate-spin-slow pointer-events-none"
                  style={{ inset: "-6px", border: `1px dashed ${tech.color}30`, borderRadius: "50%" }} />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${tech.color}15`, border: `1px solid ${tech.color}35` }}>
                  <Icon className="w-6 h-6" style={{ color: tech.color }} />
                </div>
              </div>
              <div>
                <h2 className="t-head text-xl font-black mb-1">{tech.name}</h2>
                <p className="t-muted text-sm leading-relaxed">
                  {tech.description}
                </p>
              </div>
            </div>

            {/* Detail paragraph */}
            <div className="modal-detail-box mb-5 p-4 rounded">
              <div className="flex items-center gap-2 mb-2">
                <ChevronRight className="w-3 h-3" style={{ color: tech.color }} />
                <span className="text-xs font-mono tracking-widest uppercase" style={{ color: tech.color }}>
                  Description technique
                </span>
              </div>
              <p className="t-muted text-sm leading-relaxed">{tech.details}</p>
            </div>

            {/* Specs chips */}
            <div className="hidden sm:flex flex-wrap gap-2 mb-5">
              {tech.specs.map((spec) => (
                <span key={spec} className="text-xs font-mono px-3 py-1 rounded-full"
                  style={{
                    background: `${tech.color}12`,
                    border: `1px solid ${tech.color}30`,
                    color: `${tech.color}cc`,
                  }}>
                  {spec}
                </span>
              ))}
            </div>

            {/* Coordinates row */}
            <div className="modal-coord-border flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" style={{ color: tech.color }} />
                <span className="modal-coord-text text-xs font-mono">{tech.coord}</span>
              </div>
              <span className="text-lg font-black tracking-widest" style={{ color: isDark ? "#ffffff" : "#007BFF" }}>ETAFAT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function TechCard({
  tech,
  index,
  onOpen,
}: {
  tech: typeof technologies[0]
  index: number
  onOpen: () => void
}) {
  const { ref: revealRef, isVisible } = useScrollReveal(0.1)
  const { ref: focusRef, centered } = useCenterFocus()
  const [hovered, setHovered] = useState(false)
  const { isDark } = useTheme()
  const Icon = tech.icon
  const active = hovered || centered

  const setRefs = useCallback((el: HTMLDivElement | null) => {
    ;(revealRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    ;(focusRef as React.MutableRefObject<HTMLDivElement | null>).current = el
  }, [])

  return (
    <div ref={setRefs} id={`tech-${tech.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "")}`} className="reveal" style={{ transitionDelay: `${index * 60}ms` }}>
      <div
        data-open-id={`tech-${tech.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "")}`}
        className="group relative rounded-[5px] p-5 h-full transition-all duration-300 cursor-pointer overflow-hidden"
        style={{
          background: active
            ? isDark ? tech.bg : `linear-gradient(135deg, rgba(255,255,255,1), ${tech.color}0d)`
            : isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.97)",
          border: `1px solid ${active ? tech.color + "40" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,90,200,0.18)"}`,
          transform: active ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
          boxShadow: active ? `0 16px 40px ${tech.color}22` : isDark ? "none" : "0 4px 20px rgba(0,80,180,0.1)",
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
        {active && (
          <>
            <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
              style={{ borderTop: `2px solid ${tech.color}`, borderLeft: `2px solid ${tech.color}`, borderRadius: "2px 0 0 0" }} />
            <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none"
              style={{ borderBottom: `2px solid ${tech.color}`, borderRight: `2px solid ${tech.color}`, borderRadius: "0 0 2px 0" }} />
          </>
        )}

        <div className="text-xs font-semibold tracking-widest uppercase mb-3 transition-colors duration-300"
          style={{ color: active ? tech.color : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,60,140,0.4)" }}>
          {tech.category}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
            style={{
              background: active ? `${tech.color}20` : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,90,200,0.07)",
              border: `1px solid ${active ? tech.color + "35" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,90,200,0.15)"}`,
            }}>
            <Icon className="w-5 h-5 transition-colors duration-300" style={{ color: active ? tech.color : isDark ? "#6b7280" : "#4a6a85" }} />
          </div>
          <h3 className="t-head font-bold text-sm">{tech.name}</h3>
        </div>

        <p className="t-muted text-xs leading-relaxed mb-4">{tech.description}</p>

        <div className="grid grid-cols-2 gap-1.5">
          {tech.specs.map((spec) => (
            <div key={spec} className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full flex-shrink-0 transition-colors duration-300"
                style={{ background: active ? tech.color : "#374151" }} />
              <span className="text-xs t-xmuted">{spec}</span>
            </div>
          ))}
        </div>

        {/* Preview image */}
        <div className="relative w-full overflow-hidden rounded-lg mt-4" style={{ height: "110px" }}>
          <div className="absolute inset-0 z-10 rounded-lg"
            style={{
              background: isDark
                ? `linear-gradient(to bottom, rgba(0,5,16,0.2) 0%, rgba(0,5,16,0) 40%, rgba(0,5,16,0.65) 100%)`
                : `linear-gradient(to bottom, rgba(240,246,255,0.1) 0%, rgba(240,246,255,0) 40%, rgba(240,246,255,0.5) 100%)`,
            }} />
          <div className="absolute inset-0 z-10 rounded-lg transition-opacity duration-300"
            style={{
              background: `linear-gradient(135deg, ${tech.color}18, transparent)`,
              opacity: active ? 1 : 0,
            }} />
          {"video" in tech && tech.video ? (
            <video
              src={tech.video}
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ filter: isDark ? "brightness(0.7) saturate(0.9)" : "brightness(0.95) saturate(1.05)" }}
              ref={el => { if (el) { el.muted = true; el.play().catch(() => {}) } }}
            />
          ) : (
            <img
              src={tech.image ?? undefined}
              alt={tech.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ filter: isDark ? "brightness(0.7) saturate(0.9)" : "brightness(0.95) saturate(1.05)" }}
            />
          )}
        </div>

        <div className="absolute bottom-3 right-4 flex items-center gap-1 transition-all duration-300"
          style={{ opacity: active ? 0.6 : 0 }}>
          <span className="text-[10px] font-mono" style={{ color: tech.color }}>voir plus</span>
          <ChevronRight className="w-3 h-3" style={{ color: tech.color }} />
        </div>
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
export default function TechnologiesSection() {
  const { ref, isVisible } = useScrollReveal()
  const [selected, setSelected] = useState<typeof technologies[0] | null>(null)

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
    <section className="py-24 sec-bg-a relative overflow-hidden" id="technologies">
      <div className="absolute inset-0 moroccan-pattern opacity-20" />

      <div className="absolute top-1/2 right-16 w-64 h-64 -translate-y-1/2 pointer-events-none opacity-10">
        <div className="absolute inset-0 rounded-full border border-blue-500/50" />
        <div className="absolute inset-4 rounded-full border border-cyan-500/40" />
        <div className="absolute inset-8 rounded-full border border-blue-400/30" />
        <div className="absolute inset-12 rounded-full border border-cyan-400/20" />
        <div className="absolute inset-0 rounded-full overflow-hidden animate-radar origin-center">
          <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500/80 to-transparent origin-left" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div ref={ref} className={`text-center mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-1.5 text-xs text-cyan-400 uppercase tracking-widest mb-4">
            Technologies de pointe
          </div>
          <h2 className="text-4xl sm:text-5xl font-black t-head mb-4">
            L&apos;arsenal technologique{" "}
            <span className="gradient-text">d&apos;Etafat</span>
          </h2>
          <p className="t-body max-w-2xl mx-auto">
            Nous déployons les instruments les plus avancés du marché pour garantir la précision, la rapidité et la fiabilité de chaque acquisition de données géospatiales.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {technologies.map((tech, i) => (
            <TechCard key={tech.name} tech={tech} index={i} onOpen={() => setSelected(tech)} />
          ))}
        </div>
      </div>

      {selected && <TechModal tech={selected} onClose={() => setSelected(null)} />}

      <div className="section-divider mt-24" />
    </section>
  )
}
