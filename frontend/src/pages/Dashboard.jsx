import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Trash2, Package, Tag, DollarSign } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { getUserProducts, sellOne, deleteProduct } from '../api/products'
import { categoryLabel, conditionLabel } from '../lib/constants'
import Badge from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Spinner, ErrorState, EmptyState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { useCountUp } from '../hooks/useCountUp'
import { fadeUp, staggerContainer } from '../lib/motion'

function Metric({ icon: Icon, label, value, prefix = '', decimals = 0 }) {
  const display = useCountUp(value, { decimals })
  return (
    <div className="flex flex-1 items-center gap-3 px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums text-foreground">
          {prefix}
          {display}
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()

  const { data, loading, error, refetch } = useApi(() => getUserProducts())

  const products = data?.products || []
  const activeProducts = products.filter((p) => !p.isSold)
  const soldProducts = products.filter((p) => p.isSold)
  const totalEarnings = soldProducts.reduce((acc, p) => acc + (p.price || 0), 0)

  const handleMarkAsSold = async (id) => {
    try {
      await sellOne(id)
      toast('Item marked as sold!', { type: 'success' })
      refetch()
    } catch (err) {
      toast('Failed to update status', { type: 'error' })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return
    try {
      await deleteProduct(id)
      toast('Listing deleted', { type: 'info' })
      refetch()
    } catch (err) {
      toast('Failed to delete listing', { type: 'error' })
    }
  }

  return (
    <div className="space-y-8">
      {/* Current activity */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.name}</h1>
        <p className="text-sm text-muted-foreground">{user?.email} • {user?.course || 'Student'}</p>
      </div>

      {/* Compact metrics band — one working surface, not three separate cards */}
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card sm:flex-row sm:divide-x sm:divide-y-0">
        <Metric icon={Package} label="Active Listings" value={activeProducts.length} />
        <Metric icon={Tag} label="Items Sold" value={soldProducts.length} />
        <Metric icon={DollarSign} label="Total Sales Value" value={totalEarnings} prefix="$" decimals={2} />
      </div>

      {/* Listings — the primary working surface */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Your Listings</h2>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : error ? (
          <ErrorState title="Failed to load dashboard" description={error} onRetry={refetch} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No listings yet"
            description="You haven't posted any items for sale. Click 'Sell' in the navbar to create your first listing."
          />
        ) : (
          <motion.div
            variants={staggerContainer(0.04)}
            initial="hidden"
            animate="show"
            className="divide-y divide-border rounded-xl border border-border bg-card"
          >
            <AnimatePresence initial={false}>
              {products.map((item) => (
                <motion.div
                  key={item._id}
                  layout
                  variants={fadeUp}
                  exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="group flex flex-col gap-4 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img
                        src={item.images?.[0] || 'https://placehold.co/100x100?text=No+Image'}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        {item.isSold ? (
                          <Badge variant="secondary">Sold</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-primary tabular-nums">${item.price?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(item.category)} • {conditionLabel(item.condition)}
                      </p>
                    </div>
                  </div>

                  {/* Management actions — present at rest, emphasized on hover/focus */}
                  <div className="flex items-center gap-2 self-end opacity-80 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:self-center">
                    {!item.isSold && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsSold(item._id)}
                        title="Mark as Sold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Sold
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item._id)}
                      title="Delete Listing"
                      className="border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:border-destructive/25"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
