// Shared motion vocabulary for CampusMarket.
//
// A small, reusable set of patterns — not a grab bag of one-off animations.
// Every animated interaction in the app should reach for one of these
// instead of inventing a new curve/duration. Keep it that way.

export const EASE_OUT = [0.16, 1, 0.3, 1]

// ENTER — sections, cards, modal contents appearing on screen. Includes an
// `exit` so the same variant can drive AnimatePresence add/remove (e.g. a
// filtered grid) without a separate one-off animation per surface.
export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: EASE_OUT } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } },
}

// Stagger container for grids/lists. Children should use `fadeUp`/`fadeIn`.
export function staggerContainer(staggerAmount = 0.05, delayChildren = 0) {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: staggerAmount, delayChildren },
    },
  }
}

// FEEDBACK — a result/state becoming available (AI suggestion, trust panel,
// success confirmation). Slightly springy so it reads as "arriving", never
// bouncy or attention-grabbing.
export const feedbackPop = {
  hidden: { opacity: 0, y: 6, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 380, damping: 30 },
  },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
}

// MICRO — the physical response every tactile control shares.
export const tapScale = { scale: 0.97 }

// The single spring every pressable control (Button, filter chips, product
// tiles) resolves through. One spring vocabulary, reused everywhere, so a
// press always feels like the same material.
export const pressSpring = { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 }
