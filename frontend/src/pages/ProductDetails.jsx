import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  MessageCircle,
  Sparkles,
  Loader2,
} from 'lucide-react'

import { useApi } from '../hooks/useApi'
import {
  getProductById,
} from '../api/products'
import {
  getRecommendations,
} from '../api/ai'

import {
  categoryLabel,
  conditionLabel,
} from '../lib/constants'

import {
  ErrorState,
} from '../components/ui/States'

import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const {
    data: product,
    loading,
    error,
    refetch,
  } = useApi(() => getProductById(id), [id])

  const [recommendations, setRecommendations] = useState([])
  const [recommendationsLoading, setRecommendationsLoading] =
    useState(false)

  const [recommendationsError, setRecommendationsError] =
    useState(false)

  useEffect(() => {
    if (!id || loading || !product) return

    let cancelled = false

    const loadRecommendations = async () => {
      setRecommendationsLoading(true)
      setRecommendationsError(false)

      try {
        const result = await getRecommendations(id)

        if (cancelled) return

        setRecommendations(
          Array.isArray(result?.recommendations)
            ? result.recommendations
            : []
        )
      } catch (err) {
        console.error(
          'Failed to load AI recommendations:',
          err
        )

        if (!cancelled) {
          setRecommendations([])
          setRecommendationsError(true)
        }
      } finally {
        if (!cancelled) {
          setRecommendationsLoading(false)
        }
      }
    }

    loadRecommendations()

    return () => {
      cancelled = true
    }
  }, [id, loading, product])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <ErrorState
        title="Product Not Found"
        description={
          error ||
          'This item does not exist or was removed.'
        }
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="space-y-10">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </button>

      {/* PRODUCT */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Image Gallery */}
        <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
          <img
            src={
              product.images?.[0] ||
              'https://placehold.co/800x800/1a1a1a/e5e5e5?text=No+Image'
            }
            alt={product.title}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col space-y-6">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline">
                {categoryLabel(product.category)}
              </Badge>

              <Badge variant="secondary">
                {conditionLabel(product.condition)}
              </Badge>

              {product.isSold && (
                <Badge variant="destructive">
                  Sold
                </Badge>
              )}
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {product.title}
            </h1>

            <p className="mt-2 text-3xl font-semibold text-primary">
              ₹{product.price?.toLocaleString()}
            </p>
          </div>

          <div className="prose prose-sm text-muted-foreground dark:prose-invert">
            <p>{product.description}</p>
          </div>

          {/* Seller Card */}
          <div className="mt-auto rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-3">
              <Avatar
                name={product.seller?.name}
                size="md"
              />

              <div>
                <p className="font-medium text-foreground">
                  {product.seller?.name}
                </p>

                <p className="text-sm text-muted-foreground">
                  {product.seller?.course || 'Student'}
                </p>
              </div>
            </div>

            <button
              disabled={product.isSold}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              onClick={() => {
                window.location.href =
                  `mailto:${product.seller?.email}?subject=Interested in: ${product.title}`
              }}
            >
              <MessageCircle className="h-4 w-4" />

              {product.isSold
                ? 'Item Sold'
                : 'Contact Seller'}
            </button>
          </div>
        </div>
      </div>

      {/* AI RECOMMENDATIONS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />

          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              You May Also Like
            </h2>

            <p className="text-sm text-muted-foreground">
              AI-powered recommendations based on this listing.
            </p>
          </div>
        </div>

        {recommendationsLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding similar listings...
          </div>
        )}

        {!recommendationsLoading &&
          !recommendationsError &&
          recommendations.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() =>
                    navigate(`/product/${item._id}`)
                  }
                  className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={
                        item.images?.[0] ||
                        item.imageUrl ||
                        'https://placehold.co/600x450/1a1a1a/e5e5e5?text=No+Image'
                      }
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-1 font-semibold text-foreground">
                        {item.title}
                      </h3>

                      <span className="shrink-0 font-semibold text-primary">
                        ₹{item.price?.toLocaleString()}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {categoryLabel(item.category)}
                      </Badge>

                      <Badge variant="secondary">
                        {conditionLabel(item.condition)}
                      </Badge>
                    </div>

                    {item.recommendation_score !==
                      undefined && (
                      <p className="text-xs text-muted-foreground">
                        AI similarity:{' '}
                        {Math.round(
                          item.recommendation_score * 100
                        )}
                        %
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

        {!recommendationsLoading &&
          !recommendationsError &&
          recommendations.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No similar listings found yet.
              </p>
            </div>
          )}

        {recommendationsError && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Recommendations are temporarily unavailable.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}