import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardFooter } from '../ui/Card'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import FraudBadge from '../ai/FraudBadge'
import { categoryLabel, conditionLabel } from '../../lib/constants'
import { fadeUp } from '../../lib/motion'
import { usePointerTilt } from '../../hooks/usePointerTilt'

export default function ProductCard({ product }) {
  const price =
    typeof product.price === 'number' ? product.price.toFixed(2) : product.price

  // Shared "product media language" — also used on ProductDetails.
  const tiltRef = usePointerTilt({ max: 5, scale: 1.045 })

  return (
    <motion.div
      layout
      variants={fadeUp}
      initial="hidden"
      animate="show"
      exit="exit"
      className="h-full"
    >
      <Card interactive className="group flex h-full flex-col overflow-hidden">
        <Link
          to={`/product/${product._id}`}
          className="relative block aspect-[4/3] overflow-hidden bg-muted"
        >
          <div
            ref={tiltRef}
            className="h-full w-full [transform-style:preserve-3d] transition-transform duration-300 ease-out"
          >
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                No image
              </div>
            )}
          </div>

          {/* Depth scrim — legibility for the price chip, not decoration */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-sm font-semibold tabular-nums text-foreground shadow-sm ring-1 ring-border backdrop-blur">
            ₹{price}
          </span>

          {/* Contextual affordance: reinforces the card opens details */}
          <span className="absolute bottom-3 right-3 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-sm ring-1 ring-border backdrop-blur transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>

        <CardContent className="flex flex-1 flex-col p-4">
          <h3 className="mb-1.5 min-w-0 font-semibold leading-snug tracking-tight text-foreground line-clamp-1">
            <Link
              to={`/product/${product._id}`}
              className="outline-none transition-colors hover:text-primary focus-visible:text-primary"
            >
              {product.title}
            </Link>
          </h3>

          <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {product.description}
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="outline">{categoryLabel(product.category)}</Badge>
            <Badge variant="secondary">{conditionLabel(product.condition)}</Badge>
          </div>

          {/* Cached ML fraud result from MongoDB */}
          <div className="mt-auto">
            <FraudBadge data={product.aiFraud} compact />
          </div>
        </CardContent>

        <CardFooter className="border-t border-border p-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={product.seller?.name} size="sm" />
            <span className="truncate text-xs font-medium text-muted-foreground">
              {product.seller?.name || 'Unknown seller'}
            </span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
