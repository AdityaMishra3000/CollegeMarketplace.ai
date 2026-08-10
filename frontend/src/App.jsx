import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import CommandPalette from './components/layout/CommandPalette'
import SellModal from './components/marketplace/SellModal'
import { useAuth } from './context/AuthContext'

// Pages
import Marketplace from './pages/Marketplace'
import ProductDetails from './pages/ProductDetails'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

// Protected Route Wrapper
function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth()
  
  // Prevent flashing the login screen while the JWT validates on mount
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }
  
  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  
  return children
}

export default function App() {
  const [commandOpen, setCommandOpen] = useState(false)
  const [sellModalOpen, setSellModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar 
        onOpenCommand={() => setCommandOpen(true)} 
        onOpenSell={() => setSellModalOpen(true)} 
      />

      <CommandPalette 
        open={commandOpen} 
        onOpenChange={setCommandOpen} 
        onSell={() => setSellModalOpen(true)} 
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/marketplace" replace />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
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
              <ProtectedRoute requireAdmin={true}>
                <Admin />
              </ProtectedRoute>
            } 
          />

          {/* 404 Catch-all */}
          <Route path="*" element={
            <div className="text-center pt-20">
              <h2 className="text-2xl font-bold">404 - Page Not Found</h2>
              <p className="text-muted-foreground mt-2">The route you are looking for does not exist.</p>
            </div>
          } />
        </Routes>
      </main>

      <SellModal 
        open={sellModalOpen} 
        onClose={() => setSellModalOpen(false)} 
        onSuccess={() => {
          if (window.location.pathname === '/dashboard' || window.location.pathname === '/marketplace') {
            window.location.reload()
          }
        }}
      />
    </div>
  )
}