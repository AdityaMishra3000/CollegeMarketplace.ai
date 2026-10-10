import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  Store,
  LayoutDashboard,
  Shield,
  Home,
  Plus,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useMotion } from '@/lib/motion'
import { useDismissable } from '@/hooks/useDismissable'
import { cn } from '@/lib/utils'

/**
 * Command palette.
 *
 * Fixed here: Escape now actually closes it (the footer advertised `ESC` while
 * only Arrow and Enter were handled), the page behind it no longer scrolls,
 * focus is trapped and restored, the highlighted row is scrolled into view when
 * navigating by keyboard, hovering no longer fights the keyboard, and the
 * "View Profile" command that pointed at /dashboard is gone with the /profile
 * route it referenced.
 */
export default function CommandPalette({ open, onOpenChange, onSell }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const m = useMotion()

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  /* Pointer hover only takes over once the pointer actually moves, so arrow keys
     are not overridden by whatever the cursor happens to be resting on. */
  const [pointerDriven, setPointerDriven] = useState(false)

  const inputRef = useRef(null)
  const listRef = useRef(null)
  const panelRef = useDismissable(open, () => onOpenChange(false), { autoFocus: false })

  const commands = useMemo(() => {
    const base = [
      { id: 'home', label: 'Home', hint: 'Landing page', group: 'Navigation', icon: Home, run: () => navigate('/') },
      { id: 'market', label: 'Browse marketplace', group: 'Navigation', icon: Store, run: () => navigate('/marketplace') },
    ]
    if (user) {
      base.push(
        { id: 'sell', label: 'List a new item', group: 'Actions', icon: Plus, run: () => onSell?.() },
        { id: 'dashboard', label: 'My listings', group: 'Navigation', icon: LayoutDashboard, run: () => navigate('/dashboard') }
      )
    }
    if (user?.role === 'admin') {
      base.push({ id: 'admin', label: 'Admin console', group: 'Actions', icon: Shield, run: () => navigate('/admin') })
    }
    return base
  }, [user, navigate, onSell])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, query])

  const searchable = query.trim().length > 0
  /* Searching the marketplace is always the last row when the box has text, so
     Enter on an empty result set still does something useful. */
  const rows = useMemo(
    () => (searchable ? [...filtered, { id: '__search', search: true }] : filtered),
    [filtered, searchable]
  )

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    setPointerDriven(false)
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => setActive(0), [query])

  // Keep the highlighted row visible inside the scrolling list.
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open, rows.length])

  const close = () => onOpenChange(false)

  const runRow = (row) => {
    close()
    if (row.search) navigate(`/marketplace?search=${encodeURIComponent(query.trim())}`)
    else row.run()
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setPointerDriven(false)
      setActive((a) => (rows.length ? (a + 1) % rows.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setPointerDriven(false)
      setActive((a) => (rows.length ? (a - 1 + rows.length) % rows.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (rows[active]) runRow(rows[active])
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-palette flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]">
          <motion.div
            aria-hidden="true"
            variants={m.overlay.backdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={close}
            className="absolute inset-0 bg-[oklch(0.16_0.02_50/0.5)] backdrop-blur-[3px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            variants={m.overlay.panel}
            initial="hidden"
            animate="show"
            exit="exit"
            onMouseMove={() => setPointerDriven(true)}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search listings or jump to a page…"
                aria-label="Search listings or jump to a page"
                aria-controls="command-list"
                className="h-14 w-full bg-transparent text-[0.9375rem] text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                ESC
              </kbd>
            </div>

            <div id="command-list" ref={listRef} role="listbox" className="max-h-[min(60vh,22rem)] overflow-y-auto p-2">
              {rows.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No commands match “{query.trim()}”.
                </p>
              )}

              {rows.map((row, i) => {
                const isActive = i === active
                const previous = rows[i - 1]
                const showHeader = !row.search && (i === 0 || previous?.search || previous?.group !== row.group)
                const Icon = row.search ? Search : row.icon

                return (
                  <div key={row.id}>
                    {showHeader && (
                      <p className="eyebrow px-2.5 pb-1.5 pt-2.5 text-muted-foreground">{row.group}</p>
                    )}
                    {row.search && <div className="my-1.5 h-px bg-border" />}
                    <button
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      onMouseEnter={() => pointerDriven && setActive(i)}
                      onClick={() => runRow(row)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors',
                        isActive ? 'bg-primary-subtle text-foreground' : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors',
                            isActive
                              ? 'border-primary/30 bg-primary/15 text-primary-ink'
                              : 'border-border bg-card text-muted-foreground'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="truncate">
                          {row.search ? (
                            <>
                              Search listings for{' '}
                              <span className="font-semibold text-primary-ink">{query.trim()}</span>
                            </>
                          ) : (
                            row.label
                          )}
                        </span>
                        {row.hint && !row.search && (
                          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                            {row.hint}
                          </span>
                        )}
                      </span>
                      {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-4 border-t border-border bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Key>
                  <ArrowUp className="h-3 w-3" />
                </Key>
                <Key>
                  <ArrowDown className="h-3 w-3" />
                </Key>
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Key>
                  <CornerDownLeft className="h-3 w-3" />
                </Key>
                Select
              </span>
              <span className="ml-auto hidden sm:flex sm:items-center sm:gap-1.5">
                <Key>ESC</Key>
                Close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

function Key({ children }) {
  return (
    <kbd className="inline-flex items-center rounded border border-border bg-card px-1 py-0.5 font-sans text-[10px]">
      {children}
    </kbd>
  )
}
