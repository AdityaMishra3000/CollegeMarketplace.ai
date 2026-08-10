import axios from 'axios'

const API = axios.create({
  // Fallback to local during dev, Vercel will use the env var
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
})

// Intercept requests to attach the JWT token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercept responses to unwrap data and handle global auth failures
API.interceptors.response.use(
  (res) => res.data,
  (error) => {
    // If the token expires or is invalid, wipe it and kick them to login
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default API