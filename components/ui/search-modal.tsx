"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X, ArrowRight, Hash } from "lucide-react"
import { useTheme } from "@/lib/theme-context"

const searchItems = [
  // Sections
  { label: "Accueil",          category: "Section",   href: "#home",        keywords: "home hero accueil" },
  { label: "Nos Services",     category: "Section",   href: "#services",    keywords: "services sig géomatique topographie" },
  { label: "Technologies",     category: "Section",   href: "#technologies",keywords: "technologies drone scan lidar gpr" },
  { label: "À Propos",         category: "Section",   href: "#about",       keywords: "about histoire equipe propos etafat" },
  { label: "Statistiques",     category: "Section",   href: "#stats",       keywords: "stats chiffres experts années" },
  { label: "Clients",          category: "Section",   href: "#clients",     keywords: "clients références partenaires" },
  { label: "Académie Etafat",  category: "Section",   href: "#académie",    keywords: "académie formation training" },
  { label: "Contact",          category: "Section",   href: "#contact",     keywords: "contact email telephone message" },
  // Services
  { label: "SIG & Géomatique",           category: "Service", href: "#services", keywords: "sig géomatique cartographie" },
  { label: "Foncier & Topographie",      category: "Service", href: "#services", keywords: "foncier topographie terrain" },
  { label: "Ingénierie des données",     category: "Service", href: "#services", keywords: "données data ingénierie" },
  { label: "Conseil en ingénierie",      category: "Service", href: "#services", keywords: "conseil ingénierie expertise" },
  { label: "Inspection d'infrastructures", category: "Service", href: "#services", keywords: "inspection infrastructure pont route" },
  { label: "BIM & Digital",             category: "Service", href: "#services", keywords: "bim digital numérique modélisation" },
  // Marchés
  { label: "Infrastructure & Transport", category: "Marché", href: "#services", keywords: "infrastructure transport route rail" },
  { label: "Planification territoriale", category: "Marché", href: "#services", keywords: "planification territoire urbanisme" },
  { label: "Énergie & Mines",           category: "Marché", href: "#services", keywords: "énergie mines pétrole" },
  { label: "Agriculture & Environnement",category: "Marché", href: "#services", keywords: "agriculture environnement forêt" },
  { label: "Urbanisme",                 category: "Marché", href: "#services", keywords: "urbanisme ville urban" },
  { label: "Port & Maritime",           category: "Marché", href: "#services", keywords: "port maritime mer" },
]

const categoryColors: Record<string, string> = {
  Section: "#007BFF",
  Service: "#10b981",
  Marché:  "#f97316",
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: Props) {
  const { isDark } = useTheme()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const suggestions = searchItems.slice(0, 5)

  const filtered = query.trim()
    ? searchItems.filter(item =>
        `${item.label} ${item.keywords} ${item.category}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ).slice(0, 5)
    : []

  // Reset active index when results change
  useEffect(() => { setActive(0) }, [query])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return }
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
      if (e.key === "Enter" && filtered[active]) {
        navigate(filtered[active].href)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, active, filtered]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${active}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [active])

  const navigate = (href: string) => {
    const id = href.replace("#", "")
    const target = document.getElementById(id)
    if (target) target.scrollIntoView({ behavior: "smooth" })
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300 ${isDark ? "bg-[#060f1e] border border-white/10" : "bg-white border border-slate-200"}`}>

        {/* Input row */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b ${isDark ? "border-white/8" : "border-slate-100"}`}>
          <Search className="w-5 h-5 text-[#007BFF] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher une section, service, marché…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={`flex-1 bg-transparent text-sm outline-none ${isDark ? "text-white placeholder-white/30" : "text-slate-800 placeholder-slate-400"}`}
          />
          <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${isDark ? "text-white/40 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
          {!query.trim() ? (
            /* No query — show 5 suggestions */
            <>
              <p className={`px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-white/25" : "text-slate-400"}`}>
                Suggestions
              </p>
              {suggestions.map((item, i) => (
                <button
                  key={`sug-${i}`}
                  data-index={i}
                  onClick={() => navigate(item.href)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ${
                    active === i
                      ? isDark ? "bg-white/8" : "bg-[#007BFF]/6"
                      : "hover:bg-transparent"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${categoryColors[item.category]}20` }}>
                    <Hash className="w-3.5 h-3.5" style={{ color: categoryColors[item.category] }} />
                  </div>
                  <span className={`text-sm ${isDark ? "text-white/50" : "text-slate-500"}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </>
          ) : filtered.length === 0 ? (
            <p className={`text-center text-sm py-8 ${isDark ? "text-white/30" : "text-slate-400"}`}>
              Aucun résultat pour &ldquo;{query}&rdquo;
            </p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={`${item.label}-${i}`}
                data-index={i}
                onClick={() => navigate(item.href)}
                onMouseEnter={() => setActive(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ${
                  active === i
                    ? isDark ? "bg-white/8" : "bg-[#007BFF]/6"
                    : "hover:bg-transparent"
                }`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${categoryColors[item.category]}20` }}>
                  <Hash className="w-3.5 h-3.5" style={{ color: categoryColors[item.category] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
                    {item.label}
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: `${categoryColors[item.category]}18`, color: categoryColors[item.category] }}>
                  {item.category}
                </span>
                {active === i && <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: categoryColors[item.category] }} />}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className={`flex items-center justify-end gap-4 px-4 py-2.5 border-t text-xs ${isDark ? "border-white/8 text-white/25" : "border-slate-100 text-slate-400"}`}>
          <span>↑↓ naviguer</span>
          <span>↵ aller</span>
          <span>esc fermer</span>
        </div>
      </div>
    </div>
  )
}
