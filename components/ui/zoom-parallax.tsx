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
 * Each tile is anchored to the viewport center (50vw, 50vh) then shifted by dx/dy.
 * dx/dy are CSS calc-compatible strings (e.g. "0px", "-30vw").
 * The tile's own size is subtracted via -50% so the center of each tile
 * sits exactly at (50% + dx, 50% + dy).
 */
const TILES = [
  // 0 – center hero (drone video)
  { dx: '0px',    dy: '0px',    w: '30vw', h: '36vh', scaleTo: 4 },
  // 1 – top-left
  { dx: '-30vw',  dy: '-24vh',  w: '24vw', h: '26vh', scaleTo: 5 },
  // 2 – top-right
  { dx: '22vw',   dy: '-24vh',  w: '22vw', h: '24vh', scaleTo: 6 },
  // 3 – bottom-left
  { dx: '-28vw',  dy: '22vh',   w: '24vw', h: '22vh', scaleTo: 5 },
  // 4 – bottom-right
  { dx: '20vw',   dy: '22vh',   w: '22vw', h: '22vh', scaleTo: 6 },
  // 5 – mid-left slim
  { dx: '-38vw',  dy: '-2vh',   w: '12vw', h: '20vh', scaleTo: 8 },
  // 6 – top-right accent
  { dx: '34vw',   dy: '-8vh',   w: '12vw', h: '16vh', scaleTo: 9 },
]

export function ZoomParallax({ images }: ZoomParallaxProps) {
  const container = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  })

  const s4 = useTransform(scrollYProgress, [0, 1], [1, 4])
  const s5 = useTransform(scrollYProgress, [0, 1], [1, 5])
  const s6 = useTransform(scrollYProgress, [0, 1], [1, 6])
  const s8 = useTransform(scrollYProgress, [0, 1], [1, 8])
  const s9 = useTransform(scrollYProgress, [0, 1], [1, 9])
  const scaleMap: Record<number, typeof s4> = { 4: s4, 5: s5, 6: s6, 8: s8, 9: s9 }

  return (
    <div ref={container} className="relative h-[200vh]">
      {/* sticky fullscreen canvas */}
      <div className="sticky top-0 h-screen overflow-hidden bg-[#07101f]">
        {images.map(({ src, alt, type = 'image' }, index) => {
          const tile = TILES[index % TILES.length]
          const scale = scaleMap[tile.scaleTo]

          return (
            <motion.div
              key={index}
              style={{ scale }}
              /* Fills the viewport; scale zooms from the element center = viewport center */
              className="absolute inset-0"
            >
              {/* Anchored to (50% + dx, 50% + dy), own center via -50% */}
              <div
                style={{
                  position: 'absolute',
                  top: `calc(50% + ${tile.dy})`,
                  left: `calc(50% + ${tile.dx})`,
                  width: tile.w,
                  height: tile.h,
                  transform: 'translate(-50%, -50%)',
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
