

import { supabase } from './supabase'
import { isProcessAiErrorResponse, type ProcessAiRequest, type ProcessAiResponse } from '@/types/ai'



// 🛡️ PRIMARY MODEL (Confirmed working on HF Router via 'together' provider)

const FALLBACK_MODELS = [
  'Qwen/Qwen2.5-7B-Instruct'
]

/**
 * Robust JSON parser for LLM outputs.
 * Handles trailing commas, unescaped newlines in strings, and truncated arrays.
 */
function safeParseJson<T>(raw: string, expectArray: boolean): T | null {
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
        // Find all complete {...} objects within the array
        const objects: string[] = []
        let depth = 0, start = -1, inStr = false, escape = false
        for (let i = 0; i < match[0].length; i++) {
          const ch = match[0][i]
          if (escape) { escape = false; continue }
          if (ch === '\\') { escape = true; continue }
          if (ch === '"') { inStr = !inStr; continue }
          if (inStr) continue
          if (ch === '{') { if (depth === 0) start = i; depth++ }
          if (ch === '}') {
            depth--
            if (depth === 0 && start !== -1) {
              objects.push(match[0].slice(start, i + 1))
              start = -1
            }
          }
        }
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
  suggestedBlockType: 'text' | 'video' | 'document_link'
  summary: string
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
}



const cleanText = (text: string): string => {

  return text

    .replace(/\p{Cc}/gu, '')

    .replace(/[þÿ]/g, '')

    .replace(/\s+/g, ' ')

    .trim()

}



// 🧱 PROXY AI CALLER via Supabase Edge Function

async function callHuggingFace(model: string, prompt: string) {

  try {
    const request: ProcessAiRequest = { model, prompt }
    const { data, error } = await supabase.functions.invoke<ProcessAiResponse>('process-ai-request', {
      body: request
    })



    if (error) {

      // Hard network error (500/404 from Supabase itself)

      console.error("Critical Edge Error:", error)

      throw new Error(`Edge Function Connectivity Error: ${error.message}`)

    }



    if (isProcessAiErrorResponse(data)) {

      // Check for session expiry

      if (data.error && (data.error.includes('Session expired') || data.error.includes('Unauthorized'))) {

        throw new Error('Your session has expired. Please refresh the page to continue using AI features.')

      }

      // Soft failure from Edge Function (e.g. HF API 400/500)

      console.warn(`Model ${model} rejected:`, data.error)

      throw new Error(data.error)

    }



    // Support both 'generated_text' (HF style), 'result' (OpenAI style), and 'response' (Edge Function format)

    return (data.response || data.result) as string

  } catch (error: unknown) {

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.warn(`Model ${model} call failed via proxy:`, errorMessage)

    throw error // Re-throw to trigger fallback loop

  }

}



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
          rich_content: `<div class="space-y-5"><div class="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow border border-slate-800"><span class="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">PRIME Operations Standard</span><h3 class="text-xl font-bold text-white mb-2">Standard Operating Procedures</h3><p class="text-slate-300 text-sm leading-relaxed">Adherence to operational excellence, brand benchmarks, and safety compliance across all hotel touchpoints.</p></div></div>`
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
          <span class="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">PRIME Operations Standard</span>
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

    includeExplanations?: boolean

  }): Promise<QuizQuestion[]> {

    // Use recursive sanitization to prevent bypass attempts with nested tags
    let previous: string;
    let sanitized = request.sopContent;
    do {
      previous = sanitized;
      sanitized = previous.replace(/<[^>]*>/g, '');
    } while (sanitized !== previous);
    const context = sanitized.substring(0, 3000)

    const requestedTypesList = request.types && request.types.length > 0
      ? request.types
      : ['mcq', 'true_false', 'fill_blank']
    const typesDescription = requestedTypesList.join(', ')

    const difficulty = request.difficulty || 'medium'
    const language = request.language || 'English'
    const isArabic = language.toLowerCase() === 'arabic' || language.toLowerCase() === 'arabic only'

    const prompt = `You are a Senior Hotel Training & Quality Assurance Director. Create EXACTLY ${count} quiz questions based ONLY on the SOP/training content below.

Target Audience: Hotel Staff and Operations Teams.
Tone: Professional, Clear, Practical, and Educational.
Target Language: ${language}

STRICT QUESTION TYPE REQUIREMENT:
- You MUST ONLY generate questions whose "question_type" is one of the following requested types: [${typesDescription}].
- Distribute the questions evenly across the requested types: [${typesDescription}].
- DO NOT produce any question type that is not in [${typesDescription}].

Detailed rules per question type:
- "mcq": Standard 4-choice question with 1 correct answer. "options" must have 4 distinct choices.
- "mcq_multi": Multiple select question. "options" must have 4-5 choices.
- "true_false": True/False question. "options" MUST be ["True", "False"] (or ["صحيح", "خطأ"] if language is Arabic). "correct_answer" must be "True" or "False" (or "صحيح"/"خطأ").
- "fill_blank": Sentence with a "___" blank. "options" contains 4 possible replacement terms. "correct_answer" is the exact term that fills the blank.
- "scenario": Realistic hotel operational scenario describing a guest interaction, safety procedure, or operational challenge, followed by a decision question. "options" contains 4 practical actions.

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



    Important: For true_false, options MUST be translated to ${language} equivalents.

    

    Context Content:

    ${context}`



    for (const model of FALLBACK_MODELS) {

      try {

        const generatedText = await callHuggingFace(model, prompt)

        const parsed = safeParseJson<QuizQuestion[]>(generatedText, true)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }

      } catch (e) {

        console.warn(`Quiz generation model ${model} failed:`, e)

      }

    }



    return heuristicQuiz()

  },

  /**
   * Generates a structural DRAFT OUTLINE for a training module from pasted
   * source material (an SOP excerpt, meeting notes, raw text). This is
   * explicitly NOT full content generation -- it returns a suggested title,
   * description, and an ordered list of section skeletons (heading +
   * suggested block type + a short summary), plus optional quiz checkpoint
   * suggestions. The author reviews/edits this in the Training Builder
   * before inserting it, then fleshes out the real content themselves.
   */
  async generateModuleOutline(request: {
    sourceContent: string,
    targetLanguage?: string,
    sectionCount?: number
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
    const sectionGuidance = request.sectionCount
      ? `Aim for approximately ${request.sectionCount} sections.`
      : 'Use as many sections as the material naturally supports (typically 3-8).'

    const prompt = `You are a Senior Hotel Training Curriculum Designer. Read the source material below and propose a STRUCTURAL outline for a training module.

    Target Audience: Hotel Staff.
    Target Language: ${language}
    ${sectionGuidance}

    CRITICAL RULES:
    - This is a STRUCTURE only. Do NOT write full paragraphs of finished training content.
    - "summary" fields must be 1-2 short sentences describing what that section should cover, not the finished content itself.
    - "suggestedBlockType" must be exactly one of: "text", "video", "document_link".
    - Suggest quiz checkpoints only where pedagogically useful, referencing the 0-based index of the section they should follow.
    ${isArabic ? '- OUTPUT ONLY IN ARABIC. Translate content where necessary.' : ''}

    Return VALID JSON ONLY with this exact structure:
    {
      "title": "Suggested module title",
      "description": "One or two sentence module description",
      "sections": [
        { "heading": "Section heading", "suggestedBlockType": "text", "summary": "What this section should cover" }
      ],
      "suggestedQuizCheckpoints": [
        { "afterSectionIndex": 0, "topic": "What the checkpoint should test" }
      ]
    }

    Do not add markdown formatting like \`\`\`json. Just the raw JSON object.

    Source Material:
    ${context}`

    for (const model of FALLBACK_MODELS) {

      try {

        const generatedText = await callHuggingFace(model, prompt)
        const parsed = safeParseJson<ModuleOutline>(generatedText, false)
        if (parsed && parsed.title && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          const validBlockTypes = new Set(['text', 'video', 'document_link'])
          const sections = parsed.sections
            .filter(section => !!section?.heading)
            .map(section => ({
              heading: section.heading,
              suggestedBlockType: validBlockTypes.has(section.suggestedBlockType)
                ? section.suggestedBlockType
                : 'text' as const,
              summary: section.summary || ''
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
                : []
            }
          }
        }

      } catch (e) {

        console.warn(`Outline generation model ${model} failed:`, e)

      }

    }

    console.warn('🔥 All AI models failed for outline generation. Engaging Smart Local Fallback.')
    return heuristicOutline(context)

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

        const generatedText = await callHuggingFace(model, prompt)

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

  }

}

