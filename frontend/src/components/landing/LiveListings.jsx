import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getProducts } from '@/api/products'
import { getMarketInsights } from '@/api/ai'
import { categoryLabel, categoryIcon } from '@/lib/constants'
import ProductCard from '@/components/marketplace/ProductCard'
import { Skeleton } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { Display, Eyebrow, Price } from '@/components/ui/Editorial'
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal'

/**
 * Real listings and real category counts, from the existing public endpoints
 * (`GET /api/products`, `GET /api/ai/insights`). Nothing on this page is mock
 * data — an empty marketplace shows an honest empty state rather than invented
 * placeholder products.
 */

const PREVIEW_COUNT = 8

export function LiveListings() {
  const { data, loading, error } = useApi(
    () => getProducts({ limit: PREVIEW_COUNT, sort: 'newest' }),
    []
  )
  const items = data?.items ?? []

  return (
    <section className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-[1600px] px-5 py-12 sm:px-6 sm:py-16">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <Eyebrow accent>Listed this week</Eyebrow>
            <Display className="mt-4">Fresh off the notice board</Display>
          </div>
          <Button asChild variant="outline">
            <Link to="/marketplace">
              See everything
              <ArrowUpRight />
            </Link>
          </Button>
        </Reveal>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : error || items.length === 0 ? (
          <div className="mt-8 border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {error
                ? 'Listings are unavailable right now.'
                : 'Nothing listed yet — be the first.'}
            </p>
          </div>
        ) : (
          <RevealGroup
            staggerChildren={0.05}
            className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {items.slice(0, PREVIEW_COUNT).map((product) => (
              <RevealItem key={product._id}>
                <ProductCard product={product} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  )
}

/**
 * Editorial index of the taxonomy, with live counts. Reads as a directory
 * rather than a row of icon tiles.
 */
export function CategoryIndex() {
  const { data, loading } = useApi(() => getMarketInsights(), [])
  const rows = data?.trending_categories ?? []

  return (
    <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-6 sm:py-24">
      <Reveal className="max-w-2xl">
        <Eyebrow accent>What people sell</Eyebrow>
        <Display className="mt-4">The index</Display>
      </Reveal>

      <div className="mt-12 border-t border-border">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border py-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}

        {!loading && rows.length === 0 && (
          <p className="py-10 text-sm text-muted-foreground">
            Category figures are unavailable right now.
          </p>
        )}

        <RevealGroup staggerChildren={0.045}>
          {rows.map((row) => {
            const Icon = categoryIcon(row.category)
            return (
              <RevealItem key={row.category}>
                <Link
                  to={`/marketplace?category=${row.category}`}
                  className="group flex items-center gap-4 border-b border-border py-5 transition-colors hover:bg-primary-subtle sm:gap-6 sm:py-6"
                >
                  <Icon
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary-ink"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 font-display text-heading text-foreground">
                    {row.label || categoryLabel(row.category)}
                  </span>
                  <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
                    avg&nbsp;<Price value={row.avg_price} size="sm" className="[&>span]:text-inherit" />
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {row.listing_count}
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-border-strong transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary-ink"
                    aria-hidden="true"
                  />
                </Link>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </div>
    </section>
  )
}
