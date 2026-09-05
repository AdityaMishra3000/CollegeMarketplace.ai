import { useState } from 'react'
import { Users, Package, ShieldAlert, Trash2, Loader2, RefreshCw } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { usePaginatedList } from '../hooks/usePaginatedList'
import {
  getAdminProducts,
  getStats,
  deleteProduct,
  backfillFraud,
} from '../api/products'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Spinner, ErrorState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import FraudBadge from '../components/ai/FraudBadge'
import { formatPrice } from '../lib/utils'

const PAGE_SIZE = 25

export default function Admin() {
  const { toast } = useToast()
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [backfilling, setBackfilling] = useState(false)

  const { data: stats, loading: statsLoading, refetch: refetchStats } = useApi(() => getStats())

  /*
   * The fraud verdict arrives with each product.
   *
   * This page used to run one checkFraudById request per row inside a
   * useEffect — 419 concurrent requests on load, every one of them a cache hit
   * on data that /api/admin/products had already returned. The effect also
   * depended on a `products` array that was rebuilt on every render, so while
   * the list was empty it re-fired itself in a loop.
   *
   * Both problems disappear by reading `product.aiFraud` directly.
   */
  const {
    items: products,
    loading,
    loadingMore,
    error,
    hasMore,
    total,
    loadMore,
    refresh,
  } = usePaginatedList(
    (page) => getAdminProducts({ page, limit: PAGE_SIZE, flagged: flaggedOnly }),
    [flaggedOnly]
  )

  const unanalyzed = products.filter((p) => !p.aiFraud?.risk_level).length

  const handleDelete = async (id, title) => {
    if (!window.confirm(`ADMIN ACTION: permanently delete "${title}"?`)) return
    try {
      await deleteProduct(id)
      toast('Listing deleted by admin', { type: 'success' })
      refresh()
      refetchStats()
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to delete listing', { type: 'error' })
    }
  }

  /** One batched request for every listing missing a verdict. */
  const handleBackfill = async () => {
    setBackfilling(true)
    try {
      const result = await backfillFraud()
      toast(
        result.analyzed > 0
          ? `Analyzed ${result.analyzed} listing(s) in ${result.batches} batch(es), ${result.flagged} flagged`
          : 'Every listing already has a fraud verdict',
        { type: 'success' }
      )
      refresh()
    } catch (err) {
      toast(err?.response?.data?.message || 'Fraud analysis is unavailable', { type: 'error' })
    } finally {
      setBackfilling(false)
    }
  }

  if (statsLoading && loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return <ErrorState title="Unable to load admin dashboard" description={error} onRetry={refresh} />
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Control Panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">System overview and moderation tools.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" icon={Users} value={stats?.totalUsers ?? 0} />
        <StatCard label="Total Listings" icon={Package} value={stats?.totalProducts ?? 0} />
        <StatCard
          label="Active Value"
          value={formatPrice(stats?.totalValue ?? 0)}
          hint={`${stats?.totalItems ?? 0} active · ${stats?.totalSales ?? 0} sold`}
        />
        <StatCard
          label="Flagged"
          icon={ShieldAlert}
          value={stats?.flaggedProducts ?? 0}
          hint="Auto-flagged by fraud analysis"
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Listings &amp; Moderation</h2>
            <p className="text-sm text-muted-foreground">
              Showing {products.length} of {total}
              {unanalyzed > 0 && ` · ${unanalyzed} on this page not analyzed yet`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium">
              <input
                type="checkbox"
                className="accent-primary"
                checked={flaggedOnly}
                onChange={(e) => setFlaggedOnly(e.target.checked)}
              />
              Flagged only
            </label>

            <button
              onClick={handleBackfill}
              disabled={backfilling}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-60"
              title="Analyze every listing that has no fraud verdict yet"
            >
              {backfilling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {backfilling ? 'Analyzing…' : 'Run fraud backfill'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th scope="col" className="p-4 font-medium">Item</th>
                <th scope="col" className="p-4 font-medium">Seller</th>
                <th scope="col" className="p-4 font-medium">Status</th>
                <th scope="col" className="p-4 font-medium">AI Risk</th>
                <th scope="col" className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {products.map((item) => (
                <tr key={item._id} className="transition-colors hover:bg-muted/50">
                  <td className="p-4">
                    <div className="font-medium text-foreground">{item.title}</div>
                    <div className="tabular-nums text-muted-foreground">
                      {formatPrice(item.price)}
                    </div>
                  </td>

                  <td className="p-4 text-muted-foreground">
                    {item.seller?.name || 'Unknown'}
                    <br />
                    <span className="text-xs">{item.seller?.email}</span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.isSold
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {item.isSold ? 'Sold' : 'Active'}
                    </span>
                  </td>

                  <td className="p-4">
                    <FraudBadge data={item.aiFraud} compact showPending />
                  </td>

                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(item._id, item.title)}
                      className="inline-flex items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-destructive transition-colors hover:bg-destructive/20"
                      title={`Delete ${item.title}`}
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && !loading && (
            <div className="p-8 text-center text-muted-foreground">
              {flaggedOnly ? 'No flagged listings.' : 'No products found in the database.'}
            </div>
          )}
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
      </div>
    </div>
  )
}

function StatCard({ label, icon: Icon, value, hint }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
