import React, { useMemo } from 'react'

export interface BarChartItem {
  label: string
  value: number
  maxValue?: number
  secondaryText?: string
  variant?: 'accent' | 'success' | 'warning' | 'danger' | 'info'
}

export interface HorizontalBarChartProps {
  items: BarChartItem[]
  className?: string
}

const barColorMap = {
  accent: 'bg-ds-accent',
  success: 'bg-ds-success',
  warning: 'bg-ds-warning',
  danger: 'bg-ds-danger',
  info: 'bg-ds-info',
}

/**
 * Restrained Horizontal Bar Chart per Section 31 & 32.
 * Ideal for "Completion by Department" and hotel compliance rosters.
 */
export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  items,
  className = '',
}) => {
  const globalMax = Math.max(...items.map((i) => i.maxValue || i.value || 100), 100)

  return (
    <div className={`space-y-3 font-sans ${className}`}>
      {items.map((item, idx) => {
        const max = item.maxValue || globalMax
        const pct = Math.min(100, Math.max(0, Math.round((item.value / max) * 100)))
        const barColor = barColorMap[item.variant || 'accent']

        return (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ds-ink truncate">{item.label}</span>
              <div className="flex items-center gap-2 shrink-0 ms-2 font-mono">
                {item.secondaryText && (
                  <span className="text-[11px] text-ds-muted">{item.secondaryText}</span>
                )}
                <span className="font-semibold text-ds-ink">{pct}%</span>
              </div>
            </div>

            <div className="h-2 w-full bg-ds-surface-subtle rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 motion-reduce:transition-none ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export interface DonutSegment {
  label: string
  value: number
  color: string // Tailwind token or CSS variable
}

export interface SimpleDonutChartProps {
  segments: DonutSegment[]
  size?: number
  centerLabel?: string
  centerValue?: string | number
  className?: string
}

/**
 * Restrained Simple Donut Chart per Section 31 & 32.
 * Clean, flat segmented circle without decorative 3D or gradients.
 */
export const SimpleDonutChart: React.FC<SimpleDonutChartProps> = ({
  segments,
  size = 140,
  centerLabel,
  centerValue,
  className = '',
}) => {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const calculatedSegments = useMemo(() => {
    let acc = 0
    const result = []
    for (const seg of segments) {
      const offset = acc
      acc += seg.value / total
      result.push({
        ...seg,
        strokeDasharray: `${(seg.value / total) * circumference} ${circumference}`,
        strokeDashoffset: -offset * circumference,
      })
    }
    return result
  }, [segments, total, circumference])

  return (
    <div className={`flex flex-col items-center justify-center font-sans ${className}`}>
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--color-surface-subtle)"
            strokeWidth={strokeWidth}
          />
          {calculatedSegments.map((seg, idx) => (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              className="transition-all duration-300 motion-reduce:transition-none"
            />
          ))}
        </svg>

        {(centerLabel || centerValue !== undefined) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue !== undefined && (
              <span className="text-xl font-bold font-mono text-ds-ink">{centerValue}</span>
            )}
            {centerLabel && (
              <span className="text-[10px] uppercase font-semibold text-ds-muted">{centerLabel}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-ds-muted">{seg.label}</span>
            <span className="font-mono font-medium text-ds-ink">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const DonutChart = SimpleDonutChart
export type DonutChartProps = SimpleDonutChartProps

export interface SparklineChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
}

/**
 * Compact Sparkline Chart per Section 32.
 */
export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 120,
  height = 32,
  color = 'rgb(var(--ds-brass))',
  className = '',
}) => {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width
      const y = height - ((val - min) / range) * (height - 6) - 3
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className={`overflow-visible ${className}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}
