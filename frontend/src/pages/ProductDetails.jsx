import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, Phone, Sparkles, LogIn, Eye, Bookmark, Share2 } from 'lucide-react'

import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { useSaved } from '../context/SavedContext'
import { useToast } from '../components/ui/Toast'
import { getProductById } from '../api/products'
import { getRecommendations } from '../api/ai'
import { categoryLabel, conditionLabel, categoryIcon } from '../lib/constants'
import { useMotion } from '../lib/motion'
import { hapticTap } from '../lib/native'
import { cn } from '../lib/utils'
import { ErrorState, Skeleton } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import ImageFrame from '../components/ui/ImageFrame'
import FraudBadge from '../components/ai/FraudBadge'
import VerificationBadge from '../components/marketplace/VerificationBadge'
import { Display, Eyebrow, Price, Rule } from '../components/ui/Editorial'
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal'
import ProductCard from '../components/marketplace/ProductCard'

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isSaved, toggleSave } = useSaved()
  const { toast } = useToast()
  const m = useMotion()

  const { data: product, loading, error, refetch } = useApi(() => getProductById(id), [id])

  const [recommendations, setRecommendations] = useState([])
  const [recsLoading, setRecsLoading] = useState(false)
  const [recsUnavailable, setRecsUnavailable] = useState(false)

  useEffect(() => {
    if (!id || loading || !product) return
    let cancelled = false

    const load = async () => {
      setRecsLoading(true)
      setRecsUnavailable(false)
      try {
        const result = await getRecommendations(id)
        if (cancelled) return
        setRecommendations(Array.isArray(result?.recommendations) ? result.recommendations : [])
        setRecsUnavailable(Boolean(result?.unavailable))
      } catch {
        if (cancelled) return
        setRecommendations([])
        setRecsUnavailable(true)
      } finally {
        if (!cancelled) setRecsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, loading, product])

  if (loading) return <DetailSkeleton />

  if (error || !product) {
    return (
      <ErrorState
        title="Listing not found"
        description={error || 'This item does not exist or was removed.'}
        onRetry={refetch}
      />
    )
  }

  const CategoryIcon = categoryIcon(product.category)
  const image = product.images?.[0] || product.imageUrl
  const sellerEmail = product.seller?.email
  const sellerPhone = product.seller?.phone || product.sellerPhone
  const mailto = sellerEmail
    ? `mailto:${encodeURIComponent(sellerEmail)}?subject=${encodeURIComponent(
        `Interested in: ${product.title}`
      )}`
    : null

  const saved = isSaved(product._id)

  const handleShare = async () => {
    hapticTap()
    const shareData = {
      title: product.title,
      text: `Check out ${product.title} for ₹${product.price} on CampusMarket`,
      url: window.location.href,
    }
    if (typeof navigator !== 'undefined' && navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast('Link copied to clipboard', { type: 'success', duration: 2000 })
    } catch {
      toast('Failed to copy link', { type: 'error', duration: 2000 })
    }
  }

  return (
    <div className="space-y-16">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            hapticTap()
            navigate(-1)
          }}
          className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="h-9 gap-1.5 px-3 text-xs"
            aria-label="Share listing"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Share</span>
          </Button>

          <Button
            type="button"
            variant={saved ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => toggleSave(product)}
            className="h-9 gap-1.5 px-3 text-xs"
            aria-label={saved ? 'Remove from saved' : 'Save listing'}
          >
            <Bookmark className={cn('h-3.5 w-3.5', saved && 'fill-current text-primary')} />
            <span>{saved ? 'Saved' : 'Save'}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        {/* ── Photography ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: m.reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={m.transitions.slow}
          className="group lg:sticky lg:top-24 lg:self-start"
        >
          <ImageFrame
            src={image}
            alt={product.title}
            ratio="square"
            priority
            className="rounded-2xl border border-border"
            fallback={
              <div className="relative flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden">
                <CategoryIcon
                  className="absolute h-64 w-64 text-primary/[0.08]"
                  strokeWidth={0.75}
                  aria-hidden="true"
                />
                <span className="relative font-display text-display text-muted-foreground/70">
                  {categoryLabel(product.category)}
                </span>
                <span className="relative eyebrow text-muted-foreground">No photo provided</span>
              </div>
            }
          />
        </motion.div>

        {/* ── Detail ──────────────────────────────────────────────────── */}
        <div className="flex flex-col">
          <Reveal variant="fade">
            <div className="flex flex-wrap items-center gap-2">
              <Eyebrow accent>{categoryLabel(product.category)}</Eyebrow>
              <span className="h-3 w-px bg-border" aria-hidden="true" />
              <Eyebrow>{conditionLabel(product.condition)}</Eyebrow>
              {product.isSold && <Badge variant="secondary">Sold</Badge>}
              {product.videoVerification?.status && product.videoVerification.status !== 'not_submitted' && (
                <VerificationBadge data={product.videoVerification} compact />
              )}
            </div>

            <Display size="display" as="h1" className="mt-5 break-words">
              {product.title}
            </Display>

            <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
              <Price value={product.price} size="xl" />
              {product.views > 0 && (
                <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {product.views} views
                </span>
              )}
            </div>

            <Rule accent className="mt-7" />

            <p className="mt-7 whitespace-pre-line break-words text-[0.9375rem] leading-[1.65] text-muted-foreground">
              {product.description}
            </p>

            {/* The cached safety verdict — no second request, no browser-side check. */}
            {product.aiFraud?.risk_level && (
              <div className="mt-8">
                <Eyebrow className="mb-3">Safety check</Eyebrow>
                <FraudBadge data={product.aiFraud} />
              </div>
            )}

            {/* Mobile Video Verification result — read-only display across platforms */}
            {product.videoVerification?.status && product.videoVerification.status !== 'not_submitted' && (
              <div className="mt-8">
                <Eyebrow className="mb-3">Product Verification</Eyebrow>
                <VerificationBadge data={product.videoVerification} />
              </div>
            )}

            <SellerPanel
              product={product}
              user={user}
              mailto={mailto}
              sellerPhone={sellerPhone}
            />
          </Reveal>
        </div>
      </div>

      <Recommendations
        items={recommendations}
        loading={recsLoading}
        unavailable={recsUnavailable}
      />
    </div>
  )
}

/**
 * Seller panel. Contact details are absent from the API response for anonymous
 * callers, so visitors are prompted to sign in rather than shown a dead button.
 */
function SellerPanel({ product, user, mailto, sellerPhone }) {
  return (
    <div className="mt-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <Eyebrow className="mb-4">Listed by</Eyebrow>
      <div className="flex items-center gap-3.5">
        <Avatar name={product.seller?.name} size="lg" />
        <div className="min-w-0">
          <p className="font-display text-heading text-foreground">{product.seller?.name}</p>
          <p className="text-xs text-muted-foreground">{product.seller?.course || 'Student'}</p>
        </div>
      </div>

      <div className="mt-6">
        {!user ? (
          <>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <LogIn />
                Sign in to see contact details
              </Link>
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Email addresses and phone numbers are only shown to signed-in students.
            </p>
          </>
        ) : product.isSold ? (
          <Button disabled className="w-full">
            This item is sold
          </Button>
        ) : (
          <div className="flex flex-col gap-2.5">
            {mailto && (
              <Button asChild className="w-full">
                <a href={mailto}>
                  <Mail />
                  Email the seller
                </a>
              </Button>
            )}
            {sellerPhone && (
              <Button asChild variant="outline" className="w-full">
                <a href={`tel:${sellerPhone}`} className="tabular-nums">
                  <Phone />
                  {sellerPhone}
                </a>
              </Button>
            )}
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Meet on campus and inspect the item before you pay.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Recommendations({ items, loading, unavailable }) {
  if (!loading && (unavailable || items.length === 0)) return null

  return (
    <section className="border-t border-border pt-12">
      <div className="flex items-center gap-2.5">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <Eyebrow accent>Similar listings</Eyebrow>
      </div>
      <Display className="mt-4">You may also like</Display>

      {loading ? (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <RevealGroup
          staggerChildren={0.05}
          className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => (
            <RevealItem key={item._id}>
              <ProductCard product={item} />
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="space-y-5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-4/5" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  )
}
