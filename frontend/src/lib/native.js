/**
 * Capacitor platform detection and native bridge utilities.
 *
 * Consolidates all Capacitor checks to a single module so the rest of the app
 * imports `isNative`, `isMobile`, etc. instead of scattering Capacitor.isNativePlatform()
 * calls through components.
 *
 * Safe to import on web — everything degrades to a no-op.
 */
import { Capacitor } from '@capacitor/core'
import { initBackButtonListener } from './backButton'

/** True when running inside the Capacitor Android/iOS shell. */
export const isNative = Capacitor.isNativePlatform()

/** The platform name: 'android', 'ios', or 'web'. */
export const platform = Capacitor.getPlatform()

/** True specifically on Android (native). */
export const isAndroid = platform === 'android'

/** True specifically on iOS (native). */
export const isIOS = platform === 'ios'

/** True on any touch-primary device (native or mobile browser). */
export const isTouchDevice =
  isNative || (typeof window !== 'undefined' && 'ontouchstart' in window)

/**
 * Initialise native plugins that need setup once at app start.
 * Called from main.jsx. Safe to call on web — each block checks `isNative`.
 */
export async function initNativePlugins() {
  if (!isNative) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
    if (isAndroid) {
      await StatusBar.setBackgroundColor({
        color: theme === 'dark' ? '#2A2420' : '#FFFFFF',
      })
    }
  } catch {
    // StatusBar plugin not available — web fallback
  }

  try {
    const { Keyboard } = await import('@capacitor/keyboard')
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`)
      document.body.classList.add('keyboard-open')
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px')
      document.body.classList.remove('keyboard-open')
    })
  } catch {
    // Keyboard plugin not available
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    // Give React a moment to mount, then hide
    setTimeout(() => SplashScreen.hide({ fadeOutDuration: 300 }), 400)
  } catch {
    // SplashScreen plugin not available
  }

  // Register native Android Back button handler
  initBackButtonListener()
}

/**
 * Update the status bar to match the current theme.
 * Called whenever the theme toggles.
 */
export async function syncStatusBar(theme) {
  if (!isNative) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
    if (isAndroid) {
      await StatusBar.setBackgroundColor({
        color: theme === 'dark' ? '#2A2420' : '#FFFFFF',
      })
    }
  } catch {
    // ignore
  }
}

/**
 * Fire a light haptic tap. Used for nav interactions and button presses.
 */
export async function hapticTap() {
  if (!isNative) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // ignore
  }
}

/**
 * Open the device camera or photo library and return the selected image.
 * Returns { dataUrl, webPath } or null if the user cancelled.
 */
export async function pickPhoto(source = 'prompt') {
  if (!isNative) return null
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const sourceMap = {
      camera: CameraSource.Camera,
      photos: CameraSource.Photos,
      prompt: CameraSource.Prompt,
    }
    const photo = await Camera.getPhoto({
      quality: 85,
      width: 1200,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: sourceMap[source] || CameraSource.Prompt,
      promptLabelHeader: 'Add a photo',
      promptLabelPhoto: 'Choose from gallery',
      promptLabelPicture: 'Take a photo',
    })
    return { dataUrl: photo.dataUrl, webPath: photo.webPath }
  } catch {
    // User cancelled or permission denied
    return null
  }
}
