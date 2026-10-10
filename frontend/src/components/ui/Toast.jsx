import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMotion } from '@/lib/motion'

const ToastContext = createContext({ toast: () => {} })

const CONFIG = {
  success: { icon: CheckCircle2, accent: 'text-success', bar: 'bg-success' },
  error: { icon: XCircle, accent: 'text-destructive', bar: 'bg-destructive' },
  info: { icon: Info, accent: 'text-primary-ink', bar: 'bg-primary' },
}

const MAX_VISIBLE = 3

/**
 * Toasts.
 *
 * Timers are tracked and cleared on unmount — the previous implementation left
 * a dangling setTimeout per toast. The stack is capped so a burst of messages
 * cannot cover the interface, and it is announced politely to screen readers.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())
  const counter = useRef(0)

  const remove = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message, options = {}) => {
      counter.current += 1
      const id = `t${counter.current}`
      const type = CONFIG[options.type] ? options.type : 'info'

      setToasts((current) => [...current, { id, message, type, title: options.title }].slice(-MAX_VISIBLE))
      timers.current.set(
        id,
        setTimeout(() => remove(id), options.duration ?? 4200)
      )
      return id
    },
    [remove]
  )

  // Clear every pending timer if the provider goes away.
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      timers.current.clear()
    },
    []
  )

  return (
    <ToastContext.Provider value={{ toast, dismiss: remove }}>
      {children}
      {createPortal(<ToastViewport toasts={toasts} onDismiss={remove} />, document.body)}
    </ToastContext.Provider>
  )
}

function ToastViewport({ toasts, onDismiss }) {
  const m = useMotion()

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-toast flex flex-col items-center gap-2.5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const { icon: Icon, accent, bar } = CONFIG[t.type]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: m.reduced ? 0 : 14, scale: m.reduced ? 1 : 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: m.reduced ? 0 : 18, scale: 0.97 }}
              transition={m.transitions.normal}
              className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border border-border bg-popover py-3.5 pl-4 pr-3 text-popover-foreground shadow-xl"
            >
              {/* A colour bar rather than a tinted card: the message stays readable. */}
              <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[3px]', bar)} />
              <Icon className={cn('mt-px h-4 w-4 shrink-0', accent)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                {t.title && <p className="text-[13px] font-semibold">{t.title}</p>}
                <p className="text-[13px] leading-snug text-muted-foreground">{t.message}</p>
              </div>
              <button
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss notification"
                className="-mt-0.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export const useToast = () => useContext(ToastContext)
