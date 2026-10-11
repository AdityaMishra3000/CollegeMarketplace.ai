import { Capacitor } from '@capacitor/core'

/**
 * Centralized Android Back Button and Overlay Registry.
 *
 * Implements Android Back button priority:
 * 1. Close open modal, sheet, drawer, or dialog (LIFO stack).
 * 2. Dismiss virtual keyboard if active.
 * 3. Navigate back through React Router history.
 * 4. At root screen, require double-tap within 2s to exit (prevents accidental exit).
 */

const overlayStack = []
let backListenerRegistered = false
let lastBackPressTime = 0
let routerNavigate = null
let currentPathname = '/'
let showToastFn = null

/** Register the navigate function and toast helper from React app shell */
export function setRouterNavigation(navigate, getPathname, toastFn) {
  routerNavigate = navigate
  if (getPathname) currentPathname = getPathname()
  if (toastFn) showToastFn = toastFn
}

/** Update the current pathname for root-check calculations */
export function updateCurrentPathname(pathname) {
  currentPathname = pathname
}

/**
 * Register an overlay (modal, drawer, sheet) onto the back stack.
 * Returns an unregister cleanup function.
 */
export function registerOverlay(id, dismissCallback) {
  const existingIndex = overlayStack.findIndex((item) => item.id === id)
  if (existingIndex !== -1) {
    overlayStack.splice(existingIndex, 1)
  }
  overlayStack.push({ id, dismiss: dismissCallback })

  return () => {
    const idx = overlayStack.findIndex((item) => item.id === id)
    if (idx !== -1) {
      overlayStack.splice(idx, 1)
    }
  }
}

/** Check if any overlay is currently open */
export function hasOpenOverlays() {
  return overlayStack.length > 0
}

/**
 * Initialize the hardware/gesture back button listener via Capacitor App plugin.
 * Safe to call multiple times; listener is registered only once.
 */
export async function initBackButtonListener() {
  if (!Capacitor.isNativePlatform() || backListenerRegistered) return

  try {
    const { App } = await import('@capacitor/app')
    const { Keyboard } = await import('@capacitor/keyboard')

    await App.addListener('backButton', async () => {
      // 1. Highest priority: dismiss topmost overlay
      if (overlayStack.length > 0) {
        const top = overlayStack.pop()
        if (top?.dismiss) {
          top.dismiss()
          return
        }
      }

      // 2. Second priority: dismiss keyboard if open
      if (document.body.classList.contains('keyboard-open')) {
        try {
          await Keyboard.hide()
          return
        } catch {
          // Ignore keyboard hide errors
        }
      }

      // 3. Third priority: in-app navigation history
      const isRoot = currentPathname === '/' || currentPathname === '/marketplace'

      if (!isRoot && routerNavigate) {
        // We are on a subpage (e.g. /product/:id, /dashboard, /saved, /login)
        routerNavigate(-1)
        return
      }

      // 4. Fourth priority: if on landing (/), navigate to marketplace first
      if (currentPathname === '/' && routerNavigate) {
        routerNavigate('/marketplace')
        return
      }

      // 5. Fifth priority: at root screen (/marketplace)
      // Require double-tap within 2000ms to exit app
      const now = Date.now()
      if (now - lastBackPressTime < 2000) {
        App.exitApp()
      } else {
        lastBackPressTime = now
        if (showToastFn) {
          showToastFn('Press back again to exit', { type: 'info', duration: 2000 })
        }
      }
    })

    backListenerRegistered = true
  } catch {
    // @capacitor/app not available or running on web
  }
}
