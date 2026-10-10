import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMotion } from '@/lib/motion'
import { useDismissable } from '@/hooks/useDismissable'
import { Eyebrow } from './Editorial'

const sizes = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

/**
 * Dialog.
 *
 * Escape, scroll lock, focus trap and focus restore all come from
 * useDismissable, so this component and the command palette cannot drift apart.
 *
 * On phones it is a bottom sheet: full width, rounded only at the top, reachable
 * with a thumb. On larger screens it is a centred panel.
 */
export default function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  size = 'md',
  className,
}) {
  const m = useMotion()
  const panelRef = useDismissable(open, onClose)

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            aria-hidden="true"
            variants={m.overlay.backdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-[oklch(0.16_0.02_50/0.55)] backdrop-blur-[3px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            variants={m.overlay.panel}
            initial="hidden"
            animate="show"
            exit="exit"
            className={cn(
              'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden border border-border bg-popover shadow-2xl outline-none',
              'rounded-t-2xl sm:rounded-2xl',
              sizes[size] ?? sizes.md,
              className
            )}
          >
            {/* Grab handle: signals the sheet is dismissable on touch. */}
            <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border-strong sm:hidden" />

            {(title || description) && (
              <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-4 sm:px-7 sm:pt-6">
                <div className="min-w-0">
                  {eyebrow && <Eyebrow accent className="mb-2">{eyebrow}</Eyebrow>}
                  {title && (
                    <h2 className="font-display text-title text-foreground">{title}</h2>
                  )}
                  {description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="-mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7 sm:pb-7">{children}</div>

            {footer && (
              <footer className="flex items-center justify-end gap-2.5 border-t border-border bg-muted/40 px-5 py-4 sm:px-7">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
