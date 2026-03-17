'use client'
import { useScroll, useTransform, motion } from 'framer-motion'
import { useRef } from 'react'

interface MediaItem {
  src: string
  alt?: string
  type?: 'image' | 'video'
}

interface ZoomParallaxProps {
  images: MediaItem[]
}

/**
 * Each tile is positioned relative to the viewport center (50vw, 50vh).
 * `top` / `left` are CSS translate values applied via transform so the tile
 * is offset from the center-anchored flex position.
 * All tiles should remain inside 0-100vw × 0-100vh at scale 1.
 */
const TILES = [
  // idx 0 — center hero (drone video) — largest, zooms to fill screen
  { offsetX: '0px',    offsetY: '0px',    w: '32vw', h: '38vh', scaleTo: 4 },
  // idx 1 — top-left wide
  { offsetX: '-33vw',  offsetY: '-26vh',  w: '26vw', h: '28vh', scaleTo: 5 },
  // idx 2 — top-right
  { offsetX: '24vw',   offsetY: '-26vh',  w: '22vw', h: '26vh', scaleTo: 6 },
  // idx 3 — bottom-left
  { offsetX: '-30vw',  offsetY: '22vh',   w: '24vw', h: '22vh', scaleTo: 5 },
  // idx 4 — bottom-right
  { offsetX: '22vw',   offsetY: '24vh',   w: '22vw', h: '22vh', scaleTo: 6 },
  // idx 5 — mid-left slim
  { offsetX: '-38vw',  offsetY: '-3vh',   w: '12vw', h: '20vh', scaleTo: 8 },
  // idx 6 — top-right small accent
  { offsetX: '32vw',   offsetY: '-8vh',   w: '12vw', h: '15vh', scaleTo: 9 },
]

export function ZoomParallax({ images }: ZoomParallaxProps) {
  const container = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  })

  // Build one motion value per unique scaleTo
  const s4 = useTransform(scrollYProgress, [0, 1], [1, 4])
  const s5 = useTransform(scrollYProgress, [0, 1], [1, 5])
  const s6 = useTransform(scrollYProgress, [0, 1], [1, 6])
  const s8 = useTransform(scrollYProgress, [0, 1], [1, 8])
  const s9 = useTransform(scrollYProgress, [0, 1], [1, 9])
  const scaleMap: Record<number, typeof s4> = { 4: s4, 5: s5, 6: s6, 8: s8, 9: s9 }

  return (
    <div ref={container} className="relative h-[200vh]">
      {/* sticky viewport */}
      <div className="sticky top-0 h-screen overflow-hidden bg-[#07101f]">
        {images.map(({ src, alt, type = 'image' }, index) => {
          const tile = TILES[index % TILES.length]
          const scale = scaleMap[tile.scaleTo]

          return (
            <motion.div
              key={index}
              style={{ scale }}
              /* Each layer is a full-viewport flex-centered box.
                 The inner div is translated to its grid position.
                 transform-origin defaults to center → zooms from viewport center. */
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                style={{
                  width: tile.w,
                  height: tile.h,
                  transform: `translate(${tile.offsetX}, ${tile.offsetY})`,
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {type === 'video' ? (
                  <video
                    src={src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={src}
                    alt={alt ?? `Image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default ZoomParallax
