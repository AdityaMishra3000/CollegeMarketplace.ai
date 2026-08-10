import { CheckCircle2, Trash2, Package, Tag, DollarSign } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { getUserProducts, sellOne, deleteProduct } from '../api/products'
import { categoryLabel, conditionLabel } from '../lib/constants'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { Spinner, ErrorState, EmptyState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'

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
      {/* User Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.name}</h1>
        <p className="text-sm text-muted-foreground">{user?.email} • {user?.course || 'Student'}</p>
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items Sold</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{soldProducts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Listings Management */}
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
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {products.map((item) => (
              <div key={item._id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={item.images?.[0] || 'https://placehold.co/100x100?text=No+Image'}
                    alt={item.title}
                    className="h-16 w-16 rounded-lg object-cover bg-muted shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      {item.isSold ? (
                        <Badge variant="secondary">Sold</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-primary">${item.price?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryLabel(item.category)} • {conditionLabel(item.condition)}
                    </p>
                  </div>
                </div>

                {/* Management Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!item.isSold && (
                    <button
                      onClick={() => handleMarkAsSold(item._id)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                      title="Mark as Sold"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark Sold
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                    title="Delete Listing"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}