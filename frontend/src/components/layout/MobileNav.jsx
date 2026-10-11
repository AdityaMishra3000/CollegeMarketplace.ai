import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Search, Bookmark, Package, User } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { useSaved } from '../../context/SavedContext'
import { hapticTap } from '../../lib/native'
import { useMotion } from '../../lib/motion'

/**
 * Instagram-Inspired Floating Navigation Capsule.
 *
 * Conforms strictly to Section 16 Mandatory Design Specification:
 * - Wide pill-shaped floating container with rounded-full ends.
 * - Clean white surface in light mode, elevated dark surface in dark mode.
 * - Restrained elevation and subtle border.
 * - ZERO protruding center button or raised FAB — uniform height across all 5 destinations.
 * - Five balanced destinations: Home, Explore, Saved, My Items, Profile.
 * - Active state in CampusMarket orange (#FF8000) with subtle restrained indicator.
 * - 44+ dp touch targets with active press feedback and haptic taps.
 * - Safe-area inset aware, hidden when the virtual keyboard is open.
 */
export default function MobileNav({ onOpenSearch }) {
  const { user } = useAuth()
  const { savedCount } = useSaved()
  const location = useLocation()
  const m = useMotion()

  const [keyboardOpen, setKeyboardOpen] = useState(false)

  // Listen for keyboard show/hide to automatically hide bottom navigation
  useEffect(() => {
    const handleMutation = () => {
      setKeyboardOpen(document.body.classList.contains('keyboard-open'))
    }
    const observer = new MutationObserver(handleMutation)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Do not display bottom navigation on full authentication screens
  const isAuthPage = ['/login', '/register'].includes(location.pathname)
  if (isAuthPage || keyboardOpen) return null

  const isActive = (tab) => {
    const path = tab.to
  
    if (tab.key === 'profile' && location.pathname === '/dashboard') {
      return false
    }
  
    if (path === '/marketplace') {
      return location.pathname === '/marketplace' || location.pathname === '/'
    }
  
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const handleTabClick = (tab, e) => {
    hapticTap()

    // If tapping the already-active tab, scroll to the top of the feed
    if (tab.to && isActive(tab.to)) {
      e?.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (tab.action) {
      e?.preventDefault()
      tab.action()
    }
  }


  const tabs = [
    {
      key: 'home',
      label: 'Home',
      icon: Home,
      to: '/marketplace',
    },
    {
      key: 'explore',
      label: 'Explore',
      icon: Search,
      action: () => onOpenSearch?.(),
    },
    {
      key: 'saved',
      label: 'Saved',
      icon: Bookmark,
      to: '/saved',
      badge: savedCount > 0 ? savedCount : null,
    },
    {
      key: 'my-items',
      label: 'My Items',
      icon: Package,
      to: user ? '/dashboard' : '/login',
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: User,
      to: user ? '/profile' : '/login',
    },
  ]

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-nav md:hidden',
        'pb-[max(env(safe-area-inset-bottom,0px),0.5rem)]',
        'px-4 pt-1 pointer-events-none'
      )}
      aria-label="Bottom Navigation"
    >
      <div
        className={cn(
          'pointer-events-auto mx-auto flex h-[58px] max-w-[370px] items-center justify-around',
          'rounded-full border border-border/80 dark:border-white/10',
          'bg-card/95 dark:bg-[#1E1915]/95 backdrop-blur-xl',
          'shadow-[0_4px_20px_-2px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)]',
          'dark:shadow-[0_6px_24px_-2px_rgba(0,0,0,0.6)]',
          'px-2 py-1'
        )}
      >
        {tabs.map((tab) => {
          const active = tab.to ? isActive(tab) : false
          const Icon = tab.icon

          const content = (
            <div
              className={cn(
                'relative flex h-11 w-11 items-center justify-center rounded-full',
                'transition-all duration-150 active:scale-90',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground/75 hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-[22px] w-[22px] transition-transform duration-150',
                  active && 'stroke-[2.35px] scale-105'
                )}
                strokeWidth={active ? 2.35 : 1.75}
                aria-hidden="true"
              />

              {/* Badge for saved items */}
              {tab.badge && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}

              {/* Restrained active dot below icon */}
              {active && (
                <span
                  className={cn(
                    'absolute bottom-1 h-1 w-1 rounded-full bg-primary',
                    m.reduced ? '' : 'animate-in fade-in zoom-in-50 duration-150'
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          )

          if (tab.action) {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={(e) => handleTabClick(tab, e)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center outline-none"
                aria-label={tab.label}
              >
                {content}
              </button>
            )
          }

          return (
            <Link
              key={tab.key}
              to={tab.to}
              onClick={(e) => handleTabClick(tab, e)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center outline-none"
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
            >
              {content}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
