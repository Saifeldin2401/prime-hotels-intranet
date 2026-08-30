/**
 * Bilingual Audio Briefing & Narration Agent
 * 
 * Synthesizes crystal-clear audio narrations for lesson briefings and SOP checklists.
 * Supports Saudi Arabic (ar-SA) and Professional Hospitality English (en-US).
 */

import { audioSynthesisEngine, type AudioLanguage } from '@/lib/ai/audio/audioSynthesisEngine'
import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import type { AgentExecutionResult, AgentRole } from './types'

export interface AudioAgentInput {
  lessonTitle: string
  lessonContentHtml: string
  language?: AudioLanguage
}

export interface AudioNarrationResult {
  lessonTitle: string
  audioUrl?: string
  isNativeSpeech: boolean
  durationSeconds: number
  language: AudioLanguage
  briefingScript: string
}

export class AudioAgent extends BaseAIAgent<AudioAgentInput, AudioNarrationResult> {
  public readonly role: AgentRole = 'audio_ai'
  public readonly name = 'Bilingual Audio Briefing & Narration Agent'
  public readonly nameAr = 'وكيل السرد الصوتي والملخصات الصوتية الذكية'

  public readonly defaultSystemPrompt = `You are the Executive Voice Narration Director for a five-star luxury hotel group.
You transform written hotel SOP lessons into concise, engaging spoken briefings suitable for daily shift huddles.`

  public async process(
    input: AudioAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<AudioNarrationResult>> {
    const isArabic = (input.language || '').startsWith('ar')
    const rawText = input.lessonContentHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    // 1. Synthesize concise spoken script
    const scriptPrompt = isArabic
      ? `قم بتحويل محتوى الدرس التالي إلى نص سرد صوتي موجز ومركز (دقيقة إلى دقيقتين) لاجتماع الوردية:
الدرس: "${input.lessonTitle}"
المحتوى:
${rawText.slice(0, 2000)}

اكتب النص الصوتي السلس فقط باللهجة المهنية الراقية الفندقية بدون عناوين أو رموز.`
      : `Transform the following hotel lesson into a concise spoken shift briefing script (60-90 seconds):
Lesson: "${input.lessonTitle}"
Content:
${rawText.slice(0, 2000)}

Output the clean, spoken narration text only.`

    const scriptResult = await this.executePrompt<string>(scriptPrompt, {
      ...options,
      jsonMode: false,
      temperature: 0.3,
      maxTokens: 500,
    })

    const narrationScript = (scriptResult.rawOutput || rawText.slice(0, 500)).trim()
    const synthesis = await audioSynthesisEngine.synthesizeSpeech({
      text: narrationScript,
      language: input.language || (isArabic ? 'ar-SA' : 'en-US'),
    })

    return {
      agentRole: this.role,
      success: true,
      data: {
        lessonTitle: input.lessonTitle,
        audioUrl: synthesis.audioUrl,
        isNativeSpeech: synthesis.isNativeSpeech,
        durationSeconds: synthesis.durationSeconds,
        language: input.language || (isArabic ? 'ar-SA' : 'en-US'),
        briefingScript: narrationScript,
      },
      rawOutput: narrationScript,
      modelUsed: scriptResult.modelUsed,
      providerUsed: scriptResult.providerUsed,
      costTier: 'free',
      estimatedCostUSD: 0,
      latencyMs: scriptResult.latencyMs,
    }
  }
}

export const audioAgent = new AudioAgent()
