import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { sentryVitePlugin } from "@sentry/vite-plugin"

const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://*.vercel-scripts.com", // Needed for some libraries, Vercel Analytics and Speed Insights
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Needed for Tailwind and Google Fonts
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "worker-src 'self' blob:;",
    "media-src 'self' blob: https://*.supabase.co",
    `connect-src 'self' ${process.env.VITE_SUPABASE_URL || 'https://*.supabase.co'} wss://*.supabase.co https://api-inference.huggingface.co https://huggingface.co https://router.huggingface.co https://api.deepseek.com https://*.hf.co https://*.huggingface.co https://cdn.jsdelivr.net https://*.sentry.io https://date.nager.at https://va.vercel-scripts.at https://va.vercel-scripts.com https://*.vercel-scripts.com https://api.open-meteo.com https://api.aladhan.com https://fonts.googleapis.com https://fonts.gstatic.com https://images.unsplash.com`,
    // Allow YouTube, Vimeo video embeds and Supabase storage for document previews
    `frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://vimeo.com https://*.supabase.co`,
    "frame-ancestors 'none'"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), microphone=(), camera=()',
  // Cache busting: force browsers to fetch latest after updates
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
}

const sentryRelease = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VITE_RELEASE
const sentryEnv = process.env.VERCEL_ENV || process.env.VITE_SENTRY_ENV || process.env.NODE_ENV
const appBuildVersion = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VITE_RELEASE || new Date().toISOString()
const enableSentryUpload = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Security: Add security headers plugin
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          // Add security headers to all responses
          Object.entries(securityHeaders).forEach(([key, value]) => {
            res.setHeader(key, value)
          })
          next()
        })
      }
    },
    ...(enableSentryUpload ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: sentryRelease,
        deploy: {
          env: sentryEnv
        },
        sourcemaps: {
          assets: "./dist/**",
          // Delete sourcemaps after uploading to Sentry so they aren't served to users
          filesToDeleteAfterUpload: "./dist/**/*.map"
        }
      })
    ] : [])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Security: CORS configuration
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? (process.env.VITE_ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) || ['https://phg-connect.com', 'https://www.phg-connect.com'])
        : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    },
    // Security: Rate limiting middleware
    middlewareMode: false,
  },
  optimizeDeps: {
    // `marked` is imported by lazy-loaded routes. Excluding it avoids Vite's
    // prebundle cache serving stale `.vite/deps/marked.js` during local dev.
    exclude: ['marked'],
  },
  build: {
    // Security: Build optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Generate sourcemaps for Sentry upload but use 'hidden' in production so they aren't
    // referenced in the bundle (Sentry plugin deletes .map files after upload anyway).
    sourcemap: enableSentryUpload ? 'hidden' : (process.env.NODE_ENV !== 'production'),
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          // Large visualization / document libraries
          if (
            id.includes('/node_modules/mermaid') ||
            id.includes('/node_modules/d3-') ||
            id.includes('/node_modules/dagre-d3-es') ||
            id.includes('/node_modules/khroma')
          ) {
            return 'vendor-mermaid'
          }
          if (id.includes('/node_modules/katex')) return 'vendor-katex'
          if (id.includes('/node_modules/pdfjs-dist')) return 'vendor-pdfjs'
          if (id.includes('/node_modules/jspdf') || id.includes('/node_modules/jspdf-autotable')) return 'vendor-jspdf'
          if (id.includes('/node_modules/html2pdf.js') || id.includes('/node_modules/html2canvas') || id.includes('/node_modules/canvg')) {
            return 'vendor-html2pdf'
          }
          if (id.includes('/node_modules/exceljs')) return 'vendor-excel'
          if (id.includes('/node_modules/@tiptap/')) return 'vendor-editor'

          // Mobile-heavy / commonly large bundles
          if (id.includes('/node_modules/lucide-react')) return 'vendor-icons'
          if (id.includes('/node_modules/framer-motion')) return 'vendor-motion'
          if (id.includes('/node_modules/recharts')) return 'vendor-charts'

          // Core framework dependencies (keep main small)
          if (id.includes('/node_modules/@supabase/')) return 'vendor-supabase'
          if (id.includes('/node_modules/@tanstack/react-table')) return 'vendor-table'
          if (id.includes('/node_modules/@tanstack/react-query')) return 'vendor-query'
          if (id.includes('/node_modules/react-router') || id.includes('/node_modules/@remix-run/router')) return 'vendor-router'
          if (id.includes('/node_modules/i18next') || id.includes('/node_modules/react-i18next')) return 'vendor-i18n'

          // Shared UI primitives (Radix, etc.)
          if (
            id.includes('/node_modules/@radix-ui/') ||
            id.includes('/node_modules/class-variance-authority') ||
            id.includes('/node_modules/clsx') ||
            id.includes('/node_modules/tailwind-merge')
          ) {
            return 'vendor-ui'
          }

          return undefined
        }
      }
    }
  },
  define: {
    'process.env': {},
    'process.browser': true,
    global: 'globalThis',
    'import.meta.env.VITE_RELEASE': JSON.stringify(sentryRelease || ''),
    'import.meta.env.VITE_SENTRY_ENV': JSON.stringify(sentryEnv || ''),
    'import.meta.env.VITE_APP_BUILD_VERSION': JSON.stringify(appBuildVersion),
  },
  // Security: Environment variable validation
  envPrefix: 'VITE_',
})
