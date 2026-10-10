import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Every image in the app goes through here.
 *
 * Three reasons it exists:
 *   - a missing or broken src used to leave a white hole, or point at
 *     placehold.co (an external dependency in the render path)
 *   - the editorial crop-and-zoom is one consistent behaviour instead of
 *     per-component `group-hover:scale-105`
 *   - aspect ratio is declared, so the grid never shifts as images arrive
 *
 * The zoom is a CSS transform on a will-change-free element; it is disabled by
 * the global prefers-reduced-motion rule in index.css.
 */
const RATIOS = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  tall: 'aspect-[2/3]',
  landscape: 'aspect-[4/3]',
  wide: 'aspect-[16/9]',
  ultra: 'aspect-[21/9]',
  auto: '',
}

export default function ImageFrame({
  src,
  alt = '',
  ratio = 'landscape',
  zoom = false,
  priority = false,
  className,
  imgClassName,
  overlay = false,
  fallback,
  children,
  ...props
}) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <div
      className={cn(
        'img-frame relative overflow-hidden',
        RATIOS[ratio] ?? RATIOS.landscape,
        className
      )}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onError={() => setFailed(true)}
          className={cn(
            'h-full w-full object-cover',
            zoom &&
              'transition-transform duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045]',
            imgClassName
          )}
        />
      ) : (
        /* A caller-supplied fallback lets a listing with no photograph render as
           a deliberate typographic tile rather than an apology. */
        fallback ?? (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground"
            role="img"
            aria-label={alt ? `${alt} — image unavailable` : 'Image unavailable'}
          >
            <ImageOff className="h-5 w-5 opacity-50" aria-hidden="true" />
            <span className="eyebrow opacity-60">No image</span>
          </div>
        )
      )}

      {/* Scrim for text laid over photography. Warm, not neutral black. */}
      {overlay && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[oklch(0.16_0.02_50/0.82)] via-[oklch(0.16_0.02_50/0.28)] to-transparent"
        />
      )}

      {children}
    </div>
  )
}
