import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import { Button } from '../components/ui/Button'
import FraudBadge from '../components/ai/FraudBadge'
import { fadeUp, staggerContainer, pressSpring } from '../lib/motion'
import { usePointerTilt } from '../hooks/usePointerTilt'

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

  // Shared "product media language" — same tilt/scale treatment as ProductCard.
  const tiltRef = usePointerTilt({ max: 4, scale: 1.03 })

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
    <div className="space-y-12 pb-20 sm:pb-0">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </button>

      {/* PRODUCT — media is the hero */}
      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] lg:gap-12">
        {/* Media */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted md:sticky md:top-24"
        >
          <div
            ref={tiltRef}
            className="h-full w-full [transform-style:preserve-3d] transition-transform duration-300 ease-out"
          >
            <img
              src={
                product.images?.[0] ||
                'https://placehold.co/800x800/1a1a1a/e5e5e5?text=No+Image'
              }
              alt={product.title}
              className="h-full w-full object-cover"
            />
          </div>

          {product.isSold && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Badge variant="destructive" className="text-sm">
                Sold
              </Badge>
            </div>
          )}
        </motion.div>

        {/* Identity, price, trust, seller, action */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col space-y-6"
        >
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline">
                {categoryLabel(product.category)}
              </Badge>

              <Badge variant="secondary">
                {conditionLabel(product.condition)}
              </Badge>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
              {product.title}
            </h1>

            <p className="mt-2 text-3xl font-semibold text-primary tabular-nums">
              ₹{product.price?.toLocaleString()}
            </p>
          </div>

          {/* AI trust signal, when available */}
          <FraudBadge data={product.aiFraud} />

          <div className="prose prose-sm text-muted-foreground dark:prose-invert">
            <p className="leading-relaxed">{product.description}</p>
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

            <Button
              disabled={product.isSold}
              className="hidden w-full sm:flex"
              onClick={() => {
                window.location.href =
                  `mailto:${product.seller?.email}?subject=Interested in: ${product.title}`
              }}
            >
              <MessageCircle className="h-4 w-4" />
              {product.isSold ? 'Item Sold' : 'Contact Seller'}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Sticky primary action on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur-lg sm:hidden">
        <Button
          disabled={product.isSold}
          className="w-full"
          onClick={() => {
            window.location.href =
              `mailto:${product.seller?.email}?subject=Interested in: ${product.title}`
          }}
        >
          <MessageCircle className="h-4 w-4" />
          {product.isSold ? 'Item Sold' : 'Contact Seller'}
        </Button>
      </div>

      {/* AI RECOMMENDATIONS — a continuation of discovery */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
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
            <motion.div
              variants={staggerContainer(0.06)}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {recommendations.map((item) => (
                <motion.button
                  key={item._id}
                  type="button"
                  variants={fadeUp}
                  whileTap={{ scale: 0.98 }}
                  transition={pressSpring}
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

                      <span className="shrink-0 font-semibold text-primary tabular-nums">
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
                </motion.button>
              ))}
            </motion.div>
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
      </motion.section>
    </div>
  )
}
