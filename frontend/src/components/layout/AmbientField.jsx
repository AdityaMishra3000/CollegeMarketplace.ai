import { useEffect, useRef } from "react"
import { useTheme } from "../../context/ThemeContext"

/**
 * Persistent, cross-page ambient backdrop.
 *
 * Mounted once at the App root (outside <Routes>), so it survives navigation
 * between pages instead of remounting per-route. Renders a quiet particle
 * network — students/listings implicitly "connected" across campus — that
 * drifts on its own and gently reorganizes around the pointer. Colors are
 * tied to the same design tokens used everywhere else (--primary / --line),
 * so it always matches the active theme.
 */

const PALETTE = {
  light: {
    background: "oklch(0.985 0.003 264)",
    particle: "oklch(0.515 0.176 264)",
    line: "oklch(0.21 0.021 266)",
  },
  dark: {
    background: "oklch(0.181 0.015 266)",
    particle: "oklch(0.66 0.16 264)",
    line: "oklch(0.945 0.006 264)",
  },
}

const MAX_PARTICLES = 70
const MIN_PARTICLES = 22
const LINK_DISTANCE = 130
const POINTER_RADIUS = 170

function withAlpha(oklchColor, alpha) {
  return oklchColor.replace(")", ` / ${alpha})`)
}

export default function AmbientField() {
  const canvasRef = useRef(null)
  const { theme } = useTheme()
  const themeRef = useRef(theme)

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    let particles = []
    let width = 0
    let height = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let rafId = null
    let visible = document.visibilityState === "visible"
    let reduced = reduceMotionQuery.matches

    const pointer = { x: 0, y: 0, active: false }

    function seedParticles() {
      const area = width * height
      const count = Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, Math.round(area / 22000)))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.3 + 0.7,
      }))
    }

    function resize() {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = width + "px"
      canvas.style.height = height + "px"
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seedParticles()
    }

    function onPointerMove(e) {
      const point = e.touches ? e.touches[0] : e
      if (!point) return
      pointer.x = point.clientX
      pointer.y = point.clientY
      pointer.active = true
    }

    function onPointerLeave() {
      pointer.active = false
    }

    function drawFrame() {
      const colors = PALETTE[themeRef.current] || PALETTE.light

      ctx.fillStyle = colors.background
      ctx.fillRect(0, 0, width, height)

      for (const p of particles) {
        if (!reduced) {
          p.x += p.vx
          p.y += p.vy

          if (pointer.active) {
            const dx = p.x - pointer.x
            const dy = p.y - pointer.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < POINTER_RADIUS && dist > 0.01) {
              const force = (1 - dist / POINTER_RADIUS) * 0.03
              p.vx += (dx / dist) * force
              p.vy += (dy / dist) * force
            }
          }

          p.vx *= 0.985
          p.vy *= 0.985

          if (p.x < -20) p.x = width + 20
          if (p.x > width + 20) p.x = -20
          if (p.y < -20) p.y = height + 20
          if (p.y > height + 20) p.y = -20
        }
      }

      ctx.lineWidth = 1
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < LINK_DISTANCE) {
            const alpha = (1 - dist / LINK_DISTANCE) * 0.16
            ctx.strokeStyle = withAlpha(colors.line, alpha)
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      if (pointer.active) {
        const nearby = particles
          .map((p) => ({ p, dist: Math.hypot(p.x - pointer.x, p.y - pointer.y) }))
          .filter((n) => n.dist < POINTER_RADIUS)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 5)

        for (const { p, dist } of nearby) {
          const alpha = (1 - dist / POINTER_RADIUS) * 0.5
          ctx.strokeStyle = withAlpha(colors.particle, alpha)
          ctx.beginPath()
          ctx.moveTo(pointer.x, pointer.y)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
        }

        const glow = ctx.createRadialGradient(
          pointer.x, pointer.y, 0,
          pointer.x, pointer.y, POINTER_RADIUS
        )
        glow.addColorStop(0, withAlpha(colors.particle, 0.12))
        glow.addColorStop(1, withAlpha(colors.particle, 0))
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(pointer.x, pointer.y, POINTER_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }

      for (const p of particles) {
        ctx.fillStyle = withAlpha(colors.particle, 0.55)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function loop() {
      drawFrame()
      if (visible && !reduced) {
        rafId = requestAnimationFrame(loop)
      } else {
        rafId = null
      }
    }

    function handleVisibility() {
      visible = document.visibilityState === "visible"
      if (visible && !reduced && rafId === null) {
        rafId = requestAnimationFrame(loop)
      }
    }

    function handleReducedMotionChange(e) {
      reduced = e.matches
      drawFrame()
      if (!reduced && visible && rafId === null) {
        rafId = requestAnimationFrame(loop)
      }
    }

    resize()
    loop()

    window.addEventListener("resize", resize)
    window.addEventListener("mousemove", onPointerMove)
    window.addEventListener("touchmove", onPointerMove, { passive: true })
    window.addEventListener("mouseleave", onPointerLeave)
    window.addEventListener("touchend", onPointerLeave)
    document.addEventListener("visibilitychange", handleVisibility)
    reduceMotionQuery.addEventListener("change", handleReducedMotionChange)

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onPointerMove)
      window.removeEventListener("touchmove", onPointerMove)
      window.removeEventListener("mouseleave", onPointerLeave)
      window.removeEventListener("touchend", onPointerLeave)
      document.removeEventListener("visibilitychange", handleVisibility)
      reduceMotionQuery.removeEventListener("change", handleReducedMotionChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  )
}
