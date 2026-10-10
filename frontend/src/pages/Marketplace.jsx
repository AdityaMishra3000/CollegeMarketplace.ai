import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useListings } from '../context/ListingsContext'
import { getProducts } from '../api/products'
import { CATEGORIES, CONDITIONS, categoryLabel, conditionLabel } from '../lib/constants'
import { useMotion } from '../lib/motion'
import { Input, Select, Field } from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { PageHeader, Eyebrow } from '../components/ui/Editorial'
import { CardGridSkeleton, EmptyState, ErrorState } from '../components/ui/States'
import ProductCard from '../components/marketplace/ProductCard'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most viewed' },
]

const DEFAULTS = { search: '', category: 'all', condition: 'all', sort: 'newest' }

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { version } = useListings()
  const m = useMotion()

  const [sheetOpen, setSheetOpen] = useState(false)

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

  const writeParams = (next) => {
    const params = new URLSearchParams()
    for (const key of ['search', 'category', 'condition', 'sort']) {
      if (next[key] && next[key] !== DEFAULTS[key]) params.set(key, next[key])
    }
    setSearchParams(params, { replace: true })
  }

  const setFilter = (key, value) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    writeParams(next)
  }

  const clearFilters = () => {
    setFilters(DEFAULTS)
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const activeCount = ['search', 'category', 'condition', 'sort'].filter(
    (key) => filters[key] !== DEFAULTS[key]
  ).length

  /* Active filters shown as removable chips, so what is narrowing the results is
     always visible rather than buried inside three select boxes. */
  const chips = [
    filters.search && { key: 'search', label: `“${filters.search}”` },
    filters.category !== 'all' && { key: 'category', label: categoryLabel(filters.category) },
    filters.condition !== 'all' && { key: 'condition', label: conditionLabel(filters.condition) },
    filters.sort !== 'newest' && {
      key: 'sort',
      label: SORT_OPTIONS.find((s) => s.value === filters.sort)?.label,
    },
  ].filter(Boolean)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Everything on campus"
        title="The marketplace"
        description="Listings from students at your college. Contact details unlock once you are signed in."
      />

      {/* Filter bar. Sticks under the navbar so filtering never needs a scroll up.
          On phones the three selects collapse into a sheet — stacked full-width
          they ate a third of the viewport before a single listing appeared. */}
      <div className="sticky top-16 z-dropdown -mx-5 border-y border-border bg-background/90 px-5 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 lg:max-w-sm">
            <Input
              icon={Search}
              type="search"
              placeholder="Search listings…"
              aria-label="Search listings"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            className="shrink-0 lg:hidden"
            onClick={() => setSheetOpen(true)}
            aria-label="Open filters"
          >
            <SlidersHorizontal />
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold tabular-nums text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>

          <div className="ml-auto hidden gap-3 lg:grid lg:grid-cols-3">
            <FilterSelects filters={filters} setFilter={setFilter} />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {chips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={m.transitions.fast}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-2 pt-3">
                <Eyebrow className="mr-1 hidden sm:inline">Filtering</Eyebrow>
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setFilter(chip.key, DEFAULTS[chip.key])}
                    aria-label={`Remove filter ${chip.label}`}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-subtle px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary-ink transition-colors hover:border-primary/60"
                  >
                    {chip.label}
                    <X className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                  </button>
                ))}
                <button
                  onClick={clearFilters}
                  className="ml-1 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile filter sheet. Modal already renders as a bottom sheet on phones. */}
      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        size="sm"
        eyebrow="Narrow it down"
        title="Filters"
        footer={
          <>
            <Button variant="ghost" onClick={clearFilters} disabled={activeCount === 0}>
              Clear all
            </Button>
            <Button onClick={() => setSheetOpen(false)}>
              Show {total} {total === 1 ? 'listing' : 'listings'}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <FilterSelects filters={filters} setFilter={setFilter} withLabels />
        </div>
      </Modal>

      <div className="min-h-[60vh]">
        {loading ? (
          <CardGridSkeleton count={8} />
        ) : error ? (
          <ErrorState title="Could not load listings" description={error} onRetry={refresh} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            eyebrow="No matches"
            title="Nothing fits those filters"
            description="Try a broader search, a different category, or clear the filters and start again."
            action={
              chips.length > 0 ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear all filters
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <Eyebrow>
                Showing {items.length} of {total}
              </Eyebrow>
            </div>

            {/* `layout` lets the grid reflow when filters change instead of snapping. */}
            <motion.div
              layout={!m.reduced}
              transition={m.transitions.layout}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {items.map((product, i) => (
                  <motion.div
                    key={product._id}
                    layout={!m.reduced}
                    initial={{ opacity: 0, y: m.reduced ? 0 : 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: m.reduced ? 1 : 0.97 }}
                    transition={{
                      ...m.transitions.normal,
                      delay: m.reduced ? 0 : Math.min(i, 11) * 0.025,
                    }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {hasMore && (
              <div className="mt-10 flex flex-col items-center gap-3">
                <Button variant="outline" size="lg" onClick={loadMore} loading={loadingMore}>
                  {loadingMore ? 'Loading' : `Load ${Math.min(24, total - items.length)} more`}
                </Button>
                <Eyebrow>{total - items.length} listings left</Eyebrow>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * The three taxonomy/sort selects. Rendered inline in the desktop toolbar and
 * inside the mobile sheet, so there is one definition rather than two.
 */
function FilterSelects({ filters, setFilter, withLabels = false }) {
  const wrap = (label, htmlFor, control) =>
    withLabels ? (
      <Field label={label} htmlFor={htmlFor}>
        {control}
      </Field>
    ) : (
      control
    )

  return (
    <>
      {wrap(
        'Category',
        'filter-category',
        <Select
          id="filter-category"
          aria-label="Filter by category"
          value={filters.category}
          onChange={(e) => setFilter('category', e.target.value)}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      )}
      {wrap(
        'Condition',
        'filter-condition',
        <Select
          id="filter-condition"
          aria-label="Filter by condition"
          value={filters.condition}
          onChange={(e) => setFilter('condition', e.target.value)}
        >
          <option value="all">Any condition</option>
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      )}
      {wrap(
        'Sort by',
        'filter-sort',
        <Select
          id="filter-sort"
          aria-label="Sort results"
          value={filters.sort}
          onChange={(e) => setFilter('sort', e.target.value)}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      )}
    </>
  )
}
