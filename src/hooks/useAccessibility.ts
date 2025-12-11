import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface AccessibilityOptions {
  enableKeyboardNavigation?: boolean
  enableScreenReader?: boolean
  enableHighContrast?: boolean
  enableReducedMotion?: boolean
  enableLargeText?: boolean
}

export function useAccessibility(options: AccessibilityOptions = {}) {
  const {
    enableKeyboardNavigation = true,
    enableScreenReader = true,
    enableHighContrast = false,
    enableReducedMotion = false,
    enableLargeText = false
  } = options

  const [preferences, setPreferences] = useState({
    highContrast: enableHighContrast,
    reducedMotion: enableReducedMotion,
    largeText: enableLargeText,
    keyboardNavigation: enableKeyboardNavigation,
    screenReader: enableScreenReader
  })

  const { theme } = useTheme()

  // Detect user preferences from system
  useEffect(() => {
    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      largeText: window.matchMedia('(prefers-reduced-transparency: reduce)')
    }

    const updatePreferences = () => {
      setPreferences(prev => ({
        ...prev,
        reducedMotion: mediaQueries.reducedMotion.matches,
        highContrast: mediaQueries.highContrast.matches,
        largeText: mediaQueries.largeText.matches
      }))
    }

    updatePreferences()

    Object.values(mediaQueries).forEach(mq => {
      mq.addEventListener('change', updatePreferences)
    })

    return () => {
      Object.values(mediaQueries).forEach(mq => {
        mq.removeEventListener('change', updatePreferences)
      })
    }
  }, [])

  // Apply accessibility preferences
  useEffect(() => {
    const root = document.documentElement

    if (preferences.highContrast) {
      root.classList.add('high-contrast')
      if (String(theme) === 'light') {
        // Apply high contrast light theme
        root.style.setProperty('--background', '255, 255, 255')
        root.style.setProperty('--foreground', '0, 0, 0')
      } else {
        // Apply high contrast dark theme
        root.style.setProperty('--background', '0, 0, 0')
        root.style.setProperty('--foreground', '255, 255, 255')
      }
    } else {
      root.classList.remove('high-contrast')
      root.style.removeProperty('--background')
      root.style.removeProperty('--foreground')
    }

    if (preferences.reducedMotion) {
      root.classList.add('reduced-motion')
    } else {
      root.classList.remove('reduced-motion')
    }

    if (preferences.largeText) {
      root.classList.add('large-text')
    } else {
      root.classList.remove('large-text')
    }
  }, [preferences, theme])

  const updatePreference = useCallback((key: keyof typeof preferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }, [])

  return {
    preferences,
    updatePreference,
    isHighContrast: preferences.highContrast,
    isReducedMotion: preferences.reducedMotion,
    isLargeText: preferences.largeText,
    isKeyboardNavigation: preferences.keyboardNavigation,
    isScreenReader: preferences.screenReader
  }
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
  items: Array<{ id: string; element?: HTMLElement }>
) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLElement>(null)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex(prev => (prev + 1) % items.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex(prev => (prev - 1 + items.length) % items.length)
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(items.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (activeIndex >= 0 && items[activeIndex]) {
          items[activeIndex].element?.click()
        }
        break
      case 'Escape':
        event.preventDefault()
        setActiveIndex(-1)
        containerRef.current?.focus()
        break
    }
  }, [items, activeIndex])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (activeIndex >= 0 && items[activeIndex]?.element) {
      items[activeIndex].element?.focus()
    }
  }, [activeIndex, items])

  return {
    activeIndex,
    setActiveIndex,
    containerRef
  }
}

// Hook for focus trap
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  const getFocusableElements = useCallback(() => {
    const container = containerRef.current
    if (!container) return []

    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ]

    return Array.from(container.querySelectorAll(selectors.join(', '))) as HTMLElement[]
  }, [])

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }, [getFocusableElements])

  useEffect(() => {
    if (!isActive) return

    const container = containerRef.current
    if (!container) return

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus the first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    // Add event listener for tab trapping
    container.addEventListener('keydown', trapFocus)

    return () => {
      container.removeEventListener('keydown', trapFocus)
      
      // Restore focus to the previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive, getFocusableElements, trapFocus])

  return containerRef
}

// Hook for ARIA live regions
export function useAriaLive() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)

    // Remove after announcement is made
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [])

  const announcePolite = useCallback((message: string) => {
    announce(message, 'polite')
  }, [announce])

  const announceAssertive = useCallback((message: string) => {
    announce(message, 'assertive')
  }, [announce])

  return {
    announce,
    announcePolite,
    announceAssertive
  }
}

// Hook for color contrast checking
export function useColorContrast() {
  const getLuminance = useCallback((hex: string): number => {
    const rgb = hex.replace('#', '').match(/.{2}/g)
    if (!rgb) return 0

    const [r, g, b] = rgb.map(x => {
      const val = parseInt(x, 16)
      return val / 255 <= 0.03928
        ? val / 255 / 12.92
        : Math.pow((val / 255 + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }, [])

  const getContrastRatio = useCallback((foreground: string, background: string): number => {
    const lum1 = getLuminance(foreground)
    const lum2 = getLuminance(background)
    
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    
    return (brightest + 0.05) / (darkest + 0.05)
  }, [getLuminance])

  const isWCAGCompliant = useCallback((foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
    const ratio = getContrastRatio(foreground, background)
    
    switch (level) {
      case 'AA':
        return ratio >= 4.5
      case 'AAA':
        return ratio >= 7
      default:
        return false
    }
  }, [getContrastRatio])

  return {
    getContrastRatio,
    isWCAGCompliant,
    getLuminance
  }
}

// Hook for screen reader detection
export function useScreenReaderDetection() {
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false)

  useEffect(() => {
    const detectScreenReader = () => {
      // Create a visually hidden element that screen readers will announce
      const detector = document.createElement('div')
      detector.setAttribute('aria-live', 'polite')
      detector.className = 'sr-only'
      detector.textContent = 'Screen reader detection test'
      
      document.body.appendChild(detector)
      
      // Check if the element was focused (indicating screen reader)
      setTimeout(() => {
        const isActive = document.activeElement === detector
        setIsScreenReaderActive(isActive)
        document.body.removeChild(detector)
      }, 100)
    }

    detectScreenReader()
  }, [])

  return isScreenReaderActive
}

// Hook for skip links
export function useSkipLinks() {
  const createSkipLink = useCallback((targetId: string, text: string) => {
    const skipLink = document.createElement('a')
    skipLink.href = `#${targetId}`
    skipLink.textContent = text
    skipLink.className = 'skip-link'
    
    // Add styles for skip link
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: primary;
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 9999;
      transition: top 0.3s;
    `
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px'
    })
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px'
    })
    
    document.body.insertBefore(skipLink, document.body.firstChild)
    
    return skipLink
  }, [])

  return { createSkipLink }
}

// Hook for accessible form validation
export function useAccessibleForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})

  const { announceAssertive } = useAriaLive()

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }, [])

  const setError = useCallback((field: keyof T, error: string | undefined) => {
    setErrors(prev => ({ ...prev, [field]: error }))
    
    if (error) {
      announceAssertive(`${String(field)} field has error: ${error}`)
    }
  }, [announceAssertive])

  const setFieldTouched = useCallback((fieldName: keyof T) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))
  }, [])

  const validateField = useCallback((field: keyof T, validator: (value: any) => string | undefined) => {
    const error = validator(values[field])
    setError(field, error)
    return !error
  }, [values, setError])

  const getFieldProps = useCallback((field: keyof T) => ({
    value: values[field],
    onChange: (value: any) => setValue(field, value),
    onBlur: () => setFieldTouched(field),
    'aria-invalid': !!errors[field],
    'aria-describedby': errors[field] ? `${String(field)}-error` : undefined,
    error: errors[field],
    touched: touched[field]
  }), [values, errors, touched, setValue, setFieldTouched])

  return {
    values,
    errors,
    touched,
    setValue,
    setError,
    setTouched: setFieldTouched,
    validateField,
    getFieldProps
  }
}

// Accessibility utility functions
export const getAriaLabel = (label: string, required?: boolean): string => {
  return required ? `${label} (required)` : label
}

export const getAriaDescribedBy = (error?: string, hint?: string): string | undefined => {
  const ids = []
  if (error) ids.push('error')
  if (hint) ids.push('hint')
  return ids.length > 0 ? ids.join(' ') : undefined
}

export const getRoleDescription = (role: string): string => {
  const descriptions: Record<string, string> = {
    'button': 'Button',
    'link': 'Link',
    'navigation': 'Navigation',
    'main': 'Main content',
    'complementary': 'Supporting content',
    'contentinfo': 'Footer information',
    'search': 'Search',
    'tab': 'Tab',
    'tabpanel': 'Tab panel',
    'dialog': 'Dialog window',
    'alert': 'Alert message',
    'status': 'Status update'
  }
  
  return descriptions[role] || role
}

export const getKeyboardInstructions = (elementType: string): string => {
  const instructions: Record<string, string> = {
    'menu': 'Use arrow keys to navigate, Enter to select',
    'listbox': 'Use arrow keys to navigate, Enter to select',
    'grid': 'Use arrow keys to navigate cells',
    'tabs': 'Use left and right arrow keys to switch tabs',
    'slider': 'Use arrow keys to adjust value',
    'combobox': 'Type to filter options, use arrow keys to navigate'
  }
  
  return instructions[elementType] || 'Use Tab to navigate'
}

// Screen reader announcements
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// Focus management utilities
export const setFocus = (element: HTMLElement | null) => {
  if (element) {
    element.focus()
  }
}

export const restoreFocus = (element: HTMLElement | null) => {
  if (element) {
    requestAnimationFrame(() => {
      element.focus()
    })
  }
}

export const trapFocusInElement = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  element.addEventListener('keydown', handleKeyDown)
  
  return () => {
    element.removeEventListener('keydown', handleKeyDown)
  }
}
