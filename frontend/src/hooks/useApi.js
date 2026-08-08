import { useCallback, useEffect, useRef, useState } from 'react'

// Lightweight data-fetching hook. `fetcher` is called on mount and whenever a
// value in `deps` changes. Returns data/loading/error plus a manual refetch.
export function useApi(fetcher, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      setData(result)
      return result
    } catch (err) {
      setError(typeof err === 'string' ? err : err?.message || 'Request failed')
      throw err
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (immediate) run().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refetch: run, setData }
}
