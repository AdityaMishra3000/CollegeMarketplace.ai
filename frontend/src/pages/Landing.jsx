import { Navigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { getPublicStats } from '../api/products'
import Hero from '../components/landing/Hero'
import { PhotoBand, HowItWorks, ClosingCta, LandingFooter } from '../components/landing/Sections'
import { LiveListings, CategoryIndex } from '../components/landing/LiveListings'
import { Spinner } from '../components/ui/States'

/**
 * The first impression.
 *
 * Shown at `/` to visitors who are not signed in. Signed-in students go straight
 * to the marketplace — they have already been sold to.
 *
 * No new authentication: the CTAs point at the existing /login and /register
 * routes, and every figure on the page comes from the existing public endpoints.
 */
export default function Landing() {
  const { user, loading: authLoading } = useAuth()
  const { data: stats } = useApi(() => getPublicStats(), [])

  // Wait for the session check so the landing does not flash for a signed-in user.
  if (authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Spinner className="h-7 w-7 text-primary" />
      </div>
    )
  }

  if (user) return <Navigate to="/marketplace" replace />

  return (
    <>
      <Hero stats={stats} />
      <HowItWorks />
      <PhotoBand />
      <LiveListings />
      <CategoryIndex />
      <ClosingCta />
      <LandingFooter />
    </>
  )
}
