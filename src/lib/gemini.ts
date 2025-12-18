
import { supabase } from './supabase'

// 🛡️ MULTI-MODEL REDUNDANCY STRATEGY
// Using models known to work well with the Inference API (Free Tier)
const FALLBACK_MODELS = [
  'Qwen/Qwen2.5-7B-Instruct',          // Very fast & smart
  'meta-llama/Llama-3.2-3B-Instruct',  // Efficient & open
  'HuggingFaceH4/zephyr-7b-beta',      // Reliable classic
  'microsoft/Phi-3-mini-4k-instruct'   // Good backup
]

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
  question_type: 'mcq' | 'true_false' | 'fill_blank'
  options: string[]
  correct_answer: string
  points: number
}

const cleanText = (text: string): string => {
  return text
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/[þÿ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// 🧱 PROXY AI CALLER via Supabase Edge Function
async function callHuggingFace(model: string, prompt: string) {
  try {
    const { data, error } = await supabase.functions.invoke('process-ai-request', {
      body: { model, prompt }
    })

    if (error) {
      // Hard network error (500/404 from Supabase itself)
      console.error("Critical Edge Error:", error)
      throw new Error(`Edge Function Connectivity Error: ${error.message}`)
    }

    if (data && data.success === false) {
      // Soft failure from Edge Function (e.g. HF API 400/500)
      // We throw this so the loop can try the next model
      console.warn(`Model ${model} rejected by HF:`, data.error)
      throw new Error(data.error)
    }

    return data.generated_text as string
  } catch (error: any) {
    console.warn(`Model ${model} call failed via proxy:`, error.message)
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
        const cleanJson = generatedText.replace(/```json\n?|\n?```/g, '').trim()
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      } catch (e: any) {
        console.warn(`⚠️ Model ${model} failed, switch to next...`)
      }
    }

    // If ALL models fail
    console.error('🔥 All AI models failed. Engaging Smart Local Fallback.')
    return heuristicAnalysis(text)
  },

  async generateQuiz(sopContent: string): Promise<QuizQuestion[]> {
    const context = sopContent.replace(/<[^>]*>/g, '').substring(0, 1000)

    const prompt = `Create 5 MCQ quiz questions for this SOP context. 
    Target Audience: Hotel Staff. Tone: Professional and Educational.
    
    Return ONLY a JSON Array of objects with this structure:
    [
      {
        "question_text": "Question?",
        "question_type": "mcq",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "points": 10
      }
    ]

    Context:
    ${context}`

    for (const model of FALLBACK_MODELS) {
      try {
        const generatedText = await callHuggingFace(model, prompt)
        const cleanJson = generatedText.replace(/```json\n?|\n?```/g, '').trim()
        const jsonMatch = cleanJson.match(/\[[\s\S]*\]/)

        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        console.warn(`Quiz generation model ${model} failed:`, e)
      }
    }

    return heuristicQuiz()
  },

  async improveContent(text: string, instruction: 'grammar' | 'expand' | 'shorten' | 'professional' | 'arabic', language: string = 'English'): Promise<string | null> {
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
        console.log(`🧠 AI Improving content with model: ${model}`)
        const generatedText = await callHuggingFace(model, fullPrompt)

        if (generatedText && generatedText.trim().length > 0) {
          // Remove any potential quotes or chatty prefixes AI might add
          return generatedText.replace(/^"|"$/g, '').trim()
        }
      } catch (e: any) {
        console.warn(`⚠️ AI model ${model} failed:`, e.message)
      }
    }

    console.error("🔥 All AI models failed to improve content.")
    return null
  }
}
