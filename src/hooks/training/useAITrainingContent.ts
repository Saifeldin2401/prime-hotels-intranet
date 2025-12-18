/**
 * useAITrainingContent
 * 
 * Hook for AI-powered training content generation.
 * Generates training content from documents, creates outlines, and suggests resources.
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

interface GeneratedContent {
    title: string
    type: 'text' | 'key_points' | 'summary' | 'quiz_prep'
    content: string
    sourceDocumentId?: string
}

interface ContentGenerationOptions {
    format: 'summary' | 'key_points' | 'training_text' | 'quiz_prep'
    maxLength?: number
    focusAreas?: string[]
}

interface ModuleOutline {
    title: string
    description: string
    sections: {
        title: string
        type: string
        description: string
        suggestedContent?: string
    }[]
    estimatedDuration: string
    suggestedQuizQuestions: number
}

export const useAITrainingContent = () => {
    const [generating, setGenerating] = useState(false)
    const [progress, setProgress] = useState<string>('')
    const { toast } = useToast()

    /**
     * Generate training content from a document
     */
    const generateFromDocument = async (
        documentId: string,
        options: ContentGenerationOptions = { format: 'training_text' }
    ): Promise<GeneratedContent | null> => {
        try {
            setGenerating(true)
            setProgress('Fetching document...')

            // 1. Fetch document content
            const { data: doc, error: docError } = await supabase
                .from('documents')
                .select('id, title, content, description')
                .eq('id', documentId)
                .single()

            if (docError || !doc) {
                throw new Error('Failed to fetch document')
            }

            setProgress('Generating training content...')

            // 2. Strip HTML and prepare content
            const plainContent = stripHtml(doc.content || '')

            // 3. Build AI prompt based on format
            const prompt = buildContentPrompt(doc.title, plainContent, options)

            // 4. Call AI function
            const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-ai-request', {
                body: {
                    action: 'generate_training_content',
                    prompt,
                    context: {
                        document_id: documentId,
                        document_title: doc.title,
                        format: options.format
                    }
                }
            })

            if (aiError) {
                throw new Error(aiError.message || 'AI generation failed')
            }

            setProgress('Processing result...')

            // 5. Parse and return result
            const generatedText = aiResult?.result || generateFallbackContent(doc.title, plainContent, options)

            return {
                title: `Training: ${doc.title}`,
                type: options.format === 'key_points' ? 'key_points' : 'text',
                content: generatedText,
                sourceDocumentId: documentId
            }

        } catch (error: any) {
            console.error('Content generation error:', error)
            toast({
                title: 'Generation Failed',
                description: error.message || 'Could not generate content',
                variant: 'destructive'
            })
            return null
        } finally {
            setGenerating(false)
            setProgress('')
        }
    }

    /**
     * Generate a module outline from documents
     */
    const generateModuleOutline = async (
        topic: string,
        documentIds: string[] = []
    ): Promise<ModuleOutline | null> => {
        try {
            setGenerating(true)
            setProgress('Analyzing documents...')

            // Fetch document contents if provided
            let docContents: string[] = []
            if (documentIds.length > 0) {
                const { data: docs } = await supabase
                    .from('documents')
                    .select('title, content')
                    .in('id', documentIds)

                docContents = docs?.map(d => `${d.title}: ${stripHtml(d.content || '').slice(0, 500)}`) || []
            }

            setProgress('Creating outline...')

            // Build outline prompt
            const prompt = `Create a training module outline for: "${topic}"
            
${docContents.length > 0 ? `Reference documents:\n${docContents.join('\n\n')}` : ''}

Return a JSON object with:
- title: Module title
- description: Brief description
- sections: Array of { title, type (text/video/quiz/sop_reference), description }
- estimatedDuration: e.g., "30 minutes"
- suggestedQuizQuestions: Number of quiz questions recommended`

            const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-ai-request', {
                body: {
                    action: 'generate_outline',
                    prompt,
                    context: { topic, documentIds }
                }
            })

            if (aiError) {
                throw new Error(aiError.message)
            }

            // Parse result or use fallback
            try {
                const parsed = JSON.parse(aiResult?.result || '{}')
                return parsed as ModuleOutline
            } catch {
                // Fallback outline
                return {
                    title: topic,
                    description: `Training module for ${topic}`,
                    sections: [
                        { title: 'Introduction', type: 'text', description: 'Overview and objectives' },
                        { title: 'Core Content', type: 'text', description: 'Main training material' },
                        { title: 'Knowledge Check', type: 'quiz', description: 'Verify understanding' }
                    ],
                    estimatedDuration: '30 minutes',
                    suggestedQuizQuestions: 5
                }
            }

        } catch (error: any) {
            console.error('Outline generation error:', error)
            toast({
                title: 'Outline Generation Failed',
                description: error.message,
                variant: 'destructive'
            })
            return null
        } finally {
            setGenerating(false)
            setProgress('')
        }
    }

    /**
     * Get suggested resources for a module topic
     */
    const getSuggestedResources = async (
        moduleId: string,
        topic: string
    ): Promise<{ documents: any[], quizzes: any[], questions: any[] }> => {
        try {
            // Search for related documents
            const { data: documents } = await supabase
                .from('documents')
                .select('id, title, description, document_type')
                .or(`title.ilike.%${topic}%,content.ilike.%${topic}%`)
                .eq('status', 'published')
                .limit(10)

            // Search for related quizzes
            const { data: quizzes } = await supabase
                .from('learning_quizzes')
                .select('id, title, description')
                .or(`title.ilike.%${topic}%,description.ilike.%${topic}%`)
                .eq('status', 'published')
                .limit(5)

            // Search for related questions
            const { data: questions } = await supabase
                .from('knowledge_questions')
                .select('id, question_text, question_type, difficulty_level')
                .or(`question_text.ilike.%${topic}%,tags.cs.{${topic}}`)
                .eq('status', 'published')
                .limit(20)

            return {
                documents: documents || [],
                quizzes: quizzes || [],
                questions: questions || []
            }

        } catch (error) {
            console.error('Resource suggestion error:', error)
            return { documents: [], quizzes: [], questions: [] }
        }
    }

    /**
     * Generate complete training module with full content for each section
     */
    const generateFullModuleContent = async (
        topic: string,
        documentIds: string[] = [],
        category: string = 'General',
        language: string = 'English'
    ): Promise<{
        title: string
        description: string
        estimatedDuration: string
        sections: {
            title: string
            type: string
            content: string
            description: string
            duration: number
            points: number
        }[]
    } | null> => {
        try {
            setGenerating(true)
            setProgress('Fetching reference documents...')

            // Fetch full document contents
            let docContents: { title: string; content: string }[] = []
            if (documentIds.length > 0) {
                const { data: docs } = await supabase
                    .from('documents')
                    .select('title, content, description')
                    .in('id', documentIds)

                docContents = docs?.map(d => ({
                    title: d.title,
                    content: stripHtml(d.content || d.description || '').slice(0, 2000)
                })) || []
            }

            setProgress('Generating complete training content...')

            // Build comprehensive prompt for full content generation
            const prompt = `You are an expert corporate training developer for a hotel chain. Create a complete training module on: "${topic}"

${docContents.length > 0 ? `Use these reference documents as the basis for content:
${docContents.map(d => `### ${d.title}\n${d.content}`).join('\n\n')}` : `Create comprehensive training content for hotel staff on this topic.`}

Category: ${category}
    
    CRITICAL OUTPUT RULES:
    1. Your output content MUST be in ${language}.
    ${language.toLowerCase() === 'arabic' || language.toLowerCase() === 'arabic only' ? `
    2. OUTPUT ONLY IN ARABIC. Translate and EXPAND content.
    3. NO English text allowed. Do not echo the category or input prompt.
    4. NO Bilingual content.
    ` : `
    2. If Target Language is "Bilingual (En/Ar)" or "English and Arabic", provide the English text first, followed immediately by the Arabic translation.
    `}
    
    SYSTEM INSTRUCTION: Do NOT translate the text above. Only generate the JSON based on the <category> below.

    <category>
    ${category}
    </category>

    Return a JSON object with this EXACT structure:

    Return a JSON object with this EXACT structure:
    {
      "title": "Training module title in Target Language",
      "description": "2-3 sentence module description in Target Language",
      "estimatedDuration": "XX minutes",
      "sections": [
        {
          "title": "Section Title in Target Language",
          "type": "text",
          "description": "Brief section summary in Target Language",
          "content": "<h2>Heading in Target Language</h2><p>Content in Target Language...</p>",
          "duration": 5,
          "points": 0
        },
    {
      "title": "Core Concepts",
      "type": "text",
      "description": "Main content section",
      "content": "<h2>Key Concepts</h2><p>Detailed content with multiple paragraphs...</p><h3>Best Practices</h3><ul><li>Practice 1 with explanation</li><li>Practice 2 with explanation</li></ul>",
      "duration": 10,
      "points": 0
    },
    {
      "title": "Procedures & Steps",
      "type": "text", 
      "description": "Step-by-step guide",
      "content": "<h2>Step-by-Step Procedures</h2><ol><li><strong>Step 1:</strong> Description...</li><li><strong>Step 2:</strong> Description...</li></ol>",
      "duration": 10,
      "points": 0
    },
    {
      "title": "Knowledge Check",
      "type": "quiz",
      "description": "Test your understanding",
      "content": "<h2>Knowledge Check</h2><p>Answer the following questions to verify your understanding of the material.</p>",
      "duration": 5,
      "points": 10
    }
  ]
}

IMPORTANT: 
- Create 4-6 substantive sections with real, detailed content
- Each section's "content" must be valid HTML with paragraphs, lists, and headings
- Content should be specific to hotels and hospitality
- Make it professional and engaging for employees
- If Target Language is "Bilingual (En/Ar)" or "English and Arabic", provide content in English first, followed immediately by the Arabic translation for each section.`

            const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-ai-request', {
                body: {
                    action: 'generate_full_module',
                    prompt,
                    context: { topic, documentIds, category }
                }
            })

            if (aiError) {
                throw new Error(aiError.message)
            }

            setProgress('Processing generated content...')

            // Parse result
            try {
                const parsed = JSON.parse(aiResult?.result || '{}')
                if (parsed.sections && parsed.sections.length > 0) {
                    return parsed
                }
            } catch (parseError) {
                console.warn('Failed to parse AI response, using fallback')
            }

            // Fallback with rich content if AI fails
            return {
                title: topic,
                description: `Comprehensive training module covering ${topic} for hotel staff.`,
                estimatedDuration: '30 minutes',
                sections: [
                    {
                        title: 'Introduction',
                        type: 'text',
                        description: 'Learning objectives and overview',
                        content: `<h2>Learning Objectives</h2>
<p>By completing this module on <strong>${topic}</strong>, you will:</p>
<ul>
<li>Understand the key principles and best practices</li>
<li>Be able to apply standardized procedures in your daily work</li>
<li>Know how to handle common situations and exceptions</li>
<li>Demonstrate compliance with company standards</li>
</ul>
<h2>Overview</h2>
<p>This training module provides comprehensive guidance on ${topic}. You will learn the essential skills and knowledge required to excel in your role while maintaining our high standards of service excellence.</p>`,
                        duration: 5,
                        points: 0
                    },
                    {
                        title: 'Core Concepts',
                        type: 'text',
                        description: 'Key principles and fundamentals',
                        content: `<h2>Key Principles</h2>
<p>Understanding the fundamentals of ${topic} is essential for providing excellent guest service.</p>
<h3>Why This Matters</h3>
<p>Every interaction with guests reflects our brand values. By mastering these concepts, you contribute to:</p>
<ul>
<li><strong>Guest Satisfaction:</strong> Creating memorable positive experiences</li>
<li><strong>Operational Excellence:</strong> Ensuring smooth and efficient operations</li>
<li><strong>Team Success:</strong> Supporting your colleagues and department goals</li>
</ul>
<h3>Best Practices</h3>
<p>Always approach your work with professionalism, attention to detail, and a guest-first mindset.</p>`,
                        duration: 10,
                        points: 0
                    },
                    {
                        title: 'Procedures & Guidelines',
                        type: 'text',
                        description: 'Step-by-step procedures',
                        content: `<h2>Standard Operating Procedures</h2>
<p>Follow these procedures to ensure consistency and quality:</p>
<ol>
<li><strong>Preparation:</strong> Ensure you have all necessary materials and information ready</li>
<li><strong>Execution:</strong> Follow the established steps carefully and thoroughly</li>
<li><strong>Verification:</strong> Double-check your work for accuracy and completeness</li>
<li><strong>Documentation:</strong> Record relevant information as required by policy</li>
<li><strong>Follow-up:</strong> Complete any necessary follow-up actions promptly</li>
</ol>
<h3>Important Reminders</h3>
<ul>
<li>When in doubt, ask your supervisor for guidance</li>
<li>Report any issues or concerns immediately</li>
<li>Maintain confidentiality of guest and company information</li>
</ul>`,
                        duration: 10,
                        points: 0
                    },
                    {
                        title: 'Knowledge Check',
                        type: 'quiz',
                        description: 'Test your understanding',
                        content: `<h2>Knowledge Check</h2>
<p>Congratulations on completing the learning content! Now it's time to test your understanding.</p>
<p>Answer the following questions to demonstrate your knowledge of ${topic}. You need to score at least 80% to pass this module.</p>
<p><em>Good luck!</em></p>`,
                        duration: 5,
                        points: 10
                    }
                ]
            }

        } catch (error: any) {
            console.error('Full module generation error:', error)
            toast({
                title: 'Content Generation Failed',
                description: error.message || 'Could not generate complete training content',
                variant: 'destructive'
            })
            return null
        } finally {
            setGenerating(false)
            setProgress('')
        }
    }

    return {
        generating,
        progress,
        generateFromDocument,
        generateModuleOutline,
        getSuggestedResources,
        generateFullModuleContent
    }
}

// Helper functions

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()
}

function buildContentPrompt(title: string, content: string, options: ContentGenerationOptions): string {
    const truncatedContent = content.slice(0, 3000)

    switch (options.format) {
        case 'summary':
            return `Summarize this document for training purposes in 2-3 paragraphs:

Title: ${title}
Content: ${truncatedContent}

Focus on key takeaways that employees need to remember.`

        case 'key_points':
            return `Extract the key learning points from this document as a bulleted list:

Title: ${title}
Content: ${truncatedContent}

Format as bullet points (5-10 points). Each point should be actionable and memorable.`

        case 'quiz_prep':
            return `Identify the main concepts in this document that would make good quiz questions:

Title: ${title}
Content: ${truncatedContent}

List 5-10 key concepts with brief explanations.`

        default:
            return `Convert this document into training content suitable for employee learning:

Title: ${title}
Content: ${truncatedContent}

Make it engaging, clear, and easy to understand. Include:
- Clear learning objectives
- Structured content sections
- Key takeaways at the end`
    }
}

function generateFallbackContent(title: string, content: string, options: ContentGenerationOptions): string {
    const preview = content.slice(0, 500)

    switch (options.format) {
        case 'summary':
            return `## ${title}\n\n${preview}...\n\n**Key Takeaway:** This document covers essential procedures and guidelines that all team members should understand.`

        case 'key_points':
            return `## Key Points: ${title}\n\n• Understanding the core principles\n• Following established procedures\n• Maintaining compliance and quality\n• Continuous improvement practices`

        default:
            return `## Training Content: ${title}\n\n### Learning Objectives\nBy the end of this section, you will understand the key concepts from "${title}".\n\n### Overview\n${preview}...\n\n### Summary\nRemember to apply these principles in your daily work.`
    }
}
