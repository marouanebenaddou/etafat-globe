"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X, ArrowRight, Hash } from "lucide-react"
import { useTheme } from "@/lib/theme-context"

type SearchItem = {
  label: string
  category: string
  keywords: string
  section: string
  cardLabel?: string  // first word(s) used to find the card button by text
  cardId?: string
  cardSection?: string
}

const searchItems: SearchItem[] = [
  // Sections
  { label: "Accueil",                     category: "Section",  section: "home",         keywords: "accueil home hero révélons potentiel afrique" },
  { label: "Nos Services",                category: "Section",  section: "services",     keywords: "services offres expertises" },
  { label: "Nos Marchés",                 category: "Section",  section: "marches",      keywords: "marchés secteurs solutions adaptées" },
  { label: "Technologies",                category: "Section",  section: "technologies", keywords: "technologies arsenal pointe équipements" },
  { label: "Notre Parcours",              category: "Section",  section: "about",        keywords: "about histoire parcours fondation etafat 1983" },
  { label: "Ils nous font confiance",     category: "Section",  section: "clients",      keywords: "clients références partenaires confiance" },
  { label: "Académie Etafat",             category: "Section",  section: "academy",      keywords: "académie formation training certification" },
  { label: "Contactez-nous",             category: "Section",  section: "contact",      keywords: "contact email téléphone message formulaire" },
  // Services
  { label: "Systèmes d'Information Géographique", category: "Service", section: "services", cardLabel: "Systèmes", keywords: "sig géomatique cartographie spatiale analyse données décision urbanisme" },
  { label: "Foncier & Topographie",      category: "Service",  section: "services", cardLabel: "Foncier",       keywords: "foncier topographie levé terrain bornage morcellement délimitation" },
  { label: "Ingénierie des Données",     category: "Service",  section: "services", cardLabel: "Ingénierie des", keywords: "données data ingénierie pipeline cloud acquisition traitement structuration" },
  { label: "Conseil en Ingénierie",      category: "Service",  section: "services", cardLabel: "Conseil",        keywords: "conseil ingénierie étude amo schéma directeur audit aménagement territorial" },
  { label: "Inspection d'Ouvrages",      category: "Service",  section: "services", cardLabel: "Inspection",     keywords: "inspection infrastructure pont route ouvrage" },
  { label: "BIM & Digital Twin",         category: "Service",  section: "services", cardLabel: "BIM",            keywords: "bim digital numérique jumeau modélisation 3d maquette" },
  { label: "Académie Etafat",            category: "Service",  section: "services", cardLabel: "Académie",       keywords: "académie formation training certification etafat" },
  // Technologies
  { label: "Drones & UAV",               category: "Tech",     section: "technologies", cardLabel: "Drones",         keywords: "drone uav photogrammétrie vol aérien orthophoto haute résolution" },
  { label: "LiDAR",                      category: "Tech",     section: "technologies", cardLabel: "LiDAR",          keywords: "lidar laser aérien nuage points 3d topographie" },
  { label: "GPS / GNSS",                 category: "Tech",     section: "technologies", cardLabel: "GPS",            keywords: "gps gnss rtk positionnement satellite géodésie mesure" },
  { label: "Mobile Mapping",             category: "Tech",     section: "technologies", cardLabel: "Mobile",         keywords: "mobile mapping véhicule scan route corridor" },
  { label: "Bathymétrie",                category: "Tech",     section: "technologies", cardLabel: "Bathym",         keywords: "bathymétrie fond marin lac rivière profondeur sonar" },
  { label: "Géoradar GPR",               category: "Tech",     section: "technologies", cardLabel: "Géoradar",       keywords: "géoradar gpr sol sous-sol détection réseaux cavités" },
  { label: "Détection EM",               category: "Tech",     section: "technologies", cardLabel: "Détection",      keywords: "détection électromagnétique em réseaux souterrains canalisations" },
  { label: "Laser Scanning",             category: "Tech",     section: "technologies", cardLabel: "Laser",          keywords: "laser scanning numérisation bim relevé intérieur" },
  { label: "Stations Totales",           category: "Tech",     section: "technologies", cardLabel: "Stations",       keywords: "station totale tachéomètre mesure précision topographie terrain" },
  // Marchés
  { label: "Infrastructures",            category: "Marché",   section: "marches", keywords: "infrastructures routes autoroutes ponts aéroports rail" },
  { label: "Aménagement du Territoire",  category: "Marché",   section: "marches", keywords: "aménagement territoire urbanisme patrimoine foncier" },
  { label: "Énergie & Mines",            category: "Marché",   section: "marches", keywords: "énergie mines carrières renouvelable solaire vent" },
  { label: "Agriculture",                category: "Marché",   section: "marches", keywords: "agriculture précision télédétection irrigation forêt" },
  { label: "Cartographie",               category: "Marché",   section: "marches", keywords: "cartographie orthophoto mnt bim 3d planification" },
  // Clients
  { label: "OCP",       category: "Client",   section: "clients", keywords: "ocp phosphates mines chimie" },
  { label: "ONCF",      category: "Client",   section: "clients", keywords: "oncf ferroviaire train rail" },
  { label: "ADM",       category: "Client",   section: "clients", keywords: "adm autoroutes maroc routes" },
  { label: "ONDA",      category: "Client",   section: "clients", keywords: "onda aéroports aviation" },
  { label: "MASEN",     category: "Client",   section: "clients", keywords: "masen énergie solaire renouvelable" },
  { label: "Al Omrane", category: "Client",   section: "clients", keywords: "al omrane immobilier habitat" },
  { label: "ANCFCC",    category: "Client",   section: "clients", keywords: "ancfcc conservation foncière cadastre" },
  // Parcours
  { label: "Fondation 1983",               category: "Parcours", section: "about", keywords: "1983 fondation rabat ingénieurs topographes visionnaires" },
  { label: "Expansion nationale 1995",     category: "Parcours", section: "about", keywords: "1995 expansion nationale agences maroc" },
  { label: "Révolution SIG 2005",          category: "Parcours", section: "about", keywords: "2005 sig révolution information géographique gps" },
  { label: "Etafat Afrique 2012",          category: "Parcours", section: "about", keywords: "2012 afrique côte ivoire subsaharienne expansion" },
  { label: "LiDAR & Drones 2018",          category: "Parcours", section: "about", keywords: "2018 lidar drones mobile mapping technologie" },
  { label: "Etafat Sénégal & BIM 2024",    category: "Parcours", section: "about", keywords: "2024 sénégal bim digital jumeau numérique" },
  { label: "Premier projet en Asie 2025",  category: "Parcours", section: "about", keywords: "2025 asie premier projet géospatial international" },
]

const suggestions = searchItems.slice(0, 5)

const categoryColors: Record<string, string> = {
  Section:  "#007BFF",
  Service:  "#10b981",
  Tech:     "#8b5cf6",
  Marché:   "#f97316",
  Client:   "#22d3ee",
  Parcours: "#f43f5e",
}

function flashSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.add("search-flash")
  setTimeout(() => el.classList.remove("search-flash"), 1800)
}

interface Props { open: boolean; onClose: () => void }

export default function SearchModal({ open, onClose }: Props) {
  const { isDark } = useTheme()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? searchItems.filter(item =>
        `${item.label} ${item.keywords} ${item.category}`
          .toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : []

  const displayList = query.trim() ? filtered : suggestions
  const showSuggestionLabel = !query.trim()

  useEffect(() => { setActive(0) }, [query])

  useEffect(() => {
    if (open) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return }
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, displayList.length - 1)) }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
      if (e.key === "Enter" && displayList[active]) navigate(displayList[active])
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, active, displayList]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${active}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [active])

  const navigate = (item: SearchItem) => {
    onClose()
    const section = document.getElementById(item.section)
    if (section) {
      section.scrollIntoView({ behavior: "smooth" })
      setTimeout(() => flashSection(item.section), 600)
    }
    if (item.cardLabel) {
      setTimeout(() => {
        // Find all card buttons with data-open-id in the section
        const sectionEl = document.getElementById(item.section)
        if (!sectionEl) return
        const cards = Array.from(sectionEl.querySelectorAll<HTMLElement>("[data-open-id]"))
        // Match by closest text content to the label
        const label = item.cardLabel!.toLowerCase()
        const match = cards.find(card =>
          card.textContent?.toLowerCase().includes(label.split(" ")[0]) ||
          card.textContent?.toLowerCase().includes(label.split("&")[0].trim())
        )
        if (match) {
          match.click()
        }
      }, 750)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden ${isDark ? "bg-[#060f1e] border border-white/10" : "bg-white border border-slate-200"}`}>

        {/* Input */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b ${isDark ? "border-white/8" : "border-slate-100"}`}>
          <Search className="w-5 h-5 text-[#007BFF] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher sur le site…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={`flex-1 bg-transparent text-sm outline-none ${isDark ? "text-white placeholder-white/30" : "text-slate-800 placeholder-slate-400"}`}
          />
          {query && (
            <button onClick={() => setQuery("")} className={`p-1 rounded transition-colors ${isDark ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-600"}`}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${isDark ? "text-white/40 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
          {showSuggestionLabel && (
            <p className={`px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-white/25" : "text-slate-400"}`}>
              Suggestions
            </p>
          )}
          {displayList.length === 0 && query.trim() ? (
            <p className={`text-center text-sm py-8 ${isDark ? "text-white/30" : "text-slate-400"}`}>
              Aucun résultat pour &ldquo;{query}&rdquo;
            </p>
          ) : (
            displayList.map((item, i) => (
              <button
                key={`${item.label}-${i}`}
                data-index={i}
                onClick={() => navigate(item)}
                onMouseEnter={() => setActive(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ${active === i ? (isDark ? "bg-white/8" : "bg-[#007BFF]/6") : ""}`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${categoryColors[item.category] ?? "#007BFF"}20` }}>
                  <Hash className="w-3.5 h-3.5" style={{ color: categoryColors[item.category] ?? "#007BFF" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${showSuggestionLabel ? (isDark ? "text-white/50" : "text-slate-500") : (isDark ? "text-white" : "text-slate-800")}`}>
                    {item.label}
                  </span>
                </div>
                {!showSuggestionLabel && (
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${categoryColors[item.category] ?? "#007BFF"}18`, color: categoryColors[item.category] ?? "#007BFF" }}>
                    {item.category}
                  </span>
                )}
                {active === i && <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: categoryColors[item.category] ?? "#007BFF" }} />}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-4 px-4 py-2.5 border-t text-xs ${isDark ? "border-white/8 text-white/25" : "border-slate-100 text-slate-400"}`}>
          <span>↑↓ naviguer</span><span>↵ aller</span><span>esc fermer</span>
        </div>
      </div>
    </div>
  )
}
