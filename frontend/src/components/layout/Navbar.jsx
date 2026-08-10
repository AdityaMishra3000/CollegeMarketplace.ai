import { useState } from "react"
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

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="CampusMarket home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_8px_-2px_var(--accent)]">
            <Store className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </div>
          <span className="hidden text-[15px] font-semibold tracking-tight text-foreground sm:block">
            CampusMarket
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.filter((l) => !l.auth || user).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(link.to)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive(link.to) && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-md bg-muted"
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
            className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground sm:flex"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Command className="h-3 w-3" />K
            </kbd>
          </button>

          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
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
                  className="flex items-center rounded-full outline-none ring-accent/50 focus-visible:ring-2"
                  aria-label="Account menu"
                >
                  <Avatar name={user.name} size={36} />
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
                        className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-2xl"
                      >
                        <div className="border-b border-border px-3 py-2.5">
                          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <MenuItem to="/profile" icon={UserIcon} onClick={() => setMenuOpen(false)}>
                          Profile
                        </MenuItem>
                        <MenuItem to="/dashboard" icon={LayoutDashboard} onClick={() => setMenuOpen(false)}>
                          Dashboard
                        </MenuItem>
                        {user.role === "admin" && (
                          <MenuItem to="/admin" icon={Shield} onClick={() => setMenuOpen(false)}>
                            Admin
                          </MenuItem>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-muted"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground md:hidden"
            aria-label="Menu"
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
              <button
                onClick={() => {
                  onOpenCommand()
                  setMobileOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground"
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
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive(link.to) ? "bg-muted text-foreground" : "text-muted-foreground",
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
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground"
                  >
                    <UserIcon className="h-4 w-4" />
                    Profile
                  </Link>
                  {user.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground"
                    >
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  )}
                  <Button
                    className="mt-2 w-full"
                    onClick={() => {
                      onOpenSell()
                      setMobileOpen(false)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Sell an item
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
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
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </Link>
  )
}
