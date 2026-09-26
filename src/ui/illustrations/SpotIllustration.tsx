import type { ReactNode } from 'react'

export type SpotName = 'courses' | 'done' | 'knowledge' | 'certificate' | 'search' | 'team' | 'path' | 'saved'

/**
 * Small friendly scenes for empty states. Drawn with design tokens (fill-ds-*,
 * stroke-ds-*) so they follow light/dark mode and brand themes; decorative.
 */
const SCENES: Record<SpotName, ReactNode> = {
  courses: (
    <>
      <rect x="34" y="30" width="22" height="50" rx="3" className="fill-ds-accent-soft stroke-ds-accent" strokeWidth="2" />
      <rect x="58" y="24" width="22" height="56" rx="3" className="fill-ds-brass/20 stroke-ds-brass" strokeWidth="2" />
      <rect x="82" y="36" width="20" height="44" rx="3" className="fill-ds-success-soft stroke-ds-success" strokeWidth="2" transform="rotate(8 92 58)" />
      <path d="M38 40h14M38 46h10M62 34h14M62 40h10" className="stroke-ds-ink/30" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  done: (
    <>
      <rect x="40" y="22" width="56" height="62" rx="6" className="fill-ds-surface stroke-ds-border-strong" strokeWidth="2" />
      <path d="M50 38l4 4 8-8M50 54l4 4 8-8M50 70l4 4 8-8" className="stroke-ds-success" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M68 40h18M68 56h18M68 72h14" className="stroke-ds-ink/25" strokeWidth="3" strokeLinecap="round" />
      <path d="M104 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" className="fill-ds-brass" />
      <path d="M30 30l1.5 3.5 3.5 1.5-3.5 1.5L30 40l-1.5-3.5L25 35l3.5-1.5z" className="fill-ds-accent" />
    </>
  ),
  knowledge: (
    <>
      <path d="M68 34c-10-6-22-6-32-2v46c10-4 22-4 32 2 10-6 22-6 32-2V32c-10-4-22-4-32 2z" className="fill-ds-surface stroke-ds-accent" strokeWidth="2" strokeLinejoin="round" />
      <path d="M68 34v46" className="stroke-ds-accent" strokeWidth="2" />
      <path d="M43 44h17M43 51h17M43 58h12M76 44h17M76 51h17M76 58h12" className="stroke-ds-ink/25" strokeWidth="2" strokeLinecap="round" />
      <circle cx="98" cy="26" r="6" className="fill-ds-brass/30 stroke-ds-brass" strokeWidth="2" />
    </>
  ),
  certificate: (
    <>
      <rect x="30" y="26" width="76" height="52" rx="4" className="fill-ds-surface stroke-ds-brass" strokeWidth="2" />
      <rect x="35" y="31" width="66" height="42" rx="2" className="fill-none stroke-ds-brass/40" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M45 44h30M45 51h22" className="stroke-ds-ink/30" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="88" cy="62" r="11" className="fill-ds-brass" />
      <path d="M83 72l-3 12 8-4 8 4-3-12" className="fill-ds-brass/70" />
      <path d="M84 62l3 3 5-6" className="stroke-white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  search: (
    <>
      <circle cx="62" cy="50" r="20" className="fill-ds-accent-soft stroke-ds-accent" strokeWidth="3" />
      <path d="M77 65l16 16" className="stroke-ds-accent" strokeWidth="6" strokeLinecap="round" />
      <path d="M55 44a8 8 0 0 1 12 0" className="stroke-ds-surface" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="100" cy="30" r="3" className="fill-ds-brass" />
      <circle cx="34" cy="70" r="2.5" className="fill-ds-brass/60" />
    </>
  ),
  team: (
    <>
      <circle cx="50" cy="44" r="10" className="fill-ds-accent-soft stroke-ds-accent" strokeWidth="2" />
      <path d="M34 78c0-10 7-16 16-16s16 6 16 16" className="fill-ds-accent-soft stroke-ds-accent" strokeWidth="2" />
      <circle cx="86" cy="44" r="10" className="fill-ds-brass/20 stroke-ds-brass" strokeWidth="2" />
      <path d="M70 78c0-10 7-16 16-16s16 6 16 16" className="fill-ds-brass/20 stroke-ds-brass" strokeWidth="2" />
      <path d="M68 24l2 4 4 1.5-4 1.5-2 4-2-4-4-1.5 4-1.5z" className="fill-ds-success" />
    </>
  ),
  path: (
    <>
      <path d="M30 80c20 0 16-24 38-24s18-26 40-26" className="stroke-ds-border-strong" strokeWidth="4" fill="none" strokeDasharray="6 6" strokeLinecap="round" />
      <circle cx="30" cy="80" r="6" className="fill-ds-success" />
      <circle cx="68" cy="56" r="6" className="fill-ds-brass" />
      <path d="M104 18v18" className="stroke-ds-ink/60" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M104 18h14l-4 5 4 5h-14z" className="fill-ds-accent" />
    </>
  ),
  saved: (
    <>
      <path d="M50 24h36a4 4 0 0 1 4 4v56l-22-14-22 14V28a4 4 0 0 1 4-4z" className="fill-ds-brass/20 stroke-ds-brass" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M68 38l3 6 6.5 1-4.8 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4-4.8-4.6 6.5-1z" className="fill-ds-brass" />
    </>
  ),
}

export function SpotIllustration({ name, className }: { name: SpotName; className?: string }) {
  return (
    <svg viewBox="0 0 136 100" aria-hidden="true" className={className} width="136" height="100">
      <ellipse cx="68" cy="88" rx="46" ry="6" className="fill-ds-ink/5" />
      <circle cx="68" cy="52" r="40" className="fill-ds-surface-subtle" />
      <g className="motion-safe:animate-float">{SCENES[name]}</g>
    </svg>
  )
}
