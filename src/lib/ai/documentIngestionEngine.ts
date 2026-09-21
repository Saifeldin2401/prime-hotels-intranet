/**
 * Multimodal Document-to-Course Ingestion Engine
 * 
 * Ingests raw documents (PDFs, brand standards, SOP manuals, scanned policies),
 * and automatically synthesizes a fully structured 5-star course curriculum with
 * modular sections, interactive lesson markdown, and checkpoint quizzes.
 */

import { multiProviderRouter } from './providers/multiProviderRouter'

interface DocumentIngestionOptions {
  documentText: string
  fileName?: string
  targetLanguage?: 'en' | 'ar' | 'bilingual'
  targetDepartment?: string
  targetLevel?: 'beginner' | 'intermediate' | 'advanced'
}

/** Draft course outline returned by the ingestion prompt (distinct from the Studio's CourseBlueprint). */
export interface IngestedCourseDraft {
  title: string
  topic?: string
  courseType?: string
  instructionalStrategy?: string
  targetAudience?: string
  experienceLevel?: string
  courseLanguage?: string
  estimatedDurationMinutes?: number
  learningObjectives?: string[]
  sections: Array<{
    id: string
    title: string
    description?: string
    lessons: Array<{
      id: string
      title: string
      durationMinutes?: number
      content?: string
      learningPoints?: string[]
      hasCheckpoint?: boolean
      quizQuestion?: {
        id: string
        question: string
        options: string[]
        correctAnswerIndex: number
        explanation?: string
      }
    }>
  }>
}

export interface IngestionResult {
  blueprint: IngestedCourseDraft
  extractedTopics: string[]
  wordCount: number
  estimatedReadingMinutes: number
  summary: string
  summaryAr: string
}

class DocumentIngestionEngine {
  private static instance: DocumentIngestionEngine

  private constructor() {}

  public static getInstance(): DocumentIngestionEngine {
    if (!DocumentIngestionEngine.instance) {
      DocumentIngestionEngine.instance = new DocumentIngestionEngine()
    }
    return DocumentIngestionEngine.instance
  }

  /**
   * Synthesize full course blueprint from raw document text
   */
  public async ingestDocument(options: DocumentIngestionOptions): Promise<IngestionResult> {
    const {
      documentText,
      fileName = 'Hotel Manual',
      targetLanguage = 'en',
      targetDepartment = 'Hotel Operations',
      targetLevel = 'intermediate',
    } = options

    const words = documentText.trim().split(/\s+/).length
    const readingTime = Math.max(5, Math.ceil(words / 180))

    const prompt = `You are an elite Hospitality Curriculum Architect.
Analyze the following source document (${fileName}) and transform it into a comprehensive, 5-star hotel training course.

Department: ${targetDepartment}
Difficulty Level: ${targetLevel}
Language: ${targetLanguage === 'ar' ? 'Arabic' : 'English'}

Source Document Content:
"""
${documentText.slice(0, 15000)}
"""

Generate a complete structured JSON course curriculum adhering to this exact format:
{
  "summary": "Concise course summary in English",
  "summaryAr": "Concise course summary in Arabic",
  "extractedTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "blueprint": {
    "title": "Clear, engaging course title",
    "topic": "Core topic name",
    "courseType": "sop",
    "instructionalStrategy": "Standard operating procedure with step-by-step drills",
    "targetAudience": "All Hotel Staff",
    "experienceLevel": "${targetLevel}",
    "courseLanguage": "${targetLanguage}",
    "estimatedDurationMinutes": ${readingTime},
    "learningObjectives": [
      "Objective 1",
      "Objective 2",
      "Objective 3"
    ],
    "sections": [
      {
        "id": "sec-1",
        "title": "Section Title",
        "description": "Section Description",
        "lessons": [
          {
            "id": "les-1",
            "title": "Lesson Title",
            "durationMinutes": 10,
            "content": "Detailed instructional lesson text in markdown format with clear headings, procedural steps, and hotel standard tips.",
            "learningPoints": ["Point 1", "Point 2"],
            "hasCheckpoint": true,
            "quizQuestion": {
              "id": "q-1",
              "question": "Realistic scenario question testing knowledge from this lesson?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctAnswerIndex": 0,
              "explanation": "Detailed explanation of why this answer aligns with hotel standards."
            }
          }
        ]
      }
    ]
  }
}`

    try {
      const response = await multiProviderRouter.execute<{
        summary: string
        summaryAr: string
        extractedTopics: string[]
        blueprint: IngestedCourseDraft
      }>(prompt, {
        task: 'reasoning',
        jsonMode: true,
        temperature: 0.4,
      })

      if (response.data?.blueprint?.title) {
        return {
          blueprint: response.data.blueprint,
          extractedTopics: response.data.extractedTopics || ['Standard Operating Procedures'],
          wordCount: words,
          estimatedReadingMinutes: readingTime,
          summary: response.data.summary || 'Course extracted from document.',
          summaryAr: response.data.summaryAr || 'تم استخراج الدورة التدريبية من المستند المرفق.',
        }
      }
    } catch (err) {
      console.warn('[DocumentIngestionEngine] AI generation failed:', err)
    }

    // Never fabricate a course from the file name: surface the failure so the author knows
    // nothing was generated and can retry.
    throw new Error(
      targetLanguage === 'ar'
        ? 'تعذر إنشاء دورة من هذا المستند. لم تُرجع خدمة الذكاء الاصطناعي نتيجة صالحة — يرجى المحاولة مرة أخرى.'
        : 'Could not generate a course from this document. The AI service did not return a usable result — please try again.',
    )
  }
}

export const documentIngestionEngine = DocumentIngestionEngine.getInstance()
