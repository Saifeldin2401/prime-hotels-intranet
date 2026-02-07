# Sentry Integration Report

## Changes Made
- Installed `@sentry/react` dependency.
- Initialized Sentry in `src/main.tsx` with performance monitoring and session replay enabled.
- Updated `src/components/common/ErrorBoundary.tsx` to trap React errors and report to Sentry.
- Updated `src/lib/security-config.ts` to log exceptions directly to Sentry via the `securityUtils.logException` utility (used by `RouteErrorBoundary` and others).
- Added `VITE_SENTRY_DSN` to `.env.example`.
- Updated TypeScript definitions in `src/custom.d.ts`.

## How to Set Up
1. **Create Sentry Project**: Go to [Sentry.io](https://sentry.io/), create a new project for React.
2. **Get DSN**: Copy the DSN key provided by Sentry (Client Keys -> DSN).
3. **Configure Environment**: 
   - Add `VITE_SENTRY_DSN=your_dsn_here` to your `.env` or `.env.local` file.
   - Example format: `https://examplePublicKey@o0.ingest.sentry.io/0`

## Features Enabled
- **Error Tracking**: Automatically captures unhandled exceptions.
- **Performance Monitoring**: Traces transactions to identify slow operations (Sample rate: 100%).
- **Session Replay**: Records session videos for debugging (Sample rate: 10% for general sessions, 100% for sessions with errors).

## Next Steps (Optional)
- To enable source maps for better stack traces, you can configure the Sentry Vite plugin in `vite.config.ts`. This requires setting up an auth token.
- Adjust `tracesSampleRate` and `replaysSessionSampleRate` in `src/main.tsx` based on your production traffic volume.
