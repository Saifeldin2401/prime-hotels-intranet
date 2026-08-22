import { z } from 'zod'

/**
 * Module Outline Zod Schema for Structured Course Creation
 */
export const ModuleOutlineSectionSchema = z.object({
  heading: z.string().min(2, 'Heading is required'),
  suggestedBlockType: z.enum(['text', 'video', 'document_link', 'scenario']).default('text'),
  summary: z.string().default(''),
  rich_content: z.string().optional(),
})

export const ModuleOutlineSchema = z.object({
  title: z.string().min(2, 'Course title is required'),
  description: z.string().default(''),
  sections: z.array(ModuleOutlineSectionSchema).min(1, 'At least one section is required'),
  suggestedQuizCheckpoints: z.array(z.string()).optional().default([]),
})

/**
 * Quiz Question Zod Schema
 */
export const AIQuizQuestionSchema = z.object({
  question_text: z.string().min(5, 'Question text is required'),
  question_type: z.enum(['mcq', 'true_false', 'multi_select', 'open_ended']).default('mcq'),
  options: z.array(z.string()).optional().default([]),
  correct_answer: z.string().min(1, 'Correct answer is required'),
  points: z.number().default(10),
  explanation: z.string().optional(),
  hint: z.string().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  source_snippet: z.string().optional(),
})

export const AIQuizGenerationSchema = z.array(AIQuizQuestionSchema)

/**
 * Operational Checklist Item Schema
 */
export const AIHotelChecklistItemSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  text: z.string().min(2),
  text_ar: z.string().optional(),
  is_required: z.boolean().default(true),
  order: z.number().default(0),
})

export const AIHotelChecklistSchema = z.array(AIHotelChecklistItemSchema)

/**
 * Operational FAQ Item Schema
 */
export const AIHotelFAQItemSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  question: z.string().min(2),
  question_ar: z.string().optional(),
  answer: z.string().min(2),
  answer_ar: z.string().optional(),
  order: z.number().default(0),
})

export const AIHotelFAQSchema = z.array(AIHotelFAQItemSchema)
