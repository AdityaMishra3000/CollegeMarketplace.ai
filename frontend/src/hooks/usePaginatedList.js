import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Paginated list fetching for the `{ items, pagination }` envelope the API now
 * returns.
 *
 * `fetchPage(page)` must resolve to `{ items, pagination }`. Changing `deps`
 * resets to page 1; `loadMore` appends the next page.
 *
 * A monotonic request id guards against out-of-order responses: with a debounced
 * search box, a slow request for "lap" could otherwise land after the fast one
 * for "laptop" and overwrite the results. The same guard discards the duplicate
 * request that StrictMode's double mount produces in development.
 *
 * There is deliberately no `isMounted` ref here. React 18 removed the
 * "setState on an unmounted component" warning such refs existed to silence, so
 * one would guard nothing — and under StrictMode (setup → cleanup → setup) a ref
 * that is only cleared in the cleanup stays false for the component's whole life,
 * which silently swallowed every response and left the list spinning forever.
 */
export function usePaginatedList(fetchPage, deps = []) {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage

  const requestId = useRef(0)

  const load = useCallback(async (page, { append }) => {
    const id = ++requestId.current
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError(null)

    try {
      const result = await fetchRef.current(page)
      // A newer request has already been issued; discard this response.
      if (id !== requestId.current) return

      const nextItems = Array.isArray(result?.items) ? result.items : []
      setItems((current) => (append ? [...current, ...nextItems] : nextItems))
      setPagination(result?.pagination ?? null)
    } catch (err) {
      if (id !== requestId.current) return
      setError(err?.response?.data?.message || err?.message || 'Request failed')
      if (!append) setItems([])
    } finally {
      if (id === requestId.current) {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(1, { append: false }) }, deps)

  const loadMore = useCallback(() => {
    if (!pagination?.hasMore || loadingMore) return
    load(pagination.page + 1, { append: true })
  }, [load, pagination, loadingMore])

  const refresh = useCallback(() => load(1, { append: false }), [load])

  return {
    items,
    pagination,
    loading,
    loadingMore,
    error,
    hasMore: Boolean(pagination?.hasMore),
    total: pagination?.total ?? items.length,
    loadMore,
    refresh,
    setItems,
  }
}
