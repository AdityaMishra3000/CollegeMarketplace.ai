import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

// Animates a displayed number from its previous value to `value`.
// Short, deterministic, no bounce — it should read as "this is a live
// value updating", never as decoration. Respects prefers-reduced-motion.
export function useCountUp(value, { duration = 0.6, decimals = 0 } = {}) {
  const numeric = typeof value === 'number' && !Number.isNaN(value) ? value : 0
  const [display, setDisplay] = useState(numeric)
  const prevRef = useRef(numeric)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const from = prevRef.current
    const to = numeric

    if (reduceMotion || from === to) {
      setDisplay(to)
      prevRef.current = to
      return
    }

    const controls = animate(from, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    })

    prevRef.current = to
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeric, duration, reduceMotion])

  return decimals > 0 ? display.toFixed(decimals) : Math.round(display)
}
