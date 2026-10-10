import { useReducedMotion } from 'framer-motion'

/**
 * THE MOTION VOCABULARY.
 *
 * Four patterns, reused everywhere, instead of per-page invention:
 *
 *   1. reveal   — sections and grid items enter on scroll (once, never looping)
 *   2. press    — every interactive surface lifts on hover, compresses on tap
 *   3. overlay  — one transition shared by modal, palette, menus, toasts
 *   4. image    — slow scale inside an overflow-hidden crop
 *
 * Durations are short by default. Longer sequences are reserved for high-value
 * moments (landing entry, route change) and are opted into explicitly.
 *
 * Everything is gated by `useMotion()`, which collapses distance and duration to
 * nothing when the user asks for reduced motion.
 */

// Mirrors the --ease-* tokens in index.css.
export const EASE = {
  outExpo: [0.16, 1, 0.3, 1],
  outQuart: [0.25, 1, 0.5, 1],
  spring: [0.34, 1.56, 0.64, 1],
}

export const DURATION = {
  instant: 0.12,
  fast: 0.18,
  normal: 0.28,
  slow: 0.5,
  editorial: 0.85,
}

export const transitions = {
  fast: { duration: DURATION.fast, ease: EASE.outQuart },
  normal: { duration: DURATION.normal, ease: EASE.outExpo },
  slow: { duration: DURATION.slow, ease: EASE.outExpo },
  editorial: { duration: DURATION.editorial, ease: EASE.outExpo },
  /** Tactile press feedback — the single spring used app-wide. */
  press: { type: 'spring', stiffness: 420, damping: 26, mass: 0.6 },
  /** Layout reflow when a list filters or reorders. */
  layout: { duration: DURATION.normal, ease: EASE.outExpo },
}

/** Hover/tap feedback. Spread onto any motion element that can be activated. */
export const pressable = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.97, y: 0 },
  transition: transitions.press,
}

/** Same, without the lift — for full-width bars and table rows. */
export const pressableFlat = {
  whileTap: { scale: 0.99 },
  transition: transitions.press,
}

// ── Variants ───────────────────────────────────────────────────────────────

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitions.normal },
}

export const revealUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: transitions.slow },
}

export const revealScale = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: transitions.slow },
}

/** Parent for staggered children. `stagger()` tunes the cadence per block. */
export const stagger = (staggerChildren = 0.06, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
})

/** Backdrop + panel pair shared by modal, command palette and sheets. */
export const overlay = {
  backdrop: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: DURATION.instant } },
    exit: { opacity: 0, transition: { duration: DURATION.instant } },
  },
  panel: {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: transitions.normal },
    exit: { opacity: 0, y: 8, scale: 0.985, transition: transitions.fast },
  },
  /** Mobile bottom sheet. */
  sheet: {
    hidden: { opacity: 0, y: '4%' },
    show: { opacity: 1, y: 0, transition: transitions.normal },
    exit: { opacity: 0, y: '4%', transition: transitions.fast },
  },
}

/** Route change. Deliberately short — navigation must never feel gated. */
export const routeTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: DURATION.fast, ease: EASE.outQuart },
}

/** Standard viewport config for scroll reveals: fire once, fairly early. */
export const viewportOnce = { once: true, amount: 0.25, margin: '0px 0px -8% 0px' }

/**
 * Reduced-motion aware accessors.
 *
 * Returns the vocabulary above, or flattened equivalents that still change
 * opacity (so entrances remain perceptible) but move nothing.
 */
export function useMotion() {
  const reduced = useReducedMotion()

  if (!reduced) {
    return {
      reduced: false,
      revealUp,
      revealScale,
      fadeIn,
      stagger,
      pressable,
      pressableFlat,
      overlay,
      routeTransition,
      transitions,
      viewportOnce,
      /** Multiplier for decorative distances (parallax, offsets). */
      distance: 1,
    }
  }

  const flat = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.01 } },
    exit: { opacity: 0, transition: { duration: 0.01 } },
  }

  return {
    reduced: true,
    revealUp: flat,
    revealScale: flat,
    fadeIn: flat,
    stagger: () => ({ hidden: {}, show: {} }),
    pressable: {},
    pressableFlat: {},
    overlay: { backdrop: flat, panel: flat, sheet: flat },
    routeTransition: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.01 },
    },
    transitions: {
      ...transitions,
      fast: { duration: 0.01 },
      normal: { duration: 0.01 },
      slow: { duration: 0.01 },
      editorial: { duration: 0.01 },
      layout: { duration: 0.01 },
    },
    viewportOnce,
    distance: 0,
  }
}
