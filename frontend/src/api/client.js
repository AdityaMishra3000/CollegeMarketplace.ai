
import axios from 'axios'

const API = axios.create({
  /**
   * Web: use same-origin /api, proxied by Vite or Nginx.
   * Native Android: the request interceptor below selects an absolute URL.
   */
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

// Attach the JWT token and resolve the correct API URL on native platforms.
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const isNative =
      typeof window !== 'undefined' &&
      (
        window.Capacitor?.isNativePlatform?.() === true ||
        window.location.protocol === 'capacitor:' ||
        (
          window.location.hostname === 'localhost' &&
          window.location.port === ''
        )
      )

    if (isNative) {
      const customUrl = localStorage
        .getItem('campusmarket_custom_api_url')
        ?.trim()

      const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim()

      const isAbsoluteHttpUrl = (value) =>
        typeof value === 'string' && /^https?:\/\//i.test(value)

      // Priority: explicit custom URL, absolute build-time URL,
      // then the local backend reachable through adb reverse.
      const nativeBase = isAbsoluteHttpUrl(customUrl)
        ? customUrl.replace(/\/+$/, '')
        : isAbsoluteHttpUrl(configuredUrl)
          ? configuredUrl.replace(/\/+$/, '')
          : 'http://127.0.0.1:5000/api'

      if (
        !config.baseURL ||
        config.baseURL === '/api' ||
        config.baseURL.startsWith('/')
      ) {
        config.baseURL = nativeBase
      }
    }

    return config
  },
  (error) => Promise.reject(error)
)

const PUBLIC_PATHS = ['/login', '/register']

/**
 * Determine whether an authentication failure means the session is invalid.
 */
function isSessionFailure(error) {
  const status = error.response?.status

  if (status === 401) {
    return true
  }

  const code = error.response?.data?.code

  return (
    status === 403 &&
    ['NO_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'NO_USER'].includes(code)
  )
}

// Unwrap successful responses and handle invalid authentication sessions.
API.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (
      typeof window !== 'undefined' &&
      isSessionFailure(error) &&
      localStorage.getItem('authToken')
    ) {
      localStorage.removeItem('authToken')

      if (!PUBLIC_PATHS.includes(window.location.pathname)) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default API
