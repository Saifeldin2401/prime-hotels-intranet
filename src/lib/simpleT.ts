import type { TFunction } from 'i18next'

/** The plain `t(key, fallback)` shape that presentational components accept as a prop. */
export type SimpleT = (key: string, fallback?: string, options?: Record<string, unknown>) => string

/** Adapts i18next's overloaded `TFunction` to {@link SimpleT} (always returns a string). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toSimpleT = (t: TFunction<any, any>): SimpleT => (key, fallback, options) =>
  String(t(key, { ...options, defaultValue: fallback ?? key }))
