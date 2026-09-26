import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/** A number that counts up to its value once, for points and scores. */
export function CountUp({ value, duration = 900, locale, className }: { value: number; duration?: number; locale?: string; className?: string }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)

  useEffect(() => {
    if (reduce) {
      setShown(value)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, reduce])

  return <span className={className}>{shown.toLocaleString(locale)}</span>
}
