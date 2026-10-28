const ApiError = require('../utils/ApiError');

/**
 * Enforce that product video verification requests originate exclusively
 * from the authorized mobile/Android application workflow.
 *
 * Checks:
 * 1. Platform header: `x-app-platform` must indicate mobile/android native (`android-native` or `capacitor-android`)
 * 2. Origin header: If present, must be a native scheme (`https://localhost`, `capacitor://localhost`, or absent/native).
 *    Browser origins like `http://localhost:5173`, `http://localhost`, or external web domains are forbidden.
 * 3. User-Agent header: Must match mobile / Android / Capacitor indicators, or non-desktop browser agent.
 *
 * NOTE: While this multi-factor check prevents regular desktop web clients and browsers
 * from submitting videos, true hardware-level attestation on Android would require Play Integrity
 * API cryptographic tokens.
 */
function requireNativeApp(req, _res, next) {
    const platform = (req.headers['x-app-platform'] || req.headers['x-platform-client'] || '').toLowerCase();
    const origin = (req.headers.origin || '').toLowerCase();
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();

    // 1. Explicit native platform header check
    const hasNativeHeader =
        platform === 'android-native' || platform === 'capacitor-android' || platform === 'android';

    // 2. Origin check: native Capacitor webview uses https://localhost, capacitor://localhost, or omits Origin
    const isNativeOrigin =
        !origin ||
        origin.startsWith('capacitor://') ||
        origin.startsWith('https://localhost') ||
        origin === 'http://127.0.0.1:5000' ||
        origin === 'http://localhost:5000';

    // Web browser origins that represent standard website access:
    const isWebBrowserOrigin =
        origin.includes(':5173') || origin.includes(':3000') || origin.includes('vercel.app');

    // 3. User-agent inspection
    const isMobileClient =
        userAgent.includes('android') ||
        userAgent.includes('capacitor') ||
        userAgent.includes('mobile') ||
        userAgent.includes('wv');

    if (!hasNativeHeader || isWebBrowserOrigin || (!isNativeOrigin && !isMobileClient)) {
        return next(
            ApiError.forbidden(
                'Product video verification is only available through the Android mobile application.',
                { code: 'MOBILE_ONLY_VERIFICATION' }
            )
        );
    }

    return next();
}

module.exports = { requireNativeApp };
