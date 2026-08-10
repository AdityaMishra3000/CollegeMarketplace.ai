import { createContext, useCallback, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, XCircle, X } from 'lucide-react'

const ToastContext = createContext({ toast: () => {} })

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const accents = {
  success: 'text-success',
  error: 'text-destructive',
  info: 'text-primary',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (message, opts = {}) => {
      const id = Math.random().toString(36).slice(2)
      const type = opts.type || 'info'
      setToasts((t) => [...t, { id, message, type, title: opts.title }])
      setTimeout(() => remove(id), opts.duration || 3800)
    },
    [remove]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5">
          <AnimatePresence>
            {toasts.map((t) => {
              const Icon = icons[t.type]
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.97 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-popover p-3.5 pr-3 text-popover-foreground shadow-lg"
                >
                  <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${accents[t.type]}`} />
                  <div className="min-w-0 flex-1">
                    {t.title && (
                      <p className="text-sm font-medium">{t.title}</p>
                    )}
                    <p className="text-[13px] leading-snug text-muted-foreground">
                      {t.message}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(t.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
