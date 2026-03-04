import { useState, useEffect } from 'react'

/**
 * Hook that returns a debounced version of the passed value.
 * Useful for rate-limiting expensive operations like API calls based on user input.
 *
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set debouncedValue to value (passed in) after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up the timeout if value changes (also on unmount)
    // This is how we prevent debouncedValue from updating if value is changed
    // within the delay period
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay]) // Only re-call effect if value or delay changes

  return debouncedValue
}
