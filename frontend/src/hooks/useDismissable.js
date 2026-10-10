import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Everything an overlay needs to behave: Escape to dismiss, a locked page
 * behind it, focus kept inside, and focus returned to whatever opened it.
 *
 * Shared by Modal and CommandPalette. The palette previously advertised `ESC` in
 * its own footer while handling only Arrow and Enter keys, never locked the page
 * scroll, and dropped focus on close.
 *
 * Returns a ref to attach to the overlay container.
 */
export function useDismissable(open, onClose, { autoFocus = true, lockScroll = true } = {}) {
  const containerRef = useRef(null)
  const restoreRef = useRef(null)

  // Remember the trigger so focus can go back to it.
  useEffect(() => {
    if (open) restoreRef.current = document.activeElement
  }, [open])

  useEffect(() => {
    if (!open) return

    const container = containerRef.current
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose?.()
        return
      }

      if (event.key !== 'Tab' || !container) return

      const items = Array.from(container.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      )
      if (items.length === 0) {
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      // Wrap at both ends, and pull focus in if it has escaped the overlay.
      if (!container.contains(active)) {
        event.preventDefault()
        first.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  // Lock the page behind the overlay. Compensating for the scrollbar width keeps
  // the layout from shifting as it disappears.
  useEffect(() => {
    if (!open || !lockScroll) return
    const { body, documentElement } = document
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight
    const scrollbar = window.innerWidth - documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
    }
  }, [open, lockScroll])

  // Move focus in on open, and back out on close.
  useEffect(() => {
    if (!open) {
      const target = restoreRef.current
      if (target && typeof target.focus === 'function') {
        // Let the exit animation start before stealing focus back.
        const id = requestAnimationFrame(() => target.focus())
        return () => cancelAnimationFrame(id)
      }
      return undefined
    }

    if (!autoFocus) return undefined
    const id = requestAnimationFrame(() => {
      const container = containerRef.current
      if (!container) return
      const first = container.querySelector(FOCUSABLE)
      ;(first || container).focus?.()
    })
    return () => cancelAnimationFrame(id)
  }, [open, autoFocus])

  return containerRef
}
