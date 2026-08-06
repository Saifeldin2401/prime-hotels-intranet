import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from "react-i18next"
import { BarChart3 } from 'lucide-react'
import { usePerformanceTimeline } from '@/hooks/usePerformanceTimeline'

export function PerformanceChart() {
  const { t } = useTranslation('dashboard')
  const { data, isLoading } = usePerformanceTimeline()

  const points = data?.points || []
  const overallScore = data?.overallScore ?? 0
  const targetScore = data?.targetScore ?? 85
  const trendPercentage = data?.trendPercentage ?? 0
  const rating = data?.rating || 'Needs Focus'

  // SVG coordinates calculation
  const width = 360
  const height = 140
  const padding = 20

  const getX = (index: number) => 
    points.length <= 1 ? padding : padding + (index * (width - 2 * padding)) / (points.length - 1)
  
  const getY = (val: number) => height - padding - (val * (height - 2 * padding)) / 100

  const perfD = points.reduce((acc, p, i) => {
    const x = getX(i)
    const y = getY(p.perf)
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
  }, '')

  const targetY = getY(targetScore)
  const targetD = `M ${padding} ${targetY} L ${width - padding} ${targetY}`

  const areaD = points.length > 0 
    ? `${perfD} L ${getX(points.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`
    : ''

  const getRatingColor = (r: string) => {
    if (r === 'Excellent') return 'text-emerald-600 dark:text-emerald-400'
    if (r === 'Good') return 'text-blue-600 dark:text-blue-400'
    return 'text-amber-600 dark:text-amber-400'
  }

  return (
    <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-md rounded-[24px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md overflow-hidden h-full flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 px-6 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase flex items-center gap-2 font-sans">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          {t('widgets.performance_overview', 'Performance Overview')}
        </CardTitle>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span>{t('performance.performance', 'Performance')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-500 rounded" />
            <span>{t('performance.target', 'Target')}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full space-y-2">
              <Skeleton className="w-full h-[150px] rounded-xl" />
            </div>
          </div>
        ) : points.length === 0 ? (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center py-12 text-slate-500 w-full font-medium">
               No performance data available for this week.
            </div>
          </div>
        ) : (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          
          {/* Left Line Chart SVG */}
          <div className="flex-1 w-full space-y-2">
            <div className="relative w-full h-[150px]">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Target dashed line */}
                <path d={targetD} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />

                {/* Performance area fill */}
                {areaD && <path d={areaD} fill="url(#perfGradient)" />}

                {/* Performance line */}
                {perfD && <path d={perfD} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

                {/* Data points */}
                {points.map((p, i) => (
                  <circle
                    key={p.day + i}
                    cx={getX(i)}
                    cy={getY(p.perf)}
                    r="4"
                    className="fill-blue-600 stroke-white dark:stroke-slate-900 stroke-2 hover:r-6 transition-all"
                  >
                    <title>{`${p.day}: ${p.perf}%`}</title>
                  </circle>
                ))}
              </svg>

              {/* Day Labels */}
              <div className="flex items-center justify-between px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 pt-1">
                {points.map((p, i) => (
                  <span key={p.day + i}>{p.day}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Donut Target Summary */}
          <div className="w-full lg:w-48 shrink-0 rounded-2xl bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800/60 flex flex-col items-center justify-center text-center space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('performance.overall', 'Overall Performance')}
            </div>

            <div className="relative flex items-center justify-center w-24 h-24">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-blue-600"
                  strokeDasharray={`${overallScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {overallScore}%
                </span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                  trendPercentage >= 0 
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' 
                    : 'text-rose-600 bg-rose-50 dark:bg-rose-950/60'
                }`}>
                  {trendPercentage >= 0 ? `+${trendPercentage}%` : `${trendPercentage}%`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between w-full text-[10px] font-bold pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span className={getRatingColor(rating)}>
                {t(`performance.rating_${rating.toLowerCase().replace(' ', '_')}`, rating)}
              </span>
              <span className="text-slate-400">
                {t('performance.target_val', `Target: ${targetScore}%`)}
              </span>
            </div>
          </div>

        </div>
        )}
      </CardContent>
    </Card>
  )
}
export default PerformanceChart
