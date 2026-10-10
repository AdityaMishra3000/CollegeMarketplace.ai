import { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Navbar } from './components/layout/Navbar'
import CommandPalette from './components/layout/CommandPalette'
import SellModal from './components/marketplace/SellModal'
import { useAuth } from './context/AuthContext'
import { ListingsProvider, useListings } from './context/ListingsContext'
import { useMotion } from './lib/motion'

// Pages
import Landing from './pages/Landing'
import Marketplace from './pages/Marketplace'
import ProductDetails from './pages/ProductDetails'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth()

  // Prevent flashing the login screen while the JWT validates on mount
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}

export default function App() {
  return (
    <ListingsProvider>
      <AppShell />
    </ListingsProvider>
  )
}

function AppShell() {
  const [commandOpen, setCommandOpen] = useState(false)
  const [sellModalOpen, setSellModalOpen] = useState(false)
  const { refreshListings } = useListings()
  const location = useLocation()
  const m = useMotion()

  /* The landing page composes its own full-bleed sections, so it opts out of the
     constrained page container every other route sits inside. */
  const isFullBleed = location.pathname === '/'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-palette focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <Navbar
        onOpenCommand={() => setCommandOpen(true)}
        onOpenSell={() => setSellModalOpen(true)}
        transparent={isFullBleed}
      />

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onSell={() => setSellModalOpen(true)}
      />

      <main id="main" className={isFullBleed ? '' : 'mx-auto max-w-[1600px] px-5 py-10 sm:px-6 sm:py-12'}>
        {/* Route change is short by design — navigation must never feel gated. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} {...m.routeTransition}>
            <Routes location={location}>
              <Route path="/" element={<Landing />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <Admin />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <SellModal
        open={sellModalOpen}
        onClose={() => setSellModalOpen(false)}
        onSuccess={refreshListings}
      />
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-hero leading-none text-border-strong">404</p>
      <h1 className="mt-6 font-display text-title text-foreground">Page not found</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        The route you are looking for does not exist.
      </p>
    </div>
  )
}
