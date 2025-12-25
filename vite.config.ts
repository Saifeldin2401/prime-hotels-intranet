import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for some libraries
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Needed for Tailwind and Google Fonts
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "worker-src 'self' blob:;",
    "connect-src 'self' https://api.supabase.co https://htsvjfrofcpkfzvjpwvx.supabase.co wss://htsvjfrofcpkfzvjpwvx.supabase.co ws://htsvjfrofcpkfzvjpwvx.supabase.co https://api-inference.huggingface.co https://huggingface.co https://router.huggingface.co https://api.deepseek.com https://*.hf.co https://*.huggingface.co https://cdn.jsdelivr.net",
    "frame-ancestors 'none'"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

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
    }
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
    sourcemap: process.env.NODE_ENV !== 'production', // Disable sourcemaps in production
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
  },
  // Security: Environment variable validation
  envPrefix: 'VITE_',
})
