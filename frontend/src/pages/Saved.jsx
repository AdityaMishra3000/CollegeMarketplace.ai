import { Link } from 'react-router-dom'
import { Bookmark, ArrowRight } from 'lucide-react'
import { useSaved } from '../context/SavedContext'
import ProductCard from '../components/marketplace/ProductCard'
import { PageHeader, Eyebrow } from '../components/ui/Editorial'
import { EmptyState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { RevealGroup, RevealItem } from '../components/ui/Reveal'

export default function Saved() {
  const { savedItems, savedCount } = useSaved()

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your bookmarks"
        title="Saved items"
        description="Listings you have saved to keep an eye on. Accessible anytime."
      />

      {savedCount === 0 ? (
        <EmptyState
          icon={Bookmark}
          eyebrow="Nothing saved yet"
          title="Your saved list is empty"
          description="Tap the bookmark icon on any listing to save it here for quick access later."
          action={
            <Button asChild size="lg">
              <Link to="/marketplace">
                Explore listings
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Eyebrow>
              {savedCount} {savedCount === 1 ? 'saved item' : 'saved items'}
            </Eyebrow>
          </div>

          <RevealGroup
            staggerChildren={0.03}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {savedItems.map((product) => (
              <RevealItem key={product._id}>
                <ProductCard product={product} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      )}
    </div>
  )
}
