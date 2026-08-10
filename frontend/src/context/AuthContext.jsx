import { createContext, useContext, useState, useEffect } from 'react'
import API from '../api/client'
import { useToast } from '../components/ui/Toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('authToken')
      if (token) {
        try {
          const res = await API.get('/auth/me')
          setUser(res.user)
        } catch (err) {
          localStorage.removeItem('authToken')
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const res = await API.post('/auth/login', { email, password })
      localStorage.setItem('authToken', res.token)
      setUser(res.user)
      toast('Welcome back!', { type: 'success' })
      return res.user
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid credentials'
      toast(msg, { type: 'error' })
      throw err
    }
  }

  const register = async (userData) => {
    try {
      const res = await API.post('/auth/register', userData)
      localStorage.setItem('authToken', res.token)
      setUser(res.user)
      toast('Account created successfully', { type: 'success' })
      return res.user
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed'
      toast(msg, { type: 'error' })
      throw err
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setUser(null)
    toast('Logged out successfully', { type: 'info' })
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)