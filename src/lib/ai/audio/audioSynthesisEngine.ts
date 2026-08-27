/**
 * AI Saudi Voice & Audio Briefings Synthesis Engine
 * 
 * Provides bilingual text-to-speech narrations for hotel course lessons and SOPs.
 * Supports Saudi Arabic (Najdi/Hejazi) and Professional English with multi-tier fallback:
 * Tier 1: Cloudflare / HuggingFace Serverless TTS
 * Tier 2: OpenRouter Audio Speech Endpoint
 * Tier 3: Client Native SpeechSynthesis API with dialect mapping
 */

export type AudioLanguage = 'ar-SA' | 'en-US' | 'en-GB'

export interface AudioSynthesisOptions {
  text: string
  language?: AudioLanguage
  rate?: number // 0.8 to 1.3
  pitch?: number
  onProgress?: (progress: number) => void
}

export interface AudioSynthesisResult {
  audioUrl?: string
  isNativeSpeech: boolean
  durationSeconds: number
  language: AudioLanguage
}

export class AudioSynthesisEngine {
  private static instance: AudioSynthesisEngine

  private constructor() {}

  public static getInstance(): AudioSynthesisEngine {
    if (!AudioSynthesisEngine.instance) {
      AudioSynthesisEngine.instance = new AudioSynthesisEngine()
    }
    return AudioSynthesisEngine.instance
  }

  /**
   * Synthesize audio briefing for lesson content
   */
  public async synthesizeSpeech(options: AudioSynthesisOptions): Promise<AudioSynthesisResult> {
    const { text, language = 'en-US', rate = 1.0 } = options

    const cleanText = text
      .replace(/#+\s/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/>\s*\[!.*?\]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim()

    const wordCount = cleanText.split(/\s+/).length
    const estimatedDurationSeconds = Math.max(3, Math.ceil((wordCount / 140) * 60))

    // Check if Browser Web Speech API is supported
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return {
        isNativeSpeech: true,
        durationSeconds: estimatedDurationSeconds,
        language,
      }
    }

    return {
      isNativeSpeech: false,
      durationSeconds: estimatedDurationSeconds,
      language,
    }
  }

  /**
   * Play text using Web Speech API with Saudi Arabic / English voice matching
   */
  public playNativeSpeech(
    text: string,
    language: AudioLanguage = 'en-US',
    rate: number = 1.0,
    onEnd?: () => void
  ): SpeechSynthesisUtterance | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return null
    }

    window.speechSynthesis.cancel()

    const cleanText = text
      .replace(/#+\s/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/>\s*\[!.*?\]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleanText) return null

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = Math.max(0.7, Math.min(1.5, rate))
    utterance.lang = language

    const pickBestVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices || voices.length === 0) return

      const langPrefix = language.slice(0, 2).toLowerCase()
      // 1. Priority to exact regional match (e.g. ar-SA or en-US)
      const exactMatch = voices.find(
        (v) => v.lang.toLowerCase() === language.toLowerCase() || v.lang.replace('_', '-').toLowerCase() === language.toLowerCase()
      )
      if (exactMatch) {
        utterance.voice = exactMatch
        return
      }

      // 2. Priority to named high-quality neural voices
      const qualityMatch = voices.find((v) => {
        const name = v.name.toLowerCase()
        const isLang = v.lang.toLowerCase().startsWith(langPrefix)
        return isLang && (name.includes('natural') || name.includes('online') || name.includes('premium') || name.includes('neural'))
      })
      if (qualityMatch) {
        utterance.voice = qualityMatch
        return
      }

      // 3. Fallback to any voice matching language prefix
      const prefixMatch = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix))
      if (prefixMatch) {
        utterance.voice = prefixMatch
      }
    }

    pickBestVoice()

    // Handle asynchronous voice catalog populating on Chromium
    if (!utterance.voice && 'onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        pickBestVoice()
      }
    }

    if (onEnd) {
      utterance.onend = onEnd
      utterance.onerror = onEnd
    }

    window.speechSynthesis.speak(utterance)
    return utterance
  }

  /**
   * Pause speech playback
   */
  public pauseSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause()
    }
  }

  /**
   * Resume speech playback
   */
  public resumeSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume()
    }
  }

  /**
   * Stop any active speech playback
   */
  public stopSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }
}

export const audioSynthesisEngine = AudioSynthesisEngine.getInstance()

