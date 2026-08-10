import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter } from '../ui/Card'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import FraudBadge from '../ai/FraudBadge'
import { categoryLabel, conditionLabel } from '../../lib/constants'

export default function ProductCard({ product }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Link
        to={`/product/${product._id}`}
        className="block aspect-[4/3] overflow-hidden bg-muted"
      >
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
            No Image
          </div>
        )}
      </Link>

      <CardContent className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="min-w-0 font-semibold tracking-tight text-foreground line-clamp-1">
            <Link
              to={`/product/${product._id}`}
              className="hover:underline"
            >
              {product.title}
            </Link>
          </h3>

          <span className="shrink-0 font-semibold text-primary">
            ₹{product.price?.toFixed(2)}
          </span>
        </div>

        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="outline">
            {categoryLabel(product.category)}
          </Badge>

          <Badge variant="secondary">
            {conditionLabel(product.condition)}
          </Badge>
        </div>

        {/* Cached ML fraud result from MongoDB */}
        <div className="mt-auto">
          <FraudBadge
            data={product.aiFraud}
            compact
          />
        </div>
      </CardContent>

      <CardFooter className="border-t border-border p-4">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar
            name={product.seller?.name}
            size="sm"
          />

          <span className="truncate text-xs text-muted-foreground">
            {product.seller?.name || 'Unknown Seller'}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}