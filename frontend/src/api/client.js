import axios from 'axios'

const API = axios.create({
  /**
   * Same-origin by default.
   *
   * `/api` is proxied to the backend by the Vite dev server (vite.config.js) and
   * by nginx in the production build, so the app never needs to know which host
   * or port it is being served from. An absolute default here is what broke the
   * app when it was opened as http://marketplace.io instead of http://localhost:
   * every request became cross-origin.
   *
   * Set VITE_API_BASE_URL to an absolute URL only when the API genuinely lives on
   * another origin — that origin must then be listed in the backend's
   * CORS_ORIGINS allowlist.
   */
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

// Intercept requests to attach the JWT token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const PUBLIC_PATHS = ['/login', '/register']

/**
 * True when the response says our credentials are the problem.
 *
 * The backend now answers 401 for every token failure, including expiry — it
 * used to answer 403 for expired tokens, which this interceptor ignored, so an
 * expired session was never cleared and the user was stuck. 403 is still checked
 * for the authentication codes because a 403 with one of them can only mean the
 * session is unusable (a genuine permission denial has no code).
 */
function isSessionFailure(error) {
  const status = error.response?.status
  if (status === 401) return true
  const code = error.response?.data?.code
  return status === 403 && ['NO_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'NO_USER'].includes(code)
}

// Intercept responses to unwrap data and handle global auth failures
API.interceptors.response.use(
  (res) => res.data,
  (error) => {
    if (isSessionFailure(error) && localStorage.getItem('authToken')) {
      localStorage.removeItem('authToken')
      if (!PUBLIC_PATHS.includes(window.location.pathname)) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default API
