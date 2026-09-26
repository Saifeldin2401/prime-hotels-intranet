import { useEffect, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * A thin bar along the top of the viewport showing how far through the
 * article body the reader has scrolled. Measures the article element, so
 * comments and related articles below it do not count.
 */
export function ReadingProgress({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const { t } = useTranslation('knowledge')
  const [pct, setPct] = useState(0)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const el = targetRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const read = total <= 0 ? (rect.top < window.innerHeight ? 1 : 0) : Math.min(1, Math.max(0, -rect.top / total))
      setPct(Math.round(read * 100))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [targetRef])

  return (
    <div
      role="progressbar"
      aria-label={t('reader.progress', 'Reading progress')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 bg-transparent print:hidden"
    >
      <div className="h-full origin-left bg-gradient-to-r from-ds-accent to-ds-brass transition-transform duration-150 ease-out rtl:origin-right" style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  )
}
