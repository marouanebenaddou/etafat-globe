"use client"

import { useTheme } from "@/lib/theme-context"
import { Sun, Moon } from "lucide-react"

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme()

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
      <div className={`theme-track ${isDark ? "is-dark" : "is-light"}`}>
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
