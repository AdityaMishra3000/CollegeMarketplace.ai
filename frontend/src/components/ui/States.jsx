import { AlertTriangle, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { Eyebrow } from './Editorial'

/**
 * Loading / empty / error states.
 *
 * These are the three surfaces a user sees most often when something is wrong,
 * so they get the same editorial treatment as the rest of the app rather than
 * being an afterthought: a rule, a kicker, real hierarchy.
 */

export function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-foreground/[0.06] after:to-transparent',
        className
      )}
    />
  )
}

/** Matches the ProductCard footprint so the grid does not jump on load. */
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="mt-3 h-2.5 w-1/2" />
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 8, className }) {
  return (
    <div
      role="status"
      aria-label="Loading listings"
      className={cn('grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon, eyebrow = 'Nothing here', title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-start rounded-xl border border-dashed border-border px-6 py-14 sm:px-12 sm:py-20',
        className
      )}
    >
      {Icon && (
        <Icon className="mb-6 h-6 w-6 text-border-strong" strokeWidth={1.5} aria-hidden="true" />
      )}
      <Eyebrow accent>{eyebrow}</Eyebrow>
      <h3 className="mt-3 font-display text-title text-foreground">{title}</h3>
      {description && (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-7">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', description, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start rounded-xl border border-destructive/25 bg-destructive/[0.06] px-6 py-12 sm:px-12 sm:py-16',
        className
      )}
    >
      <AlertTriangle className="mb-6 h-6 w-6 text-destructive" strokeWidth={1.5} aria-hidden="true" />
      <Eyebrow className="text-destructive">Error</Eyebrow>
      <h3 className="mt-3 font-display text-title text-foreground">{title}</h3>
      {description && (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-7" onClick={onRetry}>
          <RotateCw />
          Try again
        </Button>
      )}
    </div>
  )
}

export function Spinner({ className, label = 'Loading' }) {
  return (
    <span role="status" aria-label={label}>
      <span
        className={cn(
          'block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
          className
        )}
      />
    </span>
  )
}
