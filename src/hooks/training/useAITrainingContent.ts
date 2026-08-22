/**
 * useAITrainingContent
 * 
 * Hook for AI-powered training content generation.
 * Generates training content from documents, creates outlines, and suggests resources.
 */

import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

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
                    model: 'openrouter/auto',
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
            const generatedText = (aiResult?.response ?? aiResult?.result) || generateFallbackContent(doc.title, plainContent, options)

            return {
                title: `Training: ${doc.title}`,
                type: options.format === 'key_points' ? 'key_points' : 'text',
                content: generatedText,
                sourceDocumentId: documentId
            }

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Could not generate content'
            console.error('Content generation error:', error)
            toast({
                title: 'Generation Failed',
                description: errorMessage,
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
                    model: 'openrouter/auto',
                    prompt,
                    context: { topic, documentIds }
                }
            })

            if (aiError) {
                throw new Error(aiError.message)
            }

            // Parse result or use fallback
            try {
                const rawText = (aiResult?.response ?? aiResult?.result ?? '{}')
                const parsed = JSON.parse(cleanJSON(rawText))
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

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error('Outline generation error:', error)
            toast({
                title: 'Outline Generation Failed',
                description: errorMessage,
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
    ): Promise<{ documents, quizzes, questions }> => {
        try {
            // Search for related documents
            const { data: documents } = await supabase
                .from('documents')
                .select('id, title, description, content_type')
                .or(`title.ilike.%${topic}%,content.ilike.%${topic}%`)
                .eq('status', 'PUBLISHED')
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
     * Enhanced version with rich instructional design and interactive elements
     */
    const generateFullModuleContent = async (
        topic: string,
        documentIds: string[] = [],
        category: string = 'General',
        language: string = 'English',
        options: {
            difficulty?: 'easy' | 'medium' | 'hard'
            estimatedDuration?: number
            includeVideo?: boolean
            includeScenarios?: boolean
            includeAssessment?: boolean
        } = {}
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

            // Fetch full document contents with more context
            let docContents: { title: string; content: string }[] = []
            if (documentIds.length > 0) {
                const { data: docs } = await supabase
                    .from('documents')
                    .select('title, content, description')
                    .in('id', documentIds)

                docContents = docs?.map(d => ({
                    title: d.title,
                    content: stripHtml(d.content || d.description || '').slice(0, 3000)
                })) || []
            }

            setProgress('Generating complete training content...')

            // Build comprehensive prompt for full content generation
            const langLower = language.toLowerCase()
            const isArabic = langLower.includes('arabic') && !langLower.includes('english')
            const isBilingual = langLower.includes('english') && langLower.includes('arabic')
            
            const difficultyLevel = options.difficulty || 'medium'
            const targetDuration = options.estimatedDuration || 30
            const includeScenarios = options.includeScenarios !== false
            const includeAssessment = options.includeAssessment !== false

            const prompt = `You are an expert instructional designer and corporate training developer for luxury hotels. Create a COMPREHENSIVE, PROFESSIONAL training module on: "${topic}"

${docContents.length > 0 ? `BASE DOCUMENTS (use these as primary source material - extract key concepts, procedures, and best practices):
${docContents.map(d => `### ${d.title}\n${d.content}`).join('\n\n')}` : `Create comprehensive training content for hotel staff on this topic, using industry best practices and luxury hospitality standards.`}

TARGET AUDIENCE: ${category} staff
DIFFICULTY LEVEL: ${difficultyLevel}
TARGET DURATION: ${targetDuration} minutes

LANGUAGE REQUIREMENTS:
${isArabic ? `
- OUTPUT ONLY IN ARABIC (Modern Standard Arabic with hospitality terminology)
- NO English words except internationally recognized hotel terms (e.g., "Lobby", "Check-in")
- Use formal, professional Arabic suitable for training materials
` : isBilingual ? `
- Provide BILINGUAL content: English first, then Arabic translation
- Format: "English text / النص العربي"
- Ensure both languages are complete and professional
` : `
- OUTPUT ONLY IN ENGLISH
- Use professional hospitality industry terminology
- Clear, concise language appropriate for adult learners
`}

INSTRUCTIONAL DESIGN REQUIREMENTS:

1. CONTENT STRUCTURE (Create 6-8 substantial sections):
   - Welcome/Introduction (set context and motivation)
   - Learning Objectives (3-5 SMART objectives)
   - Core Concepts & Theory (foundational knowledge)
   - Real-World Scenarios (case studies with dilemmas)
   - Step-by-Step Procedures (practical workflows)
   - Common Mistakes & How to Avoid Them
   - Best Practices & Expert Tips
   - Knowledge Check/Assessment
   - Summary & Key Takeaways
   - Additional Resources

2. CONTENT RICHNESS REQUIREMENTS:
   Each section must include:
   - Multiple paragraphs with detailed explanations
   - Bulleted lists for key points (minimum 3-5 items)
   - Numbered lists for procedures (minimum 4-7 steps)
   - Tables where appropriate (comparison charts, checklists)
   - Callout boxes for important notes, warnings, or tips
   - Real-world examples specific to hotel operations
   - "Try This" practical exercises

3. HTML FORMATTING (use rich formatting):
   - <h2> for main section headings
   - <h3> for subsections
   - <p> with class="lead" for introductory paragraphs
   - <ul> and <ol> with <li> for lists
   - <blockquote> for quotes or important statements
   - <div class="callout callout-info"> for tips
   - <div class="callout callout-warning"> for warnings
   - <div class="example-box"> for real-world examples
   - <table> with <thead> and <tbody> for data
   - <strong> and <em> for emphasis
   - <a href="#"> for references

4. SECTION TYPES:
   - "text" - Standard content sections
   - "video" - Sections that should have video content (mark with placeholder)
   - "scenario" - Interactive case studies with questions
   - "quiz" - Knowledge assessment section
   - "interactive" - Hands-on exercises

5. ENGAGEMENT ELEMENTS:
   - Include "Reflection Questions" throughout
   - Add "Quick Check" mini-assessments
   - Include "Pro Tips" from experienced staff
   - Add "Common Mistake" warnings
   - Include "Scenario Walkthrough" examples

6. CONTENT SPECIFICITY:
   - Reference specific hotel areas (lobby, guest rooms, F&B outlets, back-of-house)
   - Mention specific tools and equipment
   - Include guest interaction scripts/dialogues
   - Reference time standards (e.g., "respond within 2 minutes")
   - Include quality metrics and KPIs

OUTPUT FORMAT - Return ONLY a valid JSON object:

{
  "title": "Compelling, specific module title",
  "description": "Engaging 2-3 sentence description explaining what learners will gain and why it matters",
  "estimatedDuration": "XX minutes",
  "sections": [
    {
      "title": "Section Title",
      "type": "text|video|scenario|quiz|interactive",
      "description": "What this section covers",
      "content": "<h2>Heading</h2><p>Rich HTML content...</p><div class='callout callout-info'><strong>Pro Tip:</strong> ...</div><div class='example-box'><h4>Example: ...</h4><p>...</p></div>",
      "duration": 5,
      "points": 0
    }
  ]
}

SECTION CONTENT EXAMPLES:

For "Core Concepts": Include theory, definitions, and WHY it matters.
For "Procedures": Include numbered steps, decision trees, and quality checkpoints.
For "Scenarios": Present realistic situations with "What would you do?" questions.
For "Assessment": Include 3-5 quiz questions with explanations.

REMEMBER:
- Generate SUBSTANTIVE content (not placeholder text)
- Each section should take 5-8 minutes to complete
- Content must be immediately applicable to hotel operations
- Use hospitality industry terminology and standards
- Include specific details, not generic advice`

            const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-ai-request', {
                body: {
                    action: 'generate_full_module',
                    model: 'openrouter/auto',
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
                const rawText = (aiResult?.response ?? aiResult?.result ?? '{}')
                const parsed = JSON.parse(cleanJSON(rawText))
                if (parsed.sections && parsed.sections.length > 0) {
                    return parsed
                }
            } catch (_parseError) {
                console.warn('Failed to parse AI response, using fallback')
            }

            // Fallback with comprehensive content if AI fails
            const categoryContext = getCategoryContext(category)
            
            return {
                title: `Mastering ${topic}: A Complete Guide`,
                description: `This comprehensive training module provides hotel staff with in-depth knowledge and practical skills for ${topic}. Through real-world scenarios, step-by-step procedures, and expert insights, learners will develop the confidence and competence to deliver exceptional guest experiences.`,
                estimatedDuration: '45 minutes',
                sections: [
                    {
                        title: 'Welcome & Module Overview',
                        type: 'text',
                        description: 'Introduction to the training journey',
                        content: `<div class="welcome-section">
<h2>Welcome to ${topic} Training</h2>
<p class="lead">This module is designed to transform your understanding of <strong>${topic}</strong> and equip you with professional-level skills that you can apply immediately in your daily work.</p>

<h3>What You Will Learn</h3>
<div class="learning-path">
<div class="path-item">
<strong>1. Foundational Knowledge</strong>
<p>Understand the core concepts, terminology, and principles that underpin ${topic}</p>
</div>
<div class="path-item">
<strong>2. Practical Application</strong>
<p>Master step-by-step procedures through detailed walkthroughs and demonstrations</p>
</div>
<div class="path-item">
<strong>3. Real-World Scenarios</strong>
<p>Navigate challenging situations through interactive case studies</p>
</div>
<div class="path-item">
<strong>4. Expert Techniques</strong>
<p>Learn advanced tips and best practices from industry professionals</p>
</div>
</div>

<div class="callout callout-info">
<strong>💡 Pro Tip:</strong> Take notes as you go through this module. The practical exercises will help reinforce your learning.
</div>
</div>`,
                        duration: 5,
                        points: 0
                    },
                    {
                        title: 'Learning Objectives',
                        type: 'text',
                        description: 'Clear goals for your learning journey',
                        content: `<h2>Module Learning Objectives</h2>
<p>By the end of this training, you will be able to:</p>

<div class="objectives-grid">
<div class="objective-card">
<h4>✓ Knowledge Mastery</h4>
<p>Demonstrate comprehensive understanding of ${topic} concepts, standards, and requirements</p>
</div>

<div class="objective-card">
<h4>✓ Skill Application</h4>
<p>Execute ${topic} procedures correctly and consistently according to hotel standards</p>
</div>

<div class="objective-card">
<h4>✓ Problem Solving</h4>
<p>Identify and resolve common issues and challenges related to ${topic}</p>
</div>

<div class="objective-card">
<h4>✓ Guest Excellence</h4>
<p>Apply ${topic} knowledge to enhance guest satisfaction and service quality</p>
</div>

<div class="objective-card">
<h4>✓ Team Collaboration</h4>
<p>Work effectively with colleagues to maintain seamless ${topic} operations</p>
</div>
</div>

<div class="callout callout-warning">
<strong>🎯 Assessment:</strong> You will be assessed on these objectives through the knowledge check at the end of this module. Aim for 80% or higher to pass.
</div>`,
                        duration: 5,
                        points: 0
                    },
                    {
                        title: 'Core Concepts & Theory',
                        type: 'text',
                        description: 'Building your foundational knowledge',
                        content: `<h2>Understanding ${topic}</h2>

<h3>What is ${topic}?</h3>
<p>${topic} is a critical component of hotel operations that directly impacts guest satisfaction, operational efficiency, and team performance. It encompasses the systems, procedures, and behaviors that ensure consistent, high-quality service delivery.</p>

<div class="concept-box">
<h4>Key Definition</h4>
<p><strong>${topic}</strong> refers to the standardized approach and best practices that hotel staff follow to deliver exceptional guest experiences while maintaining operational excellence.</p>
</div>

<h3>Why ${topic} Matters</h3>
<p>Understanding and mastering ${topic} is essential for several reasons:</p>

<table class="benefits-table">
<thead>
<tr>
<th>Impact Area</th>
<th>Guest Perspective</th>
<th>Business Impact</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>First Impressions</strong></td>
<td>Sets expectations for entire stay</td>
<td>Directly affects review scores</td>
</tr>
<tr>
<td><strong>Consistency</strong></td>
<td>Builds trust and reliability</td>
<td>Increases repeat bookings</td>
</tr>
<tr>
<td><strong>Efficiency</strong></td>
<td>Reduces wait times and errors</td>
<td>Lowers operational costs</td>
</tr>
<tr>
<td><strong>Problem Prevention</strong></td>
<td>Minimizes service disruptions</td>
<td>Reduces guest complaints</td>
</tr>
</tbody>
</table>

<h3>Core Principles</h3>
<div class="principles-list">
<div class="principle">
<h4>1. Guest-First Mindset</h4>
<p>Every decision and action should prioritize guest needs and expectations. This means anticipating needs, personalizing service, and exceeding expectations whenever possible.</p>
</div>

<div class="principle">
<h4>2. Attention to Detail</h4>
<p>Excellence is in the details. Small oversights can significantly impact guest perception. Develop a habit of thoroughness in every task.</p>
</div>

<div class="principle">
<h4>3. Proactive Communication</h4>
<p>Keep guests informed, address concerns before they escalate, and coordinate seamlessly with team members to ensure smooth service delivery.</p>
</div>

<div class="principle">
<h4>4. Continuous Improvement</h4>
<p>Always look for ways to enhance processes, learn from feedback, and stay updated on industry best practices.</p>
</div>
</div>

<div class="callout callout-tip">
<strong>💡 Reflection:</strong> Think about a recent guest interaction. How did ${topic} principles apply? What could have been improved?
</div>`,
                        duration: 10,
                        points: 0
                    },
                    {
                        title: 'Real-World Scenarios',
                        type: 'scenario',
                        description: 'Navigate challenging situations',
                        content: `<h2>Scenario-Based Learning</h2>
<p>Explore these realistic situations that ${category} staff commonly encounter. For each scenario, consider what you would do before revealing the recommended approach.</p>

<div class="scenario-box">
<div class="scenario-header">
<h3>Scenario 1: The Unexpected Challenge</h3>
<span class="difficulty-badge medium">Medium</span>
</div>
<div class="scenario-content">
<p><strong>Situation:</strong> During peak hours, you encounter an issue that requires immediate attention while managing other tasks.</p>

<div class="scenario-question">
<strong>What would you do?</strong>
<p>Consider: Prioritization, communication, and resolution steps.</p>
</div>

<div class="scenario-solution">
<h4>Recommended Approach:</h4>
<ol>
<li><strong>Assess urgency:</strong> Determine if the situation requires immediate action or can be scheduled</li>
<li><strong>Communicate clearly:</strong> Inform relevant stakeholders of the situation and expected timeline</li>
<li><strong>Delegate if possible:</strong> Coordinate with team members to manage other responsibilities</li>
<li><strong>Document actions:</strong> Record what was done and any follow-up required</li>
<li><strong>Review and improve:</strong> After resolution, identify how similar situations can be prevented</li>
</ol>
</div>
</div>
</div>

<div class="scenario-box">
<div class="scenario-header">
<h3>Scenario 2: Meeting High Standards</h3>
<span class="difficulty-badge hard">Advanced</span>
</div>
<div class="scenario-content">
<p><strong>Situation:</strong> You need to deliver exceptional service while managing multiple guest requests simultaneously.</p>

<div class="scenario-question">
<strong>How do you maintain quality under pressure?</strong>
</div>

<div class="scenario-solution">
<h4>Best Practice Approach:</h4>
<ul>
<li>Stay calm and organized - use checklists and prioritization frameworks</li>
<li>Set realistic expectations with guests about timing</li>
<li>Focus on one task at a time while keeping others informed</li>
<li>Quality check your work before marking as complete</li>
<li>Follow up to ensure guest satisfaction</li>
</ul>
</div>
</div>
</div>

<div class="scenario-box">
<div class="scenario-header">
<h3>Scenario 3: Team Collaboration</h3>
<span class="difficulty-badge easy">Essential</span>
</div>
<div class="scenario-content">
<p><strong>Situation:</strong> A task requires coordination between multiple departments to ensure seamless guest experience.</p>

<div class="scenario-solution">
<h4>Collaboration Framework:</h4>
<ol>
<li><strong>Clarify responsibilities:</strong> Ensure each department understands their role</li>
<li><strong>Establish timelines:</strong> Coordinate schedules and deadlines</li>
<li><strong>Share information:</strong> Communicate guest preferences and special requirements</li>
<li><strong>Monitor progress:</strong> Check in at key milestones</li>
<li><strong>Debrief together:</strong> Review what worked well and what can be improved</li>
</ol>
</div>
</div>
</div>

<div class="callout callout-info">
<strong>🎯 Key Takeaway:</strong> Every scenario reinforces the importance of preparation, communication, and guest-centric thinking in ${topic}.
</div>`,
                        duration: 10,
                        points: 0
                    },
                    {
                        title: 'Step-by-Step Procedures',
                        type: 'text',
                        description: 'Master the workflow',
                        content: `<h2>Standard Operating Procedures</h2>
<p>Follow these detailed workflows to ensure consistent, high-quality execution of ${topic} tasks. Each step includes quality checkpoints and best practices.</p>

<div class="procedure-section">
<h3>Standard Procedure: ${topic} Workflow</h3>

<div class="step-container">
<div class="step">
<div class="step-number">1</div>
<div class="step-content">
<h4>Preparation Phase</h4>
<p><strong>Time: 2-3 minutes</strong></p>
<ul>
<li>Gather all necessary tools, equipment, and materials</li>
<li>Review guest preferences and special requirements from the system</li>
<li>Check for any alerts, notes, or previous issues</li>
<li>Ensure your appearance and uniform meet hotel standards</li>
<li>Mentally prepare for guest interactions</li>
</ul>
<div class="checkpoint">✓ Quality Check: Do you have everything needed before starting?</div>
</div>
</div>

<div class="step">
<div class="step-number">2</div>
<div class="step-content">
<h4>Initial Assessment</h4>
<p><strong>Time: 1-2 minutes</strong></p>
<ul>
<li>Survey the situation and identify any immediate issues</li>
<li>Take note of guest presence and adjust approach accordingly</li>
<li>Identify priority areas that need attention</li>
<li>Plan your sequence of tasks for efficiency</li>
</ul>
<div class="checkpoint">✓ Quality Check: Have you identified all priority items?</div>
</div>
</div>

<div class="step">
<div class="step-number">3</div>
<div class="step-content">
<h4>Execution Phase</h4>
<p><strong>Time: Varies by task</strong></p>
<ul>
<li>Follow the standard protocol for each specific task</li>
<li>Work systematically from top to bottom, left to right</li>
<li>Use the correct techniques and tools for each step</li>
<li>Pay attention to detail - don't rush the process</li>
<li>Maintain safety and hygiene standards throughout</li>
</ul>
<div class="checkpoint">✓ Quality Check: Are you following proper techniques and safety protocols?</div>
</div>
</div>

<div class="step">
<div class="step-number">4</div>
<div class="step-content">
<h4>Quality Verification</h4>
<p><strong>Time: 2 minutes</strong></p>
<ul>
<li>Inspect your work against quality standards</li>
<li>Check that nothing was missed or overlooked</li>
<li>Verify that all equipment is functioning correctly</li>
<li>Ensure consistency with hotel brand standards</li>
<li>Get a second opinion if uncertain</li>
</ul>
<div class="checkpoint">✓ Quality Check: Would this meet our 5-star standard?</div>
</div>
</div>

<div class="step">
<div class="step-number">5</div>
<div class="step-content">
<h4>Documentation & Handoff</h4>
<p><strong>Time: 1-2 minutes</strong></p>
<ul>
<li>Record completion in the appropriate system</li>
<li>Note any issues, guest requests, or follow-up needed</li>
<li>Communicate with relevant team members</li>
<li>Return tools and equipment to designated storage</li>
<li>Prepare for next task or guest interaction</li>
</ul>
<div class="checkpoint">✓ Quality Check: Is all documentation complete and accurate?</div>
</div>
</div>
</div>
</div>

<div class="callout callout-warning">
<strong>⚠️ Common Mistake:</strong> Skipping the quality verification step. This is where errors are caught before they impact guests. Always take time to verify your work.
</div>

<h3>Time Management Guidelines</h3>
<table class="time-table">
<thead>
<tr>
<th>Task Complexity</th>
<th>Target Time</th>
<th>Quality Focus</th>
</tr>
</thead>
<tbody>
<tr>
<td>Routine/Standard</td>
<td>5-10 minutes</td>
<td>Efficiency + Consistency</td>
</tr>
<tr>
<td>Detailed/Complex</td>
<td>15-25 minutes</td>
<td>Thoroughness + Accuracy</td>
</tr>
<tr>
<td>Guest-Facing</td>
<td>As needed</td>
<td>Guest satisfaction priority</td>
</tr>
</tbody>
</table>`,
                        duration: 12,
                        points: 0
                    },
                    {
                        title: 'Common Mistakes & Solutions',
                        type: 'text',
                        description: 'Learn from others\' experiences',
                        content: `<h2>Avoiding Common Pitfalls</h2>
<p>Even experienced staff can fall into common traps when executing ${topic} tasks. Learn to recognize and avoid these mistakes.</p>

<div class="mistakes-container">

<div class="mistake-card">
<div class="mistake-header">
<h4>❌ Mistake #1: Rushing Through Tasks</h4>
</div>
<div class="mistake-impact">
<strong>Impact:</strong> Missed details, lower quality, guest complaints, rework required
</div>
<div class="mistake-solution">
<h5>✓ Better Approach:</h5>
<ul>
<li>Prioritize tasks realistically</li>
<li>Communicate with supervisor if workload is unmanageable</li>
<li>Focus on quality over speed</li>
<li>Use checklists to ensure nothing is missed</li>
</ul>
</div>
</div>

<div class="mistake-card">
<div class="mistake-header">
<h4>❌ Mistake #2: Poor Communication</h4>
</div>
<div class="mistake-impact">
<strong>Impact:</strong> Misunderstandings, service gaps, frustrated guests and colleagues
</div>
<div class="mistake-solution">
<h5>✓ Better Approach:</h5>
<ul>
<li>Document everything important in the system</li>
<li>Use clear, concise language in handoffs</li>
<li>Confirm understanding when receiving instructions</li>
<li>Update team on status changes promptly</li>
</ul>
</div>
</div>

<div class="mistake-card">
<div class="mistake-header">
<h4>❌ Mistake #3: Ignoring Guest Preferences</h4>
</div>
<div class="mistake-impact">
<strong>Impact:</strong> Personalization failures, guest dissatisfaction, negative reviews
</div>
<div class="mistake-solution">
<h5>✓ Better Approach:</h5>
<ul>
<li>Always check guest profile before service</li>
<li>Note and remember special requests</li>
<li>Look for opportunities to personalize</li>
<li>Ask questions to understand preferences</li>
</ul>
</div>
</div>

<div class="mistake-card">
<div class="mistake-header">
<h4>❌ Mistake #4: Inconsistent Standards</h4>
</div>
<div class="mistake-impact">
<strong>Impact:</strong> Unpredictable guest experience, brand reputation damage
</div>
<div class="mistake-solution">
<h5>✓ Better Approach:</h5>
<ul>
<li>Follow SOPs every time, not just when convenient</li>
<li>Use the same quality checks consistently</li>
<li>Hold yourself to the same high standard regardless of time pressure</li>
<li>Seek feedback on your performance regularly</li>
</ul>
</div>
</div>

<div class="mistake-card">
<div class="mistake-header">
<h4>❌ Mistake #5: Working in Silos</h4>
</div>
<div class="mistake-impact">
<strong>Impact:</strong> Disjointed service, missed opportunities, team inefficiency
</div>
<div class="mistake-solution">
<h5>✓ Better Approach:</h5>
<ul>
<li>Communicate across departments proactively</li>
<li>Share guest insights with relevant teams</li>
<li>Offer help to colleagues when you have capacity</li>
<li>Participate in team briefings and debriefs</li>
</ul>
</div>
</div>

</div>

<div class="callout callout-tip">
<strong>💡 Remember:</strong> Mistakes are learning opportunities. When you make an error, analyze what went wrong and implement a system to prevent it from happening again.
</div>`,
                        duration: 8,
                        points: 0
                    },
                    {
                        title: 'Expert Tips & Best Practices',
                        type: 'text',
                        description: 'Insider knowledge from top performers',
                        content: `<h2>Expert Insights</h2>
<p>Learn from high-performing hotel professionals who have mastered ${topic}. These tips will help you elevate your performance.</p>

<div class="tips-section">

<div class="tip-category">
<h3>🌟 Service Excellence Tips</h3>

<div class="expert-tip">
<div class="tip-header">
<strong>Anticipate Needs Before Guests Ask</strong>
</div>
<p>Study patterns and guest behaviors. If you notice a guest struggling with luggage, offer assistance before they ask. Check weather forecasts and prepare umbrellas for rainy days. The best service is often invisible.</p>
</div>

<div class="expert-tip">
<div class="tip-header">
<strong>Remember the "Little Things"</strong>
</div>
<p>Guests remember details - their preferred newspaper, how they like their coffee, their room temperature preference. Use the guest history system and add your own observations. These personal touches create loyalty.</p>
</div>

<div class="expert-tip">
<div class="tip-header">
<strong>Own the Moment</strong>
</div>
<p>When a guest approaches you, give them your full attention. Stop what you're doing (safely), make eye contact, smile genuinely, and focus entirely on their needs. Never make guests feel like they're interrupting.</p>
</div>
</div>

<div class="tip-category">
<h3>⚡ Efficiency Tips</h3>

<div class="expert-tip">
<div class="tip-header">
<strong>Create Mental Checklists</strong>
</div>
<p>Develop routines for common tasks so they become automatic. This frees up mental energy for problem-solving and guest interaction. Example: "Enter room → Check lighting → Check temperature → Check amenities → Check cleanliness → Complete."</p>
</div>

<div class="expert-tip">
<div class="tip-header">
<strong>Batch Similar Tasks</strong>
</div>
<p>Group similar activities together to minimize context-switching. If you need to deliver items to multiple rooms, plan an efficient route. If you're checking supplies, check all areas at once.</p>
</div>

<div class="expert-tip">
<div class="tip-header">
<strong>Use Technology Wisely</strong>
</div>
<p>Familiarize yourself with all hotel systems and apps. Learn keyboard shortcuts, set up templates for common communications, and use mobile tools when available. Technology should speed you up, not slow you down.</p>
</div>
</div>

<div class="tip-category">
<h3>🤝 Teamwork Tips</h3>

<div class="expert-tip">
<div class="tip-header">
<strong>Communicate with Context</strong>
</div>
<p>When handing off information to colleagues, include the "why" not just the "what." Instead of "Room 205 needs towels," say "Room 205 - VIP guest, prefers extra towels, mentioned they're going to the spa."</p>
</div>

<div class="expert-tip">
<div class="tip-header">
<strong>Cover for Each Other</strong>
</div>
<p>Build trust with your team by helping when they're overwhelmed. This goodwill comes back when you need support. A strong team handles busy periods with less stress and better results.</p>
</div>
</div>

<div class="tip-category">
<h3>📈 Professional Growth Tips</h3>

<div class="expert-tip">
<div class="tip-header">
<strong>Seek Feedback Actively</strong>
</div>
<p>Don't wait for annual reviews. Ask your supervisor, "What's one thing I could do better?" after shifts. Ask guests, "Is there anything else I can help with?" Listen carefully to the answers.</p>
</div>

<div class="expert-tip">
<div class="tip-header">
<strong>Study the Standards</strong>
</div>
<p>Know your hotel's brand standards inside and out. Be able to explain WHY we do things a certain way. This knowledge gives you confidence and authority in guest interactions.</p>
</div>

</div>
</div>

<div class="callout callout-info">
<strong>🎯 Daily Challenge:</strong> Pick ONE tip from this section to focus on each day. Mastery comes from consistent application of small improvements.
</div>`,
                        duration: 8,
                        points: 0
                    },
                    {
                        title: 'Knowledge Check',
                        type: 'quiz',
                        description: 'Test your understanding',
                        content: `<h2>Module Assessment</h2>
<p>Answer these questions to verify your understanding of ${topic}. You need to score 80% or higher to pass this module.</p>

<div class="quiz-intro">
<div class="quiz-stats">
<span>📋 5 Questions</span>
<span>⏱️ Estimated: 5 minutes</span>
<span>🎯 Pass: 80%</span>
</div>
</div>

<div class="assessment-preview">
<h3>What to Expect:</h3>
<ul>
<li><strong>Scenario-based questions</strong> - Apply concepts to realistic situations</li>
<li><strong>Best practice identification</strong> - Select the optimal approach</li>
<li><strong>Problem-solving scenarios</strong> - Choose the right solution</li>
<li><strong>Procedure knowledge</strong> - Demonstrate understanding of workflows</li>
<li><strong>Guest service principles</strong> - Show mastery of hospitality standards</li>
</ul>

<div class="callout callout-warning">
<strong>📚 Before You Start:</strong> If you're unsure about any topics, review the relevant sections above. The goal is mastery, not just passing.
</div>
</div>

<div class="quiz-content-placeholder">
<p><em>The interactive quiz will load here. Answer honestly - this helps us understand what training areas might need reinforcement.</em></p>
</div>`,
                        duration: 5,
                        points: 10
                    },
                    {
                        title: 'Summary & Key Takeaways',
                        type: 'text',
                        description: 'Consolidate your learning',
                        content: `<h2>Module Summary</h2>
<p>Congratulations on completing this comprehensive module on <strong>${topic}</strong>! Let's review the key points that will help you excel in your role.</p>

<div class="summary-section">
<h3>🎯 Key Points to Remember</h3>

<div class="key-point">
<h4>1. Foundation is Everything</h4>
<p>Master the core concepts and principles before focusing on speed. Understanding WHY we do things a certain way helps you make better decisions in unusual situations.</p>
</div>

<div class="key-point">
<h4>2. Details Create Excellence</h4>
<p>The difference between good and exceptional service is in the details. Develop a habit of noticing and addressing small things that others might miss.</p>
</div>

<div class="key-point">
<h4>3. Communication is Critical</h4>
<p>Clear, proactive communication prevents problems and builds trust. Keep guests informed, update your team, and document important information.</p>
</div>

<div class="key-point">
<h4>4. Follow the Process</h4>
<p>Standard Operating Procedures exist for a reason. Following them ensures consistency, quality, and safety. When you think you can skip a step, that's when mistakes happen.</p>
</div>

<div class="key-point">
<h4>5. Never Stop Learning</h4>
<p>The best hospitality professionals are constantly improving. Seek feedback, study best practices, and learn from every guest interaction.</p>
</div>
</div>

<div class="action-plan">
<h3>📝 Your Action Plan</h3>
<p>Apply what you've learned with these immediate actions:</p>

<div class="action-items">
<div class="action-item">
<input type="checkbox" /> Review the SOP for ${topic} and identify one area to improve
</div>
<div class="action-item">
<input type="checkbox" /> Practice the step-by-step procedure on your next shift
</div>
<div class="action-item">
<input type="checkbox" /> Ask a colleague or supervisor for feedback on your technique
</div>
<div class="action-item">
<input type="checkbox" /> Apply one "Expert Tip" consistently for one week
</div>
<div class="action-item">
<input type="checkbox" /> Share something you learned with a team member
</div>
</div>
</div>

<div class="congratulations-box">
<h3>🎉 Well Done!</h3>
<p>You've invested time in developing your professional skills. This commitment to excellence sets you apart and contributes to our hotel's reputation for outstanding service.</p>
<p><strong>Remember:</strong> Training is not a one-time event - it's a continuous journey. Return to this module whenever you need a refresher.</p>
</div>
</div>`,
                        duration: 5,
                        points: 0
                    },
                    {
                        title: 'Additional Resources',
                        type: 'text',
                        description: 'Continue your learning journey',
                        content: `<h2>Resources for Continued Learning</h2>

<div class="resources-grid">

<div class="resource-category">
<h3>📚 Related Training Modules</h3>
<ul>
<li>Customer Service Excellence</li>
<li>Hotel Brand Standards</li>
<li>Guest Communication Skills</li>
<li>Problem Resolution Techniques</li>
<li>Time Management for Hotel Staff</li>
</ul>
</div>

<div class="resource-category">
<h3>📖 Reference Materials</h3>
<ul>
<li>Employee Handbook - ${category} Section</li>
<li>Standard Operating Procedures Manual</li>
<li>Guest Service Standards Guide</li>
<li>Safety and Security Protocols</li>
<li>Hotel Emergency Procedures</li>
</ul>
</div>

<div class="resource-category">
<h3>👥 Support Contacts</h3>
<ul>
<li><strong>Department Manager:</strong> For operational questions</li>
<li><strong>Training Coordinator:</strong> For learning support</li>
<li><strong>HR Department:</strong> For policy questions</li>
<li><strong>IT Helpdesk:</strong> For system support</li>
</ul>
</div>

<div class="resource-category">
<h3>💬 Feedback</h3>
<p>Help us improve this training module:</p>
<ul>
<li>Was the content clear and helpful?</li>
<li>What additional topics would you like covered?</li>
<li>How can we make this training better?</li>
</ul>
<p>Share your feedback with your supervisor or training coordinator.</p>
</div>

</div>

<div class="certificate-preview">
<h3>🏆 Certificate of Completion</h3>
<p>Upon passing the knowledge check, you will receive a certificate recognizing your completion of this training module. This contributes to your professional development record.</p>
</div>

<div class="callout callout-info">
<strong>🔄 Keep Learning:</strong> Check the Training Hub regularly for new modules and refresher courses. Continuous learning is the key to career growth in hospitality.
</div>`,
                        duration: 3,
                        points: 0
                    }
                ]
            }

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Could not generate complete training content'
            console.error('Full module generation error:', error)
            toast({
                title: 'Content Generation Failed',
                description: errorMessage,
                variant: 'destructive'
            })
            return null
        } finally {
            setGenerating(false)
            setProgress('')
        }
    }

    /**
     * Generate AI-suggested course configuration based on content analysis
     */
    const generateCourseConfiguration = async (
        topic: string,
        category: string,
        difficulty: string,
        sections: { title: string; type: string }[]
    ): Promise<Partial<CourseConfiguration> | null> => {
        try {
            setProgress('Analyzing content for optimal configuration...')
            
            const hasQuizSection = sections.some(s => 
                s.type === 'quiz' || s.title.toLowerCase().includes('knowledge') || s.title.toLowerCase().includes('assessment')
            )
            
            const hasScenarioSection = sections.some(s => 
                s.type === 'scenario' || s.title.toLowerCase().includes('scenario') || s.title.toLowerCase().includes('case study')
            )
            
            const isComplianceRelated = 
                category.toLowerCase().includes('safety') || 
                category.toLowerCase().includes('compliance') ||
                category.toLowerCase().includes('security') ||
                topic.toLowerCase().includes('safety') ||
                topic.toLowerCase().includes('compliance') ||
                topic.toLowerCase().includes('fire') ||
                topic.toLowerCase().includes('emergency')
            
            const isTechnical = 
                category.toLowerCase().includes('maintenance') ||
                category.toLowerCase().includes('kitchen') ||
                topic.toLowerCase().includes('technical') ||
                topic.toLowerCase().includes('system') ||
                topic.toLowerCase().includes('equipment')

            // AI-suggested configuration based on content analysis
            const suggestedConfig: Partial<CourseConfiguration> = {
                // Assignment rules
                assignmentType: isComplianceRelated ? 'auto_assign' : 'manual',
                assignToAll: isComplianceRelated,
                isMandatory: isComplianceRelated,
                priority: isComplianceRelated ? 'compliance' : (difficulty === 'hard' ? 'high' : 'normal'),
                
                // Completion requirements
                requireQuiz: hasQuizSection || difficulty !== 'easy',
                requireAllSections: true,
                minQuizScore: isComplianceRelated ? 90 : (difficulty === 'hard' ? 85 : 80),
                maxQuizAttempts: isComplianceRelated ? 5 : 3,
                timeLimitMinutes: sections.length > 8 ? 45 : (sections.length > 5 ? 30 : 20),
                allowRetake: !isComplianceRelated,
                
                // Certificate
                issueCertificate: difficulty !== 'easy' || isComplianceRelated,
                certificateTemplate: isComplianceRelated ? 'compliance' : (difficulty === 'hard' ? 'mastery' : 'standard'),
                validityPeriod: isComplianceRelated ? '1_year' : null,
                
                // Due date
                hasDueDate: true,
                dueDaysAfterAssignment: isComplianceRelated ? 7 : (difficulty === 'hard' ? 21 : 14),
                
                // Automation
                sendReminders: true,
                reminderDays: isComplianceRelated ? [3, 1] : [7, 3, 1],
                autoEscalate: isComplianceRelated,
                escalationDays: isComplianceRelated ? 2 : 7,
                
                // Prerequisites for advanced content
                requirePrerequisites: difficulty === 'hard',
            }
            
            // Build prompt for AI to validate/refine suggestions
            const prompt = `As a training administrator for a hotel, analyze this training module and suggest optimal configuration:

Topic: "${topic}"
Category: ${category}
Difficulty: ${difficulty}
Sections: ${sections.map(s => s.title).join(', ')}

Based on this content, suggest the best settings for:
1. Should this be mandatory? (compliance/safety = yes)
2. What should the passing score be?
3. Should it auto-assign to everyone?
4. What priority level?

Return a JSON object with these fields:
{
  "assignmentType": "manual" | "auto_assign" | "onboarding",
  "isMandatory": boolean,
  "priority": "low" | "normal" | "high" | "compliance",
  "minQuizScore": number,
  "requireQuiz": boolean,
  "issueCertificate": boolean,
  "dueDaysAfterAssignment": number,
  "sendReminders": boolean,
  "autoEscalate": boolean
}`

            const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-ai-request', {
                body: {
                    action: 'generate_course_config',
                    prompt,
                    context: { topic, category, difficulty, sectionCount: sections.length }
                }
            })

            if (!aiError && aiResult?.response) {
                try {
                    const parsed = JSON.parse(cleanJSON(aiResult.response))
                    return { ...suggestedConfig, ...parsed }
                } catch {
                    return suggestedConfig
                }
            }
            
            return suggestedConfig

        } catch (error) {
            console.error('Configuration generation error:', error)
            return null
        }
    }

    return {
        generating,
        progress,
        generateFromDocument,
        generateModuleOutline,
        getSuggestedResources,
        generateFullModuleContent,
        generateCourseConfiguration
    }
}

export type CourseConfiguration = {
    assignmentType: 'manual' | 'auto_assign' | 'onboarding' | 'role_based'
    targetDepartments: string[]
    targetRoles: string[]
    assignToAll: boolean
    requireQuiz: boolean
    requireAllSections: boolean
    minQuizScore: number
    maxQuizAttempts: number
    timeLimitMinutes: number
    allowRetake: boolean
    issueCertificate: boolean
    certificateTemplate: string
    validityPeriod: 'no_expiration' | '1_year' | '2_years' | '3_years' | '5_years' | null
    hasDueDate: boolean
    dueDaysAfterAssignment: number
    validFrom: string | null
    expiresAt: string | null
    sendReminders: boolean
    reminderDays: number[]
    autoEscalate: boolean
    escalationDays: number
    requirePrerequisites: boolean
    prerequisiteModules: string[]
    isMandatory: boolean
    priority: 'low' | 'normal' | 'high' | 'compliance'
    trackOffline: boolean
}

// Helper functions

/**
 * Get context and specific details for a training category
 */
function getCategoryContext(category: string): string {
    const contexts: Record<string, string> = {
        'Front Office': 'front desk operations, check-in/check-out procedures, guest registration, key management, and concierge services',
        'Housekeeping': 'room cleaning standards, bed making techniques, bathroom sanitization, laundry operations, and turndown service',
        'Food & Beverage': 'restaurant service, bar operations, menu knowledge, food safety, table setting, and order taking procedures',
        'Maintenance': 'preventive maintenance, repair procedures, HVAC systems, plumbing, electrical work, and room inspections',
        'Security': 'surveillance monitoring, access control, emergency procedures, incident reporting, and guest safety protocols',
        'Human Resources': 'recruitment processes, onboarding procedures, employee relations, performance management, and policy enforcement',
        'Sales & Marketing': 'reservation systems, upselling techniques, client relationship management, promotional campaigns, and revenue management',
        'Management': 'leadership principles, team supervision, budgeting, strategic planning, and operational excellence',
        'Safety & Compliance': 'health and safety regulations, fire safety, first aid, OSHA compliance, and risk management',
        'Customer Service': 'guest complaint resolution, service recovery, communication skills, and guest satisfaction measurement',
        'General': 'hospitality industry standards, professional conduct, and hotel-wide operational knowledge'
    }
    
    const normalizedCategory = Object.keys(contexts).find(key => 
        category.toLowerCase().includes(key.toLowerCase())
    )
    
    return contexts[normalizedCategory || 'General'] || contexts['General']
}

function stripHtml(html: string): string {
    // Use recursive sanitization to prevent bypass attempts with nested tags
    let previous: string;
    let result = html;
    do {
      previous = result;
      result = previous.replace(/<[^>]*>/g, ' ');
    } while (result !== previous);
    return result
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()
}

function cleanJSON(text: string): string {
    if (!text) return '{}'
    // Remove markdown code blocks if present
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/)
    if (jsonMatch && jsonMatch[1]) {
        return jsonMatch[1]
    }
    // Also try matching standard code blocks
    const codeMatch = text.match(/```\n?([\s\S]*?)\n?```/)
    if (codeMatch && codeMatch[1]) {
        return codeMatch[1]
    }

    return text
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
