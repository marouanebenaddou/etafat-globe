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
 * Tiles are positioned with:
 *   top:  calc(50% + dy),  left: calc(50% + dx)
 *   transform: translate(-50%, -50%)
 * → the CENTER of each tile lands at (50vw + dx, 50vh + dy).
 * All values stay inside 0-100vw / 0-100vh at scale 1.
 *
 * Scale origin of the motion.div (absolute inset-0 = 100vw×100vh) is
 * its center = viewport center, so tiles diverge outward as they zoom.
 */
const TILES: {
  dx: string; dy: string
  w: string;  h: string
  scaleTo: 4 | 5 | 6 | 8 | 9
}[] = [
  // 0 — CENTER hero (drone video)
  { dx: '0vw',    dy: '0vh',    w: '35vw', h: '35vh', scaleTo: 4 },
  // 1 — top, slightly right  (mirrors template idx1)
  { dx: '7vw',   dy: '-30vh',  w: '35vw', h: '30vh', scaleTo: 5 },
  // 2 — left, tall           (mirrors template idx2)
  { dx: '-25vw', dy: '-10vh',  w: '20vw', h: '45vh', scaleTo: 6 },
  // 3 — right, center-height (mirrors template idx3)
  { dx: '28vw',  dy: '0vh',    w: '25vw', h: '25vh', scaleTo: 5 },
  // 4 — lower-left           (mirrors template idx4)
  { dx: '5vw',   dy: '28vh',   w: '20vw', h: '25vh', scaleTo: 6 },
  // 5 — lower, wide-left     (mirrors template idx5)
  { dx: '-22vw', dy: '28vh',   w: '30vw', h: '25vh', scaleTo: 8 },
  // 6 — lower-right small    (mirrors template idx6)
  { dx: '25vw',  dy: '23vh',   w: '15vw', h: '15vh', scaleTo: 9 },
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
  const scaleMap = { 4: s4, 5: s5, 6: s6, 8: s8, 9: s9 }

  return (
    <div ref={container} className="relative h-[220vh]">
      {/* sticky fullscreen canvas */}
      <div className="sticky top-0 h-screen overflow-hidden bg-[#07101f]">
        {images.map(({ src, alt = '', type = 'image' }, index) => {
          const tile = TILES[index % TILES.length]
          const scale = scaleMap[tile.scaleTo]

          return (
            <motion.div
              key={index}
              style={{ scale }}
              /* Fills viewport; scale zooms from this element's center = viewport center */
              className="absolute inset-0"
            >
              <div
                style={{
                  position: 'absolute',
                  top:  `calc(50% + ${tile.dy})`,
                  left: `calc(50% + ${tile.dx})`,
                  width:  tile.w,
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
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <img
                    src={src}
                    alt={alt}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
