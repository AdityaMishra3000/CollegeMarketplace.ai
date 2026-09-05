import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter, Loader2 } from 'lucide-react'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useListings } from '../context/ListingsContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getProducts } from '../api/products'
import { CATEGORIES, CONDITIONS } from '../lib/constants'
import { Input, Select } from '../components/ui/Input'
import { EmptyState, ErrorState, Spinner } from '../components/ui/States'
import ProductCard from '../components/marketplace/ProductCard'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most viewed' },
]

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { version } = useListings()

  const [filters, setFilters] = useState(() => ({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'all',
    condition: searchParams.get('condition') || 'all',
    sort: searchParams.get('sort') || 'newest',
  }))

  // Sync when the URL changes externally (the command palette writes ?search=).
  useEffect(() => {
    const query = searchParams.get('search') || ''
    setFilters((prev) => (prev.search === query ? prev : { ...prev, search: query }))
  }, [searchParams])

  // One request per pause in typing rather than one per keystroke.
  const debouncedSearch = useDebouncedValue(filters.search, 350)

  const query = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters.category, filters.condition, filters.sort, debouncedSearch] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const { items, loading, loadingMore, error, hasMore, total, loadMore, refresh } =
    usePaginatedList((page) => getProducts({ ...query, page }), [
      query.search,
      query.category,
      query.condition,
      query.sort,
      version,
    ])

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value }
    setFilters(next)

    const params = new URLSearchParams()
    if (next.search) params.set('search', next.search)
    if (next.category !== 'all') params.set('category', next.category)
    if (next.condition !== 'all') params.set('condition', next.condition)
    if (next.sort !== 'newest') params.set('sort', next.sort)
    setSearchParams(params, { replace: true })
  }

  const clearFilters = () => {
    setFilters({ search: '', category: 'all', condition: 'all', sort: 'newest' })
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            Discover items from students on campus.
            {!loading && total > 0 && (
              <span> Showing {items.length} of {total}.</span>
            )}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 md:grid-cols-5">
        <div className="md:col-span-2">
          <Input
            icon={Search}
            placeholder="Search products..."
            aria-label="Search products"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <Select
          aria-label="Filter by category"
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
        <Select
          aria-label="Filter by condition"
          value={filters.condition}
          onChange={(e) => handleFilterChange('condition', e.target.value)}
        >
          <option value="all">All Conditions</option>
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
        <Select
          aria-label="Sort results"
          value={filters.sort}
          onChange={(e) => handleFilterChange('sort', e.target.value)}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>

      <div className="min-h-[50vh]">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : error ? (
          <ErrorState title="Failed to load products" description={error} onRetry={refresh} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No products found"
            description="Try adjusting your filters or search query to find what you're looking for."
            action={
              <button
                onClick={clearFilters}
                className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
              >
                Clear all filters
              </button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loadingMore ? 'Loading…' : `Load more (${total - items.length} left)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
