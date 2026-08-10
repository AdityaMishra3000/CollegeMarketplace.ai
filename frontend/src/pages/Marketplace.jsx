import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { getProducts } from '../api/products'
import { CATEGORIES, CONDITIONS } from '../lib/constants'
import { Input, Select } from '../components/ui/Input'
import { EmptyState, ErrorState, Spinner } from '../components/ui/States'
import ProductCard from '../components/marketplace/ProductCard'

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Discover items from students on campus.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 rounded-xl border border-border bg-card p-4">
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

      {/* Main Content Area */}
      <div className="min-h-[50vh]">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-8 w-8 text-primary" />
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
              <button 
                onClick={() => {
                  setFilters({ search: '', category: 'all', condition: 'all' })
                  setSearchParams(new URLSearchParams())
                }}
                className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                Clear all filters
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.products.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}