"use client"
import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { ChevronRight, X } from "lucide-react"

export interface AccordionItemData {
  id: number
  title: string
  subtitle?: string
  imageUrl: string
  details?: string
  services?: string[]
}

interface AccordionItemProps {
  item: AccordionItemData
  isActive: boolean
  isExpanded: boolean
  onHover: () => void
  onToggleExpand: () => void
  accentColor?: string
}

const AccordionItem = ({
  item,
  isActive,
  isExpanded,
  onHover,
  onToggleExpand,
  accentColor = "#007BFF",
}: AccordionItemProps) => {
  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden cursor-pointer flex-shrink-0"
      style={{ height: 560 }}
      animate={{ width: isActive ? 440 : 64 }}
      transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={onHover}
      onClick={onToggleExpand}
    >
      {/* Background Image */}
      <motion.img
        src={item.imageUrl}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover"
        animate={{ scale: isActive ? 1.05 : 1 }}
        transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
      />

      {/* Permanent dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Active color gradient */}
      <motion.div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to top, ${accentColor}70 0%, transparent 55%)` }}
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* ── Active state: bottom info + expand hint ── */}
      <AnimatePresence>
        {isActive && !isExpanded && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 px-6 pb-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <p className="text-white font-black text-xl leading-tight mb-1">{item.title}</p>
            {item.subtitle && (
              <p className="text-white/65 text-sm mb-4">{item.subtitle}</p>
            )}
            {item.details && (
              <div
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: `${accentColor}25`, border: `1px solid ${accentColor}50`, color: "white" }}
              >
                Cliquer pour en savoir plus
                <ChevronRight className="w-3 h-3" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Expanded detail overlay ── */}
      <AnimatePresence>
        {isActive && isExpanded && (
          <motion.div
            className="absolute inset-0 flex flex-col justify-end"
            style={{ background: "linear-gradient(to top, rgba(0,5,20,0.97) 0%, rgba(0,5,20,0.82) 50%, transparent 100%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
              onClick={e => { e.stopPropagation(); onToggleExpand() }}
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="px-6 pb-6">
              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                <div
                  className="inline-block text-[10px] font-mono font-semibold tracking-widest uppercase px-2 py-0.5 rounded mb-2"
                  style={{ background: `${accentColor}30`, color: accentColor }}
                >
                  Marché
                </div>
                <h3 className="text-white font-black text-xl leading-tight mb-2">{item.title}</h3>
                {item.details && (
                  <p className="text-white/70 text-sm leading-relaxed mb-4">{item.details}</p>
                )}
              </motion.div>

              {/* Services list */}
              {item.services && item.services.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="flex flex-col gap-1.5"
                >
                  {item.services.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accentColor }} />
                      <span className="text-white/80 text-xs">{s}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inactive: rotated label ── */}
      <AnimatePresence>
        {!isActive && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <span
              className="text-white/80 text-sm font-semibold whitespace-nowrap"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {item.title}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface InteractiveImageAccordionProps {
  items: AccordionItemData[]
  defaultActive?: number
  accentColor?: string
  className?: string
}

export function InteractiveImageAccordion({
  items,
  defaultActive = 0,
  accentColor = "#007BFF",
  className,
}: InteractiveImageAccordionProps) {
  const [activeIndex, setActiveIndex] = useState(defaultActive)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const handleHover = (index: number) => {
    if (expandedIndex !== null) return // don't change active while one is expanded
    setActiveIndex(index)
  }

  const handleToggleExpand = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else {
      setActiveIndex(index)
      setExpandedIndex(index)
    }
  }

  return (
    <div className={cn("flex flex-row items-center justify-center gap-3 overflow-x-auto p-2", className)}>
      {items.map((item, index) => (
        <AccordionItem
          key={item.id}
          item={item}
          isActive={index === activeIndex}
          isExpanded={index === expandedIndex}
          onHover={() => handleHover(index)}
          onToggleExpand={() => handleToggleExpand(index)}
          accentColor={accentColor}
        />
      ))}
    </div>
  )
}
