import { Award } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Scalloped rosette seal, drawn in currentColor so it follows the theme. */
export function CertificateSeal({ size = 72, className }: { size?: number; className?: string }) {
  const bumps = 24
  const cx = 50
  const cy = 50
  const outer = 48
  const inner = 43
  const points: string[] = []
  for (let i = 0; i < bumps * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI * i) / bumps - Math.PI / 2
    points.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return (
    <span aria-hidden="true" className={cn('relative inline-flex shrink-0 items-center justify-center text-ds-brass', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0">
        <polygon points={points.join(' ')} fill="currentColor" opacity="0.9" />
        <circle cx={cx} cy={cy} r="36" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="2 3" />
        <circle cx={cx} cy={cy} r="31" fill="white" fillOpacity="0.14" />
      </svg>
      <Award className="relative h-[38%] w-[38%] text-white drop-shadow-sm" />
    </span>
  )
}
