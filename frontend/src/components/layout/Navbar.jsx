import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Plus,
  Menu,
  X,
  Sun,
  Moon,
  LayoutDashboard,
  Store,
  User as UserIcon,
  LogOut,
  Shield,
  Command,
} from "lucide-react"
import { cn } from "../../lib/utils"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { Button } from "../ui/Button"
import Avatar from "../ui/Avatar"

const NAV_LINKS = [
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, auth: true },
]

export function Navbar({ onOpenCommand, onOpenSell }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + "/")

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    setMobileOpen(false)
    navigate("/")
  }

  // Wire the advertised ⌘K / Ctrl+K hint to the existing command-palette trigger.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault()
        onOpenCommand?.()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onOpenCommand])

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="CampusMarket home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30 ring-1 ring-inset ring-white/10">
            <Store className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight text-foreground sm:block">
            Campus<span className="text-primary">Market</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {NAV_LINKS.filter((l) => !l.auth || user).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.to)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive(link.to) && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-muted"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          <button
            onClick={onOpenCommand}
            className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-card pl-2.5 pr-2 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground sm:flex"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
            <span className="pr-6">Search…</span>
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Command className="h-3 w-3" />K
            </kbd>
          </button>

          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center"
              >
                {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </motion.span>
            </AnimatePresence>
          </button>

          {user ? (
            <>
              <Button size="sm" onClick={onOpenSell} className="hidden sm:inline-flex">
                <Plus className="h-4 w-4" />
                Sell
              </Button>

              <div className="relative hidden md:block">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center rounded-full outline-none ring-offset-2 ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring/55"
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar name={user.name} size="md" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.14 }}
                        className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-xl"
                      >
                        <div className="flex items-center gap-3 border-b border-border px-2.5 pb-2.5 pt-1.5">
                          <Avatar name={user.name} size="md" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="pt-1.5">
                          <MenuItem to="/profile" icon={UserIcon} onClick={() => setMenuOpen(false)}>
                            Profile
                          </MenuItem>
                          <MenuItem to="/dashboard" icon={LayoutDashboard} onClick={() => setMenuOpen(false)}>
                            Dashboard
                          </MenuItem>
                          {user.role === "admin" && (
                            <MenuItem to="/admin" icon={Shield} onClick={() => setMenuOpen(false)}>
                              Admin console
                            </MenuItem>
                          )}
                          <div className="my-1 h-px bg-border" />
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    </>
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

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:border-border-strong md:hidden"
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {user && (
                <div className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                  <Avatar name={user.name} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  onOpenCommand()
                  setMobileOpen(false)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground"
              >
                <Search className="h-4 w-4" />
                Search products
              </button>
              {NAV_LINKS.filter((l) => !l.auth || user).map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(link.to)
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <UserIcon className="h-4 w-4" />
                    Profile
                  </Link>
                  {user.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      <Shield className="h-4 w-4" />
                      Admin console
                    </Link>
                  )}
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      onClick={() => {
                        onOpenSell()
                        setMobileOpen(false)
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Sell an item
                    </Button>
                    <Button variant="outline" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="outline" asChild>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link to="/register" onClick={() => setMobileOpen(false)}>
                      Get started
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function MenuItem({ to, icon: Icon, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </Link>
  )
}
