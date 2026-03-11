/**
 * Domain-split type barrel export.
 *
 * All interfaces are organized into domain-specific files for maintainability
 * but re-exported from here so existing `import ... from '@/lib/types'` works unchanged.
 */

import type { AppRole } from '../constants'
export type { AppRole }

// Re-export EntityStatus from Supabase generated types
import type { Database } from '@/types/supabase'
export type EntityStatus = Database['public']['Enums']['entity_status']

// ── Domain re-exports ──────────────────────────────────────────────────────
export * from './profile'
export * from './tasks'
export * from './messaging'
export * from './notifications'
export * from './documents'
export * from './training'
export * from './announcements'
export * from './compliance'
export * from './hr'
export * from './maintenance'
export * from './sop'
export * from './onboarding'
