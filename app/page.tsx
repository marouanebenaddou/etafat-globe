"use client"

import { useEffect } from "react"
import EtafatHero from "@/components/ui/etafat-hero"
import StatsSection from "@/components/sections/stats-section"
import ServicesSection from "@/components/sections/services-section"
import TechnologiesSection from "@/components/sections/technologies-section"
import AboutSection from "@/components/sections/about-section"
import ClientsSection from "@/components/sections/clients-section"
import AcademySection from "@/components/sections/academy-section"
import ContactSection from "@/components/sections/contact-section"
import FooterSection from "@/components/sections/footer-section"

export default function Home() {
  // Global scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible")
          }
        })
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    )

    const attach = () => {
      document
        .querySelectorAll(".reveal:not(.is-visible), .reveal-left:not(.is-visible), .reveal-right:not(.is-visible), .reveal-scale:not(.is-visible)")
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
    <main className="overflow-x-hidden">
      <EtafatHero />
<StatsSection />
      <ServicesSection />
      <TechnologiesSection />
      <AboutSection />
      <ClientsSection />
      <AcademySection />
      <ContactSection />
      <FooterSection />
    </main>
  )
}
