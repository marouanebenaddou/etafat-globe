"use client"

import { useTheme } from "@/lib/theme-context"
import { Sun, Moon } from "lucide-react"
import { useState, useEffect, useRef } from "react"

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme()
  const [glowing, setGlowing] = useState(false)
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevDark = useRef(isDark)

  useEffect(() => {
    // Only trigger glow when switching FROM dark TO light
    if (prevDark.current && !isDark) {
      setGlowing(true)
      if (glowTimer.current) clearTimeout(glowTimer.current)
      glowTimer.current = setTimeout(() => setGlowing(false), 2000)
    }
    prevDark.current = isDark
    return () => { if (glowTimer.current) clearTimeout(glowTimer.current) }
  }, [isDark])

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
      className="flex items-center gap-2.5 select-none group"
    >
      {/* Icon beside toggle */}
      <span className="transition-all duration-400">
        {isDark ? (
          <Moon className="w-4 h-4 text-blue-300" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 animate-sun-spin" />
        )}
      </span>

      {/* Toggle track */}
      <div className={`theme-track ${isDark ? "is-dark" : "is-light"} ${!isDark && glowing ? "is-glowing" : ""}`}>
        <div className={`theme-thumb ${isDark ? "is-dark" : "is-light"}`}>
          {isDark ? (
            <Moon className="w-3 h-3 text-blue-600" />
          ) : (
            <Sun className="w-3 h-3 text-amber-500" />
          )}
        </div>
      </div>
    </button>
  )
}
