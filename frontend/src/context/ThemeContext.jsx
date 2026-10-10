import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'campusmarket-theme'
const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggle: () => {} })

/**
 * Reads the stored choice, then the OS preference, then falls back to light.
 *
 * Previously the theme was hardcoded to 'light' on every mount, so the toggle
 * reset on reload and a visitor whose system is dark got a white flash and then
 * a white app.
 */
function resolveInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Private browsing / storage disabled — fall through to the OS preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(resolveInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    root.style.colorScheme = theme
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Not fatal: the theme still applies for this session.
    }
  }, [theme])

  /* Follow the OS while the user has not made an explicit choice. */
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = (event) => {
      let stored = null
      try {
        stored = window.localStorage.getItem(STORAGE_KEY)
      } catch {
        stored = null
      }
      if (!stored) setTheme(event.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(
    () => setTheme((current) => (current === 'light' ? 'dark' : 'light')),
    []
  )

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
export const THEME_STORAGE_KEY = STORAGE_KEY
