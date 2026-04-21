"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, Satellite, Box, Map, Database, FileText,
  Settings, LogOut, Bell, Search, ChevronLeft, Menu as MenuIcon,
} from "lucide-react"

const navItems = [
  { label: "Tableau de bord", icon: LayoutDashboard, path: "/tools",       section: "principal" },
  { label: "GNSS",            icon: Satellite,       path: "/tools/gnss",  section: "outils" },
  { label: "LiDAR & 3D",      icon: Box,             path: "/tools/lidar", section: "outils", disabled: true },
  { label: "SIG",             icon: Map,             path: "/tools/sig",   section: "outils", disabled: true },
  { label: "Données",         icon: Database,        path: "/tools/data",  section: "outils", disabled: true },
  { label: "Rapports",        icon: FileText,        path: "/tools/reports", section: "sortie", disabled: true },
  { label: "Paramètres",      icon: Settings,        path: "/tools/settings", section: "autre", disabled: true },
]

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarW = collapsed ? 76 : 248

  const grouped = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    (acc[item.section] ||= []).push(item)
    return acc
  }, {})

  const sectionLabels: Record<string, string> = {
    principal: "Principal",
    outils:    "Outils métier",
    sortie:    "Livrables",
    autre:     "Compte",
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb", display: "flex", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <aside
        style={{
          width: sidebarW,
          background: "#0a1628",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          position: "fixed", top: 0, bottom: 0, left: 0,
          zIndex: 40,
          display: "flex", flexDirection: "column",
          transition: "width 0.3s cubic-bezier(0.16,1,0.3,1)",
          overflow: "hidden",
        }}
        className={mobileOpen ? "tools-sidebar-open" : "tools-sidebar"}
      >
        {/* Logo */}
        <div style={{
          height: 68, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? 0 : "0 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => router.push("/v2")}>
            {collapsed ? (
              <img src="/etafat-globe.png" alt="Etafat" style={{ height: 30, filter: "brightness(0) invert(1)" }} />
            ) : (
              <img src="/etafat.png" alt="Etafat" style={{ height: 26, width: "auto", display: "block" }} />
            )}
          </div>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} style={{ color: "rgba(255,255,255,0.35)", display: "flex" }}>
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: collapsed ? "16px 10px" : "20px 14px", overflowY: "auto" }}>
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section} style={{ marginBottom: 22 }}>
              {!collapsed && (
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase", padding: "0 10px", marginBottom: 8 }}>
                  {sectionLabels[section]}
                </div>
              )}
              {items.map(item => {
                const active = pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => !item.disabled && router.push(item.path)}
                    disabled={item.disabled}
                    style={{
                      width: "100%",
                      display: "flex", alignItems: "center", gap: 12,
                      padding: collapsed ? "11px" : "10px 12px",
                      justifyContent: collapsed ? "center" : "flex-start",
                      marginBottom: 2,
                      borderRadius: 8,
                      color: active ? "#fff" : item.disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.55)",
                      background: active ? "rgba(0,123,255,0.12)" : "transparent",
                      border: active ? "1px solid rgba(0,123,255,0.25)" : "1px solid transparent",
                      cursor: item.disabled ? "not-allowed" : "pointer",
                      fontSize: 13, fontWeight: 500,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={e => { if (!active && !item.disabled) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)" } }}
                    onMouseLeave={e => { if (!active && !item.disabled) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)" } }}
                  >
                    <item.icon size={17} strokeWidth={1.75} color={active ? "#3b9bff" : "currentColor"} />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                        {item.disabled && <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "rgba(255,255,255,0.35)" }}>bientôt</span>}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom — user */}
        <div style={{ padding: collapsed ? "14px 10px" : "16px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {collapsed ? (
            <>
              <button onClick={() => setCollapsed(false)} style={{ width: 56, height: 40, borderRadius: 8, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                <MenuIcon size={15} color="rgba(255,255,255,0.5)" />
              </button>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #007BFF, #0057b8)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13,
                margin: "0 auto",
              }}>M</div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 6px", borderRadius: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #007BFF, #0057b8)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13,
                flexShrink: 0,
              }}>M</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Marouane B.</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Ingénieur</div>
              </div>
              <button style={{ color: "rgba(255,255,255,0.35)", padding: 6 }} title="Déconnexion">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, marginLeft: sidebarW, minWidth: 0, transition: "margin 0.3s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Header */}
        <header style={{
          height: 68,
          background: "#fff",
          borderBottom: "1px solid #e8edf3",
          display: "flex", alignItems: "center", padding: "0 clamp(1.2rem,3vw,2rem)",
          gap: 16,
          position: "sticky", top: 0, zIndex: 30,
        }}>
          <button onClick={() => setMobileOpen(!mobileOpen)} style={{ display: "none" }} className="tools-mobile-toggle">
            <MenuIcon size={18} />
          </button>

          {/* Search */}
          <div style={{
            flex: 1, maxWidth: 420, display: "flex", alignItems: "center", gap: 10,
            background: "#f6f8fb", borderRadius: 8, padding: "9px 14px", border: "1px solid transparent",
          }}>
            <Search size={15} color="#94a3b8" />
            <input
              placeholder="Rechercher un projet, un fichier…"
              style={{ flex: 1, background: "transparent", color: "#0f172a", fontSize: 13, border: "none", outline: "none" }}
            />
            <kbd style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 10, padding: "2px 5px", color: "#94a3b8", fontFamily: "inherit" }}>⌘K</kbd>
          </div>

          <div style={{ flex: 1 }} />

          <button style={{
            width: 38, height: 38, borderRadius: 8, background: "#f6f8fb",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", color: "#64748b",
          }}>
            <Bell size={16} />
            <span style={{ position: "absolute", top: 9, right: 10, width: 6, height: 6, background: "#ef4444", borderRadius: "50%" }} />
          </button>
        </header>

        {/* Page content */}
        <main style={{ padding: "clamp(1.5rem,3vw,2rem)", minHeight: "calc(100vh - 68px)" }}>
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      <style>{`
        @media (max-width: 900px) {
          .tools-sidebar { transform: translateX(-100%); }
          .tools-sidebar-open { transform: translateX(0); }
          .tools-mobile-toggle { display: flex !important; width: 38px; height: 38px; border-radius: 8px; background: #f6f8fb; align-items: center; justify-content: center; color: #64748b; }
        }
      `}</style>
    </div>
  )
}
