import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * Dev server target for the /api proxy.
 *
 * Inside docker compose the backend is reachable as `backend`; a developer
 * running `npm run dev` on the host reaches it on localhost.
 */
const API_PROXY_TARGET = process.env.VITE_DEV_API_PROXY || 'http://localhost:5000'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    // Hostnames the dev server will answer for. `marketplace.io` is mapped to
    // 127.0.0.1 in /etc/hosts for this deployment.
    allowedHosts: [
      'marketplace.io',
      'localhost',
    ],
    /**
     * Proxy the API so the SPA talks to its own origin.
     *
     * Without this, the app had to call an absolute URL (http://localhost:5000)
     * that can never match the origin the page is served from — so opening the
     * site as http://marketplace.io made every request cross-origin and it broke
     * on the CORS allowlist. Serving /api from the same origin removes the
     * preflight entirely and means the app works under any hostname.
     *
     * This mirrors what nginx.conf already does for the production build, so dev
     * and production now route identically.
     */
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        // Forward X-Forwarded-For so the backend's rate limiter sees real
        // client IPs rather than bucketing every user under the proxy.
        xfwd: true,
      },
    },
  },
})
