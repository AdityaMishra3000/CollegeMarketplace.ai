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
      { id: 'home', label: 'Go to Home', icon: Home, run: () => navigate('/') },
      { id: 'market', label: 'Browse Marketplace', icon: Store, run: () => navigate('/marketplace') },
    ]
    if (user) {
      base.push(
        { id: 'sell', label: 'List a new item', icon: Plus, run: () => onSell?.() },
        { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard, run: () => navigate('/dashboard') },
        { id: 'profile', label: 'View Profile', icon: User, run: () => navigate('/dashboard') }
      )
    }
    if (user?.role === 'admin') {
      base.push({ id: 'admin', label: 'Admin Control Center', icon: Shield, run: () => navigate('/admin') })
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
    if (cmd.id === 'market' && query.trim() && cmd.id === 'market') {
      // no-op
    }
    cmd.run()
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
      else if (query.trim()) {
        onOpenChange(false)
        navigate(`/marketplace?search=${encodeURIComponent(query.trim())}`)
      }
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search items or jump to a page…"
                className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 && query.trim() && (
                <button
                  onClick={() => {
                    onOpenChange(false)
                    navigate(`/marketplace?search=${encodeURIComponent(query.trim())}`)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg bg-primary/10 px-3 py-2.5 text-left text-sm text-foreground"
                >
                  <Search className="h-4 w-4 text-primary" />
                  Search marketplace for “{query.trim()}”
                </button>
              )}
              {filtered.map((cmd, i) => {
                const Icon = cmd.icon
                return (
                  <button
                    key={cmd.id}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => runCommand(cmd)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      i === active
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {cmd.label}
                    </span>
                    {i === active && (
                      <CornerDownLeft className="h-3.5 w-3.5 opacity-60" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
