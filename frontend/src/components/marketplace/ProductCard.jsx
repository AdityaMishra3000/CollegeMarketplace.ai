import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter } from '../ui/Card'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import FraudBadge from '../ai/FraudBadge'
import { categoryLabel, conditionLabel } from '../../lib/constants'

export default function ProductCard({ product }) {
  const price =
    typeof product.price === 'number' ? product.price.toFixed(2) : product.price

  return (
    <Card interactive className="group flex h-full flex-col overflow-hidden">
      <Link
        to={`/product/${product._id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-muted"
      >
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
            No image
          </div>
        )}

        {/* Price chip floating on the image */}
        <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border backdrop-blur">
          ₹{price}
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
  )
}
