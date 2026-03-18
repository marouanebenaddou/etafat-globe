"use client"

import dynamic from "next/dynamic"
import { useEffect } from "react"

/** Spacer visible only on mobile — no Tailwind, pure inline CSS */
function MobileGap() {
  return (
    <>
      <style>{`@media (max-width: 767px) { .etafat-mobile-gap { height: 64px; } }`}</style>
      <div className="etafat-mobile-gap" />
    </>
  )
}
import StatsSection from "@/components/sections/stats-section"
import ParallaxSection from "@/components/sections/parallax-section"

const ServicesSection    = dynamic(() => import("@/components/sections/services-section"),    { ssr: false })
const TechnologiesSection = dynamic(() => import("@/components/sections/technologies-section"), { ssr: false })
const MarchesSection     = dynamic(() => import("@/components/sections/marches-section"),     { ssr: false })
const AboutSection       = dynamic(() => import("@/components/sections/about-section"),       { ssr: false })
const ClientsSection     = dynamic(() => import("@/components/sections/clients-section"),     { ssr: false })
const AcademySection     = dynamic(() => import("@/components/sections/academy-section"),     { ssr: false })
const ContactSection     = dynamic(() => import("@/components/sections/contact-section"),     { ssr: false })
const FooterSection      = dynamic(() => import("@/components/sections/footer-section"),      { ssr: false })

const EtherealBeamsHero = dynamic(
  () => import("@/components/ui/ethereal-beams-hero"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#000510] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#007BFF]/30 border-t-[#007BFF] rounded-full animate-spin" />
          <span className="text-white/40 text-sm tracking-widest">ETAFAT</span>
        </div>
      </div>
    ),
  }
)

export default function Home() {
  // Prevent browser from restoring mid-page scroll on refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      history.scrollRestoration = "manual"
      window.scrollTo(0, 0)
    }
  }, [])

  // Global scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible")
          } else if (!entry.target.closest("[data-reveal-once]")) {
            entry.target.classList.remove("is-visible")
          }
        })
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    )

    const attach = () => {
      document
        .querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale")
        .forEach((el) => observer.observe(el))
    }

    attach()

    const mutation = new MutationObserver(attach)
    mutation.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutation.disconnect()
    }
  }, [])

  return (
    <main className="[overflow-x:clip]">
      <EtherealBeamsHero />
      <ParallaxSection />
      <StatsSection />
      <ServicesSection />
      <MarchesSection />
      <TechnologiesSection />
      <div data-reveal-once>
        <AboutSection />
        <ClientsSection />
        <AcademySection />
        <ContactSection />
        <FooterSection />
      </div>
    </main>
  )
}
