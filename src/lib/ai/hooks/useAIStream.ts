import { useCallback, useRef, useState } from 'react'
import { altusAI } from '../client'
import type { AIRequestOptions } from '../types'

export interface UseAIStreamResult {
  streamedText: string
  isStreaming: boolean
  error: string | null
  startStream: (prompt: string, options?: AIRequestOptions) => Promise<string>
  abortStream: () => void
  resetStream: () => void
}

export function useAIStream(): UseAIStreamResult {
  const [streamedText, setStreamedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const resetStream = useCallback(() => {
    abortStream()
    setStreamedText('')
    setError(null)
  }, [abortStream])

  const startStream = useCallback(
    async (prompt: string, options: AIRequestOptions = {}): Promise<string> => {
      abortStream()
      setStreamedText('')
      setError(null)
      setIsStreaming(true)

      const controller = new AbortController()
      abortControllerRef.current = controller

      let accumulated = ''
      try {
        const stream = altusAI.streamPrompt(prompt, {
          ...options,
          signal: controller.signal,
        })

        for await (const chunk of stream) {
          accumulated += chunk
          setStreamedText(accumulated)
        }

        return accumulated
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') {
          return accumulated
        }
        const message = err instanceof Error ? err.message : 'Streaming failed'
        setError(message)
        throw err
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [abortStream]
  )

  return {
    streamedText,
    isStreaming,
    error,
    startStream,
    abortStream,
    resetStream,
  }
}
