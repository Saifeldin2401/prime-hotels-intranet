

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

    const context = request.sopContent.replace(/<[^>]*>/g, '').substring(0, 3000)

    const count = request.count || 5

    const types = request.types?.join(', ') || 'mcq, true_false, fill_blank'

    const difficulty = request.difficulty || 'medium'

    const language = request.language || 'English'

    const isArabic = language.toLowerCase() === 'arabic' || language.toLowerCase() === 'arabic only'



    const prompt = `You are a Senior Hotel Training Manager. Create EXACTLY ${count} quiz questions based on the SOP content below.

    

    Target Audience: Hotel Staff.

    Tone: Professional, Clear, and Educational.

    Target Language: ${language}

    

    

    REQUIREMENTS:

    - Number of questions: EXACTLY ${count} (It is CRITICAL that you generate ${count} items)

    - Question types: ${types}

    - Difficulty level: ${difficulty}

    - ${request.includeHints ? 'Include a helpful "hint" for each question' : 'Do NOT include hints'}

    - ${request.includeExplanations ? 'Include a clear "explanation" for why the answer is correct' : 'Do NOT include explanations'}

    ${isArabic ? '- OUTPUT ONLY IN ARABIC. Translate content where necessary.' : ''}

    

    Return VALID JSON ONLY. The output must be a single JSON Array containing EXACTLY ${count} objects.

    Structure:

    [

      {

        "question_text": "Question 1 Content in ${language}",

        "question_type": "mcq",

        "options": ["Opt 1", "Opt 2", "Opt 3", "Opt 4"], 

        "correct_answer": "Opt 2",

        "points": 10,

        "explanation": "Exp 1",

        "hint": "Hint 1"

      },

      {

        "question_text": "Question 2 Content in ${language}",

        "question_type": "true_false",

        "options": ["True", "False"], 

        "correct_answer": "True",

        "points": 10,

        "explanation": "Exp 2",

        "hint": "Hint 2"

      }

      ... (continue for ${count} items)

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
    const moduleContext = (request.moduleContext || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
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

