import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type TranslationTargetLanguage =
    | 'en'
    | 'ar'
    | 'fr'
    | 'es'
    | 'de'
    | 'ru'
    | 'tr'
    | 'ur'
    | 'hi'
    | 'bn'
    | 'id'
    | 'tl'

export type TranslationSourceLanguage = TranslationTargetLanguage | 'auto'

export const SUPPORTED_TRANSLATION_LANGUAGES: Array<{
    code: TranslationTargetLanguage
    label: string
    direction: 'ltr' | 'rtl'
}> = [
    { code: 'en', label: 'English', direction: 'ltr' },
    { code: 'ar', label: 'Arabic', direction: 'rtl' },
    { code: 'hi', label: 'Hindi', direction: 'ltr' },
    { code: 'bn', label: 'Bengali', direction: 'ltr' },
    { code: 'ur', label: 'Urdu', direction: 'rtl' },
    { code: 'fr', label: 'French', direction: 'ltr' },
    { code: 'es', label: 'Spanish', direction: 'ltr' },
    { code: 'de', label: 'German', direction: 'ltr' },
    { code: 'ru', label: 'Russian', direction: 'ltr' },
    { code: 'tr', label: 'Turkish', direction: 'ltr' },
    { code: 'id', label: 'Indonesian', direction: 'ltr' },
    { code: 'tl', label: 'Filipino', direction: 'ltr' }
]

interface TranslationRequest {
    text?: string
    texts?: string[]
    file_url?: string
    file_type?: 'pdf' | 'docx'
    target_lang: TranslationTargetLanguage
    source_lang?: TranslationSourceLanguage
    preserve_format?: boolean
}

interface TranslationResponse {
    translated_text?: string
    translated_texts?: string[]
    extracted_text?: string
    success: boolean
    source_lang: string
    target_lang: string
    cached?: boolean
    error?: string
}

export function useTranslationAI() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (request: TranslationRequest): Promise<TranslationResponse> => {
            const { data, error } = await supabase.functions.invoke('ai-translation', {
                body: request
            })

            if (error) {
                let message = error.message || 'Translation failed'
                const context = (error as { context?: unknown })?.context
                let contextBody: unknown = undefined

                if (context && typeof context === 'object') {
                    const maybeResponse = context as { text?: () => Promise<string>; json?: () => Promise<unknown>; body?: unknown }
                    if (typeof maybeResponse.text === 'function') {
                        try {
                            contextBody = await maybeResponse.text()
                        } catch {
                            // ignore
                        }
                    } else if (typeof maybeResponse.json === 'function') {
                        try {
                            contextBody = await maybeResponse.json()
                        } catch {
                            // ignore
                        }
                    } else if ('body' in maybeResponse) {
                        contextBody = maybeResponse.body
                    }
                }

                if (contextBody) {
                    if (typeof contextBody === 'string') {
                        try {
                            const parsed = JSON.parse(contextBody)
                            if (parsed && typeof parsed === 'object') {
                                const parsedError = (parsed as { error?: string; message?: string }).error || (parsed as { error?: string; message?: string }).message
                                if (parsedError) {
                                    message = parsedError
                                }
                            }
                        } catch {
                            message = contextBody
                        }
                    } else if (typeof contextBody === 'object') {
                        const parsedError = (contextBody as { error?: string; message?: string }).error || (contextBody as { error?: string; message?: string }).message
                        if (parsedError) {
                            message = parsedError
                        }
                    }
                }

                throw new Error(message)
            }
            if (data?.success === false) throw new Error(data.error || 'Translation failed')

            return data as TranslationResponse
        },
        onSuccess: (data, variables) => {
            // Potentially invalidate or pre-fill other queries if needed
            // For now, we rely on the database cache handled by the Edge Function
        }
    })
}
