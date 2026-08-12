import { useEffect, useRef } from 'react'

// Subtle pointer-responsive tilt/scale for product media — the shared
// "product media language" used by both ProductCard and ProductDetails.
//
// Desktop only (hover-capable, fine pointer). Disabled entirely when the
// user prefers reduced motion. Writes the transform directly to the DOM
// node inside a rAF so it never triggers a React re-render.
export function usePointerTilt({ max = 5, scale = 1.04 } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!canHover || reduced) return

    let frame = null

    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width - 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5

      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.transform = `perspective(800px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) scale(${scale})`
      })
    }

    const onEnter = () => {
      el.style.willChange = 'transform'
    }

    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame)
      el.style.transform = ''
      el.style.willChange = 'auto'
    }

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)

    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [max, scale])

  return ref
}
