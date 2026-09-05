import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Sparkles, Loader2, LogIn } from 'lucide-react'

import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { getProductById } from '../api/products'
import { getRecommendations } from '../api/ai'
import { categoryLabel, conditionLabel } from '../lib/constants'
import { formatPrice } from '../lib/utils'
import { ErrorState } from '../components/ui/States'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import FraudBadge from '../components/ai/FraudBadge'

const PLACEHOLDER = 'https://placehold.co/800x800/1a1a1a/e5e5e5?text=No+Image'

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: product, loading, error, refetch } = useApi(() => getProductById(id), [id])

  const [recommendations, setRecommendations] = useState([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendationsUnavailable, setRecommendationsUnavailable] = useState(false)

  useEffect(() => {
    if (!id || loading || !product) return

    let cancelled = false

    const load = async () => {
      setRecommendationsLoading(true)
      setRecommendationsUnavailable(false)
      try {
        const result = await getRecommendations(id)
        if (cancelled) return
        setRecommendations(Array.isArray(result?.recommendations) ? result.recommendations : [])
        // The backend degrades rather than failing when the ML service is down.
        setRecommendationsUnavailable(Boolean(result?.unavailable))
      } catch {
        if (cancelled) return
        setRecommendations([])
        setRecommendationsUnavailable(true)
      } finally {
        if (!cancelled) setRecommendationsLoading(false)
      }
    }

    load()
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
        description={error || 'This item does not exist or was removed.'}
        onRetry={refetch}
      />
    )
  }

  // Contact details are only present in the response for signed-in callers.
  const sellerEmail = product.seller?.email
  const sellerPhone = product.seller?.phone || product.sellerPhone
  const mailto = sellerEmail
    ? `mailto:${encodeURIComponent(sellerEmail)}?subject=${encodeURIComponent(
        `Interested in: ${product.title}`
      )}`
    : null

  return (
    <div className="space-y-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
          <img
            src={product.images?.[0] || product.imageUrl || PLACEHOLDER}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col space-y-6">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline">{categoryLabel(product.category)}</Badge>
              <Badge variant="secondary">{conditionLabel(product.condition)}</Badge>
              {product.isSold && <Badge variant="destructive">Sold</Badge>}
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">{product.title}</h1>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-primary">
              {formatPrice(product.price)}
            </p>
          </div>

          <div className="prose prose-sm text-muted-foreground">
            <p>{product.description}</p>
          </div>

          {/*
            The safety verdict arrives with the product — no second request, and
            no fraud check issued from the browser.
          */}
          <FraudBadge data={product.aiFraud} />

          <SellerCard
            product={product}
            user={user}
            mailto={mailto}
            sellerPhone={sellerPhone}
          />
        </div>
      </div>

      <Recommendations
        items={recommendations}
        loading={recommendationsLoading}
        unavailable={recommendationsUnavailable}
        onOpen={(productId) => navigate(`/product/${productId}`)}
      />
    </div>
  )
}

/**
 * Seller panel.
 *
 * Contact details are no longer part of the public API response, so anonymous
 * visitors are prompted to sign in instead of being shown an empty mailto link.
 */
function SellerCard({ product, user, mailto, sellerPhone }) {
  return (
    <div className="mt-auto rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={product.seller?.name} size="md" />
        <div>
          <p className="font-medium text-foreground">{product.seller?.name}</p>
          <p className="text-sm text-muted-foreground">{product.seller?.course || 'Student'}</p>
        </div>
      </div>

      {!user ? (
        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <LogIn className="h-4 w-4" />
          Sign in to contact the seller
        </Link>
      ) : product.isSold ? (
        <button
          disabled
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50"
        >
          Item Sold
        </button>
      ) : (
        <div className="space-y-2">
          {mailto && (
            <a
              href={mailto}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Mail className="h-4 w-4" />
              Email the seller
            </a>
          )}
          {sellerPhone && (
            <a
              href={`tel:${sellerPhone}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium tabular-nums transition-colors hover:bg-muted"
            >
              <Phone className="h-4 w-4" />
              {sellerPhone}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function Recommendations({ items, loading, unavailable, onOpen }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">You May Also Like</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered recommendations based on this listing.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Finding similar listings...
        </div>
      )}

      {!loading && unavailable && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Recommendations are temporarily unavailable.
          </p>
        </div>
      )}

      {!loading && !unavailable && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No similar listings found yet.</p>
        </div>
      )}

      {!loading && !unavailable && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => onOpen(item._id)}
              className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={item.images?.[0] || item.imageUrl || PLACEHOLDER}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-1 font-semibold text-foreground">{item.title}</h3>
                  <span className="shrink-0 font-semibold tabular-nums text-primary">
                    {formatPrice(item.price)}
                  </span>
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{categoryLabel(item.category)}</Badge>
                  <Badge variant="secondary">{conditionLabel(item.condition)}</Badge>
                </div>

                {item.recommendation_score !== undefined && (
                  <p className="text-xs tabular-nums text-muted-foreground">
                    AI similarity: {Math.round(item.recommendation_score * 100)}%
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
