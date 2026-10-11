import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ImageFrame from '@/components/ui/ImageFrame'
import { Eyebrow } from '@/components/ui/Editorial'
import { useMotion, EASE } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Landing hero — asymmetric editorial, not a centred SaaS block.
 *
 * The composition follows the assets rather than the reverse: the real
 * photographs are portrait (0.71–0.75), so the type occupies a wide left column
 * and the photography stacks as two offset vertical crops on different
 * baselines, overlapping the type's right edge.
 *
 * `#FF8000` cannot be used for display text — it is 2.52:1 on white and fails
 * WCAG at any size — so the brand moment is a highlight block carrying dark ink
 * (7.22:1) instead of coloured letters. It also just looks better.
 */

const LINES = [
  ['YOUR', 'CAMPUS'],
  ['ALREADY', 'HAS'],
  ['WHAT YOU', { mark: 'NEED' }],
]

export default function Hero({ stats }) {
  const m = useMotion()
  const d = m.distance

  /* Line-by-line mask reveal. This is the one long sequence in the app; the
     brief allows a real moment on landing entry. */
  const line = {
    hidden: { y: m.reduced ? 0 : '100%', opacity: m.reduced ? 0 : 1 },
    show: (i) => ({
      y: 0,
      opacity: 1,
      transition: { duration: m.reduced ? 0.01 : 0.9, ease: EASE.outExpo, delay: m.reduced ? 0 : 0.1 + i * 0.09 },
    }),
  }

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="relative mx-auto max-w-[1600px] px-5 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-16">
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-8">
          {/* ── Type column ─────────────────────────────────────────── */}
          <div className="lg:col-span-8 lg:pt-4">
            <motion.div
              initial={{ opacity: 0, y: m.reduced ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: m.reduced ? 0.01 : 0.5, ease: EASE.outQuart }}
              className="flex items-center gap-3"
            >
              <span className="h-px w-8 bg-primary" />
              <Eyebrow>A. P. Shah Institute of Technology</Eyebrow>
            </motion.div>

            <h1 className="mt-6 font-display text-hero leading-[1.02] text-foreground sm:mt-7">
              {LINES.map((words, i) => (
                /* nowrap per line: the mask reveal animates one visual line, so a
                   line that re-wraps internally would break both the rhythm and
                   the animation. The clamp() on --text-hero shrinks instead. */
                <span
                  key={i}
                  className="block overflow-hidden whitespace-normal sm:whitespace-nowrap break-words pt-[0.16em] pb-[0.18em] -mt-[0.16em]"
                >
                    <motion.span
                      className="block py-[0.04em]"
                      variants={line}
                      custom={i}
                      initial="hidden"
                      animate="show"
                    >
                    {words.map((word, j) =>
                      typeof word === 'string' ? (
                        <span key={j}>{word} </span>
                      ) : (
                        <span
                          key={j}
className="relative ml-[0.04em] inline-block bg-primary px-[0.12em] pb-[0.02em] pt-[0.2em] text-primary-foreground"
                        >
                          {word.mark}
                        </span>
                      )
                    )}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: m.reduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: m.reduced ? 0.01 : 0.6, ease: EASE.outExpo, delay: m.reduced ? 0 : 0.5 }}
              className="mt-7 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base"
            >
              Textbooks, desk fans, cricket bats, a second-hand laptop that still
              has two good years in it. Listed by students you will actually run
              into on the way to class — not strangers three cities away.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: m.reduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: m.reduced ? 0.01 : 0.6, ease: EASE.outExpo, delay: m.reduced ? 0 : 0.6 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button asChild size="lg">
                <Link to="/marketplace">
                  Browse the marketplace
                  <ArrowRight className="transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/register">Create an account</Link>
              </Button>
            </motion.div>

            {stats && <HeroStats stats={stats} reduced={m.reduced} />}
          </div>

          {/* ── Photography column ──────────────────────────────────── */}
          <div className="relative lg:col-span-4 lg:pl-2">
            <motion.div
              initial={{ opacity: 0, y: 24 * d, scale: m.reduced ? 1 : 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: m.reduced ? 0.01 : 1, ease: EASE.outExpo, delay: m.reduced ? 0 : 0.15 }}
              className="group relative ml-auto w-[86%] sm:w-[72%] lg:w-full"
            >
              <ImageFrame
                src="/landing/cricket.jpeg"
                alt="Students from the college cricket team on the ground after a match"
                ratio="tall"
                zoom
                priority
                className="rounded-xl"
                imgClassName="object-[50%_72%]"
              />
              <figcaption className="mt-2.5 flex items-center gap-2 text-right">
                <span className="h-px flex-1 bg-border" />
                <span className="eyebrow text-muted-foreground">Inter-college cricket</span>
              </figcaption>
            </motion.div>

            {/* Offset second frame on a different baseline. Kept low and left so
                it does not cover the faces in the frame behind it. */}
            <motion.div
              initial={{ opacity: 0, y: 32 * d }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: m.reduced ? 0.01 : 1, ease: EASE.outExpo, delay: m.reduced ? 0 : 0.32 }}
              className="group absolute -bottom-8 left-0 w-[42%] sm:w-[34%] lg:-left-24 lg:-bottom-20 lg:w-[52%]"
            >
              <ImageFrame
                src="/landing/Football.jpeg"
                alt="The college football team on the turf pitch"
                ratio="portrait"
                zoom
                priority
                className="rounded-xl border-4 border-background shadow-xl"
                imgClassName="object-[50%_58%]"
              />
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: m.reduced ? 0 : 1.1, duration: 0.5 }}
          className="mt-16 flex items-center gap-2 text-muted-foreground lg:mt-10"
        >
          <ArrowDown className={cn('h-3.5 w-3.5', !m.reduced && 'animate-bounce')} aria-hidden="true" />
          <Eyebrow>Scroll</Eyebrow>
        </motion.div>
      </div>
    </section>
  )
}

/** Real figures from the public /api/stats endpoint — never invented numbers. */
function HeroStats({ stats, reduced }) {
  const lakh = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Math.round(n).toLocaleString('en-IN')}`)

  const items = [
    { value: stats.totalItems, label: 'Listings live now' },
    { value: stats.totalValue ? lakh(stats.totalValue) : null, label: 'Worth of stuff' },
    { value: stats.avgPrice ? lakh(stats.avgPrice) : null, label: 'Typical price' },
  ].filter((i) => i.value !== null && i.value !== undefined && i.value !== 0)

  if (items.length === 0) return null

  return (
    <motion.dl
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: reduced ? 0 : 0.75, duration: 0.6 }}
      className="mt-12 grid max-w-lg grid-cols-3 gap-2 sm:gap-6 border-t border-border pt-6"
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="eyebrow text-[10px] sm:text-eyebrow break-words text-muted-foreground">{item.label}</dt>
          <dd className="mt-2 font-display text-base xs:text-lg sm:text-[1.75rem] leading-none tabular-nums text-foreground">
            {typeof item.value === 'number' ? item.value.toLocaleString('en-IN') : item.value}
          </dd>
        </div>
      ))}
    </motion.dl>
  )
}
