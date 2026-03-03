import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    // Update value
    rerender({ value: 'updated', delay: 500 })

    // Value should still be 'initial' immediately after update
    expect(result.current).toBe('initial')

    // Advance time by 250ms
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current).toBe('initial')

    // Advance time by another 250ms (total 500ms)
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current).toBe('updated')
  })

  it('should reset timer if value changes again during delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    // First update
    rerender({ value: 'update1', delay: 500 })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('initial')

    // Second update during delay
    rerender({ value: 'update2', delay: 500 })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    // Should still be 'initial' because timer was reset
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(200)
    })
    // Now it should be 'update2'
    expect(result.current).toBe('update2')
  })
})
