import { useEffect, useState } from 'react'

/**
 * Delay a rapidly-changing value.
 *
 * The marketplace search box fired a request per keystroke, and each request was
 * an unindexed substring scan over the whole catalogue. Typing "laptop" cost six
 * of them.
 */
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
