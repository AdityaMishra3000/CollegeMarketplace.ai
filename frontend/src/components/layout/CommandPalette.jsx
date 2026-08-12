import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  Store,
  LayoutDashboard,
  Shield,
  User,
  Home,
  Plus,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function CommandPalette({ open, onOpenChange, onSell }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)

  const commands = useMemo(() => {
    const base = [
      { id: 'home', label: 'Go to Home', group: 'Navigation', icon: Home, run: () => navigate('/') },
      { id: 'market', label: 'Browse Marketplace', group: 'Navigation', icon: Store, run: () => navigate('/marketplace') },
    ]
    if (user) {
      base.push(
        { id: 'sell', label: 'List a new item', group: 'Actions', icon: Plus, run: () => onSell?.() },
        { id: 'dashboard', label: 'My Dashboard', group: 'Navigation', icon: LayoutDashboard, run: () => navigate('/dashboard') },
        { id: 'profile', label: 'View Profile', group: 'Navigation', icon: User, run: () => navigate('/dashboard') }
      )
    }
    if (user?.role === 'admin') {
      base.push({ id: 'admin', label: 'Admin Control Center', group: 'Actions', icon: Shield, run: () => navigate('/admin') })
    }
    return base
  }, [user, navigate, onSell])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  const runCommand = (cmd) => {
    onOpenChange(false)
    cmd.run()
  }

  const searchMarketplace = () => {
    onOpenChange(false)
    navigate(`/marketplace?search=${encodeURIComponent(query.trim())}`)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[active]) runCommand(filtered[active])
      else if (query.trim()) searchMarketplace()
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[14vh]">
          <motion.div
            className="absolute inset-0 bg-foreground/25 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search items or jump to a page…"
                className="h-13 w-full bg-transparent py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 && query.trim() && (
                <button
                  onClick={searchMarketplace}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/12 text-primary">
                    <Search className="h-4 w-4" />
                  </span>
                  Search marketplace for “<span className="font-medium">{query.trim()}</span>”
                </button>
              )}

              {filtered.map((cmd, i) => {
                const Icon = cmd.icon
                const showHeader = i === 0 || filtered[i - 1].group !== cmd.group
                return (
                  <div key={cmd.id}>
                    {showHeader && (
                      <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {cmd.group}
                      </p>
                    )}
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => runCommand(cmd)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                        i === active ? 'bg-accent text-accent-foreground' : 'text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                            i === active
                              ? 'border-transparent bg-primary/15 text-primary'
                              : 'border-border bg-card text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        {cmd.label}
                      </span>
                      {i === active && <CornerDownLeft className="h-3.5 w-3.5 opacity-60" />}
                    </button>
                  </div>
                )
              })}

              {filtered.length === 0 && !query.trim() && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No commands available.
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-border bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center rounded border border-border bg-card px-1 py-0.5">
                  <ArrowUp className="h-3 w-3" />
                </kbd>
                <kbd className="inline-flex items-center rounded border border-border bg-card px-1 py-0.5">
                  <ArrowDown className="h-3 w-3" />
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center rounded border border-border bg-card px-1 py-0.5">
                  <CornerDownLeft className="h-3 w-3" />
                </kbd>
                Select
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
