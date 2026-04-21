"use client"

import { useRouter } from "next/navigation"
import {
  Satellite, Box, Map, Database, FileText, Clock,
  ArrowUpRight, Activity, CheckCircle2, TrendingUp,
} from "lucide-react"

const tools = [
  {
    title: "Traitement GNSS",
    desc: "Calcul automatique de lignes de base, fermeture des boucles, ajustements libre et contraint.",
    Icon: Satellite, color: "#007BFF",
    path: "/tools/gnss",
    status: "Actif",
    stats: "12 calculs ce mois",
  },
  {
    title: "LiDAR & Modélisation 3D",
    desc: "Classification, traitement de nuages de points, génération de MNT et maquettes BIM.",
    Icon: Box, color: "#8b5cf6",
    path: "/tools/lidar",
    status: "Bientôt", disabled: true,
  },
  {
    title: "Éditeur SIG",
    desc: "Édition cartographique, création de couches vectorielles et gestion de projets QGIS.",
    Icon: Map, color: "#10b981",
    path: "/tools/sig",
    status: "Bientôt", disabled: true,
  },
  {
    title: "Ingénierie des données",
    desc: "Pipelines ETL, normalisation et transformation de données géospatiales.",
    Icon: Database, color: "#f59e0b",
    path: "/tools/data",
    status: "Bientôt", disabled: true,
  },
]

const recentActivity = [
  { icon: CheckCircle2, color: "#10b981", text: "Calcul GNSS terminé — Projet Autoroute A1", time: "il y a 12 min" },
  { icon: Activity,     color: "#007BFF", text: "Traitement LiDAR en cours — 42 %",          time: "il y a 34 min" },
  { icon: CheckCircle2, color: "#10b981", text: "Rapport généré — Bornage Zone OCP",          time: "il y a 1 h"  },
  { icon: CheckCircle2, color: "#10b981", text: "Ajustement libre validé — 6 bases",          time: "il y a 2 h"  },
]

const statCards = [
  { label: "Calculs effectués",    value: "124", delta: "+18 %", Icon: Activity,     color: "#007BFF" },
  { label: "Points traités",        value: "2.4M", delta: "+32 %", Icon: TrendingUp,   color: "#8b5cf6" },
  { label: "Rapports générés",      value: "38",  delta: "+5",    Icon: FileText,     color: "#10b981" },
  { label: "Projets actifs",        value: "7",   delta: "cette semaine", Icon: Clock, color: "#f59e0b" },
]

export default function ToolsDashboard() {
  const router = useRouter()

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>

      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 6, letterSpacing: -0.5 }}>
          Bonjour Marouane 👋
        </h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>
          Voici un aperçu de votre espace de travail — tous vos outils métiers centralisés.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 32 }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background: "#fff", borderRadius: 12, padding: 20,
            border: "1px solid #e8edf3",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${s.color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.Icon size={17} color={s.color} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "#10b98114", padding: "3px 8px", borderRadius: 6 }}>
                {s.delta}
              </span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Split: tools grid + activity */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }} className="tools-split">

        {/* Tools */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Outils métier</h2>
            <button style={{ fontSize: 12, color: "#64748b" }}>Voir tout</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {tools.map(t => (
              <div
                key={t.title}
                onClick={() => !t.disabled && router.push(t.path)}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: 22,
                  border: "1px solid #e8edf3",
                  cursor: t.disabled ? "not-allowed" : "pointer",
                  opacity: t.disabled ? 0.55 : 1,
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
                onMouseEnter={e => {
                  if (!t.disabled) {
                    e.currentTarget.style.borderColor = `${t.color}40`
                    e.currentTarget.style.boxShadow = `0 8px 24px ${t.color}12`
                    e.currentTarget.style.transform = "translateY(-2px)"
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#e8edf3"
                  e.currentTarget.style.boxShadow = "none"
                  e.currentTarget.style.transform = "translateY(0)"
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${t.color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <t.Icon size={20} color={t.color} strokeWidth={1.75} />
                  </div>
                  {!t.disabled && <ArrowUpRight size={14} color="#94a3b8" />}
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 5 }}>{t.title}</h3>
                <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.55, marginBottom: 14 }}>{t.desc}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                  <span style={{
                    fontWeight: 700,
                    background: t.disabled ? "#f1f5f9" : `${t.color}14`,
                    color: t.disabled ? "#94a3b8" : t.color,
                    padding: "3px 8px", borderRadius: 5,
                  }}>
                    {t.status}
                  </span>
                  {t.stats && <span style={{ color: "#94a3b8" }}>· {t.stats}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Activité récente</h2>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8edf3", padding: 8 }}>
            {recentActivity.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 14px",
                borderRadius: 8,
                transition: "background 0.2s ease",
                cursor: "pointer",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#f6f8fb"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${a.color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <a.icon size={13} color={a.color} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "#0f172a", fontWeight: 500, lineHeight: 1.4, marginBottom: 3 }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 1100px) {
          .tools-split { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
