import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Search, Plus, Menu, X, Sun, Moon, LayoutDashboard, Store, LogOut, Shield, Command, Bookmark } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useMotion } from '../../lib/motion'
import { hapticTap } from '../../lib/native'
import { registerOverlay } from '../../lib/backButton'
import { Button } from '../ui/Button'
import Avatar from '../ui/Avatar'

const NAV_LINKS = [
  { to: '/marketplace', label: 'Marketplace', icon: Store },
  { to: '/saved', label: 'Saved', icon: Bookmark },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, auth: true },
]

/**
 * Application masthead.
 *
 * `transparent` is used on the landing page, where the nav sits on the hero and
 * only grows a border once the page has scrolled. Everywhere else it is a
 * permanent bordered bar.
 */
export function Navbar({ onOpenCommand, onOpenSell, transparent = false }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const m = useMotion()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)

  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12))

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(`${to}/`)

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    setMobileOpen(false)
    navigate('/')
  }

  // ⌘K / Ctrl+K opens the palette.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        onOpenCommand?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOpenCommand])

  // Automatically close overlays on route change
  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  // Register mobile drawer with Android Back button stack
  useEffect(() => {
    if (!mobileOpen) return
    return registerOverlay('mobile-drawer', () => setMobileOpen(false))
  }, [mobileOpen])

  // Close the account menu on Escape or an outside click, and return focus.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    const onClick = (e) => {
      if (!menuRef.current?.contains(e.target) && !menuButtonRef.current?.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [menuOpen])

  // The mobile sheet locks body scroll while open.
  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  const solid = !transparent || scrolled || mobileOpen

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-nav pt-[env(safe-area-inset-top,0px)] transition-[background-color,border-color,box-shadow] duration-300',
          solid
            ? 'border-b border-border bg-background/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-baseline gap-0 rounded-md font-display text-[1.375rem] leading-none tracking-tight"
            aria-label="CampusMarket — home"
          >
            <span className="text-foreground">Campus</span>
            <span className="text-primary-ink">Market</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-0.5 md:flex" aria-label="Main">
            {NAV_LINKS.filter((l) => !l.auth || user).map((link) => (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive(link.to) ? 'page' : undefined}
                className={cn(
                  'relative rounded-md px-3 py-2 text-[0.8125rem] font-medium uppercase tracking-[0.08em] transition-colors',
                  isActive(link.to) ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive(link.to) && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-3 -bottom-px h-0.5 bg-primary"
                    transition={m.reduced ? { duration: 0.01 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            <button
              onClick={onOpenCommand}
              className="hidden h-10 items-center gap-2 rounded-lg border border-input bg-card pl-3 pr-2 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground sm:flex"
              aria-label="Search listings"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="pr-8 text-[0.8125rem]">Search…</span>
              <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                <Command className="h-3 w-3" aria-hidden="true" />K
              </kbd>
            </button>

            <button
              onClick={() => {
                hapticTap()
                toggle()
              }}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-card text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground active:scale-95"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, rotate: m.reduced ? 0 : -35, scale: 0.85 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: m.reduced ? 0 : 35, scale: 0.85 }}
                  transition={{ duration: m.reduced ? 0.01 : 0.18 }}
                  className="flex items-center justify-center"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </motion.span>
              </AnimatePresence>
            </button>

            {user ? (
              <>
                <Button size="sm" onClick={onOpenSell} className="hidden sm:inline-flex">
                  <Plus />
                  Sell
                </Button>

                <div className="relative hidden md:block">
                  <button
                    ref={menuButtonRef}
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex rounded-full transition"
                    aria-label="Account menu"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                  >
                    <Avatar name={user.name} size="md" />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        ref={menuRef}
                        role="menu"
                        variants={m.overlay.panel}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="absolute right-0 z-dropdown mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
                      >
                        <div className="flex items-center gap-3 border-b border-border p-3.5">
                          <Avatar name={user.name} size="md" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="p-1.5">
                          <MenuItem to="/dashboard" icon={LayoutDashboard} onClick={() => setMenuOpen(false)}>
                            Dashboard
                          </MenuItem>
                          <MenuItem to="/saved" icon={Bookmark} onClick={() => setMenuOpen(false)}>
                            Saved items
                          </MenuItem>
                          {user.role === 'admin' && (
                            <MenuItem to="/admin" icon={Shield} onClick={() => setMenuOpen(false)}>
                              Admin console
                            </MenuItem>
                          )}
                          <div className="my-1.5 h-px bg-border" />
                          <button
                            role="menuitem"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">Get started</Link>
                </Button>
              </div>
            )}

            {/* Mobile Hamburger Menu button with 44+ dp touch target */}
            <button
              onClick={() => {
                hapticTap()
                setMobileOpen((v) => !v)
              }}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-input bg-card text-foreground transition-colors hover:border-border-strong active:scale-95 md:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Robust Portaled Drawer — rendered to document.body outside of sticky header */}
      {typeof document !== 'undefined' &&
        createPortal(
          <MobileDrawer
            open={mobileOpen}
            user={user}
            isActive={isActive}
            onClose={() => setMobileOpen(false)}
            onOpenCommand={onOpenCommand}
            onOpenSell={onOpenSell}
            onLogout={handleLogout}
            m={m}
          />,
          document.body
        )}
    </>
  )
}

function MenuItem({ to, icon: Icon, children, onClick }) {
  return (
    <Link
      role="menuitem"
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </Link>
  )
}

/** Full-height mobile drawer rendered into document.body to avoid stacking context traps */
function MobileDrawer({ open, user, isActive, onClose, onOpenCommand, onOpenSell, onLogout, m }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: m.reduced ? 0.01 : 0.2 }}
            onClick={() => {
              hapticTap()
              onClose()
            }}
            className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-xs md:hidden"
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={
              m.reduced
                ? { duration: 0.01 }
                : { type: 'spring', stiffness: 380, damping: 32 }
            }
            className="fixed inset-y-0 right-0 z-modal flex w-[85%] max-w-[340px] flex-col border-l border-border bg-background pt-[env(safe-area-inset-top,0px)] pb-[max(env(safe-area-inset-bottom,0px),1rem)] shadow-2xl md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
          >
            {/* Drawer Header */}
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <span className="font-display text-heading tracking-tight text-foreground">Menu</span>
              <button
                onClick={() => {
                  hapticTap()
                  onClose()
                }}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted active:scale-95"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto p-5">
              {user ? (
                <div className="mb-6 flex items-center gap-3.5 rounded-xl border border-border bg-card p-4">
                  <Avatar name={user.name} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-heading text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    <span className="mt-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      {user.role === 'admin' ? 'Administrator' : user.course || 'Student'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mb-6 rounded-xl border border-border bg-card p-4 text-center">
                  <p className="font-display text-heading text-foreground">Welcome to CampusMarket</p>
                  <p className="mt-1 text-xs text-muted-foreground">Sign in to buy and sell with verified college peers.</p>
                </div>
              )}

              {/* Navigation Destinations */}
              <nav className="flex flex-col gap-1" aria-label="Mobile Navigation">
                <Link
                  to="/marketplace"
                  onClick={() => {
                    hapticTap()
                    onClose()
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-semibold transition-colors',
                    isActive('/marketplace')
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <Store className="h-5 w-5" />
                  Marketplace
                </Link>

                <Link
                  to="/saved"
                  onClick={() => {
                    hapticTap()
                    onClose()
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-semibold transition-colors',
                    isActive('/saved')
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <Bookmark className="h-5 w-5" />
                  Saved items
                </Link>

                {user && (
                  <Link
                    to="/dashboard"
                    onClick={() => {
                      hapticTap()
                      onClose()
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-semibold transition-colors',
                      isActive('/dashboard')
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    My Listings & Dashboard
                  </Link>
                )}

                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => {
                      hapticTap()
                      onClose()
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-semibold transition-colors',
                      isActive('/admin')
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <Shield className="h-5 w-5" />
                    Admin Console
                  </Link>
                )}
              </nav>

              {/* Quick Search Button */}
              <button
                onClick={() => {
                  hapticTap()
                  onClose()
                  onOpenCommand?.()
                }}
                className="mt-4 flex h-12 w-full items-center gap-3 rounded-lg border border-input bg-card px-4 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>Search listings…</span>
              </button>

              {/* Sell button */}
              <Button
                size="lg"
                onClick={() => {
                  hapticTap()
                  onClose()
                  onOpenSell?.()
                }}
                className="mt-4 w-full"
              >
                <Plus />
                Sell an item
              </Button>

              {/* Footer Account Actions */}
              <div className="mt-auto pt-6">
                {user ? (
                  <Button variant="outline" size="lg" onClick={onLogout} className="w-full">
                    <LogOut />
                    Sign out
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <Button asChild size="lg" className="w-full">
                      <Link
                        to="/register"
                        onClick={() => {
                          hapticTap()
                          onClose()
                        }}
                      >
                        Create an account
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="w-full">
                      <Link
                        to="/login"
                        onClick={() => {
                          hapticTap()
                          onClose()
                        }}
                      >
                        Sign in
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
