/**
 * Multimodal Document-to-Course Ingestion Engine
 * 
 * Ingests raw documents (PDFs, brand standards, SOP manuals, scanned policies),
 * and automatically synthesizes a fully structured 5-star course curriculum with
 * modular sections, interactive lesson markdown, and checkpoint quizzes.
 */

import { multiProviderRouter } from './providers/multiProviderRouter'
import type { CourseBlueprint } from './courseEngine'

export interface DocumentIngestionOptions {
  documentText: string
  fileName?: string
  targetLanguage?: 'en' | 'ar' | 'bilingual'
  targetDepartment?: string
  targetLevel?: 'beginner' | 'intermediate' | 'advanced'
}

export interface IngestionResult {
  blueprint: CourseBlueprint
  extractedTopics: string[]
  wordCount: number
  estimatedReadingMinutes: number
  summary: string
  summaryAr: string
}

export class DocumentIngestionEngine {
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
        blueprint: CourseBlueprint
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
    } catch {
      // Fall through to heuristic blueprint generator
    }

    // Heuristic Fallback Course Generator
    const fallbackTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    const fallbackBlueprint: CourseBlueprint = {
      title: `${fallbackTitle.toUpperCase()} - Operational Mastery`,
      topic: fallbackTitle,
      courseType: 'sop',
      instructionalStrategy: 'Procedural drill and compliance verification',
      targetAudience: targetDepartment,
      experienceLevel: targetLevel,
      courseLanguage: targetLanguage,
      estimatedDurationMinutes: readingTime,
      learningObjectives: [
        'Understand operational standard operating procedures',
        'Demonstrate compliance with luxury brand guidelines',
        'Execute daily responsibilities with 5-star precision',
      ],
      sections: [
        {
          id: `sec-${Date.now()}-1`,
          title: 'Module 1: Foundations & Core Standards',
          description: 'Key principles and requirements extracted from operational guidelines',
          lessons: [
            {
              id: `les-${Date.now()}-1`,
              title: 'Standard Operating Procedures & Checkpoints',
              durationMinutes: Math.ceil(readingTime / 2),
              content: `### Operational Guidelines\n\n${documentText.slice(0, 1500)}\n\n> [!TIP] Always adhere to 5-star brand standards and guest privacy.`,
              learningPoints: ['Master core procedures', 'Verify daily checklist completion'],
              hasCheckpoint: true,
              quizQuestion: {
                id: `q-${Date.now()}-1`,
                question: 'What is the primary operational objective outlined in this SOP?',
                options: [
                  'To deliver consistent, compliant luxury guest service',
                  'To complete shifts as quickly as possible',
                  'To bypass supervisor inspections',
                  'To minimize department communication',
                ],
                correctAnswerIndex: 0,
                explanation: 'Standard operating procedures exist to guarantee consistent luxury quality and guest safety.',
              },
            },
          ],
        },
      ],
    }

    return {
      blueprint: fallbackBlueprint,
      extractedTopics: [fallbackTitle, 'Luxury Hotel Standards', 'Operational Procedures'],
      wordCount: words,
      estimatedReadingMinutes: readingTime,
      summary: `Course generated from ${fileName} containing ${words} words.`,
      summaryAr: `تم توليد الدورة التدريبية من الملف ${fileName} بواقع ${words} كلمة.`,
    }
  }
}

export const documentIngestionEngine = DocumentIngestionEngine.getInstance()
