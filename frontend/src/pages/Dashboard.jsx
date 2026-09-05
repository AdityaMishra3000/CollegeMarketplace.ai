import { CheckCircle2, Trash2, Package, Tag, IndianRupee, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useListings } from '../context/ListingsContext'
import { getUserProducts, sellOne, deleteProduct } from '../api/products'
import { categoryLabel, conditionLabel } from '../lib/constants'
import { formatPrice } from '../lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { Spinner, ErrorState, EmptyState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import FraudBadge from '../components/ai/FraudBadge'

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { version } = useListings()

  const { items: products, loading, loadingMore, error, hasMore, total, loadMore, refresh } =
    usePaginatedList((page) => getUserProducts({ page, limit: 24 }), [version])

  const activeProducts = products.filter((p) => !p.isSold)
  const soldProducts = products.filter((p) => p.isSold)
  const totalEarnings = soldProducts.reduce((acc, p) => acc + (p.price || 0), 0)

  const handleMarkAsSold = async (id) => {
    try {
      await sellOne(id)
      toast('Item marked as sold!', { type: 'success' })
      refresh()
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to update status', { type: 'error' })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return
    try {
      await deleteProduct(id)
      toast('Listing deleted', { type: 'info' })
      refresh()
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to delete listing', { type: 'error' })
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.name}</h1>
        <p className="text-sm text-muted-foreground">
          {user?.email} • {user?.course || 'Student'}
        </p>
      </div>

      {/* Counts describe the listings loaded so far; `total` is the full figure. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Active Listings" icon={Package} value={activeProducts.length} />
        <SummaryCard label="Items Sold" icon={Tag} value={soldProducts.length} />
        <SummaryCard
          label="Total Sales Value"
          icon={IndianRupee}
          value={formatPrice(totalEarnings)}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Your Listings</h2>
          {total > 0 && (
            <span className="text-sm text-muted-foreground">
              {products.length} of {total}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : error ? (
          <ErrorState title="Failed to load dashboard" description={error} onRetry={refresh} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No listings yet"
            description="You haven't posted any items for sale. Click 'Sell' in the navbar to create your first listing."
          />
        ) : (
          <>
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {products.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.images?.[0] || 'https://placehold.co/100x100?text=No+Image'}
                      alt={item.title}
                      className="h-16 w-16 shrink-0 rounded-lg bg-muted object-cover"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        {item.isSold ? (
                          <Badge variant="secondary">Sold</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                        <FraudBadge data={item.aiFraud} compact />
                      </div>
                      <p className="text-sm font-medium text-primary tabular-nums">
                        {formatPrice(item.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(item.category)} • {conditionLabel(item.condition)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!item.isSold && (
                      <button
                        onClick={() => handleMarkAsSold(item._id)}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                        title="Mark as Sold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Sold
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                      title="Delete Listing"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loadingMore ? 'Loading…' : `Load more (${total - products.length} left)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, icon: Icon, value }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}
