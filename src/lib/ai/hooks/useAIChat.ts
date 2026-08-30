import { useCallback, useState } from 'react'
import { HOTEL_PROMPTS } from '../prompts/hotelPrompts'
import type { AIMessage, AIRequestOptions } from '../types'
import { useAIStream } from './useAIStream'

export interface UseAIChatOptions {
  property?: string
  department?: string
  role?: string
  isArabic?: boolean
  initialMessages?: AIMessage[]
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { property, department, role, isArabic } = options
  const [messages, setMessages] = useState<AIMessage[]>(
    options.initialMessages || [
      {
        id: 'welcome',
        role: 'assistant',
        content: isArabic
          ? 'مرحباً بك! أنا المساعد الذكي لالعمليات (the Operations Copilot). كيف يمكنني مساعدتك في المهام التشغيلية، الإجراءات القياسية (SOPs)، أو إعداد التقارير اليوم؟'
          : 'Welcome to the Operations Copilot. How can I assist with standard operating procedures, guest service recovery, or shift reports today?',
        timestamp: new Date(),
      },
    ]
  )

  const { streamedText, isStreaming, error, startStream, abortStream } = useAIStream()

  const sendMessage = useCallback(
    async (userPrompt: string, overrideOptions: AIRequestOptions = {}) => {
      if (!userPrompt.trim() || isStreaming) return

      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userPrompt.trim(),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])

      const systemPrompt =
        overrideOptions.systemPrompt ||
        HOTEL_PROMPTS.ALTUS_COPILOT_SYSTEM({
          property,
          department,
          role,
          isArabic,
        })

      // Build conversation history format for prompt
      const contextPrompt = messages
        .slice(-6)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n')

      const fullPrompt = `${contextPrompt}\nUSER: ${userPrompt}\nASSISTANT:`

      try {
        const fullResponse = await startStream(fullPrompt, {
          systemPrompt,
          task: 'chat',
          ...overrideOptions,
        })

        if (fullResponse) {
          const assistantMessage: AIMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        }
      } catch (err) {
        console.error('Chat error:', err)
        const errorMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: isArabic
            ? 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.'
            : (err instanceof Error ? err.message : 'An error occurred while generating a response. Please try again.'),
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    },
    [department, isArabic, isStreaming, messages, property, role, startStream]
  )

  const clearChat = useCallback(() => {
    abortStream()
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: isArabic
          ? 'تم بدء جلسة محادثة جديدة. كيف يمكنني خدمتك اليوم؟'
          : 'Started a fresh session. How can I assist you today?',
        timestamp: new Date(),
      },
    ])
  }, [abortStream, isArabic])

  return {
    messages,
    streamedText,
    isStreaming,
    error,
    sendMessage,
    clearChat,
    abortStream,
  }
}
