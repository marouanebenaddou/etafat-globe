"use client"

import dynamic from "next/dynamic"
import { useEffect } from "react"
import StatsSection from "@/components/sections/stats-section"
import ParallaxSection from "@/components/sections/parallax-section"
import ServicesSection from "@/components/sections/services-section"
import TechnologiesSection from "@/components/sections/technologies-section"
import AboutSection from "@/components/sections/about-section"
import ClientsSection from "@/components/sections/clients-section"
import AcademySection from "@/components/sections/academy-section"
import ContactSection from "@/components/sections/contact-section"
import FooterSection from "@/components/sections/footer-section"

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
