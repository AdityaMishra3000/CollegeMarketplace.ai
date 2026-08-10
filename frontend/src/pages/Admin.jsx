import { useEffect, useState } from 'react'
import { Users, Package, Trash2 } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import {
  getAdminDashboard,
  getStats,
  deleteProduct,
} from '../api/products'
import { checkFraudById } from '../api/ai'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../components/ui/Card'
import { Spinner, ErrorState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'

const FRAUD_CONFIG = {
  LOW: {
    emoji: '✅',
    label: 'Safe',
    className: 'bg-emerald-100 text-emerald-800',
  },
  MEDIUM: {
    emoji: '⚠️',
    label: 'Caution',
    className: 'bg-amber-100 text-amber-800',
  },
  HIGH: {
    emoji: '🚨',
    label: 'High Risk',
    className: 'bg-red-100 text-red-800',
  },
  VERY_HIGH: {
    emoji: '🛑',
    label: 'Danger',
    className: 'bg-red-200 text-red-900',
  },
}

export default function Admin() {
  const { toast } = useToast()

  const {
    data: stats,
    loading: statsLoading,
  } = useApi(() => getStats())

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error,
    refetch,
  } = useApi(() => getAdminDashboard())

  const [fraudResults, setFraudResults] = useState({})
  const [fraudLoading, setFraudLoading] = useState(false)

  const products = dashboardData?.products || []

  /*
   * Run the REAL ML fraud check for every listing.
   *
   * This replaces the old:
   * Math.floor(Math.random() * 100)
   */
  useEffect(() => {
    if (!products.length) {
      setFraudResults({})
      return
    }

    let cancelled = false

    const analyzeProducts = async () => {
      setFraudLoading(true)

      const results = {}

      await Promise.all(
        products.map(async (product) => {
          try {
            const response = await checkFraudById(product._id)

            // Axios response -> actual JSON is in response.data
            const result = response?.data || response

            results[product._id] = result
          } catch (err) {
            console.error(
              `Fraud analysis failed for product ${product._id}:`,
              err
            )
          }
        })
      )

      if (!cancelled) {
        setFraudResults(results)
        setFraudLoading(false)
      }
    }

    analyzeProducts()

    return () => {
      cancelled = true
    }
  }, [products])

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        'ADMIN ACTION: Are you sure you want to permanently delete this listing?'
      )
    ) {
      return
    }

    try {
      await deleteProduct(id)

      toast('Listing deleted by admin', {
        type: 'success',
      })

      refetch()
    } catch (err) {
      console.error(err)

      toast('Failed to delete listing', {
        type: 'error',
      })
    }
  }

  if (statsLoading || dashboardLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load admin dashboard"
        description={error?.message || 'Something went wrong.'}
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Admin Control Panel
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          System overview and moderation tools.
        </p>
      </div>

      {/* System Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>

            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Listings
            </CardTitle>

            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalProducts || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Value
            </CardTitle>

            <span className="font-bold text-muted-foreground">
              ₹
            </span>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats?.totalValue?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Moderation Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">
            Recent Listings & Moderation
          </h2>

          {fraudLoading && (
            <span className="text-xs text-muted-foreground">
              Running AI safety analysis...
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="p-4 font-medium">
                  Item
                </th>

                <th className="p-4 font-medium">
                  Seller
                </th>

                <th className="p-4 font-medium">
                  Status
                </th>

                <th className="p-4 font-medium">
                  AI Risk Score
                </th>

                <th className="p-4 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {products.map((item) => {
                const fraud = fraudResults[item._id]

                const config =
                  FRAUD_CONFIG[fraud?.risk_level] || null

                return (
                  <tr
                    key={item._id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="p-4">
                      <div className="font-medium text-foreground">
                        {item.title}
                      </div>

                      <div className="text-muted-foreground">
                        ₹{item.price?.toFixed(2)}
                      </div>
                    </td>

                    <td className="p-4 text-muted-foreground">
                      {item.seller?.name || 'Unknown'}
                      <br />

                      <span className="text-xs">
                        {item.seller?.email}
                      </span>
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
                      {!fraud ? (
                        <span className="text-xs text-muted-foreground">
                          Analyzing...
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              config?.className ||
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {config?.emoji || '❓'}{' '}
                            {config?.label ||
                              fraud.risk_level}{' '}
                            ({fraud.risk_score ?? 0}/100)
                          </span>

                          {fraud.is_flagged && (
                            <div className="text-xs font-medium text-red-600">
                              ⚠️ Flagged for review
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="inline-flex items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-destructive transition-colors hover:bg-destructive/20"
                        title="Force Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No products found in the database.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}