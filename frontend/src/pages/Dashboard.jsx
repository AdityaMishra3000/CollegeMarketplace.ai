import { CheckCircle2, Trash2, Package, Tag, IndianRupee } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useListings } from '../context/ListingsContext'
import { getUserProducts, sellOne, deleteProduct } from '../api/products'
import { categoryLabel, conditionLabel, categoryIcon } from '../lib/constants'
import { Button } from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import ImageFrame from '../components/ui/ImageFrame'
import { PageHeader, Eyebrow, Stat, Price } from '../components/ui/Editorial'
import { Skeleton, ErrorState, EmptyState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import FraudBadge from '../components/ai/FraudBadge'
import { RevealGroup, RevealItem } from '../components/ui/Reveal'

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { version } = useListings()

  const { items: products, loading, loadingMore, error, hasMore, total, loadMore, refresh } =
    usePaginatedList((page) => getUserProducts({ page, limit: 24 }), [version])

  const active = products.filter((p) => !p.isSold)
  const sold = products.filter((p) => p.isSold)
  const earned = sold.reduce((acc, p) => acc + (p.price || 0), 0)

  const markSold = async (id) => {
    try {
      await sellOne(id)
      toast('Marked as sold.', { type: 'success', title: 'Listing updated' })
      refresh()
    } catch (err) {
      toast(err?.response?.data?.message || 'Could not update the listing.', { type: 'error' })
    }
  }

  const remove = async (id, title) => {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return
    try {
      await deleteProduct(id)
      toast('Listing deleted.', { type: 'info' })
      refresh()
    } catch (err) {
      toast(err?.response?.data?.message || 'Could not delete the listing.', { type: 'error' })
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={user?.course || 'Student'}
        title={user?.name ? `Hello, ${user.name.split(' ')[0]}` : 'Your dashboard'}
        description={user?.email}
      />

      {/* A divided band rather than four floating cards. */}
      <div className="grid divide-y divide-border rounded-2xl border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat label="Live listings" value={active.length} icon={Package} />
        <Stat label="Sold" value={sold.length} icon={Tag} />
        <Stat
          label="Earned from sales"
          value={<Price value={earned} size="md" className="[&_span]:text-inherit" />}
          icon={IndianRupee}
          hint={sold.length > 0 ? `Across ${sold.length} sold listing${sold.length > 1 ? 's' : ''}` : 'Nothing sold yet'}
        />
      </div>

      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-title text-foreground">Your listings</h2>
          {total > 0 && (
            <Eyebrow>
              {products.length} of {total}
            </Eyebrow>
          )}
        </div>

        {loading ? (
          <div className="space-y-px overflow-hidden rounded-2xl border border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] w-full rounded-none" />
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Could not load your listings" description={error} onRetry={refresh} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            eyebrow="Empty shelf"
            title="You have not listed anything yet"
            description="Use the Sell button in the header to put your first item up. It takes about a minute."
          />
        ) : (
          <>
            <RevealGroup
              staggerChildren={0.035}
              className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
            >
              {products.map((item) => (
                <RevealItem key={item._id}>
                  <ListingRow
                    item={item}
                    onMarkSold={() => markSold(item._id)}
                    onDelete={() => remove(item._id, item.title)}
                  />
                </RevealItem>
              ))}
            </RevealGroup>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={loadMore} loading={loadingMore}>
                  {loadingMore ? 'Loading' : `Load ${total - products.length} more`}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function ListingRow({ item, onMarkSold, onDelete }) {
  const CategoryIcon = categoryIcon(item.category)

  return (
    <div className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-5">
      <ImageFrame
        src={item.images?.[0] || item.imageUrl}
        alt={item.title}
        ratio="square"
        className="w-16 shrink-0 rounded-lg"
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <CategoryIcon className="h-5 w-5 text-muted-foreground/60" strokeWidth={1.5} aria-hidden="true" />
          </div>
        }
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold tracking-tight text-foreground">{item.title}</h3>
          {item.isSold ? (
            <Badge variant="secondary" size="sm">Sold</Badge>
          ) : (
            <Badge variant="primary" size="sm">Live</Badge>
          )}
          {item.aiFraud?.risk_level && item.aiFraud.risk_level !== 'LOW' && (
            <FraudBadge data={item.aiFraud} compact size="sm" />
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Price value={item.price} size="sm" />
          <span className="h-2.5 w-px bg-border" aria-hidden="true" />
          <span className="eyebrow text-muted-foreground">{categoryLabel(item.category)}</span>
          <span className="h-2.5 w-px bg-border" aria-hidden="true" />
          <span className="eyebrow text-muted-foreground">{conditionLabel(item.condition)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        {!item.isSold && (
          <Button variant="outline" size="sm" onClick={onMarkSold}>
            <CheckCircle2 />
            Mark sold
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          aria-label={`Delete ${item.title}`}
          title={`Delete ${item.title}`}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}
