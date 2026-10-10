import { cn } from '@/lib/utils'

/**
 * Status pill. Retuned for the orange brand: `primary` uses the subtle wash
 * plus the darker accessible orange ink, never the fill colour as text.
 *
 * Kept at eight variants (the names existing pages already pass) but the
 * treatment is now uniform — 1px border, tinted wash, ink text — so a row of
 * mixed badges reads as one family instead of eight decisions.
 */
const variants = {
  default: 'border-border bg-secondary text-secondary-foreground',
  secondary: 'border-border/70 bg-muted text-muted-foreground',
  primary: 'border-primary/30 bg-primary-subtle text-primary-ink',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/12 text-warning',
  destructive: 'border-destructive/25 bg-destructive/10 text-destructive',
  info: 'border-info/25 bg-info/10 text-info',
  outline: 'border-border bg-transparent text-muted-foreground',
  /** Solid brand chip — for the one thing on screen that must be unmissable. */
  solid: 'border-transparent bg-primary text-primary-foreground',
  /** For use on top of photography. */
  onPhoto: 'border-white/25 bg-[oklch(0.16_0.02_50/0.55)] text-white backdrop-blur-md',
}

const sizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  default: 'px-2.5 py-1 text-[11px]',
}

export default function Badge({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase leading-none tracking-[0.06em]',
        '[&_svg]:size-3 [&_svg]:shrink-0',
        sizes[size] ?? sizes.default,
        variants[variant] ?? variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
