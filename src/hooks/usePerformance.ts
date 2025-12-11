import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface PerformanceMetrics {
  renderTime: number
  componentCount: number
  reRenderCount: number
  memoryUsage?: number
  bundleSize?: number
}

interface PerformanceOptions {
  trackRenders?: boolean
  trackMemory?: boolean
  trackBundleSize?: boolean
  sampleRate?: number
}

export function usePerformance(options: PerformanceOptions = {}) {
  const {
    trackRenders = false,
    trackMemory = false,
    trackBundleSize = false,
    sampleRate = 100
  } = options

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentCount: 0,
    reRenderCount: 0
  })

  const renderCountRef = useRef(0)
  const startTimeRef = useRef<number>(0)

  // Track render performance
  useEffect(() => {
    if (!trackRenders) return

    renderCountRef.current += 1
    startTimeRef.current = performance.now()

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTimeRef.current

      setMetrics(prev => ({
        ...prev,
        renderTime,
        reRenderCount: renderCountRef.current
      }))
    }
  })

  // Track memory usage
  useEffect(() => {
    if (!trackMemory) return

    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize
        }))
      }
    }

    const interval = setInterval(measureMemory, sampleRate)
    return () => clearInterval(interval)
  }, [trackMemory, sampleRate])

  // Track bundle size
  useEffect(() => {
    if (!trackBundleSize) return

    const measureBundleSize = () => {
      const scripts = document.querySelectorAll('script[src]')
      let totalSize = 0
      
      scripts.forEach(script => {
        const src = (script as HTMLScriptElement).src
        if (src.includes('chunk') || src.includes('bundle')) {
          // Estimate size - this is approximate
          totalSize += 50000 // 50KB per chunk estimate
        }
      })

      setMetrics(prev => ({
        ...prev,
        bundleSize: totalSize
      }))
    }

    measureBundleSize()
  }, [trackBundleSize])

  return metrics
}

// Hook for lazy loading components
export function useLazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: { fallback?: React.ComponentType; delay?: number } = {}
) {
  const [Component, setComponent] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { fallback: Fallback, delay = 200 } = options

  const loadComponent = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const module = await importFunc()
      setComponent(() => module.default)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [importFunc])

  useEffect(() => {
    const timer = setTimeout(loadComponent, delay)
    return () => clearTimeout(timer)
  }, [loadComponent, delay])

  const LazyComponent = useMemo(() => {
    if (Component) return Component
    if (Fallback && loading) return Fallback
    if (error) throw error
    return () => null
  }, [Component, Fallback, loading, error])

  return {
    Component: LazyComponent,
    loading,
    error,
    retry: loadComponent
  }
}

// Hook for virtual scrolling
export function useVirtualScroll<T>(
  items: T[],
  options: {
    itemHeight: number
    containerHeight: number
    overscan?: number
  }
) {
  const { itemHeight, containerHeight, overscan = 5 } = options
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [items, visibleRange])

  const totalHeight = useMemo(() => {
    return items.length * itemHeight
  }, [items.length, itemHeight])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    startIndex: visibleRange.startIndex,
    endIndex: visibleRange.endIndex,
    handleScroll
  }
}

// Hook for debouncing
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>(null)

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay]) as T
}

// Hook for throttling
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0)

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now
      callback(...args)
    }
  }, [callback, delay]) as T
}

// Hook for intersection observer
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [entries, setEntries] = useState<IntersectionObserverEntry[]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)

  const observe = useCallback((element: Element) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        setEntries(entries)
      }, options)
    }
    observerRef.current.observe(element)
  }, [options])

  const unobserve = useCallback((element: Element) => {
    if (observerRef.current) {
      observerRef.current.unobserve(element)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return { entries, observe, unobserve }
}

// Hook for resize observer
export function useResizeObserver() {
  const [entries, setEntries] = useState<ResizeObserverEntry[]>([])
  const observerRef = useRef<ResizeObserver | null>(null)

  const observe = useCallback((element: Element) => {
    if (!observerRef.current) {
      observerRef.current = new ResizeObserver((entries) => {
        setEntries(entries)
      })
    }
    observerRef.current.observe(element)
  }, [])

  const unobserve = useCallback((element: Element) => {
    if (observerRef.current) {
      observerRef.current.unobserve(element)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return { entries, observe, unobserve }
}

// Hook for network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    const updateConnectionType = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown')
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    updateConnectionType()

    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', updateConnectionType)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (connection) {
        connection.removeEventListener('change', updateConnectionType)
      }
    }
  }, [])

  return { isOnline, connectionType }
}

// Hook for idle detection
export function useIdleDetection(timeout: number = 5000) {
  const [isIdle, setIsIdle] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>(null)

  const events = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ]

  const handleActivity = useCallback(() => {
    setIsIdle(false)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setIsIdle(true)
    }, timeout)
  }, [timeout]) // Added setIsIdle as a dependency

  useEffect(() => {
    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Start the initial timeout
    handleActivity()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [handleActivity])

  return isIdle
}

// Hook for caching
export function useCache<T>(key: string, fetcher: () => Promise<T>, ttl: number = 5 * 60 * 1000) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadFromCache = async () => {
      try {
        const cached = localStorage.getItem(key)
        
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached)
          const now = Date.now()
          
          if (now - timestamp < ttl) {
            setData(cachedData)
            return
          }
        }

        setLoading(true)
        const freshData = await fetcher()
        setData(freshData)
        
        localStorage.setItem(key, JSON.stringify({
          data: freshData,
          timestamp: Date.now()
        }))
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    loadFromCache()
  }, [key, fetcher, ttl])

  const invalidate = useCallback(() => {
    localStorage.removeItem(key)
    setData(null)
  }, [key])

  return { data, loading, error, invalidate }
}

// Hook for prefetching
export function usePrefetch() {
  const { profile } = useAuth()

  const prefetch = useCallback(async (url: string, priority: 'high' | 'low' = 'low') => {
    if (!profile) return

    try {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      
      if (priority === 'high') {
        link.as = 'fetch'
        link.crossOrigin = 'anonymous'
      }
      
      document.head.appendChild(link)
      
      // Remove after 10 seconds to avoid memory leaks
      setTimeout(() => {
        document.head.removeChild(link)
      }, 10000)
    } catch (error) {
      console.warn('Prefetch failed:', error)
    }
  }, [profile])

  const prefetchCritical = useCallback((urls: string[]) => {
    urls.forEach(url => prefetch(url, 'high'))
  }, [prefetch])

  return { prefetch, prefetchCritical }
}

// Performance monitoring utilities
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now()
  fn()
  const end = performance.now()
  
  console.log(`${name} took ${end - start} milliseconds`)
  
  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    // Send performance metrics to your analytics service
  }
}

export const markPerformance = (name: string) => {
  performance.mark(name)
}

export const measurePerformanceMark = (name: string, startMark: string) => {
  performance.measure(name, startMark)
  const measure = performance.getEntriesByName(name, 'measure')[0]
  return measure ? measure.duration : 0
}

// Resource optimization utilities
export const optimizeImages = () => {
  const images = document.querySelectorAll('img[data-src]')
  
  images.forEach(img => {
    const imageElement = img as HTMLImageElement
    const src = imageElement.dataset.src
    
    if (src) {
      // Use Intersection Observer for lazy loading
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            imageElement.src = src
            imageElement.removeAttribute('data-src')
            observer.unobserve(imageElement)
          }
        })
      })
      
      observer.observe(imageElement)
    }
  })
}

export const preloadCriticalResources = (resources: string[]) => {
  resources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource
    
    if (resource.endsWith('.js')) {
      link.as = 'script'
    } else if (resource.endsWith('.css')) {
      link.as = 'style'
    } else if (resource.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
      link.as = 'image'
    }
    
    document.head.appendChild(link)
  })
}
