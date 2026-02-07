import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { sentryVitePlugin } from "@sentry/vite-plugin"

const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for some libraries
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Needed for Tailwind and Google Fonts
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "worker-src 'self' blob:;",
    `connect-src 'self' ${process.env.VITE_SUPABASE_URL || 'https://htsvjfrofcpkfzvjpwvx.supabase.co'} wss://${(process.env.VITE_SUPABASE_URL || 'https://htsvjfrofcpkfzvjpwvx.supabase.co').replace('https://', '')} https://api-inference.huggingface.co https://huggingface.co https://router.huggingface.co https://api.deepseek.com https://*.hf.co https://*.huggingface.co https://cdn.jsdelivr.net https://o4508792767840256.ingest.de.sentry.io https://*.sentry.io`,
    "frame-ancestors 'none'"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

const sentryRelease = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VITE_RELEASE
const sentryEnv = process.env.VERCEL_ENV || process.env.VITE_SENTRY_ENV || process.env.NODE_ENV
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
          assets: "./dist/**"
        }
      })
    ] : [])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-bubble-menu', '@tiptap/extension-floating-menu']
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Security: CORS configuration
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com'] // Replace with actual domains in production
        : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    },
    // Security: Rate limiting middleware
    middlewareMode: false,
  },
  build: {
    // Security: Build optimizations
    minify: 'terser',
    sourcemap: enableSentryUpload || process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs']
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
  },
  // Security: Environment variable validation
  envPrefix: 'VITE_',
})
