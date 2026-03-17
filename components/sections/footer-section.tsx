"use client"

import { useTheme } from "@/lib/theme-context"
import { Linkedin, Twitter, Youtube, Facebook, ArrowUpRight, MapPin, Mail, Phone } from "lucide-react"

const footerLinks = {
  "Services": [
    "SIG & Géomatique",
    "Foncier & Topographie",
    "Ingénierie des données",
    "Conseil en ingénierie",
    "Inspection d'infrastructures",
    "BIM & Digital",
    "Académie Etafat",
  ],
  "Marchés": [
    "Infrastructure & Transport",
    "Planification territoriale",
    "Énergie & Mines",
    "Agriculture & Environnement",
    "Urbanisme",
    "Port & Maritime",
  ],
  "Entreprise": [
    "À propos d'Etafat",
    "Notre équipe",
    "Carrières",
    "Actualités",
    "Publications",
    "Certifications",
  ],
}

const socialLinks = [
  { icon: Linkedin, label: "LinkedIn", href: "#", color: "#0077b5" },
  { icon: Twitter, label: "Twitter", href: "#", color: "#1da1f2" },
  { icon: Youtube, label: "YouTube", href: "#", color: "#ff0000" },
  { icon: Facebook, label: "Facebook", href: "#", color: "#1877f2" },
]

export default function FooterSection() {
  const { isDark } = useTheme()
  return (
    <footer className="sec-bg-b relative overflow-hidden">
      {/* Top CTA banner */}
      <div className="relative overflow-hidden" style={{ background: isDark ? "linear-gradient(135deg,#002a52,#001e3d)" : "linear-gradient(135deg,#e8f4ff,#cce4ff)" }}>
        <div className="absolute inset-0 moroccan-pattern opacity-20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full blur-3xl" style={{background:"rgba(0,123,255,0.12)"}}/>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-black t-head mb-4">
            Prêt à révéler le potentiel de{" "}
            <span className="gradient-text">votre territoire</span> ?
          </h2>
          <p className="t-body mb-8 max-w-xl mx-auto">
            Discutons de votre projet. Notre équipe vous répond sous 24 heures.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#007BFF] hover:bg-[#00669D] text-white font-bold transition-all duration-300 hover:scale-105 shadow-xl shadow-[#007BFF]/30">
              Contactez nos experts
            </a>
            <a href="#services"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/20 bg-white/5 text-white font-semibold transition-all duration-300 hover:bg-white/10">
              Voir nos services
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">

          {/* Brand column */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <div className="mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://etafat.ma/wp-content/themes/etafat/assets/images/logo.png"
                alt="Etafat"
                className={`h-10 w-auto object-contain ${isDark ? "brightness-0 invert" : ""}`}
              />
            </div>

            <p className="t-muted text-sm leading-relaxed mb-6 max-w-xs">
              Leader en solutions géospatiales au Maroc et en Afrique depuis 1983. Nous révélons le potentiel des territoires africains avec précision et innovation.
            </p>

            {/* Contact mini */}
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center gap-2 t-muted text-sm">
                <MapPin className="w-4 h-4 text-[#007BFF] flex-shrink-0" />
                Rabat, Maroc (Siège social)
              </div>
              <div className="flex items-center gap-2 t-muted text-sm">
                <Phone className="w-4 h-4 text-[#007BFF] flex-shrink-0" />
                +212 5 37 XX XX XX
              </div>
              <div className="flex items-center gap-2 t-muted text-sm">
                <Mail className="w-4 h-4 text-[#007BFF] flex-shrink-0" />
                contact@etafat.ma
              </div>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2">
              {socialLinks.map(({ icon: Icon, label, href, color }) => (
                <a key={label} href={href} aria-label={label}
                  className="w-9 h-9 glass rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-300 group">
                  <Icon className="w-4 h-4 t-muted group-hover:text-white transition-colors" style={{ "--hover-color": color } as React.CSSProperties} />
                </a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="t-head font-bold text-sm mb-5 tracking-wide">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="t-muted text-sm hover:text-[#007BFF] transition-colors duration-200">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Offices row */}
        <div className="border-t pt-10 mb-8" style={{borderColor:"var(--bd)"}}>
          <h4 className="t-xmuted text-xs uppercase tracking-widest mb-5">Nos implantations</h4>
          <div className="flex flex-wrap gap-4">
            {[
              { city: "Rabat", flag: "🇲🇦", type: "Siège" },
              { city: "Casablanca", flag: "🇲🇦", type: "Agence" },
              { city: "Marrakech", flag: "🇲🇦", type: "Agence" },
              { city: "Agadir", flag: "🇲🇦", type: "Agence" },
              { city: "Fès", flag: "🇲🇦", type: "Agence" },
              { city: "Abidjan", flag: "🇨🇮", type: "Etafat Afrique" },
              { city: "Dakar", flag: "🇸🇳", type: "Etafat Sénégal" },
              { city: "Bamako", flag: "🇲🇱", type: "Bureau" },
            ].map((o) => (
              <div key={o.city} className="flex items-center gap-2 glass rounded-lg px-3 py-1.5 text-xs">
                <span>{o.flag}</span>
                <span className="t-body">{o.city}</span>
                <span className="t-xmuted">— {o.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{borderColor:"var(--bd)"}}>
          <p className="t-xmuted text-xs">
            © {new Date().getFullYear()} Etafat. Tous droits réservés. Fondée en 1983.
          </p>
          <div className="flex items-center gap-6">
            {["Politique de confidentialité", "Mentions légales", "Plan du site"].map((l) => (
              <a key={l} href="#" className="t-xmuted text-xs hover:t-body transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
