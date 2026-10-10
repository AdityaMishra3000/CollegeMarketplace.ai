import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'
import ImageFrame from '../ui/ImageFrame'
import FraudBadge from '../ai/FraudBadge'
import { categoryLabel, conditionLabel, categoryIcon } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { Price } from '../ui/Editorial'

/**
 * Marketplace listing card.
 *
 * Two deliberate decisions:
 *
 * 1. No photograph is a *designed* state. Most seeded listings have no image, so
 *    a row of grey "no image" boxes would be the first thing a visitor sees.
 *    Instead the tile becomes typographic: the category set large in the display
 *    face over a warm wash. It reads as intentional.
 *
 * 2. The fraud verdict only appears when it says something. A green "Safe" chip
 *    on every one of 24 cards is noise; a caution or danger chip on the two that
 *    need it is information. The full verdict is still on the detail page.
 */
export default function ProductCard({ product }) {
  const CategoryIcon = categoryIcon(product.category)
  const image = product.images?.[0] || product.imageUrl
  const risk = product.aiFraud?.risk_level
  const showRisk = risk && risk !== 'LOW'

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card',
        'transition-[border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-1 hover:border-border-strong hover:shadow-lg',
        'focus-within:border-primary focus-within:shadow-lg'
      )}
    >
      <Link to={`/product/${product._id}`} className="block outline-none" tabIndex={-1} aria-hidden="true">
        <ImageFrame
          src={image}
          alt={product.title}
          ratio="landscape"
          zoom
          fallback={
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              <CategoryIcon
                className="absolute h-28 w-28 text-primary/[0.10] transition-transform duration-500 group-hover:scale-110"
                strokeWidth={1.25}
                aria-hidden="true"
              />
              <span className="relative px-4 text-center font-display text-heading leading-tight text-muted-foreground/80 transition-colors duration-300 group-hover:text-primary-ink">
                {categoryLabel(product.category)}
              </span>
            </div>
          }
        />
      </Link>

      {/* Price sits on the image edge — the one figure that must be unmissable. */}
      <div className="relative -mt-px flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <Price value={product.price} size="md" />
        {product.isSold ? (
          <Badge variant="secondary" size="sm">
            Sold
          </Badge>
        ) : (
          showRisk && <FraudBadge data={product.aiFraud} compact size="sm" />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground">
          <Link
            to={`/product/${product._id}`}
            className="outline-none transition-colors hover:text-primary-ink focus-visible:text-primary-ink"
          >
            <span className="line-clamp-2">{product.title}</span>
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        {/* Taxonomy as small caps rather than two more coloured pills. */}
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 pt-px">
          <span className="eyebrow text-muted-foreground">{categoryLabel(product.category)}</span>
          <span className="h-2.5 w-px bg-border" aria-hidden="true" />
          <span className="eyebrow text-muted-foreground">{conditionLabel(product.condition)}</span>
        </p>

        <p className="mt-auto flex min-w-0 items-center gap-2 pt-4 text-xs text-muted-foreground">
          <span className="truncate">{product.seller?.name || 'Unknown seller'}</span>
          {product.views > 0 && (
            <>
              <span className="h-2.5 w-px shrink-0 bg-border" aria-hidden="true" />
              <span className="shrink-0 tabular-nums">{product.views} views</span>
            </>
          )}
        </p>
      </div>
    </article>
  )
}
