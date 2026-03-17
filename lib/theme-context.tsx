"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface ThemeContextValue {
  isDark: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: true, toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Load preference from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem("etafat-theme")
    if (saved !== null) setIsDark(saved === "dark")
    setMounted(true)
  }, [])

  // Apply/remove `dark` class on <html>
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (isDark) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("etafat-theme", isDark ? "dark" : "light")
  }, [isDark, mounted])

  const toggle = () => setIsDark((prev) => !prev)

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
