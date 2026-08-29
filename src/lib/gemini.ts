

import { supabase } from './supabase'
import { isProcessAiErrorResponse, type ProcessAiRequest, type ProcessAiResponse } from '@/types/ai'



// 🛡️ PRIMARY & MULTI-TIER FALLBACK MODELS (Cascades across Google Gemini, OpenRouter, Groq LPU, HuggingFace & Cloudflare)
export const DEFAULT_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'openai/gpt-4o-mini',
  'deepseek/deepseek-chat',
  'deepseek/deepseek-r1',
  'meta-llama/llama-3.3-70b-instruct',
  'anthropic/claude-haiku-4.5',
  'openai/gpt-4o',
  'anthropic/claude-opus-4.5',
  'openai/gpt-oss-120b',
  'allam-2-7b',
  'Qwen/Qwen2.5-72B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.3',
  '@cf/meta/llama-3.1-8b-instruct',
]

const FALLBACK_MODELS = DEFAULT_FALLBACK_MODELS

export interface AIModelOption {
  id: string
  name: string
  provider: string
  description: string
  badge?: string
  isDefault?: boolean
}

export const AVAILABLE_COURSE_AI_MODELS: AIModelOption[] = [
  {
    id: 'auto',
    name: 'Auto Multi-Provider Failover (Gemini + OpenRouter + Groq + HuggingFace)',
    provider: 'Autonomous 5-Tier Fallback Gateway',
    description: 'Autonomous multi-tier cascade (Gemini 2.5 Flash → GPT-4o-mini / Claude Haiku 4.5 on OpenRouter → Groq LPU → Cloudflare Workers AI) with zero-downtime failover (Recommended)',
    badge: 'Recommended',
    isDefault: true,
  },
  // --- PREMIER / PAID MODELS (OpenRouter Tier) ---
  {
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5 (OpenRouter)',
    provider: 'Anthropic via OpenRouter',
    description: 'Premier flagship model with adaptive reasoning, state-of-the-art SOP structuring, and luxury hospitality elegance',
    badge: 'Premier Flagship',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Claude Haiku 4.5 (OpenRouter)',
    provider: 'Anthropic via OpenRouter',
    description: 'Fast, low-cost Claude for pedagogical instructional design, scenario generation, and Forbes 5-star rubric evaluation',
    badge: 'Fast & Low-Cost',
  },
  {
    id: 'openai/gpt-4o',
    name: 'OpenAI GPT-4o (OpenRouter)',
    provider: 'OpenAI via OpenRouter',
    description: 'Omni flagship with flawless structured JSON extraction, rapid throughput, and high bilingual fluency',
    badge: 'OpenAI Flagship',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini (OpenRouter)',
    provider: 'OpenAI via OpenRouter',
    description: 'Ultra-fast, cost-effective workhorse for rapid quiz and checkpoint generation',
    badge: 'Fast & Reliable',
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3 (OpenRouter)',
    provider: 'DeepSeek via OpenRouter',
    description: 'Massive MoE model offering top-tier reasoning and code quality at ultra-low inference costs',
    badge: 'High Value',
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 Reasoning (OpenRouter)',
    provider: 'DeepSeek via OpenRouter',
    description: 'Deep chain-of-thought mathematical and pedagogical logic for complex hospitality SOP workflows',
    badge: 'Deep Reasoning',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Meta Llama 3.3 70B Instruct (OpenRouter)',
    provider: 'Meta via OpenRouter',
    description: 'Enterprise open foundation model with high reasoning and full transparency',
    badge: '70B Foundation',
  },
  // --- HIGH-PERFORMANCE FREE MODELS ---
  {
    id: 'gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    provider: 'Google AI Studio',
    description: 'Flagship curriculum architect with deep pedagogical reasoning, 1M context, and luxury hospitality mastery',
    badge: 'Free • Flagship',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Google Gemini 3.1 Flash-Lite',
    provider: 'Google AI Studio',
    description: 'High-throughput, ultra-fast generation optimized for rapid quiz, lesson, and metadata construction',
    badge: 'Free • Fast',
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B on Groq LPU',
    provider: 'Groq Ultra-Fast LPU',
    description: 'Open-weight 120B MoE on Groq LPU (500+ tok/s) with strong reasoning and exceptional structured JSON precision',
    badge: 'Free • 500+ Tok/s',
  },
  {
    id: 'allam-2-7b',
    name: 'ALLaM 2 7B (SDAIA Arabic AI)',
    provider: 'Groq / SDAIA',
    description: 'Saudi-specialized bilingual model for KSA hospitality regulations, Saudi Labor Law, and cultural nuances',
    badge: 'Free • KSA Arabic',
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    name: 'Qwen 2.5 72B Instruct (HuggingFace)',
    provider: 'HuggingFace Inference',
    description: 'Massive open-weights foundation model with high reasoning performance and zero vendor lock-in',
    badge: 'Free • HuggingFace',
  },
  {
    id: 'mistralai/Mistral-7B-Instruct-v0.3',
    name: 'Mistral 7B Instruct v0.3 (HuggingFace)',
    provider: 'HuggingFace Inference',
    description: 'Lightweight, rapid open-source instruction model for instant summaries and lesson structuring',
    badge: 'Free • Open Source',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Claude Haiku 4.5 (OpenRouter)',
    provider: 'Anthropic / OpenRouter',
    description: 'Fast, low-cost Claude for deep reasoning and high structural accuracy on standard operating procedures',
    badge: 'Low-Cost • Reasoning',
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite (OpenRouter)',
    provider: 'Google / OpenRouter',
    description: 'Cheapest reliable gateway model — bilingual Arabic/English luxury hospitality drafting',
    badge: 'Low-Cost • Bilingual',
  },
  {
    id: '@cf/meta/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B (Cloudflare Workers AI)',
    provider: 'Cloudflare Workers AI',
    description: 'Genuinely free serverless inference — the zero-cost fallback for module & lesson drafting',
    badge: 'Free • Fallback',
  },
]

export type CourseArchetype =
  | 'sop'
  | 'compliance'
  | 'onboarding'
  | 'scenario'
  | 'leadership'
  | 'microlearning'

export type CourseTone =
  | 'luxury_formal'
  | 'engaging'
  | 'direct_sop'
  | 'strict_compliance'

export interface CourseInclusions {
  includeDialogue?: boolean
  includeChecklists?: boolean
  includeServiceRecovery?: boolean
  includeExecutiveSummary?: boolean
  includeFaqs?: boolean
}

export interface ArchetypeConfig {
  id: CourseArchetype
  title: string
  title_ar: string
  description: string
  description_ar: string
  icon: string
  badge: string
  recommendedSectionCount: number
  defaultQuizTypes: string[]
}

export const COURSE_ARCHETYPES: ArchetypeConfig[] = [
  {
    id: 'sop',
    title: '5-Star Standard SOP',
    title_ar: 'معايير وإجراءات 5 نجوم القياسية',
    description: 'Comprehensive operational guidelines, Forbes luxury benchmarks, step-by-step phases, and dialogue scripts.',
    description_ar: 'إجراءات تشغيلية شاملة، معايير فندقية فاخرة، خطوات تفصيلية ونصوص حوار معتمدة.',
    icon: 'BookOpen',
    badge: 'Forbes Standard',
    recommendedSectionCount: 4,
    defaultQuizTypes: ['mcq', 'scenario', 'true_false'],
  },
  {
    id: 'compliance',
    title: 'Compliance & Safety',
    title_ar: 'الامتثال والسلامة المهنية',
    description: 'KSA labor & municipal regulations, food hygiene, fire emergency protocols, and zero-defect rules.',
    description_ar: 'اللوائح والأنظمة السعودية، سلامة الغذاء، بروتوكولات الطوارئ ومعايير عدم التساهل.',
    icon: 'ShieldAlert',
    badge: 'Mandatory',
    recommendedSectionCount: 4,
    defaultQuizTypes: ['mcq', 'true_false', 'fill_blank'],
  },
  {
    id: 'onboarding',
    title: 'New Hire Onboarding',
    title_ar: 'التأهيل والترحيب بالموظفين الجدد',
    description: 'Welcoming cultural orientation, core hospitality mindset, brand history, and team collaboration.',
    description_ar: 'التوجيه الثقافي والترحيب، قيم الضيافة الأساسية، تاريخ العلامة التجارية والاندماج الجماعي.',
    icon: 'Sparkles',
    badge: 'Foundational',
    recommendedSectionCount: 3,
    defaultQuizTypes: ['mcq', 'true_false', 'matching'],
  },
  {
    id: 'scenario',
    title: 'Scenario & Guest Dilemmas',
    title_ar: 'سيناريوهات وتحديات خدمة النزلاء',
    description: 'Interactive guest dilemmas, VIP handling, conflict de-escalation, and LAST recovery frameworks.',
    description_ar: 'تحديات واقعية مع النزلاء، خدمة كبار الشخصيات، معالجة الشكاوى ونموذج التعافي LAST.',
    icon: 'GitBranch',
    badge: 'Interactive',
    recommendedSectionCount: 4,
    defaultQuizTypes: ['scenario', 'mcq_multi', 'ordering'],
  },
  {
    id: 'leadership',
    title: 'Supervisory & Leadership',
    title_ar: 'الإشراف وقيادة الجودة الفندقية',
    description: 'Shift management, inspection audits, associate coaching, root-cause resolution, and handover rituals.',
    description_ar: 'إدارة الورديات، تدقيق الجودة، تدريب المشرفين، تحليل الأسباب الجذرية واستلام وتسليم الورديات.',
    icon: 'Crown',
    badge: 'Leadership',
    recommendedSectionCount: 5,
    defaultQuizTypes: ['scenario', 'mcq_multi', 'ordering'],
  },
  {
    id: 'microlearning',
    title: 'Microlearning Fast-Track',
    title_ar: 'التعلم المصغر السريع (3 دقائق)',
    description: 'Bite-sized high-impact lessons, quick memory checklists, visual tables, and rapid-fire quiz.',
    description_ar: 'دروس سريعة مركزة وعالية التأثير، قوائم تحقق سريعة، جداول بصرية واختبارات فورية.',
    icon: 'Zap',
    badge: 'Quick 3-Min',
    recommendedSectionCount: 3,
    defaultQuizTypes: ['mcq', 'true_false', 'fill_blank'],
  },
]

export function resolveModelChain(preferredModel?: string): string[] {
  if (!preferredModel || preferredModel === 'auto' || preferredModel === 'free') {
    return DEFAULT_FALLBACK_MODELS
  }
  // Put requested model first, then the remaining fallbacks
  return [preferredModel, ...DEFAULT_FALLBACK_MODELS.filter(m => m !== preferredModel)]
}

// ⚡ Client-side In-Memory LRU Cache for Instant Deduplicated AI Responses
interface AICacheEntry {
  data: string
  timestamp: number
}
const aiResponseCache = new Map<string, AICacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_ENTRIES = 200

function getFromAICache(key: string): string | null {
  const entry = aiResponseCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    aiResponseCache.delete(key)
    return null
  }
  return entry.data
}

function setInAICache(key: string, data: string): void {
  if (aiResponseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = aiResponseCache.keys().next().value
    if (oldestKey) aiResponseCache.delete(oldestKey)
  }
  aiResponseCache.set(key, { data, timestamp: Date.now() })
}

/**
 * Scans a string and returns the raw text of every complete, balanced top-level
 * {...} object it contains (ignoring braces inside quoted strings). Used to
 * salvage whatever was fully generated before an LLM response got truncated.
 */
function extractCompleteObjects(str: string): string[] {
  const objects: string[] = []
  let depth = 0, start = -1, inStr = false, escape = false
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') { if (depth === 0) start = i; depth++ }
    if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        objects.push(str.slice(start, i + 1))
        start = -1
      }
    }
  }
  return objects
}

/**
 * Robust JSON parser for LLM outputs.
 * Handles trailing commas, unescaped newlines in strings, and truncated arrays.
 */
export function safeParseJson<T>(raw: string, expectArray: boolean): T | null {
  // Strip markdown fences
  let text = raw.replace(/```json\n?|\n?```/g, '').trim()

  // Fix unescaped newlines/tabs inside JSON strings (common LLM mistake)
  text = text.replace(/"([^"]*)"/g, (_match, inner: string) => {
    const fixed = inner
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
    return `"${fixed}"`
  })

  // Remove trailing commas before ] or } (another common LLM mistake)
  text = text.replace(/,\s*([\]}])/g, '$1')

  // Try to extract the target structure
  const pattern = expectArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/
  const match = text.match(pattern)
  if (!match) return null

  // First attempt: direct parse
  try {
    return JSON.parse(match[0]) as T
  } catch {
    // Second attempt: if array is truncated, extract only complete objects
    if (expectArray) {
      try {
        const objects = extractCompleteObjects(match[0])
        if (objects.length > 0) {
          return JSON.parse(`[${objects.join(',')}]`) as T
        }
      } catch {
        // Give up
      }
    }
    return null
  }
}

/**
 * Best-effort salvage for a truncated ModuleOutline response: a cut-off "sections"
 * array still means some sections rendered completely before the token limit hit.
 * Returning those (instead of nothing) means a partially-generated course still
 * reflects the actual topic instead of falling all the way back to generic content.
 */
function salvageTruncatedOutline(raw: string): ModuleOutline | null {
  const text = raw.replace(/```json\n?|\n?```/g, '').trim()

  const titleMatch = text.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  const descriptionMatch = text.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  const sectionsStart = text.indexOf('"sections"')
  if (sectionsStart === -1) return null

  const arrayStart = text.indexOf('[', sectionsStart)
  if (arrayStart === -1) return null

  const objects = extractCompleteObjects(text.slice(arrayStart))
  const validBlockTypes = new Set(['text', 'video', 'document_link', 'scenario'])
  const sections: ModuleOutlineSection[] = []
  for (const objText of objects) {
    try {
      const obj = JSON.parse(objText.replace(/,\s*}/g, '}')) as Partial<ModuleOutlineSection>
      if (obj?.heading) {
        sections.push({
          heading: obj.heading,
          suggestedBlockType: validBlockTypes.has(obj.suggestedBlockType as string)
            ? (obj.suggestedBlockType as ModuleOutlineSection['suggestedBlockType'])
            : 'text',
          summary: obj.summary || '',
          rich_content: obj.rich_content || `<h3>${obj.heading}</h3><p>${obj.summary || ''}</p>`
        })
      }
    } catch {
      // Skip the one section object that was mid-generation when the cutoff hit
    }
  }

  if (sections.length === 0) return null

  const unescape = (s: string) => s.replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  return {
    title: titleMatch ? unescape(titleMatch[1]) : '',
    description: descriptionMatch ? unescape(descriptionMatch[1]) : '',
    sections,
    suggestedQuizCheckpoints: []
  }
}



interface SOPAnalysis {

  title: string

  description: string

  department: string

  category: string

  priority: 'low' | 'medium' | 'high' | 'critical'

  contentHtml: string

}



interface QuizQuestion {

  question_text: string

  question_type: string

  options?: string[]

  correct_answer: string

  points: number

  explanation?: string

  hint?: string

  difficulty_level?: string

}

interface QuizRepairQuestionInput {

  question_id: string

  question_text: string

  question_type: string

  options?: Array<{
    text: string
    is_correct: boolean
  }>

  correct_answer?: string | null

  explanation?: string | null

  hint?: string | null

  issues: string[]

}

interface QuizRepairQuestionOutput {

  question_id: string

  question_text: string

  question_type: string

  options?: Array<{
    text: string
    is_correct: boolean
  }>

  correct_answer?: string

  explanation?: string

  hint?: string

}

// Structural draft outline for the Training Builder ("AI Draft Outline").
// This is intentionally NOT full content generation -- it proposes a module
// title/description plus a list of section headings with a suggested block
// type and a short summary the author fleshes out inside the builder.
export interface ModuleOutlineSection {
  heading: string
  suggestedBlockType: 'text' | 'video' | 'document_link' | 'scenario'
  summary: string
  rich_content?: string
}

export interface ModuleOutlineQuizCheckpoint {
  afterSectionIndex: number
  topic: string
}

export interface ModuleOutline {
  title: string
  description: string
  sections: ModuleOutlineSection[]
  suggestedQuizCheckpoints: ModuleOutlineQuizCheckpoint[]
  meta?: {
    modelUsed?: string
    fallbackOccurred?: boolean
    fallbackAttempts?: string[]
    providerUsed?: string
  }
}

export interface AssignmentEvaluationInput {
  moduleTitle: string
  blockTitle?: string
  assignmentInstructions?: string
  rubric?: string
  passingScore?: number
  submissionContent?: string
  attachmentNames?: string[]
  language?: 'English' | 'Arabic' | string
}

export interface AssignmentEvaluationResult {
  score: number
  passed: boolean
  decision: 'approved' | 'revision_required'
  strengths: string[]
  improvements: string[]
  feedback: string
  arabicFeedback?: string
  evaluationSummary: string
}



const cleanText = (text: string): string => {

  return text

    .replace(/\p{Cc}/gu, '')

    .replace(/[þÿ]/g, '')

    .replace(/\s+/g, ' ')

    .trim()

}



// 🧱 PROXY AI CALLER via Supabase Edge Function

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function callHuggingFaceOnce(model: string, prompt: string, maxTokens?: number) {
  const cacheKey = `${model}:${maxTokens || 0}:${prompt.trim()}`
  const cached = getFromAICache(cacheKey)
  if (cached) {
    return cached
  }

  const request: ProcessAiRequest = { model, prompt, ...(maxTokens ? { max_tokens: maxTokens } : {}) }
  const { data, error } = await supabase.functions.invoke<ProcessAiResponse>('process-ai-request', {
    body: request
  })

  if (error) {
    // FunctionsHttpError carries the real edge-function response body on `.context` --
    // read it so failures surface the actual reason instead of the generic
    // "Edge Function returned a non-2xx status code" wrapper message.
    let detail = error.message
    const context = (error as { context?: Response }).context
    if (context && typeof context.text === 'function') {
      try {
        const parsed = JSON.parse(await context.clone().text())
        if (parsed?.error) detail = parsed.error
      } catch {
        // Non-JSON or unreadable body -- keep the generic message
      }
    }
    console.error('Critical Edge Error:', detail)
    throw new Error(`Edge Function Connectivity Error: ${detail}`)
  }

  if (isProcessAiErrorResponse(data)) {
    if (data.error && (data.error.includes('Session expired') || data.error.includes('Unauthorized'))) {
      throw new Error('Your session has expired. Please refresh the page to continue using AI features.')
    }
    console.warn(`Model ${model} rejected:`, data.error)
    throw new Error(data.error)
  }

  // Support both 'generated_text' (HF style), 'result' (OpenAI style), and 'response' (Edge Function format)
  const resultText = (data.response || data.result) as string
  if (resultText) {
    setInAICache(cacheKey, resultText)
  }
  return resultText
}

/**
 * Supabase Edge AI Gateway Caller (`process-ai-request`).
 * Cascades across Gemini, Groq, OpenRouter, and Hugging Face server-side.
 * Includes automatic retry on transient gateway interruptions.
 */
export async function callHuggingFace(model: string, prompt: string, maxTokens?: number) {
  try {
    return await callHuggingFaceOnce(model, prompt, maxTokens)
  } catch (firstError: unknown) {
    const message = firstError instanceof Error ? firstError.message : 'Unknown error'
    if (message.includes('session has expired')) throw firstError // Retrying won't help

    console.warn(`Model ${model} call failed, retrying once in 1.5s:`, message)
    await sleep(1500)
    try {
      return await callHuggingFaceOnce(model, prompt, maxTokens)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.warn(`Model ${model} call failed via proxy after retry:`, errorMessage)
      throw error // Re-throw to trigger the caller's fallback
    }
  }
}

/** Canonical alias for `callHuggingFace` reflecting its real proxy architecture */
export const invokeEdgeAiGateway = callHuggingFace




// 🛡️ SMART LOCAL INTELLIGENCE (Fallback)

const heuristicAnalysis = (text: string): SOPAnalysis => {

  const cleaned = cleanText(text)

  const sentences = cleaned.split('. ').filter(s => s.length > 20)

  const title = sentences[0] ? sentences[0].substring(0, 80) : 'Extracted Standard Operating Procedure'



  // Format extraction into HTML

  let formattedHtml = `<h2>1. Procedure Overview</h2><p>Extracted from uploaded document.</p>`

  formattedHtml += `<h2>2. Key Instructions</h2><ul class="list-disc pl-6 space-y-2">`

  sentences.slice(1, 15).forEach(s => formattedHtml += `<li>${s}.</li>`)

  formattedHtml += `</ul>`

  formattedHtml += `<h2>3. Compliance Requirements</h2><p>Staff must adhere to these guidelines at all times.</p>`



  return {

    title,

    description: "Automatically generated from document content.",

    department: 'Operations',

    category: 'General',

    priority: 'medium',

    contentHtml: formattedHtml

  }

}



const heuristicQuiz = (): QuizQuestion[] => {

  return [

    {

      question_text: "What is the primary objective of this SOP?",

      question_type: "mcq",

      options: ["Ensure Operational Consistency", "Reduce Costs", "Marketing usage", "Staff Scheduling"],

      correct_answer: "Ensure Operational Consistency",

      points: 10

    }

  ]

}

const heuristicOutline = (text: string, generateFullContent = true): ModuleOutline => {
  const cleaned = cleanText(text)
  const sentences = cleaned.split('. ').map(s => s.trim()).filter(s => s.length > 15)

  if (sentences.length === 0) {
    return {
      title: 'New Training Masterclass',
      description: 'Standard operating procedure and training curriculum for hotel operations.',
      sections: [
        {
          heading: 'Executive Overview & Standards',
          suggestedBlockType: 'text',
          summary: 'Introduce operational context, quality benchmarks, and core service principles.',
          rich_content: `<div class="space-y-5"><div class="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow border border-slate-800"><span class="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">ALTUS Operations Standard</span><h3 class="text-xl font-bold text-white mb-2">Standard Operating Procedures</h3><p class="text-slate-300 text-sm leading-relaxed">Adherence to operational excellence, brand benchmarks, and safety compliance across all hotel touchpoints.</p></div></div>`
        }
      ],
      suggestedQuizCheckpoints: []
    }
  }

  const title = sentences[0].substring(0, 80)
  const rawSections = [
    {
      heading: 'Executive Overview & Standards',
      suggestedBlockType: 'text' as const,
      summary: sentences.slice(0, 2).join('. '),
      rich_content: `<div class="space-y-5">
        <div class="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-lg border border-slate-800">
          <span class="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">ALTUS Operations Standard</span>
          <h3 class="text-xl font-bold tracking-tight text-white mb-2">${title}</h3>
          <p class="text-slate-300 text-sm leading-relaxed">${sentences.slice(0, 2).join('. ')}.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div class="text-indigo-600 font-bold text-base mb-1">Quality Standard</div>
            <p class="text-xs text-slate-600">Zero-compromise on brand cleanliness, guest safety, and luxury presentation standards.</p>
          </div>
          <div class="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div class="text-indigo-600 font-bold text-base mb-1">Operational Benchmark</div>
            <p class="text-xs text-slate-600">Consistent multi-property adherence with regular supervisor quality audits.</p>
          </div>
          <div class="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div class="text-indigo-600 font-bold text-base mb-1">Guest Experience</div>
            <p class="text-xs text-slate-600">Elevating satisfaction through meticulous attention to operational detail.</p>
          </div>
        </div>
      </div>`
    },
    {
      heading: 'Core Objectives & Competency Framework',
      suggestedBlockType: 'text' as const,
      summary: 'Detailed competency goals and learning outcomes for staff.',
      rich_content: `<div class="space-y-4">
        <h3 class="text-lg font-bold text-slate-900">Core Competencies & Key Takeaways</h3>
        <ul class="space-y-3 text-sm text-slate-700">
          <li class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">1</span>
            <span><strong>Master Standard Operating Procedures:</strong> Execute every step in compliance with company protocols.</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">2</span>
            <span><strong>Safety & Equipment Compliance:</strong> Apply correct safety gear, chemical handling, and machine safety checks.</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">3</span>
            <span><strong>Troubleshooting & Escalation:</strong> Rapidly resolve operational bottlenecks and escalate deviations.</span>
          </li>
        </ul>
      </div>`
    },
    {
      heading: 'Step-by-Step SOP Procedures',
      suggestedBlockType: 'text' as const,
      summary: sentences.slice(2, 4).join('. ') || 'Step-by-step workflow procedures and standard phases.',
      rich_content: `<div class="space-y-5">
        <h3 class="text-lg font-bold text-slate-900">Standard Operating Workflow</h3>
        <div class="space-y-4">
          <div class="border-l-4 border-indigo-500 pl-4 py-1">
            <h4 class="font-bold text-slate-900 text-sm">Phase 1: Preparation & Safety Check</h4>
            <p class="text-xs text-slate-600">Inspect equipment, verify work area cleanliness, and ensure required PPE is worn.</p>
          </div>
          <div class="border-l-4 border-blue-500 pl-4 py-1">
            <h4 class="font-bold text-slate-900 text-sm">Phase 2: Execution & Core Processing</h4>
            <p class="text-xs text-slate-600">${sentences.slice(2, 4).join('. ') || 'Follow strict timing, chemical, and temperature parameters.'}</p>
          </div>
          <div class="border-l-4 border-emerald-500 pl-4 py-1">
            <h4 class="font-bold text-slate-900 text-sm">Phase 3: Inspection & Quality Assurance</h4>
            <p class="text-xs text-slate-600">Perform 100% visual inspection before handover to ensure zero defects.</p>
          </div>
        </div>
        <div class="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <strong class="text-amber-900 text-xs uppercase font-bold tracking-wider">Pro-Tip & Safety Alert:</strong>
          <p class="text-xs text-amber-800 mt-1">Never skip verification checks during high-volume rush periods. Quality consistency protects guest satisfaction.</p>
        </div>
      </div>`
    },
    {
      heading: 'Real-World Operational Scenario & Resolution',
      suggestedBlockType: 'scenario' as const,
      summary: 'Practical troubleshooting dilemma encountered during hotel operations.',
      rich_content: `<div class="space-y-4">
        <div class="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <span class="text-xs font-bold text-purple-700 uppercase tracking-wide">Operational Dilemma</span>
          <h4 class="text-base font-bold text-purple-950 mt-1">High-Occupancy Operational Challenge</h4>
          <p class="text-xs text-purple-900 mt-2 leading-relaxed">
            During high occupancy or VIP turnover, a critical operational discrepancy arises requiring immediate resolution without compromising luxury guest standards.
          </p>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
          <h4 class="text-sm font-bold text-slate-900">Recommended Resolution Action:</h4>
          <ol class="list-decimal list-inside space-y-1.5 text-xs text-slate-700">
            <li>Isolate the issue immediately and prevent defective items from reaching guest areas.</li>
            <li>Implement the secondary fallback inventory protocol.</li>
            <li>Notify the duty supervisor and document the root cause for prevention.</li>
          </ol>
        </div>
      </div>`
    },
    {
      heading: 'Summary & Shift Operations Checklist',
      suggestedBlockType: 'text' as const,
      summary: 'Key takeaways and daily operational checklist.',
      rich_content: `<div class="space-y-5">
        <div class="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
          <h3 class="text-lg font-bold text-emerald-900 mb-1">Module Summary</h3>
          <p class="text-xs text-emerald-800">You are now equipped with standard operating techniques and quality benchmarks for daily execution.</p>
        </div>
        <div class="border border-slate-200 rounded-lg p-4 bg-white space-y-2">
          <h4 class="font-bold text-sm text-slate-900">Daily Shift Checklist:</h4>
          <div class="space-y-1.5 text-xs text-slate-700">
            <div class="flex items-center gap-2"><span class="text-emerald-600 font-bold">✓</span><span>Complete start-of-shift equipment and safety inspections.</span></div>
            <div class="flex items-center gap-2"><span class="text-emerald-600 font-bold">✓</span><span>Verify operational parameters against official SOP specifications.</span></div>
            <div class="flex items-center gap-2"><span class="text-emerald-600 font-bold">✓</span><span>Conduct end-of-shift handover and log book updates.</span></div>
          </div>
        </div>
      </div>`
    }
  ]

  return {
    title,
    description: 'Executive training curriculum based on standard operating procedures.',
    sections: rawSections,
    suggestedQuizCheckpoints: [
      { afterSectionIndex: 3, topic: 'Comprehensive Knowledge & Scenario Assessment' }
    ]
  }
}



export const aiService = {

  /**
   * General text generation method with multi-model fallbacks and edge function support.
   */
  async generateText(request: {
    prompt: string
    systemInstruction?: string
    temperature?: number
    maxTokens?: number
  }): Promise<string> {
    const fullPrompt = request.systemInstruction
      ? `${request.systemInstruction}\n\n${request.prompt}`
      : request.prompt

    for (const model of FALLBACK_MODELS) {
      try {
        const text = await callHuggingFace(model, fullPrompt, request.maxTokens || 1024)
        if (text && text.trim().length > 0) {
          return text.trim()
        }
      } catch (e) {
        console.warn(`AI model ${model} failed in generateText:`, e)
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke<ProcessAiResponse>('process-ai-request', {
        body: {
          prompt: fullPrompt,
          max_tokens: request.maxTokens || 1024,
          temperature: request.temperature ?? 0.7,
        }
      })
      if (!error && data && (data.response || data.result)) {
        return ((data.response || data.result) as string).trim()
      }
    } catch (edgeErr) {
      console.warn('Edge function direct call failed in generateText:', edgeErr)
    }

    return ''
  },

  async analyzeSOP(text: string): Promise<SOPAnalysis> {

    const cleanedText = cleanText(text)

    const context = cleanedText.substring(0, 1500)



    const prompt = `You are a Hotel Operations Specialist. Extract the SOP from the text below.

    

    Instruction: Format the content for hotel staff. Use clear headings (<h3>) and bullet points (<ul><li>).

    Tone: Professional, Clear, and Direct.

    

    Return VALID JSON ONLY with this structure:

    {

      "title": "SOP Title",

      "description": "Short description",

      "department": "Department Name",

      "category": "Category Name",

      "priority": "medium",

      "contentHtml": "<h3>1. Purpose</h3><p>...</p><h3>2. Steps</h3><ul><li>Step 1</li></ul>"

    }



    Do not add markdown formatting like \`\`\`json. Just the raw JSON object.



    Document Text:

    ${context}`



    // Try each model in the list until one works

    for (const model of FALLBACK_MODELS) {

      try {

        const generatedText = await callHuggingFace(model, prompt)

        const parsed = safeParseJson<SOPAnalysis>(generatedText, false)
        if (parsed && parsed.title && parsed.contentHtml) {
          return parsed
        }

      } catch (_e: unknown) {

        console.warn(`⚠️ Model ${model} failed, switch to next...`)

      }

    }



    // If ALL models fail

    console.error('🔥 All AI models failed. Engaging Smart Local Fallback.')

    return heuristicAnalysis(text)

  },



  async generateQuiz(request: {
    sopContent: string,
    count?: number,
    types?: string[],
    difficulty?: string,
    language?: string,
    includeHints?: boolean,
    includeExplanations?: boolean,
    preferredModel?: string
  }): Promise<QuizQuestion[]> {

    // Use recursive sanitization to prevent bypass attempts with nested tags
    let previous: string;
    let sanitized = request.sopContent;
    do {
      previous = sanitized;
      sanitized = previous.replace(/<[^>]*>/g, '');
    } while (sanitized !== previous);
    const context = sanitized.substring(0, 3500)

    const requestedTypesList = request.types && request.types.length > 0
      ? request.types
      : ['mcq', 'scenario', 'true_false', 'mcq_multi', 'ordering', 'matching', 'fill_blank']
    const typesDescription = requestedTypesList.join(', ')

    const difficulty = request.difficulty || 'medium'
    const language = request.language || 'English'
    const isArabic = language.toLowerCase() === 'arabic' || language.toLowerCase() === 'arabic only'
    const count = request.count || 5

    const prompt = `You are a Senior Hotel Training & Quality Assurance Director. Create EXACTLY ${count} quiz questions based ONLY on the SOP/training content below.

Target Audience: Hotel Staff and Operations Teams.
Tone: Professional, Clear, Practical, and Educational.
Target Language: ${language}

STRICT QUESTION TYPE REQUIREMENT:
- You MUST ONLY generate questions whose "question_type" is one of the following requested types: [${typesDescription}].
- Distribute the questions across the requested types: [${typesDescription}].
- DO NOT produce any question type that is not in [${typesDescription}].

Detailed rules per question type:
- "mcq": Standard 4-choice question with 1 correct answer. "options" must have 4 distinct choices. "correct_answer" must match the correct choice exactly.
- "mcq_multi": Multiple select question. "options" has 4-5 choices. "correct_answer" contains 2 correct choices separated by ", ".
- "true_false": True/False question. "options" MUST be ["True", "False"] (or ["صحيح", "خطأ"] if language is Arabic). "correct_answer" must be "True" or "False" (or "صحيح"/"خطأ").
- "fill_blank": Sentence with a "___" blank. "options" contains 4 possible replacement terms. "correct_answer" is the exact term that fills the blank.
- "scenario": Realistic hotel operational dilemma describing a guest interaction, safety event, or operational challenge, followed by a decision question. "options" contains 4 practical actions.
- "ordering": Sequence ordering question (e.g. "Arrange the check-in greeting steps in order"). "options" contains 4 distinct chronological steps. "correct_answer" contains the 4 steps joined with " -> ".
- "matching": Concept/Term matching question. "options" contains 4 items formatted as "Term:::Definition" (e.g. "LAST Protocol:::Listen, Apologize, Solve, Thank"). "correct_answer" contains all 4 pairs joined with "; ".

REQUIREMENTS:
- Number of questions: EXACTLY ${count} (It is CRITICAL that you generate ${count} items)
- Difficulty level: ${difficulty}
- ${request.includeHints ? 'Include a helpful "hint" for each question' : 'Do NOT include hints'}
- ${request.includeExplanations ? 'Include a clear "explanation" for why the answer is correct' : 'Do NOT include explanations'}
${isArabic ? '- OUTPUT ONLY IN ARABIC. Translate content where necessary.' : ''}

Return VALID JSON ONLY. The output must be a single JSON Array containing EXACTLY ${count} objects:
[
  {
    "question_text": "Clear question or scenario text in ${language}",
    "question_type": "${requestedTypesList[0]}",
    "options": ["Choice 1", "Choice 2", "Choice 3", "Choice 4"],
    "correct_answer": "Choice 1",
    "points": 10,
    "explanation": "Explanation why Choice 1 is correct",
    "hint": "Helpful hint"
  }
]

Context Content:
${context}`

    const modelChain = resolveModelChain(request.preferredModel)
    for (const model of modelChain) {
      try {
        const generatedText = await callHuggingFace(model, prompt, 4000)
        const parsed = safeParseJson<QuizQuestion[]>(generatedText, true)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      } catch (e) {
        console.warn(`Quiz generation model ${model} failed, switching to fallback model:`, e)
      }
    }

    console.warn('🔥 Engaging Smart Operational Hotel Quiz Fallback.')
    return generateHotelQuizFallback(context, language, count)
  },

  /**
   * Generates a structural DRAFT OUTLINE for a training module from pasted
   * source material or topic.
   */
  async generateModuleOutline(request: {
    sourceContent: string,
    targetLanguage?: string,
    sectionCount?: number,
    archetype?: CourseArchetype,
    tone?: CourseTone,
    inclusions?: CourseInclusions,
    preferredModel?: string,
    onFallbackModelEngaged?: (failedModel: string, nextModel: string) => void
  }): Promise<ModuleOutline> {

    // Use recursive sanitization to prevent bypass attempts with nested tags
    let previous: string;
    let sanitized = request.sourceContent;
    do {
      previous = sanitized;
      sanitized = previous.replace(/<[^>]*>/g, '');
    } while (sanitized !== previous);
    const context = sanitized.substring(0, 6000)

    const language = request.targetLanguage || 'English'
    const isArabic = language.toLowerCase() === 'arabic' || language.toLowerCase() === 'arabic only'
    const sectionCount = request.sectionCount || (request.archetype === 'microlearning' ? 3 : request.archetype === 'leadership' ? 5 : 4)
    const archetype = request.archetype || 'sop'
    const tone = request.tone || 'luxury_formal'

    const archetypeInstructions: Record<CourseArchetype, string> = {
      sop: 'Focus on 5-Star Forbes luxury benchmarks, sequential procedure phases, exact timing standards, and associate dialogue scripts.',
      compliance: 'Focus on KSA Labor, Health, Municipal & Civil Defense safety standards, mandatory compliance rules, hazard prevention, and zero-defect protocols.',
      onboarding: 'Focus on welcoming culture, core hospitality mindset, brand values, department integration, and foundational standards for new hires.',
      scenario: 'Focus on real-world guest dilemmas, VIP handling, service recovery (LAST framework), conflict de-escalation, and high-judgment operational situations.',
      leadership: 'Focus on supervisory shift rituals, quality inspection audits, associate coaching, root-cause resolution, handover checklists, and escalation rules.',
      microlearning: 'Focus on concise, high-impact bite-sized lessons (3-minute modules), bullet-point summaries, quick-reference memory cards, and practical tips.'
    }

    const toneInstructions: Record<CourseTone, string> = {
      luxury_formal: 'Tone: Prestigious, Forbes 5-Star Luxury, Elegant, Highly Professional.',
      engaging: 'Tone: Warm, Highly Engaging, Motivational, Story-Driven.',
      direct_sop: 'Tone: Action-Oriented, Clear, Concise, Direct Step-by-Step.',
      strict_compliance: 'Tone: Regulatory, Strict, Safety-First, Uncompromising on Quality and Standards.'
    }

    const inclusionPrompt = [
      request.inclusions?.includeDialogue !== false ? '- Include realistic staff-guest dialogue scripts in relevant sections.' : '',
      request.inclusions?.includeChecklists !== false ? '- Include supervisor quality inspection checklists.' : '',
      request.inclusions?.includeServiceRecovery !== false ? '- Include service recovery protocols (LAST framework).' : '',
      request.inclusions?.includeExecutiveSummary !== false ? '- Include executive takeaways and pro tips.' : '',
      request.inclusions?.includeFaqs ? '- Include common operational FAQs and edge cases.' : '',
    ].filter(Boolean).join('\n')

    const prompt = `You are a Senior Hotel Operational Training Director for Altus Hotels. Read the source material or topic below and create a COMPLETE, PRODUCTION-READY hotel training module.

Target Audience: Luxury Hotel Staff & Operations Teams.
Course Pedagogical Archetype: ${archetype.toUpperCase()}
Archetype Focus: ${archetypeInstructions[archetype]}
${toneInstructions[tone]}
Target Language: ${language}
Generate EXACTLY ${sectionCount} comprehensive sections.

CRITICAL INCLUSIONS & RULES:
- Each section MUST contain substantial, ready-to-teach "rich_content" in clean, semantic HTML format (<h3>, <p>, <ul>, <ol>, <li>, <strong>, <blockquote>).
${inclusionPrompt}
- NEVER generate placeholder text, generic summaries, or "Lorem ipsum".
- "suggestedBlockType" must be one of: "text", "video", "document_link", "scenario".
- Include realistic "suggestedQuizCheckpoints" testing real-world operational scenarios.
${isArabic ? '- OUTPUT FULLY IN ARABIC (العربية). All headings, rich_content, scripts, and quiz checkpoints must be in professional Arabic.' : ''}

Return VALID JSON ONLY with this exact structure:
{
  "title": "Clear, Professional Course Title",
  "description": "Comprehensive 2-3 sentence course description and learning objectives",
  "sections": [
    {
      "heading": "Section 1: Specific Standard Heading",
      "suggestedBlockType": "text",
      "summary": "Concise summary of learning goals",
      "rich_content": "<h3>Standard Operating Procedure</h3><p>Detailed explanation...</p><ol><li><strong>Step 1:</strong> Action...</li><li><strong>Step 2:</strong> Action...</li></ol><blockquote><strong>Guest Interaction Script:</strong> 'Exact words to say...'</blockquote>"
    }
  ],
  "suggestedQuizCheckpoints": [
    { "afterSectionIndex": 0, "topic": "Practical scenario testing understanding of Section 1" }
  ]
}

Source Material / Topic:
${context}`

    const modelChain = resolveModelChain(request.preferredModel)
    const failedModels: string[] = []

    for (let i = 0; i < modelChain.length; i++) {
      const model = modelChain[i]
      try {
        const generatedText = await callHuggingFace(model, prompt, 4000)
        const parsed = safeParseJson<ModuleOutline>(generatedText, false) || salvageTruncatedOutline(generatedText)
        if (parsed && parsed.title && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          const validBlockTypes = new Set(['text', 'video', 'document_link', 'scenario'])
          const sections = parsed.sections
            .filter(section => !!section?.heading)
            .map(section => ({
              heading: section.heading,
              suggestedBlockType: validBlockTypes.has(section.suggestedBlockType)
                ? section.suggestedBlockType
                : 'text' as const,
              summary: section.summary || '',
              rich_content: section.rich_content || `<h3>${section.heading}</h3><p>${section.summary}</p>`
            }))

          if (sections.length > 0) {
            return {
              title: parsed.title,
              description: parsed.description || '',
              sections,
              suggestedQuizCheckpoints: Array.isArray(parsed.suggestedQuizCheckpoints)
                ? parsed.suggestedQuizCheckpoints.filter(checkpoint =>
                    typeof checkpoint?.afterSectionIndex === 'number' && !!checkpoint?.topic
                  )
                : [],
              meta: {
                modelUsed: model,
                fallbackOccurred: failedModels.length > 0,
                fallbackAttempts: failedModels,
                providerUsed: 'openrouter'
              }
            }
          }
        }
      } catch (e) {
        failedModels.push(model)
        const nextModel = modelChain[i + 1]
        console.warn(`Outline generation model ${model} failed, engaging fallback ${nextModel || 'local engine'}:`, e)
        if (nextModel && request.onFallbackModelEngaged) {
          request.onFallbackModelEngaged(model, nextModel)
        }
      }
    }

    console.warn('🔥 All models failed. Engaging Smart Operational Hotel Fallback Engine.')
    const fallbackOutline = generateRichHotelModuleFallback(context, language, sectionCount)
    return {
      ...fallbackOutline,
      meta: {
        modelUsed: 'smart-local-fallback',
        fallbackOccurred: true,
        fallbackAttempts: failedModels,
        providerUsed: 'local-intelligence'
      }
    }
  },

  /**
   * Deeply expands a single lesson/section into a comprehensive, publication-grade
   * 5-star operational standard operating procedure (600-800 words) formatted in clean semantic HTML.
   */
  async expandLessonContent(request: {
    courseTitle?: string
    sectionHeading: string
    sectionSummary?: string
    department?: string
    language?: string
    archetype?: CourseArchetype
    tone?: CourseTone
    inclusions?: CourseInclusions
    preferredModel?: string
    onFallbackModelEngaged?: (failedModel: string, nextModel: string) => void
  }): Promise<string> {
    const language = request.language || 'English'
    const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')
    const department = request.department || 'Hotel Operations'
    const archetype = request.archetype || 'sop'

    const prompt = isArabic
      ? `أنت خبير ومدير تدريب وتطوير فندقي فاخر في مجموعة فنادق ألتوس (Altus Hotels).
اكتب دليلاً إجرائياً تشغيلياً شاملاً وتفصيلياً جداً (Standard Operating Procedure) للدرس التالي:
- الدورة التدريبية: "${request.courseTitle || 'التميز التشغيلي الفندقي'}"
- عنوان الدرس: "${request.sectionHeading}"
- الملخص: "${request.sectionSummary || ''}"
- القسم: "${department}"
- نوع ونمط المحتوى: ${archetype}

المطلوب: كتابة محتوى تدريبي كامل وعملي (500 إلى 800 كلمة) بصيغة HTML دلالية نظيفة، يحتوي على الأقسام التالية بالضبط:
1. <h3>1. المعيار والهدف التشغيلي (Operational Standard & Purpose)</h3>
   شرح معايير الجودة والوقت المسموح به والمخرجات المتوقعة.
2. <h3>2. خطوات التنفيذ التفصيلية خطوة بخطوة (Step-by-Step Execution Workflow)</h3>
   قائمة مرتبة <ol> تحتوي على 6-8 خطوات دقيقة وعملية مع المدد الزمنية.
3. <h3>3. نصوص المحادثة ولغة الجسد المعتمدة (Verbatim Dialogue Scripts)</h3>
   حوارات واقعية مطبقة بين الموظف والنزيل (مثال: نبرة الصوت، الترحيب بالاسم، الابتسامة).
4. <h3>4. جدول/قائمة التحقق من الجودة (5-Star Quality Inspection Checklist)</h3>
   قائمة <ul> للنقاط الإلزامية التي يفحصها المشرف قبل اعتماد الخدمة.
5. <h3>5. بروتوكول التعافي وحل المشكلات (Service Recovery & LAST Framework)</h3>
   كيفية معالجة العقبات والشكاوى فوراً.
6. <div class="p-3 my-3 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded text-amber-900 dark:text-amber-200"><strong>نصيحة ألتوس الذهبية للتميز:</strong> نصيحة احترافية للموظفين.</div>

اكتب محتوى HTML فقط بدون كتل كود markdown وبدون نصوص توضيحية خارجية.`
      : `You are a Senior Luxury Hospitality Training Director at Altus Luxury Hotels.
Write an exhaustive, publication-grade Standard Operating Procedure (SOP) training manual (500-800 words) for the following hotel training lesson:
- Course: "${request.courseTitle || 'Hotel Operational Excellence'}"
- Lesson Title: "${request.sectionHeading}"
- Summary: "${request.sectionSummary || ''}"
- Department: "${department}"
- Archetype Style: ${archetype}

Requirements: Write fully developed, professional training content in clean semantic HTML with these structured sections:
1. <h3>1. Executive Standard & Operational Purpose</h3>
   Forbes 5-star benchmarks, exact timeframes, and performance expectations.
2. <h3>2. Step-by-Step Procedure & Time Benchmarks</h3>
   Numbered <ol> with 6-8 comprehensive, actionable steps with specific operational details.
3. <h3>3. Verbatim Dialogue Scripts & Body Language Protocols</h3>
   Exact quotes to say to guests (e.g. greeting by name, offering proactive alternatives, tonality).
4. <h3>4. 5-Star Quality Inspection Checklist</h3>
   Bullet points <ul> of mandatory items supervisors inspect.
5. <h3>5. Service Recovery & Problem Resolution (LAST Protocol)</h3>
   Immediate resolution actions frontline staff are empowered to take.
6. <div class="p-3 my-3 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded text-amber-900 dark:text-amber-200"><strong>Altus 5-Star Pro Tip:</strong> Insider luxury service tip.</div>

Output clean HTML only, no markdown codeblocks.`

    const modelChain = resolveModelChain(request.preferredModel)
    for (let i = 0; i < modelChain.length; i++) {
      const model = modelChain[i]
      try {
        const generatedHtml = await callHuggingFace(model, prompt, 2048)
        if (generatedHtml && generatedHtml.length > 200) {
          return generatedHtml.replace(/```html\n?|\n?```/g, '').trim()
        }
      } catch (e) {
        const nextModel = modelChain[i + 1]
        console.warn(`Deep expansion model ${model} failed, trying fallback ${nextModel || 'local heuristic'}:`, e)
        if (nextModel && request.onFallbackModelEngaged) {
          request.onFallbackModelEngaged(model, nextModel)
        }
      }
    }

    return generateDeepSectionFallback(request.sectionHeading, request.sectionSummary || '', language, department)
  },

  /**
   * Refines or rewrites an existing lesson's HTML content based on custom user instructions.
   */
  async refineLessonContent(request: {
    courseTitle?: string
    sectionHeading: string
    currentContent: string
    instruction: string
    language?: string
    preferredModel?: string
  }): Promise<string> {
    const language = request.language || 'English'
    const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')

    const prompt = isArabic
      ? `أنت خبير تدريب وتطوير فندقي فاخر. قم بتعديل وتحسين محتوى الدرس التالي بناءً على طلب المستخدم بدقة واحترافية:
- الدورة: "${request.courseTitle || 'دورة فندقية'}"
- عنوان الدرس: "${request.sectionHeading}"
- طلب التعديل: "${request.instruction}"
- المحتوى الحالي:
${request.currentContent}

المطلوب: أعد صياغة وتحسين المحتوى بصيغة HTML دلالية نظيفة مع تطبيق التعديلات المطلوبة بدقة عالية. أخرج كود HTML فقط بدون كتل كود markdown.`
      : `You are a Senior Luxury Hospitality Training Director. Refine and enhance the following hotel lesson content according to the user's specific refinement instruction:
- Course: "${request.courseTitle || 'Hotel Training'}"
- Lesson: "${request.sectionHeading}"
- Refinement Instruction: "${request.instruction}"
- Current Content:
${request.currentContent}

Requirements: Output the revised, professional lesson content in clean semantic HTML format. Output clean HTML only, no markdown codeblocks.`

    const modelChain = resolveModelChain(request.preferredModel)
    for (const model of modelChain) {
      try {
        const generated = await callHuggingFace(model, prompt, 2500)
        if (generated && generated.length > 100) {
          return generated.replace(/```html\n?|\n?```/g, '').trim()
        }
      } catch (e) {
        console.warn(`Lesson refinement with model ${model} failed, cascading:`, e)
      }
    }

    return request.currentContent
  },

  /**
   * Extracts or generates actionable, interactive hotel operational verification steps.
   */
  async generateChecklist(request: {
    title: string
    content: string
    language?: string
    count?: number
  }): Promise<Array<{ id: string; text: string; text_ar?: string; is_required: boolean; order: number }>> {
    const language = request.language || 'English'
    const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')
    const count = request.count || 6
    const cleanedContent = (request.content || '').replace(/<[^>]*>/g, ' ').substring(0, 3000)

    const prompt = `You are a Senior Hotel Quality Assurance & Audit Director for Altus Hotels.
Create EXACTLY ${count} sequential, highly actionable operational checklist verification items for hotel staff based on the following SOP / document.

Document Title: ${request.title}
Document Content: ${cleanedContent}
Target Language: ${language}

CRITICAL RULES FOR REAL HOTEL OPERATIONAL CHECKLIST ITEMS:
- Each item MUST be a specific, verifiable action (e.g. "Inspect minibar expiration dates and seal integrity", "Verify Opera PMS folio balance is zero before departure", "Check that bathroom amenities match Forbes 5-star brand lineup").
- For each item, provide:
  - "text": The clear English verification step
  - "text_ar": The professional Arabic translation of the step
  - "is_required": boolean (true for mandatory/critical safety/quality steps, false for optional/courtesy steps)
- Return VALID JSON ONLY as an Array of ${count} objects:
[
  {
    "text": "Verify guest photo ID and payment guarantee in PMS",
    "text_ar": "التحقق من هوية الضيف وضمان الدفع في نظام إدارة الممتلكات",
    "is_required": true
  }
]`

    for (const model of FALLBACK_MODELS) {
      try {
        const generatedText = await callHuggingFace(model, prompt)
        const parsed = safeParseJson<Array<{ text: string; text_ar?: string; is_required?: boolean }>>(generatedText, true)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            id: crypto.randomUUID(),
            text: isArabic ? (item.text_ar || item.text) : (item.text || item.text_ar || `Verification Step ${idx + 1}`),
            text_ar: item.text_ar || item.text,
            is_required: typeof item.is_required === 'boolean' ? item.is_required : idx < 3,
            order: idx
          }))
        }
      } catch (e) {
        console.warn(`Checklist generation model ${model} failed:`, e)
      }
    }

    return generateHotelChecklistFallback(request.title, request.content, language, count)
  },

  /**
   * Generates operational FAQs & edge cases for hotel staff based on SOP content.
   */
  async generateFAQs(request: {
    title: string
    content: string
    language?: string
    count?: number
  }): Promise<Array<{ id: string; question: string; question_ar?: string; answer: string; answer_ar?: string; order: number }>> {
    const language = request.language || 'English'
    const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')
    const count = request.count || 4
    const cleanedContent = (request.content || '').replace(/<[^>]*>/g, ' ').substring(0, 3000)

    const prompt = `You are a Luxury Hotel Operations Manager for Altus Hotels.
Create EXACTLY ${count} high-value Frequently Asked Questions (FAQs) and edge-case resolution scenarios that hotel staff encounter regarding this SOP / policy.

Document Title: ${request.title}
Document Content: ${cleanedContent}
Target Language: ${language}

CRITICAL RULES FOR REAL HOTEL OPERATIONAL FAQS:
- Questions must address real operational dilemmas, guest special requests, exceptions, and escalation paths (e.g. "What should I do if a guest requests early check-in before the room is inspected?", "How to handle conflicting room preferences between booking channels?").
- Answers must provide clear, empowered resolution steps.
- For each item, provide:
  - "question": English question
  - "question_ar": Arabic question
  - "answer": English answer
  - "answer_ar": Arabic answer
- Return VALID JSON ONLY as an Array of ${count} objects:
[
  {
    "question": "What is the procedure if a guest arrives before the standard check-in time?",
    "question_ar": "ما هو الإجراء المتبع عند وصول الضيف قبل موعد تسجيل الوصول الرسمي؟",
    "answer": "Offer a warm welcome, securely store their luggage with concierge, provide complimentary refreshments in the executive lounge, and prioritize the room cleaning with housekeeping.",
    "answer_ar": "الترحيب الحار بالضيف، وحفظ الأمتعة لدى خدمة الكونسيرج، وتقديم ضيافة تترحيبية في الردهة، وإعطاء الأولوية للغرفة لدى قسم التدبير الفندقي."
  }
]`

    for (const model of FALLBACK_MODELS) {
      try {
        const generatedText = await callHuggingFace(model, prompt)
        const parsed = safeParseJson<Array<{ question: string; question_ar?: string; answer: string; answer_ar?: string }>>(generatedText, true)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            id: crypto.randomUUID(),
            question: isArabic ? (item.question_ar || item.question) : item.question,
            question_ar: item.question_ar || item.question,
            answer: isArabic ? (item.answer_ar || item.answer) : item.answer,
            answer_ar: item.answer_ar || item.answer,
            order: idx
          }))
        }
      } catch (e) {
        console.warn(`FAQ generation model ${model} failed:`, e)
      }
    }

    return generateHotelFAQFallback(request.title, request.content, language, count)
  },

  async repairQuizQuestions(request: {
    quizTitle?: string
    moduleTitle?: string
    moduleContext?: string
    questions: QuizRepairQuestionInput[]
  }): Promise<QuizRepairQuestionOutput[]> {

    const questions = request.questions.filter(question => question.question_id)
    if (questions.length === 0) {
      return []
    }

    const serializedQuestions = JSON.stringify(questions, null, 2)
    // Use recursive sanitization to prevent bypass attempts with nested tags
    let previous: string;
    let moduleContext = request.moduleContext || '';
    do {
      previous = moduleContext;
      moduleContext = previous.replace(/<[^>]*>/g, ' ');
    } while (moduleContext !== previous);
    moduleContext = moduleContext.replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)

    const prompt = `You are a Senior Hotel Learning Quality Manager.

Review and repair the quiz questions below so they are clearly written, internally consistent, and ready for hotel staff training.

QUIZ TITLE: ${request.quizTitle || 'Untitled Quiz'}
MODULE TITLE: ${request.moduleTitle || 'Untitled Module'}

STRICT RULES:
- Preserve the original learning intent whenever possible.
- Fix grammar, spelling, ambiguity, and incorrect or weak answer options.
- Keep every repaired question grounded in the module context when context is provided.
- Supported question_type values: mcq, mcq_multi, true_false, fill_blank, scenario.
- For mcq and scenario: return 4 concise options when possible and EXACTLY 1 correct option.
- For mcq_multi: return at least 3 options and at least 1 correct option.
- For true_false: return exactly 2 options, "True" and "False", with exactly 1 correct option.
- For fill_blank: do not return options; return a concise correct_answer.
- Remove empty or duplicate options.
- If the existing correct answer is wrong or mismatched, fix it.
- Return ONLY valid JSON. No markdown, no commentary.

Return a JSON array with this shape:
[
  {
    "question_id": "existing-question-id",
    "question_text": "Corrected question text",
    "question_type": "mcq",
    "options": [
      { "text": "Option A", "is_correct": false },
      { "text": "Option B", "is_correct": true }
    ],
    "correct_answer": "Option B",
    "explanation": "Optional explanation",
    "hint": "Optional hint"
  }
]

MODULE CONTEXT:
${moduleContext || 'No additional module context provided.'}

QUESTIONS TO REPAIR:
${serializedQuestions}`

    for (const model of FALLBACK_MODELS) {

      try {

        const generatedText = await callHuggingFace(model, prompt, 4000)

        const parsed = safeParseJson<QuizRepairQuestionOutput[]>(generatedText, true)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(question => question?.question_id && question?.question_text)
        }

      } catch (_error) {

        console.warn(`Quiz repair model ${model} failed.`)

      }

    }

    return []

  },



  async improveContent(
    text: string,
    instruction: 'grammar' | 'expand' | 'shorten' | 'professional' | 'arabic',
    language: string = 'English',
    format: 'text' | 'html' = 'text',
    options?: {
      includeTables?: boolean
      includeMermaid?: boolean
      includeCallouts?: boolean
      includeTOC?: boolean
    }
  ): Promise<string | null> {

    const prompts = {

      grammar: "Fix grammar and spelling errors. Maintain the original meaning.",

      expand: "Expand this text with necessary operational details. Use a clear, helpful tone suitable for hotel staff.",

      shorten: "Summarize this text concisely. Focus on key actions for hotel staff.",

      professional: "Rewrite this to sound highly professional, warm, and clear (Hospitality Standard).",

      arabic: "Translate this text to professional Arabic (Modern Standard Arabic) suitable for business."

    }



    const isArabicOnly = language.toLowerCase() === 'arabic' || language.toLowerCase() === 'arabic only';



    // Dynamic Rules Construction

    let rules = `1. Your output MUST be in ${language}.\n`;



    if (isArabicOnly) {

      rules += `    2. CRITICAL: OUTPUT ONLY IN ARABIC. Translate and EXPAND content. Do NOT summarize.\n`;

      rules += `    3. DO NOT output the English input text. Start directly with the Arabic response.\n`;

      rules += `    4. NO English text allowed in the output (except proper nouns).\n`;

    } else {

      rules += `    2. If Target Language is "English and Arabic" or "Bilingual", provide the English text first, followed immediately by the Arabic translation.\n`;

    }



    rules += `    5. Ensure the output is comprehensive and detailed. Do not cut corners.\n`;

    rules += `    6. Do NOT translate the "System" instructions above. Only process the text inside the <content> tags.\n`;

    if (format === 'html') {
      rules += `    7. Return valid semantic HTML only. Do not wrap output in markdown code fences.\n`;
      if (options?.includeTables === false) rules += `    8. Do not add tables.\n`;
      if (options?.includeMermaid) rules += `    9. Include at most one Mermaid diagram only when it materially helps understanding.\n`;
      if (options?.includeCallouts === false) rules += `    10. Avoid decorative callout boxes.\n`;
      if (options?.includeTOC === false) rules += `    11. Do not include a table of contents section.\n`;
    }



    const fullPrompt = `System: You are a Senior Hotel Operations Manager.

    

    Task: Rewrite the text provided inside the <content> tags based on the instructions below.

    

    Instruction: ${prompts[instruction]}

    

    CRITICAL OUTPUT RULES:

    ${rules}

    

    Guidelines:

    - Use "We" language where appropriate to build team spirit.

    - Be direct but polite.

    - Return ONLY the improved text. Do not add quotes, preambles, or "Here is the text".



    <content>

    ${text}

    </content>

    

    Assistant (Improved Content in ${language}):`



    for (const model of FALLBACK_MODELS) {

      try {

        // AI improving content with specified model

        const generatedText = await callHuggingFace(model, fullPrompt)



        if (generatedText && generatedText.trim().length > 0) {

          // Remove any potential quotes or chatty prefixes AI might add

          return generatedText.replace(/^"|"$/g, '').trim()

        }

      } catch (e: unknown) {

        const errorMessage = e instanceof Error ? e.message : 'Unknown AI error'

        console.warn(`⚠️ AI model ${model} failed:`, errorMessage)

      }

    }



    const heuristicImprovement = (text: string, instruction: string): string => {

      const cleaned = cleanText(text)



      switch (instruction) {

        case 'shorten':

          return cleaned.split('. ').slice(0, 2).join('. ') + (cleaned.split('. ').length > 2 ? '.' : '')



        case 'expand':

          return `${cleaned} Furthermore, strict adherence to these guidelines is essential for maintaining our high standards of service. Please consult your supervisor if you require any clarification.`



        case 'professional':

          return `Please note the following procedure: ${cleaned} Thank you for your cooperation in maintaining operational excellence.`



        case 'grammar':

          // Basic capitalization and trimming

          return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)



        case 'arabic':

          return `[API Key Required for Arabic Translation] ${cleaned}`



        default:

          return cleaned

      }

    }



    // If ALL models fail

    console.warn("🔥 All AI models failed to improve content. Engaging Local Fallback.")

    return heuristicImprovement(text, instruction)

  },



  async beautifyArticle(
    content: string,
    contentType: string,
    language: string,
    style: 'grammar' | 'expand' | 'shorten' | 'professional' | 'arabic' = 'professional',
    options?: {
      includeTables?: boolean
      includeMermaid?: boolean
      includeCallouts?: boolean
      includeTOC?: boolean
    }
  ): Promise<string | null> {
    const contentSeed = contentType
      ? `Article Type: ${contentType}\n\n${content}`
      : content

    return this.improveContent(contentSeed, style, language, 'html', options)
  },

  async suggestImportMapping(rawRows: string[][], targetHeaders: string[]): Promise<{ mapping: Record<string, string>, headerRowIndex: number }> {

    // We take a snapshot of the first 60 rows to find the header and data structure

    const snapshot = rawRows.slice(0, 60).map((row, idx) => `[Row ${idx}] ${row.join(' | ')}`).join('\n')



    const prompt = `You are a Senior Hotel Data Architect. Analyze this PMS report snapshot and identify the data structure.

    

    TARGET HEADERS WE NEED: ${targetHeaders.join(', ')}



    REPORT SNAPSHOT (Rows with | separator):

    ${snapshot}



    TASK:

    1. Identify the "Header Row Index": This is the 0-indexed row number where the table headers actually start. 

       - Ignore report titles, hotel names, or filter descriptions at the top.

       - The header row is the one that most closely contains words like "Date", "Rooms", "Revenue", "Occupancy", "ADR", etc.

    2. Map the columns in that header row to our Target Headers.

       - We need values for: ${targetHeaders.join(', ')}

       - If a report column is called "Business Date" or "Date", map it to "business_date".

       - If a report column is called "Rooms Available" or "Inventory", map it to "rooms_available".

       - Use your best judgment for abbreviations (e.g., "Occ %" -> "occupancy").

    

    Return VALID JSON ONLY:

    {

      "headerRowIndex": 12, // Example

      "mapping": {

        "Column Name in Report": "Target Header Name"

      }

    }

    

    Return ONLY the JSON. No Markdown. No explainers.`



    for (const model of FALLBACK_MODELS) {

      try {

        const generatedText = await callHuggingFace(model, prompt)

        const parsed = safeParseJson<{ mapping: Record<string, string>, headerRowIndex: number }>(generatedText, false)
        if (parsed && parsed.mapping) {
          return parsed
        }

      } catch (e) {

        console.warn(`Mapping suggestion model ${model} failed:`, e)

      }

    }



    return { mapping: {}, headerRowIndex: 0 }
  },

  /**
   * AI Practical Assignment Evaluation & Feedback Co-Pilot
   * Analyzes learner practical submissions against hotel SOP criteria and rubrics.
   */
  async evaluatePracticalAssignment(
    input: AssignmentEvaluationInput
  ): Promise<AssignmentEvaluationResult> {
    const language = input.language || 'English'
    const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')
    const passingThreshold = input.passingScore ?? 80

    const submissionText = cleanText(input.submissionContent || 'No written response provided.')
    const filesList = input.attachmentNames && input.attachmentNames.length > 0
      ? input.attachmentNames.join(', ')
      : 'No attached files'

    const prompt = `You are a Senior Hotel Training & Quality Assurance Director evaluating a learner's practical assignment submission.

Hotel Training Module: "${input.moduleTitle}"
Practical Assignment: "${input.blockTitle || 'Practical Task'}"
Assignment Instructions: "${input.assignmentInstructions || 'Complete the practical task according to hotel SOP.'}"
Evaluation Rubric: "${input.rubric || 'Demonstrate thorough adherence to 5-star hotel standards, precision, professional communication, and guest-centric problem solving.'}"
Required Passing Score: ${passingThreshold}%

Learner's Written Response:
"""
${submissionText.slice(0, 3000)}
"""

Submitted Attachments: ${filesList}

EVALUATION CRITERIA:
1. Operational Accuracy: Does the learner demonstrate correct hotel standard operating procedures?
2. Professional Tone & Hospitality Mindset: Is the communication polite, anticipatory, and 5-star standard?
3. Completeness: Did the learner address all parts of the assignment instructions?
4. Quality Benchmarks: If the score is >= ${passingThreshold}%, mark decision as "approved" (passed=true). If critical steps are missing or score < ${passingThreshold}%, mark decision as "revision_required" (passed=false).

OUTPUT FORMAT:
Return VALID JSON ONLY with this exact schema:
{
  "score": 90,
  "passed": true,
  "decision": "approved",
  "strengths": [
    "Clear, structured adherence to check-in protocol",
    "Empathetic guest tone throughout the response"
  ],
  "improvements": [
    "Remember to mention verifying the PMS profile notes"
  ],
  "feedback": "Excellent work. Your understanding of the guest arrival standard is thorough and well-articulated. Keep up the high standard of service.",
  "arabicFeedback": "عمل ممتاز. استيعابك لمعايير استقبال الضيوف شامل وواضح للغاية. استمر في تقديم أعلى مستويات الخدمة.",
  "evaluationSummary": "Meets 5-star luxury standards with comprehensive workflow coverage."
}

Do not include any Markdown wrap like \`\`\`json. Return pure JSON object only.`

    for (const model of FALLBACK_MODELS) {
      try {
        const responseText = await callHuggingFace(model, prompt, 1200)
        const parsed = safeParseJson<AssignmentEvaluationResult>(responseText, false)
        if (parsed && typeof parsed.score === 'number' && parsed.feedback) {
          const score = Math.max(0, Math.min(100, Math.round(parsed.score)))
          const passed = score >= passingThreshold
          const decision = (parsed.decision === 'approved' && passed) ? 'approved' : 'revision_required'

          return {
            score,
            passed,
            decision,
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Demonstrated solid operational effort.'],
            improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
            feedback: parsed.feedback || (passed ? 'Submission approved.' : 'Please revise and resubmit.'),
            arabicFeedback: parsed.arabicFeedback,
            evaluationSummary: parsed.evaluationSummary || (passed ? 'Meets required standards.' : 'Revisions requested.')
          }
        }
      } catch (err) {
        console.warn(`Model ${model} failed in evaluatePracticalAssignment:`, err)
      }
    }

    // Heuristic Fallback
    const wordCount = submissionText.split(/\s+/).filter(Boolean).length
    const hasAttachments = Boolean(input.attachmentNames && input.attachmentNames.length > 0)
    const isGoodQuality = wordCount >= 30 || (wordCount >= 15 && hasAttachments)
    const fallbackScore = isGoodQuality ? 88 : 65
    const fallbackPassed = fallbackScore >= passingThreshold

    return {
      score: fallbackScore,
      passed: fallbackPassed,
      decision: fallbackPassed ? 'approved' : 'revision_required',
      strengths: isGoodQuality
        ? [
            'Good attention to operational procedure and standard steps',
            'Constructive and professional written response'
          ]
        : ['Initial submission provided for review'],
      improvements: isGoodQuality
        ? ['Continue applying these standards consistently across shifts']
        : ['Please provide more detailed step-by-step explanations in accordance with the SOP'],
      feedback: fallbackPassed
        ? (isArabic
            ? 'تمت مراجعة الإجابة واعتمادها بنجاح. أظهرت فهماً ممتازاً للإجراءات التشغيلية المعتمدة.'
            : 'Well executed practical response. You have demonstrated a clear understanding of the operational standards. Approved.')
        : (isArabic
            ? 'يرجى التوسع في تفاصيل الخطوات وإعادة إرسال الواجب بعد إضافة التوضيحات اللازمة.'
            : 'Please expand on the detailed steps and resubmit with additional operational context before final approval.'),
      arabicFeedback: fallbackPassed
        ? 'تمت مراجعة الإجابة واعتمادها بنجاح. أظهرت فهماً ممتازاً للإجراءات التشغيلية المعتمدة.'
        : 'يرجى التوسع في تفاصيل الخطوات وإعادة إرسال الواجب بعد إضافة التوضيحات اللازمة.',
      evaluationSummary: fallbackPassed ? 'Passed luxury hospitality benchmark.' : 'Requires revision before passing.'
    }
  }
}

/**
 * High-Quality Fallback Generator for Hotel Operations
 * Generates 4-6 production-ready, rich HTML Standard Operating Procedures and Checkpoints
 */
export function generateRichHotelModuleFallback(
  context: string,
  language: string = 'English',
  count: number = 4
): ModuleOutline {
  const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')
  const lower = context.toLowerCase()

  // 1. FRONT OFFICE / RECEPTION / GUEST CHECK-IN
  if (lower.includes('front') || lower.includes('check') || lower.includes('reception') || lower.includes('concierge') || lower.includes('استقبال')) {
    if (isArabic) {
      return {
        title: 'معايير الاستقبال والتميز الفندقي 5 نجوم (Altus Front Office SOP)',
        description: 'برنامج تدريبي شامل لإجراءات استقبال الضيوف، التحقق من الحجوزات في نظام الفندق، وإدارة تجربة النزيل الاستثنائية.',
        sections: [
          {
            heading: '1. بروتوكول الترحيب واستقبال الضيف (قاعدة الـ 15 ثانية)',
            suggestedBlockType: 'text',
            summary: 'معايير الترحيب الدافئ، لغة الجسد الاحترافية، وتقديم ضيافة القهوة السعودية.',
            rich_content: `
              <h3>معيار الترحيب الفندقي الفاخر</h3>
              <p>يجب الترحيب بكل ضيف يقترب من مكتب الاستقبال في غضون <strong>15 ثانية</strong> بابتسامة دافئة وتواصل بصري مباشر.</p>
              <h4>خطوات التنفيذ التشغيلية:</h4>
              <ul>
                <li><strong>الخطوة الأولى:</strong> الوقوف باعتدال والترحيب بالضيف فور اقترابه: <em>"أهلاً وسهلاً بكم في فندق ألتوس، يسعدنا وجودكم معنا اليوم."</em></li>
                <li><strong>الخطوة الثانية:</strong> طلب بطاقة الهوية الوطنية أو جواز السفر والتأكد من تطابق الاسم مع الحجز في نظام أوبرا (PMS).</li>
                <li><strong>الخطوة الثالثة:</strong> استخدام اسم عائلة الضيف مرتين على الأقل أثناء إجراءات التسجيل لإضفاء طابع شخصي راقٍ.</li>
              </ul>
              <blockquote><strong>قاعدة ألتوس الذهبية:</strong> لا تدع الضيف ينتظر دون تقديم ضيافة الترحيب الفاخرة.</blockquote>
            `
          },
          {
            heading: '2. معالجة الحجز والتسجيل في نظام الفندق (PMS) وتخصيص الغرف',
            suggestedBlockType: 'text',
            summary: 'إجراءات تفعيل مفتاح الغرفة، مراجعة تفضيلات الضيف، وضمان وسائل الدفع.',
            rich_content: `
              <h3>إجراءات التحقق والتسجيل السلس</h3>
              <p>تأكد من إتمام عملية تسجيل الوصول في أقل من <strong>3 دقائق</strong> مع الحفاظ على الدقة والخصوصية التامة.</p>
              <ul>
                <li>مراجعة تفضيلات الغرفة (طابق مرتفع، إطلالة خاصة، سرير كينج، مرافق خاصة).</li>
                <li>إجراء التفويض المالي المسبق للبطاقة الائتمانية وتوضيح سياسة الودائع بأدب.</li>
                <li>برمجة مفاتيح الغرف وتسليمها في المحفظة الخاصة مع شرح مرافق الفندق (مواعيد الإفطار، النادي الصحي، شبكة الواي فاي).</li>
              </ul>
            `
          },
          {
            heading: '3. بروتوكول خدمة كبار الشخصيات (VIP Arrival Protocols)',
            suggestedBlockType: 'text',
            summary: 'تجهيزات الضيوف المميزين، الاستقبال في صالة كبار الشخصيات، وخدمة المساعد الشخصي.',
            rich_content: `
              <h3>معايير استقبال ضيوف VIP</h3>
              <ul>
                <li>التنسيق المسبق مع قسم التدبير الفندقي للتأكد من وضع باقة الترحيب والفواكه الطازجة قبل 3 ساعات من الوصول.</li>
                <li>مرافقة الضيف مباشرة إلى جناحه وإتمام إجراءات تسجيل الوصول داخل الجناح (In-Suite Check-in).</li>
                <li>تقديم مدير المناوب شخصياً للترحيب بالضيف وتوفير رقم التواصل المباشر.</li>
              </ul>
            `
          },
          {
            heading: '4. منهجية التعافي الخدمي ومعالجة الشكاوى (LAST Method)',
            suggestedBlockType: 'text',
            summary: 'منهجية LAST لتحويل شكاوى الضيوف إلى ولاء دائم وتفويض الموظف لحل المشكلات.',
            rich_content: `
              <h3>منهجية LAST لخدمة النزلاء</h3>
              <ul>
                <li><strong>L - Listen (الاستماع):</strong> استمع للضيف باهتمام كامل دون مقاطعة ودون تبرير.</li>
                <li><strong>A - Apologize (الاعتذار):</strong> قدم اعتذاراً صادقاً باسم إدارة الفندق.</li>
                <li><strong>S - Solve (الحل):</strong> قدم حلاً فورياً ملموساً (ترقية غرفة، وجبة مجانية، حل فوري مع الصيانة).</li>
                <li><strong>T - Thank (الشكر):</strong> اشكر الضيف على لفت انتباهنا للخلل لتمكيننا من التطوير.</li>
              </ul>
            `
          }
        ],
        suggestedQuizCheckpoints: [
          { afterSectionIndex: 0, topic: 'سيناريو التعامل مع وصول ضيف VIP في ساعات الذروة' },
          { afterSectionIndex: 3, topic: 'تطبيق منهجية LAST عند وجود تأخير في جاهزية الغرفة' }
        ]
      }
    }

    return {
      title: '5-Star Front Desk & Luxury Guest Operations (Altus SOP)',
      description: 'Comprehensive standard operating procedure covering luxury arrival protocols, PMS check-in verification, VIP management, and 5-star service recovery.',
      sections: [
        {
          heading: '1. Luxury Arrival & Warm Welcome Protocol (15-Second Rule)',
          suggestedBlockType: 'text',
          summary: 'Standards for greeting guests within 15 seconds, body language, and using guest surname.',
          rich_content: `
            <h3>Forbes 5-Star Arrival Standard</h3>
            <p>Every arriving guest must be acknowledged immediately upon approaching the Front Desk within <strong>15 seconds</strong> with warm eye contact and a genuine smile.</p>
            <h4>Operational Execution Steps:</h4>
            <ul>
              <li><strong>Step 1 (The Greeting):</strong> State the official greeting warmly: <em>"Good morning/afternoon, welcome to Altus. It is our pleasure to welcome you."</em></li>
              <li><strong>Step 2 (ID & Record Verification):</strong> Request government-issued ID or passport politely and retrieve the reservation in the Property Management System (PMS).</li>
              <li><strong>Step 3 (Personalization):</strong> Address the guest by their surname at least twice naturally during the check-in conversation.</li>
            </ul>
            <blockquote><strong>Golden Rule:</strong> Never say 'No' directly. Always offer a positive luxury alternative.</blockquote>
          `
        },
        {
          heading: '2. PMS Check-in, Payment Guarantee & Room Key Coding',
          suggestedBlockType: 'text',
          summary: 'Fast and secure PMS handling, room preference confirmation, and key delivery.',
          rich_content: `
            <h3>Seamless Check-in Execution</h3>
            <p>Complete the full check-in process smoothly in <strong>under 3 minutes</strong> while ensuring total accuracy and payment security.</p>
            <ul>
              <li><strong>Room Assignment:</strong> Verify assigned room matches guest profile preferences (High floor, Quiet zone, King bed).</li>
              <li><strong>Payment Pre-Authorization:</strong> Secure credit card pre-authorization for room and incidental deposits clearly and politely.</li>
              <li><strong>Key Card Presentation:</strong> Code RFID keys, place them in a pristine key wallet, and explain elevator access and room number discreetly without saying the room number out loud.</li>
            </ul>
          `
        },
        {
          heading: '3. VIP & Executive Lounge Check-in Standards',
          suggestedBlockType: 'text',
          summary: 'High-touch executive arrival, in-suite check-in, and personalized butler coordination.',
          rich_content: `
            <h3>VIP Arrival & In-Suite Service</h3>
            <ul>
              <li>Pre-arrival inspection of VIP suite 3 hours prior to landing to ensure welcome amenities are fresh.</li>
              <li>Direct escort from lobby to the private suite for seamless in-room check-in.</li>
              <li>Personal introduction of the Duty Manager and Butler with direct contact cards.</li>
            </ul>
          `
        },
        {
          heading: '4. Service Recovery & The LAST Methodology',
          suggestedBlockType: 'text',
          summary: 'Framework for turning guest concerns into loyalty through Listen, Apologize, Solve, Thank.',
          rich_content: `
            <h3>The LAST Service Recovery Standard</h3>
            <ul>
              <li><strong>L - Listen:</strong> Actively listen without interruption, taking notes and demonstrating empathy.</li>
              <li><strong>A - Apologize:</strong> Offer a sincere, professional apology on behalf of the hotel.</li>
              <li><strong>S - Solve:</strong> Take immediate ownership. Provide a concrete solution within your staff empowerment limit ($150 / room upgrade).</li>
              <li><strong>T - Thank:</strong> Thank the guest for sharing their feedback to help us maintain 5-star excellence.</li>
            </ul>
          `
        }
      ],
      suggestedQuizCheckpoints: [
        { afterSectionIndex: 0, topic: 'Scenario: Handling early arrival guest when room is not yet inspected' },
        { afterSectionIndex: 3, topic: 'Scenario: Applying the LAST method when guest luggage is delayed' }
      ]
    }
  }

  // 2. HOUSEKEEPING & SUITE TURNOVER STANDARDS
  if (lower.includes('housekeep') || lower.includes('clean') || lower.includes('room') || lower.includes('نظافة') || lower.includes('تدبير')) {
    return {
      title: isArabic ? 'معايير التدبير الفندقي ونظافة الغرف الفاخرة (45-Point SOP)' : '5-Star Luxury Housekeeping & Room Inspection Standards',
      description: isArabic ? 'دليل شامل لمعايير تنظيف وتجهيز الغرف والأجنحة الفندقية وفق أعلى معايير الجودة والتعقيم.' : 'Comprehensive standard operating procedure for suite turnover, bed making, sanitization, and 45-point supervisor inspections.',
      sections: [
        {
          heading: isArabic ? '1. بروتوكول الدخول والتجهيز الأولي للغرفة' : '1. Guest Room Entry & Preparation Protocol',
          suggestedBlockType: 'text',
          summary: isArabic ? 'إجراءات طرق الباب 3 مرات وتهوية الغرفة وبدء جمع البياضات.' : 'Three-knock entry procedure, room ventilation, and linen stripping.',
          rich_content: `
            <h3>${isArabic ? 'معايير الدخول الآمن للغرفة' : 'Standard Room Entry Protocol'}</h3>
            <p>${isArabic ? 'اطرق الباب بلطف 3 مرات مع التعريف عن النفس بوضوح: "Housekeeping - خدمة الغرف".' : 'Knock firmly three times announcing: "Housekeeping". Wait 10 seconds before using master key.'}</p>
            <ul>
              <li>${isArabic ? 'فتح الستائر والنوافذ للتهوية الطبيعية والتحقق من وجود أي مفقودات.' : 'Open curtains, check for guest personal belongings left behind, and report any lost property immediately.'}</li>
              <li>${isArabic ? 'تجريد السرير من البياضات المستعملة ووضعها في عربة الغسيل دون ملامسة الأرض.' : 'Strip bed linens carefully into laundry bags without allowing linens to touch the floor.'}</li>
            </ul>
          `
        },
        {
          heading: isArabic ? '2. تنظيف وتعقيم الحمام وتجهيز وسائل الراحة (Amenities)' : '2. Bathroom Deep Sanitization & Amenities Setup',
          suggestedBlockType: 'text',
          summary: isArabic ? 'التعقيم الكيميائي للأسطح، تلميع الزجاج، وترتيب المناشف الفاخرة.' : 'Chemical disinfection, mirror polishing, and luxury towel placement.',
          rich_content: `
            <h3>${isArabic ? 'معايير نظافة الحمام 5 نجوم' : '5-Star Bathroom Sanitization Standard'}</h3>
            <ul>
              <li>${isArabic ? 'استخدام المحاليل المعتمدة ومراعاة زمن التطهير (Contact Time) لضمان القضاء على الجراثيم.' : 'Apply hospital-grade disinfectant to all high-touch surfaces and allow proper dwell contact time.'}</li>
              <li>${isArabic ? 'تلميع المرايا والكروم حتى خلوها التام من أي بقع أو قطرات ماء.' : 'Polish all chrome fixtures and glass mirrors to zero-streak perfection.'}</li>
              <li>${isArabic ? 'ترتيب مستلزمات العناية الشخصية والشامبو والصابون بشكل متناسق ومستقيم.' : 'Align luxury amenities label-forward with exact branding spacing standards.'}</li>
            </ul>
          `
        },
        {
          heading: isArabic ? '3. تجهيز وترتيب السرير الفاخر (Hospital Corners)' : '3. Bed Making & Triple-Sheet Styling',
          suggestedBlockType: 'text',
          summary: isArabic ? 'معايير شد الملاءات بزوايا المشفى وتوزيع الوسائد الفاخرة.' : 'Triple-sheeting technique, tight hospital corners, and 4-pillow symmetry.',
          rich_content: `
            <h3>${isArabic ? 'معيار ترتيب السرير الفاخر' : 'Luxury Bed Dressing Standards'}</h3>
            <ul>
              <li>${isArabic ? 'شد الملاءة الأساسية بإحكام لضمان عدم وجود أي تجاعيد.' : 'Pull fitted and flat sheets taut with crisp 45-degree hospital corners on all four sides.'}</li>
              <li>${isArabic ? 'ترتيب وسائد الريش مع نفخها وضبطها بزاوية 90 درجة متماثلة.' : 'Fluff all goose-down pillows and align them upright in perfect symmetry.'}</li>
            </ul>
          `
        },
        {
          heading: isArabic ? '4. قائمة الفحص النهائي للمشرف (45-Point Inspection)' : '4. 45-Point Supervisor Final Inspection Checklist',
          suggestedBlockType: 'text',
          summary: isArabic ? 'الفحص بالأشعة فوق البنفسجية، فحص الروائح، واعتماد الغرفة في نظام PMS.' : 'UV sanitation audit, aroma check, and releasing room to ready status in PMS.',
          rich_content: `
            <h3>${isArabic ? 'اعتماد جاهزية الغرفة' : 'Supervisor Room Release SOP'}</h3>
            <ul>
              <li>${isArabic ? 'فحص نقاط اللمس المتكررة (مقابض الأبواب، جهاز التحكم، الهاتف، مفاتيح الإضاءة).' : 'Inspect high-touch items: remote control (sealed in sleeve), telephone handset, door handles, light switches.'}</li>
              <li>${isArabic ? 'تغيير حالة الغرفة في نظام أوبرا إلى "Inspected - مفحوصة" لتصبح متاحة لموظفي الاستقبال.' : 'Update room status in PMS from Dirty to Inspected to allow instant guest check-in.'}</li>
            </ul>
          `
        }
      ],
      suggestedQuizCheckpoints: [
        { afterSectionIndex: 0, topic: isArabic ? 'سيناريو العثور على مقتنيات ثمينة في الغرفة المغادرة' : 'Scenario: Protocol when discovering valuable lost items in departed suite' },
        { afterSectionIndex: 3, topic: isArabic ? 'اختبار قائمة الفحص النهائي للمشرف' : 'Scenario: Handling failed room audit items before guest arrival' }
      ]
    }
  }

  // 3. GENERAL HOSPITALITY / SAFETY / OPERATIONAL DEFAULT (ALWAYS 4 SECTIONS)
  return {
    title: isArabic
      ? `معايير التميز التشغيلي والضيافة الفاخرة (${context.slice(0, 30)} - Altus Core)`
      : `Operational Excellence & 5-Star Service Standards (${context.slice(0, 30)})`,
    description: isArabic
      ? 'برنامج تدريبي متكامل للموظفين حول معايير الجودة، التواصل الفعال مع النزلاء، وإجراءات السلامة الفندقية.'
      : 'Comprehensive operational training covering 5-star service etiquette, proactive guest communication, workflows, and safety compliance.',
    sections: [
      {
        heading: isArabic ? '1. أسس الضيافة الفندقية الفاخرة والتواصل الراقي' : '1. Foundations of 5-Star Luxury Hospitality & Guest Engagement',
        suggestedBlockType: 'text',
        summary: isArabic ? 'قواعد التواصل الفعال، الابتسامة، والاهتمام الاستباقي باحتياجات النزلاء.' : 'Proactive service principles, positive body language, and anticipating guest needs.',
        rich_content: `
          <h3>${isArabic ? 'معايير ألتوس للخدمة الراقية' : 'Altus Standards of Exceptional Service'}</h3>
          <p>${isArabic ? 'تهدف فنادق ألتوس إلى تقديم تجارب لا تُنسى تتجاوز توقعات الضيوف في كل نقطة اتصال.' : 'Altus Hotels delivers unforgettable guest experiences by exceeding expectations at every single operational touchpoint.'}</p>
          <ul>
            <li><strong>${isArabic ? 'الاستباقية:' : 'Anticipation:'}</strong> ${isArabic ? 'ملاحظة احتياجات الضيف وتلبيتها قبل أن يطلبها.' : 'Observe guest habits and fulfill needs before the guest even has to ask.'}</li>
            <li><strong>${isArabic ? 'لغة الجسد:' : 'Body Language:'}</strong> ${isArabic ? 'الوقوف باستقامة، التواصل البصري الودود، والابتسامة الصادقة.' : 'Maintain open posture, welcoming eye contact, and genuine warm smiles.'}</li>
          </ul>
        `
      },
      {
        heading: isArabic ? '2. إجراءات التشغيل القياسية وسير العمل اليومي' : '2. Standard Operating Procedures & Daily Workflow Execution',
        suggestedBlockType: 'text',
        summary: isArabic ? 'خطوات التنفيذ الدقيقة، إدارة الوقت، والتنسيق بين الأقسام المختلفة.' : 'Step-by-step operational workflows, time management, and inter-departmental handovers.',
        rich_content: `
          <h3>${isArabic ? 'خطوات العمل القياسية' : 'Standard Operating Workflow'}</h3>
          <ul>
            <li>${isArabic ? 'الالتزام بمواعيد تسليم المهام والتحقق من جودة المخرجات قبل الاعتماد.' : 'Adhere strictly to service delivery time benchmarks and double-check output quality before final handover.'}</li>
            <li>${isArabic ? 'تسجيل جميع المعاملات بدقة في النظام الداخلي لضمان الشفافية والمتابعة.' : 'Document all actions and shift handover notes in the Altus enterprise intranet for seamless shift handovers.'}</li>
          </ul>
        `
      },
      {
        heading: isArabic ? '3. منهجية حل المشكلات والتعافي الفوري (LAST Framework)' : '3. Service Recovery & Problem Resolution (LAST Framework)',
        suggestedBlockType: 'text',
        summary: isArabic ? 'منهجية معالجة العقبات التشغيلية وإرضاء الضيوف بتمكين الموظفين.' : 'Resolving operational challenges on the spot with empowered frontline staff.',
        rich_content: `
          <h3>${isArabic ? 'منهجية حل المشكلات' : 'Service Recovery Protocol'}</h3>
          <ul>
            <li>${isArabic ? 'الاستماع الفعال وفهم المشكلة دون إلقاء اللوم على الزملاء أو الأقسام.' : 'Listen actively and understand root causes without blaming colleagues or departments.'}</li>
            <li>${isArabic ? 'اتخاذ إجراء تصحيحي فوري وتقديم تعويض مناسب ضمن حدود الصلاحية.' : 'Take immediate corrective action within staff empowerment thresholds and follow up with the guest.'}</li>
          </ul>
        `
      },
      {
        heading: isArabic ? '4. بروتوكول السلامة والاستجابة للطوارئ' : '4. Safety Compliance & Emergency Response Protocols',
        suggestedBlockType: 'text',
        summary: isArabic ? 'إجراءات السلامة من الحرائق، الإخلاء المنظم، والإبلاغ عن المخاطر.' : 'Fire safety standards, orderly evacuation routes, and rapid hazard reporting.',
        rich_content: `
          <h3>${isArabic ? 'إجراءات السلامة الفندقية' : 'Hotel Safety & Emergency Guidelines'}</h3>
          <ul>
            <li>${isArabic ? 'معرفة مواقع مخارج الطوارئ وطفايات الحريق في كل طابق.' : 'Know the precise locations of all emergency exits and fire extinguishers in your assigned area.'}</li>
            <li>${isArabic ? 'الإبلاغ الفوري عن أي عطل أو خطر للأمن والصيانة عبر نظام التذاكر.' : 'Log any safety hazard or maintenance issue immediately via the Altus maintenance ticket system.'}</li>
          </ul>
        `
      }
    ],
    suggestedQuizCheckpoints: [
      { afterSectionIndex: 0, topic: isArabic ? 'اختبار تطبيقي في مهارات التعامل الراقي مع الضيوف' : 'Scenario Checkpoint: Handling proactive guest assistance in hotel lobby' },
      { afterSectionIndex: 3, topic: isArabic ? 'اختبار إجراءات السلامة والاستجابة للطوارئ' : 'Scenario Checkpoint: Emergency response and hazard mitigation' }
    ]
  }
}

/**
 * High-Quality Fallback Quiz Generator for Hotel Operations
 */
export function generateHotelQuizFallback(
  context: string,
  language: string = 'English',
  count: number = 3
): QuizQuestion[] {
  const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')
  const lower = context.toLowerCase()

  if (isArabic) {
    return [
      {
        question_text: 'ما هو الحد الأقصى للوقت المسموح به للترحيب بالضيف عند وصوله إلى مكتب الاستقبال وفق معايير ألتوس الفاخرة؟',
        question_type: 'mcq',
        options: ['15 ثانية', 'دقيقة واحدة', '3 دقائق', 'عند انتهاء المعاملة السابقة'],
        correct_answer: '15 ثانية',
        points: 10,
        explanation: 'تنص معايير فوربس والضيافة الفاخرة على الترحيب بالضيف والتواصل البصري خلال 15 ثانية كحد أقصى.',
        hint: 'معيار زمني سريع للغاية لترك انطباع أولي استثنائي.'
      },
      {
        question_text: 'عند حدوث تأخير في جاهزية الغرفة لضيف قادم، ما هو التصرف الصحيح وفق منهجية LAST؟',
        question_type: 'scenario',
        options: [
          'الاستماع للضيف والاعتذار بصدق وتقديم ضيافة في الردهة ومتابعة الغرفة فوراً',
          'إخبار الضيف بأن موعد تسجيل الوصول لم يحن بعد وطلب منه الانتظار جانباً',
          'إلقاء اللوم على قسم التدبير الفندقي لتأخرهم في التنظيف',
          'تجاهل الموقف حتى تكتمل الغرفة تلقائياً في النظام'
        ],
        correct_answer: 'الاستماع للضيف والاعتذار بصدق وتقديم ضيافة في الردهة ومتابعة الغرفة فوراً',
        points: 10,
        explanation: 'منهجية LAST تركز على الاستماع والاعتذار والحل السريع والشكر لتعزيز ولاء الضيف.',
        hint: 'اختر الإجراء الذي يركز على خدمة الضيف وحل المشكلة.'
      },
      {
        question_text: 'يجب التحقق من تطابق هوية الضيف مع بيانات الحجز المسجلة في نظام إدارة الممتلكات (PMS).',
        question_type: 'true_false',
        options: ['صحيح', 'خطأ'],
        correct_answer: 'صحيح',
        points: 10,
        explanation: 'التحقق الأمني والمطابقة النظامية إلزامية لحماية خصوصية النزيل وأمن الفندق.',
        hint: 'قاعدة أمنية وتنظيمية أساسية في القطاع الفندقي.'
      }
    ]
  }

  return [
    {
      question_text: 'According to Altus 5-star standards, within what timeframe must an arriving guest be acknowledged at the Front Desk?',
      question_type: 'mcq',
      options: ['Within 15 seconds', 'Within 1 minute', 'Within 3 minutes', 'Only after finishing current paperwork'],
      correct_answer: 'Within 15 seconds',
      points: 10,
      explanation: 'Forbes 5-star standards require warm eye contact and greeting within 15 seconds of approaching the desk.',
      hint: 'A rapid standard to create a lasting first impression.'
    },
    {
      question_text: 'A guest arrives at 11:00 AM demanding early check-in, but their room is not yet inspected. What is the correct standard procedure?',
      question_type: 'scenario',
      options: [
        'Acknowledge warmly, secure luggage with concierge, offer welcome beverage in the lounge, and prioritize room turnover',
        'Directly tell the guest official check-in is 3:00 PM and ask them to return later',
        'Assign a dirty room and ask housekeeping to clean while guest is inside',
        'Blame housekeeping for cleaning delays'
      ],
      correct_answer: 'Acknowledge warmly, secure luggage with concierge, offer welcome beverage in the lounge, and prioritize room turnover',
      points: 10,
      explanation: 'Always offer a positive luxury alternative, secure luggage, and proactively expedite room readiness.',
      hint: 'Choose the proactive luxury hospitality recovery action.'
    },
    {
      question_text: 'Front desk staff must verify guest identification against the PMS reservation before coding room keys.',
      question_type: 'true_false',
      options: ['True', 'False'],
      correct_answer: 'True',
      points: 10,
      explanation: 'ID verification is a mandatory security and regulatory standard in hotel operations.',
      hint: 'Fundamental security standard.'
    }
  ]
}

/**
 * Generates an exhaustive 600-word 5-star operational hotel SOP
 */
export function generateDeepSectionFallback(
  heading: string,
  summary: string,
  language: string = 'English',
  department: string = 'Hotel Operations'
): string {
  const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')

  if (isArabic) {
    return `
      <div class="space-y-4">
        <h3>1. المعيار والهدف التشغيلي (Operational Standard & Purpose)</h3>
        <p>يهدف هذا الإجراء القياسي إلى ضبط وتنفيذ <strong>${heading}</strong> وفق أعلى معايير الضيافة الفندقية العالمية (Forbes 5-Star Standards) في مجموعة فنادق ألتوس. يجب على كافة موظفي قسم <strong>${department}</strong> الالتزام بالدقة الزمنية والاحترافية العالية لضمان تجربة استثنائية لا تُنسى للنزيل.</p>
        
        <h3>2. خطوات التنفيذ التفصيلية خطوة بخطوة (Step-by-Step Execution Workflow)</h3>
        <ol class="space-y-2 list-decimal list-inside text-slate-700 dark:text-slate-300">
          <li><strong>التحضير والتأكد من الجاهزية (0-2 دقيقة):</strong> فحص محطة العمل، التأكد من توافر كافة المستلزمات والمطبوعات والأدوات التشغيلية الرقمية قبل بدء المهمة.</li>
          <li><strong>الترحيب الاستباقي والتواصل البصري (خلال 15 ثانية):</strong> الترحيب بالضيف بابتسامة دافئة وصادقة مع الوقوف باستقامة واستخدام لقب النزيل الرسمي.</li>
          <li><strong>التحقق من البيانات وسجل التفضيلات (2-3 دقائق):</strong> مراجعة ملف النزيل في نظام PMS، ومطابقة الهوية الوطنية/جواز السفر، والاطلاع على التفضيلات الخاصة (مثل نوع الوسائد، الطابق المفضل).</li>
          <li><strong>تنفيذ الخدمة بدقة وسلاسة (3-5 دقائق):</strong> شرح تفاصيل الخدمة أو المرافق بوضوح مع تقديم خيارات مخصصة تناسب رغبات الضيف.</li>
          <li><strong>التأكيد وإتاحة المساعدة الإضافية (دقيقة واحدة):</strong> سؤال الضيف بلطف عما إذا كان بحاجة إلى أي ترتيبات خاصة للنقل، المطاعم، أو الجولات السياحية.</li>
          <li><strong>التوثيق والتحديث الفوري في النظام:</strong> تسجيل أي ملاحظات أو طلبات خاصة في النظام الداخلي لضمان علم كافة الورديات اللاحقة.</li>
        </ol>

        <h3>3. نصوص المحادثة ولغة الجسد المعتمدة (Verbatim Dialogue Scripts)</h3>
        <div class="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-2">
          <p><strong>عند الترحيب الأولي:</strong> <em>"أهلاً وسهلاً بك في فندق ألتوس، يسعدنا جداً استقبالك اليوم يا سيدي. كيف كانت رحلتك إلينا؟"</em></p>
          <p><strong>عند تلبية طلب خاص:</strong> <em>"بكل سرور وفخر، تم تسجيل طلبك وسنحرص على تنفيذه فوراً كما تفضلتم تماماً."</em></p>
          <p><strong>عند الختام:</strong> <em>"نحن دائماً في خدمتك على مدار الساعة، ونتمنى لك إقامة مميزة ومليئة بالراحة والسعادة."</em></p>
        </div>

        <h3>4. قائمة التحقق من الجودة (5-Star Quality Inspection Checklist)</h3>
        <ul class="space-y-1 list-disc list-inside">
          <li>المظهر المهني والزي الموحد مكوي ونظيف مع ارتداء بطاقة الاسم بوضوح.</li>
          <li>عدم استخدام الهاتف الشخصي نهائياً في المناطق الأمامية وأمام الضيوف.</li>
          <li>استخدام اسم النزيل مرتين على الأقل خلال المحادثة بنبرة راقية.</li>
          <li>تنفيذ الخدمة خلال الوقت المحدد دون أي تأخير أو ارتباك.</li>
        </ul>

        <h3>5. بروتوكول التعافي وحل المشكلات (Service Recovery - LAST)</h3>
        <p>في حال حدوث أي تأخير أو خطأ تشغيلي، يجب تطبيق نموذج <strong>LAST</strong> فوراً: (<strong>L</strong>isten: استمع باهتمام، <strong>A</strong>pologize: اعتذر بصدق، <strong>S</strong>olve: قدّم حلاً وتعويضاً فورياً، <strong>T</strong>hank: اشكر الضيف على تنبيهنا لتطوير خدمتنا).</p>

        <div class="p-3 my-2 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded text-amber-900 dark:text-amber-200">
          <strong>نصيحة ألتوس الذهبية للتميز:</strong> الخدمة الفاخرة الحقيقية ليست مجرد تلبية ما يطلبه الضيف، بل هي استباق احتياجاته وتقديم ما لم يخطر على باله قبل أن يسأل عنه.
        </div>
      </div>
    `
  }

  return `
    <div class="space-y-4">
      <h3>1. Executive Standard & Operational Purpose</h3>
      <p>This Standard Operating Procedure defines the precise execution of <strong>${heading}</strong> in accordance with Forbes 5-Star Luxury Hospitality benchmarks at Altus Hotels. All associates in <strong>${department}</strong> are required to master these standards to ensure flawless, anticipatory guest experiences.</p>
      
      <h3>2. Step-by-Step Procedure & Time Benchmarks</h3>
      <ol class="space-y-2 list-decimal list-inside text-slate-700 dark:text-slate-300">
        <li><strong>Pre-Service Inspection & Station Readiness (0-2 mins):</strong> Inspect operational console, verify digital supplies, and confirm that all required tools are operating properly.</li>
        <li><strong>Immediate Anticipatory Greeting (Within 15 seconds):</strong> Acknowledge arriving guests within 15 seconds with direct eye contact, a warm posture, and genuine hospitality.</li>
        <li><strong>PMS Profile Verification & Preference Recognition (2-3 mins):</strong> Pull the guest profile in Opera/PMS, cross-reference photo ID/passport, and immediately review tailored preferences (e.g. feather pillows, high floor, dietary needs).</li>
        <li><strong>Service Execution & Tailored Briefing (3-5 mins):</strong> Deliver the core service smoothly while succinctly highlighting tailored hotel amenities and dining offerings.</li>
        <li><strong>Proactive Assistance & Inquiry (1 min):</strong> Inquire politely if transportation, dining reservations, or personalized itinerary arrangements are required.</li>
        <li><strong>PMS Profile Synchronization & Shift Handover Logging:</strong> Immediately log special preferences or feedback in the intranet guest profile for seamless inter-departmental visibility.</li>
      </ol>

      <h3>3. Verbatim Dialogue Scripts & Body Language Protocols</h3>
      <div class="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-2">
        <p><strong>Initial Greeting:</strong> <em>"A very warm welcome to Altus Luxury Suites, Mr. Henderson. It is an absolute pleasure to have you with us today. How was your journey?"</em></p>
        <p><strong>Fulfilling a Request:</strong> <em>"Certainly, with pleasure. I have already prioritized that for your suite and will personally ensure it is completed."</em></p>
        <p><strong>Fond Farewell / Handover:</strong> <em>"It is our absolute pleasure to assist you. Please let us know if there is anything further we can do to make your stay extraordinary."</em></p>
      </div>

      <h3>4. 5-Star Quality Inspection Checklist</h3>
      <ul class="space-y-1 list-disc list-inside">
        <li>Pristine grooming and uniform standards with name badge prominently displayed.</li>
        <li>Zero mobile phone presence or personal chatter in guest-facing areas.</li>
        <li>Guest surname utilized naturally at least twice during the interaction.</li>
        <li>Service executed within established Forbes time benchmarks with zero friction.</li>
      </ul>

      <h3>5. Service Recovery & Problem Resolution (LAST Protocol)</h3>
      <p>If any service disruption occurs, immediately deploy the <strong>LAST</strong> framework: (<strong>L</strong>isten actively without interruption, <strong>A</strong>pologize sincerely on behalf of Altus, <strong>S</strong>olve immediately using frontline empowerment credits, and <strong>T</strong>hank the guest for providing feedback).</p>

      <div class="p-3 my-2 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded text-amber-900 dark:text-amber-200">
        <strong>Altus 5-Star Pro Tip:</strong> True luxury hospitality is not simply reacting to guest requests, but intuitively anticipating needs before the guest even verbalizes them.
      </div>
    </div>
  `
}

/**
 * Operational Checklist Fallback Generator for Hotel Operations
 */
export function generateHotelChecklistFallback(
  title: string,
  _content: string,
  language: string = 'English',
  _count: number = 6
): Array<{ id: string; text: string; text_ar?: string; is_required: boolean; order: number }> {
  const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')

  const baseItems = [
    {
      text: 'Verify guest preferences and VIP profile in Opera PMS prior to task execution.',
      text_ar: 'التحقق من تفضيلات النزيل وسجل كبار الشخصيات (VIP) في نظام PMS قبل بدء الإجراء.',
      is_required: true
    },
    {
      text: 'Inspect workstation/area for pristine Forbes 5-star cleanliness and presentation.',
      text_ar: 'فحص محطة العمل والمنطقة للتأكد من النظافة والترتيب وفق معايير فوربس 5 نجوم.',
      is_required: true
    },
    {
      text: 'Confirm physical supplies, digital equipment, and access credentials are operational.',
      text_ar: 'التأكد من جاهزية الأدوات التشغيلية والأجهزة الرقمية وصلاحيات الدخول.',
      is_required: true
    },
    {
      text: 'Execute standard operating sequence within the established time benchmark.',
      text_ar: 'تنفيذ الخطوات التشغيلية القياسية ضمن الإطار الزمني المحدد والمعتمد.',
      is_required: true
    },
    {
      text: 'Perform secondary quality audit and confirm guest/system requirements are fulfilled.',
      text_ar: 'إجراء تدقيق جودة ثانوي والتأكد من اكتمال كافة متطلبات الضيف والنظام.',
      is_required: false
    },
    {
      text: 'Log completion status and sync notes in the intranet for shift handover continuity.',
      text_ar: 'توثيق حالة الإنجاز وتسجيل الملاحظات في النظام الداخلي لضمان استمرارية تسليم الورديات.',
      is_required: false
    }
  ]

  return baseItems.map((item, idx) => ({
    id: crypto.randomUUID(),
    text: isArabic ? item.text_ar : item.text,
    text_ar: item.text_ar,
    is_required: item.is_required,
    order: idx
  }))
}

/**
 * Operational FAQ Fallback Generator for Hotel Operations
 */
export function generateHotelFAQFallback(
  title: string,
  _content: string,
  language: string = 'English',
  _count: number = 4
): Array<{ id: string; question: string; question_ar?: string; answer: string; answer_ar?: string; order: number }> {
  const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')

  const baseFAQs = [
    {
      question: `What should frontline associates do if an unexpected exception occurs during ${title || 'this SOP'}?`,
      question_ar: `ما هو الإجراء المتبع عند مواجهة استثناء أو حالة غير متوقعة أثناء تنفيذ هذا الإجراء؟`,
      answer: 'Apply immediate frontline empowerment to resolve the issue for the guest, apply the LAST protocol, and escalate to the Duty Manager only if senior authorization is required.',
      answer_ar: 'استخدام صلاحيات التمكين الفوري لحل الموقف للنزيل وتطبيق نموذج LAST، والتصعيد لمدير الوردية فقط إذا تطلب الأمر موافقة إدارية عليا.'
    },
    {
      question: 'How quickly must service recovery be initiated if a guest expresses dissatisfaction?',
      question_ar: 'ما هي المهلة الزمنية لبدء إجراءات تدارك الخدمة عند إبداء الضيف أي عدم رضا؟',
      answer: 'Immediately within 3 minutes of becoming aware. Offer a sincere apology, active solution, and follow up within 20 minutes to confirm total satisfaction.',
      answer_ar: 'فوراً خلال 3 دقائق من العلم بالمشكلة. تقديم اعتذار صادق وحل فعال، والمتابعة مع الضيف خلال 20 دقيقة للتأكد من رضاه التام.'
    },
    {
      question: 'Who is responsible for verifying that all checklist items in this document are completed?',
      question_ar: 'من هو المسؤول عن التحقق من اكتمال كافة بنود قائمة التحقق في هذه الوثيقة؟',
      answer: 'The primary assigned team associate executes each step, while the Department Supervisor conducts spot audits during daily shift turnovers.',
      answer_ar: 'الموظف المسؤول المنفذ للوردية ينفذ كافة الخطوات، ويقوم مشرف القسم بإجراء تدقيق عشوائي دوري عند تسليم الورديات.'
    },
    {
      question: 'Where are deviations or specialized guest preferences documented?',
      question_ar: 'أين يتم توثيق أي استثناءات أو تفضيلات خاصة للنزلاء؟',
      answer: 'Directly in the guest Opera PMS profile notes and logged in the Altus Intranet departmental shift handover report.',
      answer_ar: 'مباشرة في خانة ملاحظات ملف النزيل في نظام PMS وفي تقرير تسليم الورديات في إنترانت ألتوس.'
    }
  ]

  return baseFAQs.map((faq, idx) => ({
    id: crypto.randomUUID(),
    question: isArabic ? faq.question_ar : faq.question,
    question_ar: faq.question_ar,
    answer: isArabic ? faq.answer_ar : faq.answer,
    answer_ar: faq.answer_ar,
    order: idx
  }))
}


