import { motion } from 'framer-motion'
import ImageFrame from '@/components/ui/ImageFrame'
import { Display, Eyebrow, Rule } from '@/components/ui/Editorial'
import { useMotion } from '@/lib/motion'

/**
 * Shared frame for sign-in and registration.
 *
 * A split: photography on one side, the form on the other. Both auth screens
 * used to be a centred card in the middle of an empty page, which made them feel
 * like a different product from the landing page. Breaking out of the app's page
 * container (the negative margins) lets the photograph run to the edge.
 */
export default function AuthLayout({ image, imageAlt, caption, eyebrow, title, children, footer }) {
  const m = useMotion()

  return (
    <div className="-mx-4 -my-8 grid min-h-[calc(100dvh-4rem)] sm:-mx-6 sm:-my-12 lg:grid-cols-2">
      {/* ── Photography ──────────────────────────────────────────────── */}
      <div className="relative hidden border-r border-border lg:block">
        <ImageFrame
          src={image}
          alt={imageAlt}
          ratio="auto"
          overlay
          priority
          className="h-full w-full"
          imgClassName="object-[50%_45%]"
        >
          <div className="absolute inset-0 flex flex-col justify-end p-10">
            {caption && (
              <motion.figcaption
                initial={{ opacity: 0, y: m.reduced ? 0 : 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={m.transitions.slow}
                className="max-w-md"
              >
                <span className="h-0.5 w-12 bg-primary" />
                <p className="mt-6 font-display text-title text-white">{caption}</p>
              </motion.figcaption>
            )}
          </div>
        </ImageFrame>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: m.reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={m.transitions.normal}
          className="w-full max-w-sm"
        >
          <Eyebrow accent>{eyebrow}</Eyebrow>
          <Display size="title" as="h1" className="mt-4">
            {title}
          </Display>
          <Rule accent className="mt-7" />

          <div className="mt-8">{children}</div>

          {footer && (
            <p className="mt-8 text-center text-sm text-muted-foreground">{footer}</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
