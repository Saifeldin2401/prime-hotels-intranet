/**
 * useAIOnboardingPath - AI-Powered Personalized Onboarding Path Generator
 * 
 * Generates customized learning paths for new employees based on their
 * role, department, and prior experience.
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface OnboardingStep {
    order: number
    title: string
    description: string
    type: 'training' | 'document' | 'task' | 'meeting' | 'shadowing'
    duration: string
    priority: 'required' | 'recommended' | 'optional'
    department?: string
}

interface OnboardingPath {
    employeeName: string
    role: string
    department: string
    totalDuration: string
    phases: OnboardingPhase[]
    recommendations: string[]
}

interface OnboardingPhase {
    name: string
    duration: string
    description: string
    steps: OnboardingStep[]
}

interface GeneratePathOptions {
    employeeName: string
    role: string
    department: string
    startDate?: Date
    priorExperience?: 'none' | 'some_hospitality' | 'experienced_hospitality' | 'internal_transfer'
    specialFocus?: string[]
}

export function useAIOnboardingPath() {
    const [path, setPath] = useState<OnboardingPath | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Generate personalized onboarding path
    const generatePath = useCallback(async (options: GeneratePathOptions) => {
        const { employeeName, role, department, priorExperience = 'none', specialFocus } = options

        if (!employeeName || !role || !department) {
            setError('Employee name, role, and department are required')
            return null
        }

        setLoading(true)
        setError(null)

        try {
            const prompt = `You are a senior HR onboarding specialist at a luxury hotel chain. Create a personalized onboarding plan for a new employee.

NEW EMPLOYEE DETAILS:
- Name: ${employeeName}
- Role: ${role}
- Department: ${department}
- Prior Experience: ${priorExperience.replace(/_/g, ' ')}
${specialFocus?.length ? `- Special Focus Areas: ${specialFocus.join(', ')}` : ''}

ONBOARDING REQUIREMENTS:
1. Create a structured 30-90 day onboarding plan divided into phases
2. Include mix of Training, Documents to Read, Tasks, Meetings, and Shadowing
3. Prioritize items as "required", "recommended", or "optional"
4. Consider the employee's experience level when setting pace
5. Include department-specific and general hotel procedures

Return a JSON object with this structure:
{
  "employeeName": "${employeeName}",
  "role": "${role}",
  "department": "${department}",
  "totalDuration": "30 days",
  "phases": [
    {
      "name": "Week 1: Orientation & Foundations",
      "duration": "5 days",
      "description": "Initial setup and core hotel knowledge",
      "steps": [
        {
          "order": 1,
          "title": "Complete HR paperwork and system access",
          "description": "Set up employee profile, obtain ID badge, complete tax forms",
          "type": "task",
          "duration": "2 hours",
          "priority": "required"
        },
        {
          "order": 2,
          "title": "Hotel Brand Standards Training",
          "description": "Learn about hotel brand values and guest service standards",
          "type": "training",
          "duration": "3 hours",
          "priority": "required"
        }
      ]
    }
  ],
  "recommendations": [
    "Schedule weekly check-ins with manager for first month",
    "Join department team lunch on first day"
  ]
}

IMPORTANT:
- Create 3-4 phases (Week 1, Week 2-3, Month 2, etc.)
- Include 4-6 steps per phase
- Be specific to hotel industry and the employee's role
- Total steps should be 12-20 items
- Types: "training" | "document" | "task" | "meeting" | "shadowing"

Return ONLY valid JSON.`

            const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-ai-request', {
                body: {
                    prompt,
                    model: 'Qwen/Qwen2.5-72B-Instruct',
                    task: 'chat'
                }
            })

            if (aiError) throw aiError

            // Parse AI response
            let parsed: OnboardingPath | null = null
            try {
                // The server returns { response: "string content", success: true }
                let rawContent = aiResult?.response || ''

                // Clean up Markdown code blocks if present
                rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '')

                // Extract JSON object
                const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0])
                } else {
                    console.warn('No JSON found in AI response:', rawContent)
                }
            } catch (parseError) {
                console.warn('Failed to parse AI onboarding path:', parseError)
            }

            if (parsed) {
                setPath(parsed)
                return parsed
            } else {
                // Fallback path
                const fallback = createFallbackPath(options)
                setPath(fallback)
                return fallback
            }

        } catch (err: any) {
            console.error('Onboarding path generation error:', err)
            setError(err.message || 'Failed to generate onboarding path')
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    // Clear path
    const clearPath = useCallback(() => {
        setPath(null)
        setError(null)
    }, [])

    return {
        path,
        loading,
        error,
        generatePath,
        clearPath
    }
}

// Fallback path generator
function createFallbackPath(options: GeneratePathOptions): OnboardingPath {
    const { employeeName, role, department } = options

    return {
        employeeName,
        role,
        department,
        totalDuration: '30 days',
        phases: [
            {
                name: 'Week 1: Orientation',
                duration: '5 days',
                description: 'Initial setup and orientation',
                steps: [
                    {
                        order: 1,
                        title: 'Complete HR onboarding paperwork',
                        description: 'Fill out required forms, get ID badge, set up system access',
                        type: 'task',
                        duration: '2 hours',
                        priority: 'required'
                    },
                    {
                        order: 2,
                        title: 'Hotel orientation tour',
                        description: 'Tour of all hotel facilities and departments',
                        type: 'meeting',
                        duration: '2 hours',
                        priority: 'required'
                    },
                    {
                        order: 3,
                        title: `Read ${department} Department SOP`,
                        description: 'Review standard operating procedures for your department',
                        type: 'document',
                        duration: '3 hours',
                        priority: 'required'
                    },
                    {
                        order: 4,
                        title: 'Health & Safety Training',
                        description: 'Complete mandatory health and safety certification',
                        type: 'training',
                        duration: '2 hours',
                        priority: 'required'
                    }
                ]
            },
            {
                name: 'Week 2-3: Role Training',
                duration: '10 days',
                description: 'Department-specific training and shadowing',
                steps: [
                    {
                        order: 5,
                        title: `Shadow experienced ${role}`,
                        description: 'Observe and learn from an experienced team member',
                        type: 'shadowing',
                        duration: '2 days',
                        priority: 'required'
                    },
                    {
                        order: 6,
                        title: 'Guest Service Excellence Training',
                        description: 'Learn hotel brand service standards',
                        type: 'training',
                        duration: '4 hours',
                        priority: 'required'
                    },
                    {
                        order: 7,
                        title: 'Systems training (PMS/POS)',
                        description: 'Learn to use hotel technology systems',
                        type: 'training',
                        duration: '4 hours',
                        priority: 'required'
                    }
                ]
            },
            {
                name: 'Month 2: Independence & Review',
                duration: '15 days',
                description: 'Work independently with manager check-ins',
                steps: [
                    {
                        order: 8,
                        title: '30-day review with manager',
                        description: 'Discuss progress, address questions, set goals',
                        type: 'meeting',
                        duration: '1 hour',
                        priority: 'required'
                    },
                    {
                        order: 9,
                        title: 'Complete department certification quiz',
                        description: 'Demonstrate knowledge of department procedures',
                        type: 'training',
                        duration: '1 hour',
                        priority: 'required'
                    }
                ]
            }
        ],
        recommendations: [
            'Schedule weekly 1-on-1 meetings with your manager',
            'Introduce yourself to colleagues in other departments',
            'Ask questions early - your team is here to help!'
        ]
    }
}
