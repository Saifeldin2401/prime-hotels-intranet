import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface AnimationOptions {
  duration?: number
  easing?: string
  delay?: number
  fill?: 'forwards' | 'backwards' | 'both' | 'none'
}

interface ScrollAnimationOptions extends AnimationOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

interface StaggerOptions {
  staggerDelay?: number
  staggerFrom?: 'first' | 'last' | 'center'
  reverse?: boolean
}

export function useAnimation(
  elementRef: React.RefObject<HTMLElement>,
  animation: string,
  options: AnimationOptions = {}
) {
  const [isAnimating, setIsAnimating] = useState(false)
  const { theme } = useTheme()

  const {
    duration = 250,
    easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    delay = 0,
    fill = 'forwards'
  } = options

  const animate = useCallback(() => {
    const element = elementRef.current
    if (!element) return

    setIsAnimating(true)

    const animationConfig: KeyframeAnimationOptions = {
      duration,
      easing,
      delay,
      fill
    }

    const animationInstance = element.animate(
      getAnimationKeyframes(animation),
      animationConfig
    )

    animationInstance.addEventListener('finish', () => {
      setIsAnimating(false)
    })

    return animationInstance
  }, [elementRef, animation, duration, easing, delay, fill])

  return { animate, isAnimating }
}

export function useScrollAnimation(
  elementRef: React.RefObject<HTMLElement>,
  animation: string,
  options: ScrollAnimationOptions = {}
) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const { theme } = useTheme()

  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
    duration = 250,
    easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    delay = 0
  } = options

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)

            if (!hasAnimated || !triggerOnce) {
              const animationConfig: KeyframeAnimationOptions = {
                duration,
                easing,
                delay,
                fill: 'forwards'
              }

              entry.target.animate(
                getAnimationKeyframes(animation),
                animationConfig
              )

              if (triggerOnce) {
                setHasAnimated(true)
              }
            }
          } else if (!triggerOnce) {
            setIsVisible(false)
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [elementRef, animation, threshold, rootMargin, triggerOnce, hasAnimated, duration, easing, delay, theme])

  return { isVisible, hasAnimated }
}

export function useStaggeredAnimation(
  elementsRef: React.RefObject<HTMLElement[]>,
  animation: string,
  options: StaggerOptions & AnimationOptions = {}
) {
  const { theme } = useTheme()
  const [isAnimating, setIsAnimating] = useState(false)

  const {
    staggerDelay = 100,
    staggerFrom = 'first',
    reverse = false,
    duration = 250,
    easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    delay = 0
  } = options

  const animate = useCallback(() => {
    const elements = elementsRef.current
    if (!elements || elements.length === 0) return

    setIsAnimating(true)

    let indices: number[] = []
    const elementCount = elements.length

    if (staggerFrom === 'first') {
      indices = reverse ? [...Array(elementCount).keys()].reverse() : [...Array(elementCount).keys()]
    } else if (staggerFrom === 'last') {
      indices = reverse ? [...Array(elementCount).keys()] : [...Array(elementCount).keys()].reverse()
    } else if (staggerFrom === 'center') {
      const center = Math.floor(elementCount / 2)
      indices = []
      for (let i = 0; i <= center; i++) {
        if (center - i >= 0) indices.push(center - i)
        if (center + i < elementCount && i !== 0) indices.push(center + i)
      }
      if (reverse) indices.reverse()
    }

    const animations: Animation[] = []

    indices.forEach((index, staggerIndex) => {
      const element = elements[index]
      if (!element) return

      const staggeredDelay = delay + (staggerIndex * staggerDelay)

      const animationConfig: KeyframeAnimationOptions = {
        duration,
        easing,
        delay: staggeredDelay,
        fill: 'forwards'
      }

      const animationInstance = element.animate(
        getAnimationKeyframes(animation),
        animationConfig
      )

      animations.push(animationInstance)
    })

    Promise.all(animations.map(a => a.finished)).then(() => {
      setIsAnimating(false)
    })

    return animations
  }, [elementsRef, animation, staggerDelay, staggerFrom, reverse, duration, easing, delay])

  return { animate, isAnimating }
}

export function useHoverAnimation(
  elementRef: React.RefObject<HTMLElement>,
  enterAnimation: string,
  exitAnimation: string,
  options: AnimationOptions = {}
) {
  const [isHovered, setIsHovered] = useState(false)
  const { theme } = useTheme()

  const {
    duration = 150,
    easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    delay = 0
  } = options

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const animationConfig: KeyframeAnimationOptions = {
      duration,
      easing,
      delay,
      fill: 'forwards'
    }

    const handleMouseEnter = () => {
      setIsHovered(true)
      element.animate(
        getAnimationKeyframes(enterAnimation),
        animationConfig
      )
    }

    const handleMouseLeave = () => {
      setIsHovered(false)
      element.animate(
        getAnimationKeyframes(exitAnimation),
        animationConfig
      )
    }

    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [elementRef, enterAnimation, exitAnimation, duration, easing, delay, theme])

  return { isHovered }
}

export function useTypewriterAnimation(
  text: string,
  options: { speed?: number; delay?: number } = {}
) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const { speed = 50, delay = 0 } = options

  useEffect(() => {
    const timer = setTimeout(() => {
      let currentIndex = 0

      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex))
          currentIndex++
        } else {
          clearInterval(interval)
          setIsComplete(true)
        }
      }, speed)

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(timer)
  }, [text, speed, delay])

  return { displayedText, isComplete }
}

export function useCounterAnimation(
  target: number,
  options: { duration?: number; delay?: number; prefix?: string; suffix?: string } = {}
) {
  const [current, setCurrent] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const {
    duration = 1000,
    delay = 0,
    prefix = '',
    suffix = ''
  } = options

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true)
      const startTime = Date.now()
      const startValue = current

      const animate = () => {
        const now = Date.now()
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        const newValue = startValue + (target - startValue) * easeOutQuart

        setCurrent(Math.round(newValue))

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
        }
      }

      requestAnimationFrame(animate)
    }, delay)

    return () => clearTimeout(timer)
  }, [target, duration, delay, current])

  const displayValue = `${prefix}${current.toLocaleString()}${suffix}`

  return { displayValue, current, isAnimating }
}

export function useParallaxEffect(
  elementRef: React.RefObject<HTMLElement>,
  speed: number = 0.5
) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleScroll = () => {
      const scrolled = window.pageYOffset
      const rate = scrolled * -speed
      setOffset(rate)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [elementRef, speed])

  return offset
}

export function useMagneticEffect(
  elementRef: React.RefObject<HTMLElement>,
  strength: number = 0.3
) {
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const deltaX = (e.clientX - centerX) * strength
      const deltaY = (e.clientY - centerY) * strength

      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`
    }

    const handleMouseLeave = () => {
      element.style.transform = 'translate(0, 0)'
    }

    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [elementRef, strength])
}

// Helper function to get animation keyframes
function getAnimationKeyframes(animation: string): Keyframe[] {
  const keyframes: Record<string, Keyframe[]> = {
    'fade-in': [
      { opacity: 0 },
      { opacity: 1 }
    ],
    'fade-in-up': [
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    'fade-in-down': [
      { opacity: 0, transform: 'translateY(-20px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    'fade-in-left': [
      { opacity: 0, transform: 'translateX(-20px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    'fade-in-right': [
      { opacity: 0, transform: 'translateX(20px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    'slide-up': [
      { transform: 'translateY(100%)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 }
    ],
    'slide-down': [
      { transform: 'translateY(-100%)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 }
    ],
    'scale-in': [
      { transform: 'scale(0.9)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 }
    ],
    'scale-up': [
      { transform: 'scale(1)' },
      { transform: 'scale(1.05)' }
    ],
    'scale-down': [
      { transform: 'scale(1)' },
      { transform: 'scale(0.95)' }
    ],
    'rotate-360': [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(360deg)' }
    ],
    'bounce': [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-10px)' },
      { transform: 'translateY(0)' }
    ],
    'shake': [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' }
    ],
    'pulse': [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.05)', opacity: 0.8 },
      { transform: 'scale(1)', opacity: 1 }
    ],
    'glow': [
      { boxShadow: '0 0 0 rgba(59, 130, 246, 0)' },
      { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' },
      { boxShadow: '0 0 0 rgba(59, 130, 246, 0)' }
    ]
  }

  return keyframes[animation] || keyframes['fade-in']
}

// Utility functions for common animations
export const createStaggeredChildren = (parentSelector: string, childSelector: string, delay: number = 100) => {
  const parent = document.querySelector(parentSelector)
  if (!parent) return

  const children = parent.querySelectorAll(childSelector)
  children.forEach((child, index) => {
    (child as HTMLElement).style.animationDelay = `${index * delay}ms`
  })
}

export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const isMobile = () => {
  return window.innerWidth < 768
}

// Hook for detecting user preferences
export function useAnimationPreferences() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(motionQuery.matches)
    setIsMobileDevice(window.innerWidth < 768)

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    const handleResize = () => {
      setIsMobileDevice(window.innerWidth < 768)
    }

    motionQuery.addEventListener('change', handleMotionChange)
    window.addEventListener('resize', handleResize)

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return {
    prefersReducedMotion,
    isMobileDevice,
    shouldUseReducedMotion: prefersReducedMotion || isMobileDevice
  }
}
