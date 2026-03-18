"use client"
import React, { useState } from "react"
import { cn } from "@/lib/utils"

export interface AccordionItemData {
  id: number
  title: string
  subtitle?: string
  imageUrl: string
}

interface AccordionItemProps {
  item: AccordionItemData
  isActive: boolean
  onMouseEnter: () => void
  onClick: () => void
  accentColor?: string
}

const AccordionItem = ({ item, isActive, onMouseEnter, onClick, accentColor = "#007BFF" }: AccordionItemProps) => {
  return (
    <div
      className={cn(
        "relative h-[420px] rounded-xl overflow-hidden cursor-pointer flex-shrink-0",
        "transition-all duration-700 ease-in-out",
        isActive ? "w-[340px]" : "w-[56px]"
      )}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {/* Background Image */}
      <img
        src={item.imageUrl}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
        style={{ transform: isActive ? "scale(1.03)" : "scale(1)" }}
      />

      {/* Base dark overlay */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Active color accent overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: `linear-gradient(to top, ${accentColor}55 0%, transparent 60%)`,
          opacity: isActive ? 1 : 0,
        }}
      />

      {/* Active: bottom text */}
      {isActive && (
        <div className="absolute bottom-5 left-0 right-0 px-5">
          <p className="text-white font-bold text-lg leading-tight">{item.title}</p>
          {item.subtitle && (
            <p className="text-white/70 text-xs mt-1">{item.subtitle}</p>
          )}
        </div>
      )}

      {/* Inactive: rotated vertical label */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-white/80 text-sm font-semibold whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {item.title}
          </span>
        </div>
      )}
    </div>
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

  return (
    <div className={cn("flex flex-row items-center justify-center gap-3 overflow-x-auto p-2", className)}>
      {items.map((item, index) => (
        <AccordionItem
          key={item.id}
          item={item}
          isActive={index === activeIndex}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => setActiveIndex(index)}
          accentColor={accentColor}
        />
      ))}
    </div>
  )
}
