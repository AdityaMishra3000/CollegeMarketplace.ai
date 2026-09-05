import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * A counter that list pages include in their fetch dependencies.
 *
 * Creating a listing used to call `window.location.reload()` — a full page
 * reload in a single-page app, which threw away the success toast and re-fetched
 * everything. Bumping this instead re-runs just the affected queries.
 */
const ListingsContext = createContext({ version: 0, refreshListings: () => {} })

export function ListingsProvider({ children }) {
  const [version, setVersion] = useState(0)
  const refreshListings = useCallback(() => setVersion((v) => v + 1), [])
  const value = useMemo(() => ({ version, refreshListings }), [version, refreshListings])

  return <ListingsContext.Provider value={value}>{children}</ListingsContext.Provider>
}

export const useListings = () => useContext(ListingsContext)
