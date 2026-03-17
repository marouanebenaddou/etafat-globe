'use client'
import React, { CSSProperties, ReactNode, useEffect, useMemo, useRef } from "react"

type Source = { mp4?: string; webm?: string; ogg?: string }
type VideoLike = string | Source
type Eases = {
  container?: string
  overlay?: string
  text?: string
}

export type HeroScrollVideoProps = {
  title?: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  credits?: ReactNode
  media?: VideoLike
  poster?: string
  mediaType?: "video" | "image"
  muted?: boolean
  loop?: boolean
  playsInline?: boolean
  autoPlay?: boolean
  overlay?: {
    caption?: ReactNode
    heading?: ReactNode
    paragraphs?: ReactNode[]
    extra?: ReactNode
  }
  initialBoxSize?: number
  targetSize?: { widthVw: number; heightVh: number; borderRadius?: number } | "fullscreen"
  scrollHeightVh?: number
  showHeroExitAnimation?: boolean
  sticky?: boolean
  overlayBlur?: number
  overlayRevealDelay?: number
  eases?: Eases
  smoothScroll?: boolean
  lenisOptions?: Record<string, unknown>
  className?: string
  style?: CSSProperties
}

const DEFAULTS = {
  initialBoxSize: 360,
  targetSize: "fullscreen" as const,
  scrollHeightVh: 280,
  overlayBlur: 10,
  overlayRevealDelay: 0.35,
  eases: {
    container: "expo.out",
    overlay: "expo.out",
    text: "power3.inOut",
  } as Eases,
}

function isSourceObject(m?: VideoLike): m is Source {
  return !!m && typeof m !== "string"
}

export const HeroScrollVideo: React.FC<HeroScrollVideoProps> = ({
  title = "Future Forms",
  subtitle = "Design in Motion",
  meta = "2025",
  credits,
  media,
  poster,
  mediaType = "video",
  muted = true,
  loop = true,
  playsInline = true,
  autoPlay = false,
  overlay = {
    caption: "PROJECT • 07",
    heading: "Clarity in Motion",
    paragraphs: ["Scroll to expand the frame and reveal the story."],
    extra: null,
  },
  initialBoxSize = DEFAULTS.initialBoxSize,
  targetSize = DEFAULTS.targetSize,
  scrollHeightVh = DEFAULTS.scrollHeightVh,
  showHeroExitAnimation = true,
  sticky = true,
  overlayBlur = DEFAULTS.overlayBlur,
  overlayRevealDelay = DEFAULTS.overlayRevealDelay,
  eases = DEFAULTS.eases,
  smoothScroll = false,
  lenisOptions,
  className,
  style,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const headlineRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const overlayCaptionRef = useRef<HTMLDivElement | null>(null)
  const overlayContentRef = useRef<HTMLDivElement | null>(null)
  const isClient = typeof window !== "undefined"

  const cssVars: CSSProperties = useMemo(
    () => ({
      ["--initial-size" as string]: `${initialBoxSize}px`,
      ["--overlay-blur" as string]: `${overlayBlur}px`,
    }),
    [initialBoxSize, overlayBlur]
  )

  useEffect(() => {
    if (!isClient) return
    let gsapLib: any
    let ScrollTrigger: any
    let lenis: any
    let heroTl: any
    let mainTl: any
    let overlayDarkenEl: HTMLDivElement | null = null
    let rafCb: ((t: number) => void) | null = null
    let cancelled = false

    ;(async () => {
      const gsapPkg = await import("gsap")
      gsapLib = gsapPkg.gsap || gsapPkg.default || gsapPkg

      const stPkg = await import("gsap/ScrollTrigger").catch(() =>
        import("gsap/dist/ScrollTrigger" as any)
      )
      ScrollTrigger = stPkg.default || (stPkg as any).ScrollTrigger || stPkg

      const cePkg = await import("gsap/CustomEase").catch(() =>
        import("gsap/dist/CustomEase" as any)
      )
      const CustomEase = cePkg.default || (cePkg as any).CustomEase || cePkg

      gsapLib.registerPlugin(ScrollTrigger, CustomEase)
      if (cancelled) return

      // Lenis smooth scroll (opt-in, requires lenis package)
      void lenis; void rafCb

      const containerEase = eases.container ?? "expo.out"
      const overlayEase = eases.overlay ?? "expo.out"
      const textEase = eases.text ?? "power3.inOut"

      const container = containerRef.current!
      const overlayEl = overlayRef.current!
      const overlayCaption = overlayCaptionRef.current!
      const overlayContent = overlayContentRef.current!
      const headline = headlineRef.current!

      if (container) {
        overlayDarkenEl = document.createElement("div")
        overlayDarkenEl.setAttribute("data-auto-darken", "true")
        Object.assign(overlayDarkenEl.style, {
          position: "absolute",
          inset: "0",
          background: "rgba(0,0,0,0)",
          pointerEvents: "none",
          zIndex: "1",
        })
        container.appendChild(overlayDarkenEl)
      }

      if (showHeroExitAnimation && headline) {
        heroTl = gsapLib.timeline({
          scrollTrigger: {
            trigger: headline,
            start: "top top",
            end: "top+=420 top",
            scrub: 1.1,
          },
        })
        headline.querySelectorAll<HTMLElement>(".hsv-headline > *").forEach((el, i) => {
          heroTl.to(
            el,
            {
              rotationX: 80,
              y: -36,
              scale: 0.86,
              opacity: 0,
              filter: "blur(4px)",
              transformOrigin: "center top",
              ease: textEase,
            },
            i * 0.08
          )
        })
      }

      const triggerEl = rootRef.current?.querySelector("[data-sticky-scroll]") as HTMLElement
      if (!triggerEl || !container || !overlayEl) return

      mainTl = gsapLib.timeline({
        scrollTrigger: {
          trigger: triggerEl,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.1,
        },
      })

      const target =
        targetSize === "fullscreen"
          ? { width: "100vw", height: "100vh", borderRadius: 0 }
          : {
              width: `${(targetSize as any).widthVw ?? 92}vw`,
              height: `${(targetSize as any).heightVh ?? 92}vh`,
              borderRadius: (targetSize as any).borderRadius ?? 0,
            }

      gsapLib.set(container, {
        width: initialBoxSize,
        height: initialBoxSize,
        borderRadius: 20,
        filter: "none",
      })
      gsapLib.set(overlayEl, { clipPath: "inset(100% 0 0 0)" })
      gsapLib.set(overlayContent, { filter: `blur(${overlayBlur}px)`, scale: 1.05 })
      gsapLib.set([overlayContent, overlayCaption], { y: 30 })

      mainTl
        .to(container, { width: target.width, height: target.height, borderRadius: target.borderRadius, ease: containerEase }, 0)
        .to(overlayDarkenEl, { backgroundColor: "rgba(0,0,0,0.45)", ease: "power2.out" }, 0)
        .to(overlayEl, { clipPath: "inset(0% 0 0 0)", ease: overlayEase }, overlayRevealDelay)
        .to(overlayCaption, { y: 0, ease: overlayEase }, overlayRevealDelay + 0.05)
        .to(overlayContent, { y: 0, filter: "blur(0px)", scale: 1, ease: overlayEase }, overlayRevealDelay + 0.05)

      const videoEl = container.querySelector("video") as HTMLVideoElement | null
      if (videoEl) {
        const tryPlay = () => videoEl.play().catch(() => {})
        tryPlay()
        ScrollTrigger.create({ trigger: triggerEl, start: "top top", onEnter: tryPlay })
      }
    })()

    return () => {
      cancelled = true
      try { heroTl?.kill?.(); mainTl?.kill?.() } catch {}
      try {
        if (ScrollTrigger?.getAll && rootRef.current) {
          ScrollTrigger.getAll().forEach((t: any) => rootRef.current!.contains(t.trigger) && t.kill(true))
        }
      } catch {}
      try { overlayDarkenEl?.parentElement?.removeChild(overlayDarkenEl) } catch {}
      try {
        if (rafCb && gsapLib?.ticker) {
          gsapLib.ticker.remove(rafCb)
          gsapLib.ticker.lagSmoothing(1000, 16)
        }
      } catch {}
      try {
        lenis?.off?.("scroll", ScrollTrigger?.update)
        lenis?.destroy?.()
      } catch {}
    }
  }, [
    isClient,
    initialBoxSize,
    scrollHeightVh,
    overlayBlur,
    overlayRevealDelay,
    eases.container,
    eases.overlay,
    eases.text,
    showHeroExitAnimation,
    smoothScroll,
  ])

  const renderMedia = () => {
    if (mediaType === "image") {
      const src = typeof media === "string" ? media : (media as Source)?.mp4 || ""
      return <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    }
    const sources: React.ReactElement[] = []
    if (typeof media === "string") {
      sources.push(<source key="mp4" src={media} type="video/mp4" />)
    } else if (isSourceObject(media)) {
      if (media.webm) sources.push(<source key="webm" src={media.webm} type="video/webm" />)
      if (media.mp4) sources.push(<source key="mp4" src={media.mp4} type="video/mp4" />)
      if (media.ogg) sources.push(<source key="ogg" src={media.ogg} type="video/ogg" />)
    }
    return (
      <video
        poster={poster}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        autoPlay={autoPlay || muted}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      >
        {sources}
      </video>
    )
  }

  return (
    <div
      ref={rootRef}
      className={["hsv-root", className].filter(Boolean).join(" ")}
      style={{ ...cssVars, ...style } as CSSProperties}
    >
      {/* Headline area */}
      <div className="hsv-container" ref={headlineRef}>
        <div className="hsv-headline">
          <h2 className="hsv-title">{title}</h2>
          {subtitle && <p className="hsv-subtitle">{subtitle}</p>}
          {meta && <div className="hsv-meta">{meta}</div>}
          {credits && <div className="hsv-credits">{credits}</div>}
        </div>
      </div>

      {/* Sticky scroll section */}
      <div
        className="hsv-scroll"
        data-sticky-scroll
        style={{ height: `${Math.max(150, scrollHeightVh)}vh` }}
      >
        <div className={`hsv-sticky ${sticky ? "is-sticky" : ""}`}>
          <div className="hsv-media" ref={containerRef}>
            {renderMedia()}
            <div className="hsv-overlay" ref={overlayRef}>
              {overlay?.caption && (
                <div className="hsv-caption" ref={overlayCaptionRef}>
                  {overlay.caption}
                </div>
              )}
              <div className="hsv-overlay-content" ref={overlayContentRef}>
                {overlay?.heading && <h3>{overlay.heading}</h3>}
                {overlay?.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
                {overlay?.extra}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .hsv-root {
          overflow-x: clip;
        }
        .hsv-container {
          height: 100vh;
          display: grid;
          place-items: center;
          padding: clamp(16px, 3vw, 40px);
          perspective: 900px;
        }
        .hsv-headline {
          text-align: center;
          transform-style: preserve-3d;
          max-width: min(100%, 1100px);
        }
        .hsv-headline > * {
          transform-style: preserve-3d;
          backface-visibility: hidden;
          transform-origin: center top;
        }
        .hsv-title {
          margin: 0 0 .6rem 0;
          font-size: clamp(36px, 6vw, 80px);
          line-height: 1.0;
          font-weight: 900;
          letter-spacing: -0.02em;
          text-wrap: balance;
          color: var(--t-head);
        }
        .hsv-subtitle {
          margin: 0 0 1.25rem 0;
          font-size: clamp(15px, 2.5vw, 22px);
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--t-muted);
        }
        .hsv-meta {
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          padding: .4rem 1rem;
          border-radius: 999px;
          font-size: .85rem;
          font-weight: 600;
          letter-spacing: .08em;
          border: 1px solid rgba(0,123,255,0.25);
          color: #007BFF;
          margin: 1rem 0 0 0;
        }
        .dark .hsv-meta {
          border-color: rgba(0,123,255,0.35);
          color: #4da6ff;
        }
        .hsv-credits {
          margin-top: 1rem;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--t-xmuted);
        }
        .hsv-scroll { position: relative; }
        .hsv-sticky.is-sticky {
          position: sticky;
          top: 0;
          height: 100vh;
          display: grid;
          place-items: center;
        }
        .hsv-media {
          position: relative;
          width: var(--initial-size);
          height: var(--initial-size);
          border-radius: 20px;
          overflow: hidden;
          background: #000;
          display: grid;
          place-items: center;
        }
        .hsv-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,10,30,0.38);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: clamp(16px, 4vw, 40px);
          clip-path: inset(100% 0 0 0);
          z-index: 2;
        }
        .hsv-caption {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          position: absolute;
          top: clamp(16px, 3vw, 28px);
          left: 0;
          width: 100%;
          text-align: center;
          opacity: 0.75;
          color: rgba(255,255,255,0.8);
        }
        .hsv-overlay-content {
          max-width: 65ch;
          display: grid;
          gap: 1rem;
        }
        .hsv-overlay-content h3 {
          font-size: clamp(24px, 4.5vw, 52px);
          line-height: 1.05;
          margin: 0;
          font-weight: 900;
          letter-spacing: -0.01em;
          color: #ffffff;
          text-wrap: balance;
        }
        .hsv-overlay-content h3::after {
          content: "";
          display: block;
          width: 60px;
          height: 3px;
          border-radius: 999px;
          margin: 12px auto 0 auto;
          background: linear-gradient(90deg, #007BFF, #4da6ff);
        }
        .hsv-overlay-content p {
          font-size: clamp(14px, 1.8vw, 18px);
          line-height: 1.75;
          margin: 0;
          color: rgba(255,255,255,0.88);
        }
        @media (max-width: 768px) {
          .hsv-overlay-content { max-width: 36ch; }
        }
      `}</style>
    </div>
  )
}

export default HeroScrollVideo
