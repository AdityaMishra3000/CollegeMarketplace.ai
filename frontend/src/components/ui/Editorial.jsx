import { cn, formatAmount, CURRENCY } from '@/lib/utils'

/**
 * EDITORIAL LAYER.
 *
 * The typographic devices that carry the brand: uppercase kickers, oversized
 * display headings in Spongeboy, hairline rules and large numerals. These exist
 * so pages stop being "h1 + grid of equal-weight cards" and gain hierarchy
 * without every page hand-rolling its own type treatment.
 */

/** Small, wide, uppercase kicker. Sits above a heading or labels a block. */
export function Eyebrow({ children, className, accent = false, as: Tag = 'p', ...props }) {
  return (
    <Tag
      className={cn('eyebrow', accent ? 'text-primary-ink' : 'text-muted-foreground', className)}
      {...props}
    >
      {children}
    </Tag>
  )
}

/** Display type. Spongeboy, uppercase, tight. Never used for body copy. */
export function Display({ children, className, size = 'display', as: Tag = 'h2', ...props }) {
  const sizes = {
    hero: 'text-hero',
    display: 'text-display',
    title: 'text-title',
    heading: 'text-heading',
  }
  return (
    <Tag className={cn('font-display text-foreground', sizes[size] || sizes.display, className)} {...props}>
      {children}
    </Tag>
  )
}

/** A hairline with an optional orange lead-in — the section separator. */
export function Rule({ className, accent = false }) {
  if (!accent) return <div className={cn('rule', className)} aria-hidden="true" />
  return (
    <div className={cn('flex items-stretch', className)} aria-hidden="true">
      <span className="h-0.5 w-12 shrink-0 bg-primary" />
      <span className="mt-[1.5px] h-px flex-1 bg-border" />
    </div>
  )
}

/**
 * Price, set in the display face.
 *
 * Spongeboy has 203 glyphs and no U+20B9, so `₹48,000` in the display face
 * silently falls back for the rupee sign alone and renders at a different
 * weight. Setting the symbol in the sans face — smaller, muted, raised — turns
 * that constraint into a deliberate editorial detail.
 */
export function Price({ value, size = 'md', className, currency = CURRENCY }) {
  const sizes = {
    sm: 'text-[0.9375rem]',
    md: 'text-heading',
    lg: 'text-title',
    xl: 'text-display',
  }
  const formatted = formatAmount(value)

  return (
    /*
      Centre-aligned, not baseline-aligned. The two faces have very different
      metrics — Spongeboy sits on a much taller ascent — so baseline alignment
      dropped the small sans rupee sign below the digits and collided with them.
    */
    <span className={cn('inline-flex items-center gap-[0.14em] leading-none', className)}>
      <span
        aria-hidden="true"
        className="-translate-y-[0.07em] font-sans text-[0.58em] font-semibold leading-none text-muted-foreground"
      >
        {currency}
      </span>
      <span className={cn('font-display tabular-nums leading-none text-foreground', sizes[size] ?? sizes.md)}>
        {formatted}
      </span>
      <span className="sr-only">
        {currency}
        {formatted}
      </span>
    </span>
  )
}

/**
 * Page header used by every authenticated route, so Marketplace, Dashboard and
 * Admin share one masthead rather than three slightly different ones.
 */
export function PageHeader({ eyebrow, title, description, actions, className, children }) {
  return (
    <header className={cn('relative', className)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && <Eyebrow accent className="mb-3">{eyebrow}</Eyebrow>}
          <Display size="title" as="h1">
            {title}
          </Display>
          {description && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
      <Rule accent className="mt-6" />
    </header>
  )
}

/**
 * Large numeral. Uses the display face and tabular figures so columns of
 * numbers align — the dashboard and admin stat blocks depend on it.
 */
export function StatNumber({ children, className, size = 'md' }) {
  const sizes = {
    sm: 'text-[1.75rem]',
    md: 'text-[2.5rem]',
    lg: 'text-[3.25rem]',
  }
  return (
    <span
      className={cn(
        'font-display tabular-nums leading-[0.9] text-foreground',
        sizes[size] || sizes.md,
        className
      )}
    >
      {children}
    </span>
  )
}

/**
 * Stat cell: numeral over a label, separated by a rule. Composed rather than a
 * Card, because the dashboard/admin stat rows read better as a divided band
 * than as four floating boxes.
 */
export function Stat({ label, value, hint, icon: Icon, className }) {
  return (
    <div className={cn('flex flex-col gap-3 p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{label}</Eyebrow>
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </div>
      <StatNumber>{value}</StatNumber>
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}
