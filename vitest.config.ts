/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        // Placeholder values so modules that validate config at import time can load
        // in CI (which has no .env). Tests mock the client; nothing talks to Supabase.
        env: {
            VITE_SUPABASE_URL: 'https://test-project.supabase.co',
            VITE_SUPABASE_ANON_KEY: 'sb_publishable_test_placeholder',
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})
