import { useState } from 'react'
import { Users, Package, ShieldAlert, Trash2, RefreshCw, IndianRupee } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { getAdminProducts, getStats, deleteProduct, backfillFraud } from '../api/products'
import { categoryLabel } from '../lib/constants'
import { Button } from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { PageHeader, Eyebrow, Stat, Price } from '../components/ui/Editorial'
import { Skeleton, ErrorState, EmptyState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import FraudBadge from '../components/ai/FraudBadge'

const PAGE_SIZE = 25

export default function Admin() {
  const { toast } = useToast()
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [backfilling, setBackfilling] = useState(false)

  const { data: stats, loading: statsLoading, refetch: refetchStats } = useApi(() => getStats())

  /*
   * Every verdict arrives with the list. This page used to fire one fraud request
   * per row — 419 of them on load, all cache hits on data the list already had.
   */
  const { items: products, loading, loadingMore, error, hasMore, total, loadMore, refresh } =
    usePaginatedList(
      (page) => getAdminProducts({ page, limit: PAGE_SIZE, flagged: flaggedOnly }),
      [flaggedOnly]
    )

  const unanalyzed = products.filter((p) => !p.aiFraud?.risk_level).length

  const remove = async (id, title) => {
    if (!window.confirm(`Permanently delete “${title}”? This cannot be undone.`)) return
    try {
      await deleteProduct(id)
      toast('Listing removed.', { type: 'success', title: 'Moderated' })
      refresh()
      refetchStats()
    } catch (err) {
      toast(err?.response?.data?.message || 'Could not delete the listing.', { type: 'error' })
    }
  }

  const runBackfill = async () => {
    setBackfilling(true)
    try {
      const result = await backfillFraud()
      toast(
        result.analyzed > 0
          ? `${result.analyzed} listing(s) analyzed in ${result.batches} batch(es) — ${result.flagged} flagged.`
          : 'Every listing already has a verdict.',
        { type: 'success', title: 'Fraud backfill' }
      )
      refresh()
      refetchStats()
    } catch (err) {
      toast(err?.response?.data?.message || 'Fraud analysis is unavailable.', { type: 'error' })
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Moderation"
        title="Admin console"
        description="Every listing on the platform, with its cached safety verdict."
        actions={
          <Button variant="outline" size="sm" onClick={runBackfill} loading={backfilling}>
            <RefreshCw />
            {backfilling ? 'Analyzing' : 'Run backfill'}
          </Button>
        }
      />

      <div className="grid divide-y divide-border rounded-2xl border border-border bg-card sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
        <Stat label="Students" value={statsLoading ? '—' : stats?.totalUsers ?? 0} icon={Users} />
        <Stat label="Listings" value={statsLoading ? '—' : stats?.totalProducts ?? 0} icon={Package}
          hint={stats ? `${stats.totalItems} live · ${stats.totalSales} sold` : undefined} />
        <Stat
          label="Live value"
          value={statsLoading ? '—' : <Price value={stats?.totalValue ?? 0} size="md" className="[&_span]:text-inherit" />}
          icon={IndianRupee}
          hint={stats?.avgPrice ? `≈ ₹${Math.round(stats.avgPrice).toLocaleString('en-IN')} average` : undefined}
        />
        <Stat
          label="Flagged"
          value={statsLoading ? '—' : stats?.flaggedProducts ?? 0}
          icon={ShieldAlert}
          hint="Auto-flagged by fraud analysis"
        />
      </div>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-title text-foreground">Listings</h2>
            <Eyebrow className="mt-2">
              {products.length} of {total}
              {unanalyzed > 0 && ` · ${unanalyzed} without a verdict`}
            </Eyebrow>
          </div>

          <label className="inline-flex cursor-pointer select-none items-center gap-2.5 rounded-lg border border-input bg-card px-3.5 py-2.5 text-[13px] font-medium transition-colors hover:border-border-strong">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[oklch(0.732_0.186_53)]"
              checked={flaggedOnly}
              onChange={(e) => setFlaggedOnly(e.target.checked)}
            />
            Flagged only
          </label>
        </div>

        {error ? (
          <ErrorState title="Could not load the moderation list" description={error} onRetry={refresh} />
        ) : loading ? (
          <div className="overflow-hidden rounded-2xl border border-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-none" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            eyebrow={flaggedOnly ? 'All clear' : 'Empty'}
            title={flaggedOnly ? 'Nothing is flagged' : 'No listings in the database'}
            description={
              flaggedOnly
                ? 'No listing currently carries a high-risk verdict. Uncheck the filter to see everything.'
                : undefined
            }
            action={
              flaggedOnly ? (
                <Button variant="outline" onClick={() => setFlaggedOnly(false)}>
                  Show all listings
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[54rem] border-collapse text-left text-sm">
                <caption className="sr-only">Listings with seller and safety verdict</caption>
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <Th className="w-[38%]">Item</Th>
                    <Th className="w-[22%]">Seller</Th>
                    <Th>Status</Th>
                    <Th>Safety</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((item) => (
                    <tr key={item._id} className="group transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3.5">
                        <div className="truncate font-medium text-foreground">{item.title}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <Price value={item.price} size="sm" />
                          <span className="h-2.5 w-px bg-border" aria-hidden="true" />
                          <span className="eyebrow text-muted-foreground">
                            {categoryLabel(item.category)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="truncate text-foreground">{item.seller?.name || 'Unknown'}</div>
                        <div className="truncate text-xs text-muted-foreground">{item.seller?.email}</div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <Badge variant={item.isSold ? 'secondary' : 'primary'} size="sm">
                          {item.isSold ? 'Sold' : 'Live'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <FraudBadge data={item.aiFraud} compact size="sm" showPending />
                      </td>
                      <td className="px-4 py-3.5 text-right align-top">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(item._id, item.title)}
                          aria-label={`Delete ${item.title}`}
                          title={`Delete ${item.title}`}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={loadMore} loading={loadingMore}>
                  {loadingMore ? 'Loading' : `Load ${Math.min(PAGE_SIZE, total - products.length)} more`}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function Th({ children, className }) {
  return (
    <th scope="col" className={`px-4 py-3 ${className || ''}`}>
      <span className="eyebrow text-muted-foreground">{children}</span>
    </th>
  )
}
