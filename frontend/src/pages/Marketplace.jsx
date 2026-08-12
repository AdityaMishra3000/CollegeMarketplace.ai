import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Filter, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { getProducts } from '../api/products'
import { CATEGORIES, CONDITIONS, categoryLabel, conditionLabel } from '../lib/constants'
import { Input, Select } from '../components/ui/Input'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import ProductCard from '../components/marketplace/ProductCard'
import { staggerContainer } from '../lib/motion'

function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <div className="mt-1 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border p-4">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Initialize state from URL params to support the CommandPalette search
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'all',
    condition: searchParams.get('condition') || 'all',
  })

  // Sync internal state if URL changes externally (e.g., Command Palette usage)
  useEffect(() => {
    const query = searchParams.get('search') || ''
    setFilters(prev => ({ ...prev, search: query }))
  }, [searchParams])

  // Fetch products whenever filters change. 
  // getProducts automatically ignores 'all' or empty strings
  const { data, loading, error, refetch } = useApi(
    () => getProducts(filters),
    [filters.search, filters.category, filters.condition]
  )

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // Update URL params for shareability
    const params = new URLSearchParams()
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.category !== 'all') params.set('category', newFilters.category)
    if (newFilters.condition !== 'all') params.set('condition', newFilters.condition)
    setSearchParams(params)
  }

  const clearAll = () => {
    setFilters({ search: '', category: 'all', condition: 'all' })
    setSearchParams(new URLSearchParams())
  }

  const activeChips = [
    filters.search && {
      key: 'search',
      label: `"${filters.search}"`,
      onRemove: () => handleFilterChange('search', ''),
    },
    filters.category !== 'all' && {
      key: 'category',
      label: categoryLabel(filters.category),
      onRemove: () => handleFilterChange('category', 'all'),
    },
    filters.condition !== 'all' && {
      key: 'condition',
      label: conditionLabel(filters.condition),
      onRemove: () => handleFilterChange('condition', 'all'),
    },
  ].filter(Boolean)

  const resultCount = data?.products?.length ?? null

  return (
    <div className="space-y-8">
      {/* DISCOVER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Marketplace</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Discover items from students on campus.
          </p>
        </div>
        {!loading && !error && resultCount !== null && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {resultCount} {resultCount === 1 ? 'item' : 'items'} found
          </p>
        )}
      </div>

      {/* SEARCH + REFINE — one interaction system */}
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 rounded-xl border border-border bg-card p-4">
          <div className="md:col-span-2">
            <Input
              icon={Search}
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div>
            <Select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Select
              value={filters.condition}
              onChange={(e) => handleFilterChange('condition', e.target.value)}
            >
              <option value="all">All Conditions</option>
              {CONDITIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Active filters — the same removable-chip language used everywhere */}
        <AnimatePresence initial={false}>
          {activeChips.length > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap items-center gap-2 overflow-hidden"
            >
              {activeChips.map((chip) => (
                <motion.button
                  key={chip.key}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={chip.onRemove}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:border-border-strong"
                >
                  {chip.label}
                  <X className="h-3 w-3" />
                </motion.button>
              ))}
              <button
                onClick={clearAll}
                className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RESULTS */}
      <div className="min-h-[50vh]">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Failed to load products"
            description={error}
            onRetry={refetch}
          />
        ) : !data?.products?.length ? (
          <EmptyState
            icon={Filter}
            title="No products found"
            description="Try adjusting your filters or search query to find what you're looking for."
            action={
              <Button variant="secondary" size="sm" onClick={clearAll}>
                Clear all filters
              </Button>
            }
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`${filters.search}-${filters.category}-${filters.condition}`}
              variants={staggerContainer(0.05)}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {data.products.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
