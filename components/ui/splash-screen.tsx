"use client"

import { useEffect, useState } from "react"

export default function SplashScreen() {
  const [phase, setPhase] = useState<"filling" | "hold" | "exit" | "done">("filling")
  const [fillPct, setFillPct] = useState(0)

  useEffect(() => {
    // Animate fill from 0 → 100% over 1.6s
    const start = performance.now()
    const duration = 1600

    const animate = (now: number) => {
      const elapsed = now - start
      const pct = Math.min(100, (elapsed / duration) * 100)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - pct / 100, 3)
      setFillPct(eased * 100)
      if (pct < 100) {
        requestAnimationFrame(animate)
      } else {
        setPhase("hold")
        setTimeout(() => setPhase("exit"), 400)
        setTimeout(() => setPhase("done"), 1100)
      }
    }

    requestAnimationFrame(animate)
  }, [])

  if (phase === "done") return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: "#000510",
        opacity: phase === "exit" ? 0 : 1,
        transition: phase === "exit" ? "opacity 0.7s ease" : "none",
        pointerEvents: phase === "exit" ? "none" : "all",
      }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo with fill-up effect */}
        <div className="relative" style={{ width: 200, height: 64 }}>
          {/* Dim base logo */}
          <img
            src="https://etafat.ma/wp-content/themes/etafat/assets/images/logo.png"
            alt="Etafat"
            className="absolute inset-0 w-full h-full object-contain brightness-0 invert opacity-15"
          />
          {/* Filled logo revealed from bottom to top */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: `inset(${100 - fillPct}% 0 0 0)`,
              transition: "none",
            }}
          >
            <img
              src="https://etafat.ma/wp-content/themes/etafat/assets/images/logo.png"
              alt="Etafat"
              className="w-full h-full object-contain brightness-0 invert"
            />
          </div>
        </div>

        {/* Thin progress bar */}
        <div className="w-32 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${fillPct}%`,
              background: "linear-gradient(90deg, #007BFF, #4da6ff)",
              transition: "none",
            }}
          />
        </div>
      </div>
    </div>
  )
}
