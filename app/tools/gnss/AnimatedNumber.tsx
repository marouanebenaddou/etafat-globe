"use client"
/**
 * A number that smoothly counts up from 0 to its target when it first
 * renders — and also when its target value changes between renders.
 * Used on the results-banner KPIs so each successful calculation feels
 * satisfying rather than popping in as dead text.
 */
import { useEffect, useRef, useState } from "react"
import { animate } from "framer-motion"

export default function AnimatedNumber({
  value, duration = 1.2, decimals = 0, suffix = "", prefix = "",
}: {
  value: number
  duration?: number
  decimals?: number
  suffix?: string
  prefix?: string
}) {
  const [display, setDisplay] = useState<number>(0)
  const prev = useRef(0)
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: v => setDisplay(v),
    })
    prev.current = value
    return () => controls.stop()
  }, [value, duration])
  return (
    <span>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  )
}
