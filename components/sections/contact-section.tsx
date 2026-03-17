"use client"

import { useScrollReveal } from "@/lib/hooks"
import { useState } from "react"
import { Mail, Phone, Send, Linkedin, Twitter, Youtube, Facebook, ArrowRight, CheckCircle } from "lucide-react"

const offices = [
  {
    city: "Rabat",
    country: "Maroc",
    flag: "🇲🇦",
    address: "Siège social — Maroc",
    phone: "+212 5 37 XX XX XX",
    email: "contact@etafat.ma",
    isHQ: true,
    color: "#007BFF",
  },
  {
    city: "Abidjan",
    country: "Côte d'Ivoire",
    flag: "🇨🇮",
    address: "Etafat Afrique",
    phone: "+225 XX XX XX XX XX",
    email: "afrique@etafat.ma",
    isHQ: false,
    color: "#10b981",
  },
  {
    city: "Dakar",
    country: "Sénégal",
    flag: "🇸🇳",
    address: "Etafat Sénégal",
    phone: "+221 XX XXX XX XX",
    email: "senegal@etafat.ma",
    isHQ: false,
    color: "#f97316",
  },
]

const subjects = [
  "Demande de devis", "Information sur un service", "Partenariat", "Formation — Académie Etafat", "Recrutement", "Autre"
]

export default function ContactSection() {
  const { ref, isVisible } = useScrollReveal()
  const { ref: formRef, isVisible: formVisible } = useScrollReveal(0.1)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section className="sec-bg-a relative overflow-hidden" id="contact">
      <div className="absolute inset-0 moroccan-pattern opacity-10 pointer-events-none" />

      {/* Header */}
      <div ref={ref} className="relative pt-24 pb-16 text-center px-6">
        <div className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#007BFF]/20 border border-[#007BFF]/30 px-4 py-1.5 text-xs text-[#4da6ff] uppercase tracking-widest mb-5">
            <Mail className="w-3.5 h-3.5" />
            Contactez-nous
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white mb-4 leading-tight">
            Parlons de votre{" "}
            <span className="text-[#4da6ff]">projet</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            Notre équipe d&apos;experts est disponible pour étudier vos besoins et vous proposer la solution géospatiale adaptée à vos enjeux.
          </p>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8 pb-24">

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left: Contact info */}
          <div className={`lg:col-span-2 transition-all duration-800 ${formVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"}`}>
            {/* Offices */}
            <div className="space-y-4 mb-8">
              {offices.map((o, i) => (
                <div key={o.city}
                  className={`reveal glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-300 ${isVisible ? "is-visible" : ""}`}
                  style={{ transitionDelay: `${i * 100}ms` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{o.flag}</span>
                      <div>
                        <div className="t-head font-bold">{o.city}</div>
                        <div className="t-xmuted text-xs">{o.country}</div>
                      </div>
                    </div>
                    {o.isHQ && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-[#007BFF] border border-blue-500/30">
                        Siège
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs t-muted">
                      <Phone className="w-3.5 h-3.5" style={{ color: o.color }} />
                      {o.phone}
                    </div>
                    <div className="flex items-center gap-2 text-xs t-muted">
                      <Mail className="w-3.5 h-3.5" style={{ color: o.color }} />
                      {o.email}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Social links */}
            <div className={`glass rounded-2xl p-5 transition-all duration-700 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <h4 className="t-head font-bold text-sm mb-4">Suivez-nous</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Linkedin, name: "LinkedIn", color: "#0077b5" },
                  { icon: Twitter, name: "Twitter / X", color: "#1da1f2" },
                  { icon: Youtube, name: "YouTube", color: "#ff0000" },
                  { icon: Facebook, name: "Facebook", color: "#1877f2" },
                ].map(({ icon: Icon, name, color }) => (
                  <a key={name} href="#"
                    className="flex items-center gap-2 glass rounded-xl px-3 py-2.5 hover:scale-105 transition-all duration-300 group">
                    <Icon className="w-4 h-4 flex-shrink-0 transition-colors duration-300" style={{ color }} />
                    <span className="t-body text-xs group-hover:text-white transition-colors">{name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div ref={formRef} className={`lg:col-span-3 transition-all duration-800 delay-200 ${formVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}`}>
            {submitted ? (
              <div className="glass-blue rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border border-green-500/30">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-white font-black text-2xl mb-3">Message envoyé !</h3>
                <p className="t-body mb-6">Notre équipe vous répondra dans les 24 heures.</p>
                <button onClick={() => setSubmitted(false)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 t-body hover:text-white hover:border-white/40 text-sm transition-all">
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
                <h3 className="text-white font-bold text-lg mb-6">Envoyez-nous un message</h3>

                {/* Name + Email */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { key: "name", label: "Nom complet *", type: "text", placeholder: "Votre nom" },
                    { key: "email", label: "Email *", type: "email", placeholder: "votre@email.com" },
                  ].map(({ key, label, type, placeholder }) => (
                    <div key={key}>
                      <label className="t-body text-xs mb-1.5 block">{label}</label>
                      <input
                        type={type}
                        placeholder={placeholder}
                        required={key !== "phone"}
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#007BFF]/50 focus:bg-blue-500/5 transition-all duration-200"
                      />
                    </div>
                  ))}
                </div>

                {/* Phone */}
                <div>
                  <label className="t-body text-xs mb-1.5 block">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 t-xmuted" />
                    <input
                      type="tel"
                      placeholder="+212 6 XX XX XX XX"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#007BFF]/50 focus:bg-blue-500/5 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="t-body text-xs mb-1.5 block">Sujet *</label>
                  <select
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#007BFF]/50 focus:bg-blue-500/5 transition-all duration-200 appearance-none cursor-pointer"
                    style={{ colorScheme: "dark" }}>
                    <option value="" className="bg-[#000a1a]">Sélectionnez un sujet</option>
                    {subjects.map((s) => <option key={s} value={s} className="bg-[#000a1a]">{s}</option>)}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="t-body text-xs mb-1.5 block">Message *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Décrivez votre projet ou votre besoin..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#007BFF]/50 focus:bg-blue-500/5 transition-all duration-200 resize-none"
                  />
                </div>

                <button type="submit"
                  className="group w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#007BFF] hover:bg-[#00669D] text-white font-bold transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-[#007BFF]/30 hover:shadow-blue-500/50">
                  <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  Envoyer le message
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <p className="t-xmuted text-xs text-center">
                  En soumettant ce formulaire, vous acceptez d&apos;être contacté par notre équipe. Réponse garantie sous 24h.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="section-divider mt-24" />
    </section>
  )
}
