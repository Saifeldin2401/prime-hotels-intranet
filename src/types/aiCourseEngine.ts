/**
 * AI Course & Assessment Generation Engine - Types
 * Production LCMS Architecture for PRIME Hotels Intranet
 */

import type { QuestionDifficulty, QuestionType } from './questions'

// ============================================================================
// 1. GENERATION MODES
// ============================================================================
export type CourseGenerationMode =
  | 'full_course'          // Complete course from topic/material
  | 'topic_based'          // Course from topic prompt
  | 'document_based'       // Course from uploaded/SOP document
  | 'course_remix'         // From existing course (improve, expand, shorten, translate)
  | 'outline_only'         // Structure, modules, lessons, objectives
  | 'module_generation'    // Generate one complete module
  | 'lesson_generation'    // Generate single lesson
  | 'quiz_generation'      // Standalone quiz generator
  | 'assessment_generation'// Standalone comprehensive final exam
  | 'course_improvement'   // QA audit and targeted area regeneration

// ============================================================================
// 2. COURSE TYPES / LEARNING DESIGN (18 Types)
// ============================================================================
export type CourseType =
  | 'academic'
  | 'professional'
  | 'corporate'
  | 'technical'
  | 'compliance'
  | 'product'
  | 'sales'
  | 'management'
  | 'soft_skills'
  | 'workshop'
  | 'cert_prep'
  | 'onboarding'
  | 'orientation'
  | 'microlearning'
  | 'ilt'               // Instructor-led training
  | 'self_paced'
  | 'blended'
  | 'exam_prep'
  | 'simulation'

export interface CourseTypeConfig {
  id: CourseType
  title: string
  title_ar: string
  description: string
  description_ar: string
  icon: string
  defaultStrategy: InstructionalStrategy
  recommendedDifficulty: CourseDifficulty
}

// ============================================================================
// 3. AUDIENCE & EXPERIENCE
// ============================================================================
export type TargetAudience =
  | 'students'
  | 'employees'
  | 'managers'
  | 'executives'
  | 'salespeople'
  | 'technicians'
  | 'professionals'
  | 'trainers'
  | 'beginners'
  | 'specialists'
  | 'mixed'

export type ExperienceLevel =
  | 'complete_beginner'
  | 'beginner'
  | 'intermediate'
  | 'upper_intermediate'
  | 'advanced'
  | 'expert'
  | 'all_levels'

// ============================================================================
// 4. DIFFICULTY & PROGRESSION
// ============================================================================
export type CourseDifficulty =
  | 'beginner'
  | 'easy'
  | 'intermediate'
  | 'challenging'
  | 'advanced'
  | 'expert'

export type DifficultyProgression =
  | 'flat'          // Consistent difficulty across all modules
  | 'progressive'   // Gradual ramp-up (Mod 1 Beginner -> Mod 4 Advanced)
  | 'steep'         // Rapid escalation into complex mastery
  | 'adaptive'      // Performance-based branching

// ============================================================================
// 5. COURSE DURATION & GRANULARITY
// ============================================================================
export type ModuleCountOption = 'auto' | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 'custom'
export type LessonDurationMinutes = 5 | 10 | 15 | 20 | 30 | 45 | 60

export interface CourseGranularityConfig {
  moduleCount: ModuleCountOption
  customModuleCount?: number
  lessonsPerModule: 'auto' | number
  lessonDuration: LessonDurationMinutes
  totalCourseDurationMinutes?: number | 'auto'
}

// ============================================================================
// 6. CONTENT DEPTH
// ============================================================================
export type OverallContentDepth =
  | 'quick'          // High-level summary and essentials
  | 'standard'       // Balanced explanation, examples, activities
  | 'detailed'       // Deep explanation, context, practice
  | 'comprehensive'  // Extensive exercises, scenarios, and checks
  | 'expert'         // Highly technical / executive rigor

export interface GranularDepthConfig {
  theory: 1 | 2 | 3 | 4 | 5        // 1=Minimal, 5=Deep dive
  examples: 1 | 2 | 3 | 4 | 5      // 1=Brief, 5=Rich real-world examples
  practical: 1 | 2 | 3 | 4 | 5     // 1=None, 5=Hands-on drills
  caseStudies: 1 | 2 | 3 | 4 | 5   // 1=None, 5=Multi-step case dilemmas
  assessments: 1 | 2 | 3 | 4 | 5   // 1=Light, 5=Rigorous certification
}

// ============================================================================
// 7. LESSON COMPONENTS & TEMPLATES
// ============================================================================
export type LessonComponentKey =
  | 'intro'
  | 'objectives'
  | 'concepts'
  | 'definitions'
  | 'explanation'
  | 'examples'
  | 'real_world_examples'
  | 'case_study'
  | 'scenario'
  | 'demonstration'
  | 'step_procedure'
  | 'dialogue_script'
  | 'checklist'
  | 'last_protocol'
  | 'practical_exercise'
  | 'reflection_questions'
  | 'discussion_questions'
  | 'knowledge_check'
  | 'summary'
  | 'action_points'
  | 'further_reading'
  | 'assessment'

export type LessonTemplateType =
  | 'theory'
  | 'practical'
  | 'case_study'
  | 'sop_standard'
  | 'scenario_solving'
  | 'micro_action_card'

// ============================================================================
// 8. INSTRUCTIONAL STRATEGY (14 Strategies)
// ============================================================================
export type InstructionalStrategy =
  | 'traditional'
  | 'explain_example_practice'
  | 'problem_based'
  | 'case_based'
  | 'scenario_based'
  | 'project_based'
  | 'discovery'
  | 'socratic'
  | 'simulation'
  | 'microlearning'
  | 'storytelling'
  | 'role_play'
  | 'hands_on'
  | 'exam_prep'

// ============================================================================
// 9. BLOOM'S TAXONOMY & COGNITIVE LEVELS
// ============================================================================
export type BloomLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create'

export interface BloomDistribution {
  remember: number   // percentage (0-100)
  understand: number
  apply: number
  analyze: number
  evaluate: number
  create: number
}

export type BloomPreset = 'basic' | 'intermediate' | 'advanced' | 'expert' | 'custom'

// ============================================================================
// 10. QUIZ & ASSESSMENT CONFIGURATION
// ============================================================================
export type QuizPlacement =
  | 'per_lesson'
  | 'per_module'
  | 'selected_lessons'
  | 'mid_course'
  | 'final_assessment'
  | 'standalone'
  | 'checkpoints'

export type DistractorQuality = 'standard' | 'high' | 'expert_plausible'

export interface QuizEngineConfig {
  placement: QuizPlacement
  questionCount: number
  passingScore: number
  maxAttempts: number | null // null = unlimited
  randomizeQuestions: boolean
  randomizeAnswers: boolean
  useQuestionPools: boolean
  poolSize?: number
  adaptiveDifficulty: boolean
  distractorQuality: DistractorQuality
  includeHints: boolean
  includeExplanations: boolean
  storeInQuestionBank: boolean
  questionBankId?: string
}

export type QuestionTypeDistribution = Record<QuestionType, number> // Type -> Percentage

// ============================================================================
// 11. AI ENGINE CONTROLS & STRICTNESS
// ============================================================================
export type AICreativity = 'conservative' | 'balanced' | 'creative'
export type ContentStrictness = 'strict_source' | 'source_primary' | 'balanced' | 'allow_external'
export type SourceGroundingMode = 'source_only' | 'source_enhanced' | 'source_general_knowledge'

export interface AIEngineControls {
  preferredModel: string
  creativity: AICreativity
  strictness: ContentStrictness
  sourceMode: SourceGroundingMode
  hallucinationProtection: boolean
  targetLanguage: 'English' | 'Arabic' | 'Bilingual'
  questionLanguage?: 'English' | 'Arabic' | 'Bilingual'
  answerLanguage?: 'English' | 'Arabic' | 'Bilingual'
}

// ============================================================================
// ============================================================================
// 11.5. VISUAL ASSETS & CLOUDFLARE WORKERS AI IMAGE GENERATION
// ============================================================================
export type ImageProviderType = 'cloudflare'
export type ImageCostTier = 'free_only' | 'standard_paid' | 'flux_studio'

export type CloudflareImageModel =
  | '@cf/black-forest-labs/flux-1-schnell' // Ultra-HD Studio (FLUX.1 12B DiT, 4-8 steps, state-of-the-art text/diagram/photo)
  | '@cf/bytedance/stable-diffusion-xl-lightning' // Primary Free ($0.00 / step, 4-8 steps, fast 1024px)
  | '@cf/stabilityai/stable-diffusion-xl-base-1.0' // Fallback #1 Free ($0.00 / step, high-detail)
  | '@cf/lykon/dreamshaper-8-lcm' // Fallback #2 Free ($0.00 / step, creative & photorealistic LCM)
  | '@cf/runwayml/stable-diffusion-v1-5-img2img' // Specialized Img2Img Transformation
  | '@cf/runwayml/stable-diffusion-v1-5-inpainting' // Specialized Region Inpainting

export type ImageDensity = 'minimal' | 'balanced' | 'visual' | 'maximum'

export type VisualType =
  | 'educational_illustration'
  | 'technical_illustration'
  | 'concept_visualization'
  | 'process_visualization'
  | 'workflow'
  | 'step_by_step_visual'
  | 'workplace_scenario'
  | 'case_study_illustration'
  | 'realistic_scene'
  | 'professional_corporate'
  | 'equipment_illustration'
  | 'diagram_style'
  | 'infographic_style'
  | 'comparison_visual'
  | 'timeline'
  | 'conceptual_map'
  | 'historical_illustration'
  | 'isometric_illustration'
  | '3d_illustration'
  | 'minimalist_educational'

export type VisualStyle =
  | 'educational_illustration'
  | 'professional_corporate'
  | 'realistic'
  | 'photorealistic'
  | 'technical_diagram'
  | 'infographic'
  | 'minimalist'
  | 'isometric'
  | '3d_illustration'
  | 'flat_illustration'

export type VisualPlacement =
  | 'intro'
  | 'concept_explanation'
  | 'before_example'
  | 'after_explanation'
  | 'procedure'
  | 'case_study'
  | 'scenario'
  | 'summary'
  | 'full_width'

export interface CloudflareUsageStats {
  usedNeurons: number
  totalDailyNeurons: number
  percentageUsed: number
  imagesGeneratedToday: number
  imagesGeneratedThisMonth: number
  successfulGenerations: number
  failedGenerations: number
  activeModel: CloudflareImageModel
  freeOnlyMode: boolean
  isRateLimited: boolean
}

export interface ImageGenerationConfig {
  enableAIImages: boolean
  provider?: ImageProviderType // default: 'cloudflare'
  costTier?: ImageCostTier // default: 'free_only'
  imageModel: CloudflareImageModel | string // default: '@cf/bytedance/stable-diffusion-xl-lightning'
  fallbackModel?: CloudflareImageModel | string // default: '@cf/stabilityai/stable-diffusion-xl-base-1.0'
  density?: ImageDensity // default: 'balanced'
  selectionStrategy: 'auto_intelligent' | 'all_suitable_lessons' | 'high_benefit_only'
  preferredStyle: VisualStyle
  preferredAspectRatio: '16:9' | '4:3' | '1:1' | '3:2'
  maxImagesPerLesson: number
  maxImagesPerModule?: number
  maxImagesPerCourse: number
  numSteps?: number // default: 4-8 for SDXL-Lightning
  guidance?: number // default: 7.5
  dailyBudgetNeurons?: number
}

export interface VisualOpportunity {
  shouldGenerate: boolean
  priority?: 1 | 2 | 3 | 4 | 5 // 1: Essential instructional, 2: Technical/process, 3: Scenario, 4: Supporting, 5: Decorative
  purpose: string
  educationalObjective: string
  subject: string
  visualConcept: string
  visualType?: VisualType
  optimizedPrompt: string
  negativePrompt?: string
  placement: VisualPlacement
  aspectRatio: string
  width?: number
  height?: number
  numSteps?: number
  guidance?: number
  seed?: number
  title: string
  title_ar?: string
  altText: string
  altText_ar?: string
  caption?: string
  caption_ar?: string
}

export interface CourseVisualAsset {
  id: string
  course_id: string
  module_id: string
  lesson_id: string
  content_block_id?: string | null
  image_url: string
  storage_path?: string | null
  storage_bucket: string
  title: string
  title_ar?: string
  alt_text: string
  alt_text_ar?: string
  caption?: string
  caption_ar?: string
  educational_purpose: string
  visual_concept: string
  prompt: string
  negative_prompt?: string | null
  aspect_ratio: string
  visual_style: string
  placement: VisualPlacement | string
  provider: string
  model: string
  width?: number
  height?: number
  steps?: number
  guidance?: number
  seed?: number
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'disabled' | 'draft'
  /**
   * True while the asset lives only in client/in-memory state and has NOT been
   * persisted to `course_visual_assets`. Draft assets have a non-UUID `id`
   * (e.g. `img-1699…`) and must never be targeted by DB UPDATE/DELETE calls.
   */
  draft?: boolean
  order_index: number
  created_at?: string
  updated_at?: string
}

// ============================================================================
// 12. COURSE BLUEPRINT & GENERATION OUTPUT
// ============================================================================
export interface LessonBlueprint {
  id: string
  title: string
  title_ar?: string
  description?: string
  description_ar?: string
  templateType: LessonTemplateType
  durationMinutes: number
  learningOutcomes: string[]
  suggestedBlockTypes: string[]
  components: LessonComponentKey[]
  renderedHtml?: string
  renderedHtml_ar?: string
  quizCheckpoints?: QuizBlueprint[]
  visualAssets?: CourseVisualAsset[]
}

export interface ModuleBlueprint {
  id: string
  title: string
  title_ar?: string
  description?: string
  description_ar?: string
  durationMinutes: number
  difficultyLevel: CourseDifficulty
  lessons: LessonBlueprint[]
  moduleQuiz?: QuizBlueprint
}

export interface QuizBlueprint {
  id: string
  title: string
  title_ar?: string
  placement: QuizPlacement
  questionCount: number
  passingScore: number
  questions: GeneratedUnifiedQuestion[]
}

export interface GeneratedUnifiedQuestion {
  id?: string
  question_text: string
  question_text_ar?: string
  question_type: QuestionType
  difficulty: QuestionDifficulty
  bloom_level?: BloomLevel
  points: number
  options?: Array<{
    text: string
    text_ar?: string
    is_correct: boolean
    feedback?: string
    feedback_ar?: string
    match_value?: string
    match_value_ar?: string
  }>
  correct_answer?: string
  explanation?: string
  explanation_ar?: string
  hint?: string
  hint_ar?: string
  distractor_rationales?: Record<string, string>
  source_snippet?: string
  tags?: string[]
}

export interface CourseBlueprint {
  title: string
  title_ar?: string
  subtitle?: string
  subtitle_ar?: string
  description: string
  description_ar?: string
  courseType: CourseType
  instructionalStrategy: InstructionalStrategy
  targetAudience: TargetAudience
  experienceLevel: ExperienceLevel
  priorKnowledge?: string
  difficulty: CourseDifficulty
  difficultyProgression: DifficultyProgression
  estimatedDurationMinutes: number
  terminalObjectives: string[]
  enablingObjectives: string[]
  prerequisites: string[]
  modules: ModuleBlueprint[]
  finalAssessment?: QuizBlueprint
  summaryTakeaways: string[]
  qualityScore?: number
  qaReport?: CourseQAQualityReport
  visualAssets?: CourseVisualAsset[]
}

// ============================================================================
// 13. QUALITY ASSURANCE & GAP ANALYSIS
// ============================================================================
export interface CourseQAQualityReport {
  overallScore: number // 0 - 100
  objectiveAlignmentScore: number
  cognitiveProgressionScore: number
  contentDepthScore: number
  quizRigourScore: number
  identifiedGaps: Array<{
    area: string
    severity: 'low' | 'medium' | 'high'
    issue: string
    issue_ar?: string
    suggestedFix: string
    suggestedFix_ar?: string
    canAutoRegenerate: boolean
  }>
  repetitionIssues: string[]
  distractorIssues: string[]
  ksaComplianceStatus: 'compliant' | 'requires_review' | 'not_applicable'
  recommendations: string[]
}

// ============================================================================
// 14. GENERATION JOBS & PRESETS
// ============================================================================
export interface FullCourseGenerationConfig {
  generationMode: CourseGenerationMode
  courseType: CourseType
  instructionalStrategy: InstructionalStrategy
  targetAudience: TargetAudience
  experienceLevel: ExperienceLevel
  priorKnowledge?: string
  difficulty: CourseDifficulty
  difficultyProgression: DifficultyProgression
  granularity: CourseGranularityConfig
  overallDepth: OverallContentDepth
  depthConfig: GranularDepthConfig
  lessonComponents: LessonComponentKey[]
  defaultLessonTemplate: LessonTemplateType
  quizConfig: QuizEngineConfig
  questionTypes: QuestionType[]
  questionTypeDistribution?: QuestionTypeDistribution
  bloomDistribution: BloomDistribution
  aiControls: AIEngineControls
  imageConfig?: ImageGenerationConfig
  sourceContent?: string
  sourceDocumentId?: string
  existingCourseId?: string
  remixAction?: 'improve' | 'expand' | 'shorten' | 'advanced' | 'beginner' | 'new_audience' | 'translate'
}

/**
 * Persisted after every pipeline phase / module so an interrupted course
 * generation can be resumed via `resumeJobId` instead of restarting from zero.
 * Lives in `course_generation_jobs.metadata.checkpoint`.
 */
export interface CourseGenerationCheckpoint {
  version: 1
  /** Furthest phase whose output is already captured in this checkpoint. */
  phase:
    | 'discovery_and_research'
    | 'curriculum_architecture'
    | 'content_synthesis'
    | 'assessment_generation'
    | 'multimedia_generation'
    | 'quality_assurance'
    | 'done'
  updatedAt: string
  /** Raw research agent output (skips the Research + Knowledge phase on resume). */
  researchOutput?: unknown
  knowledgeOutput?: unknown
  /** Blueprint with every completed lesson's renderedHtml / quizzes filled in. */
  partialBlueprint?: CourseBlueprint
  /** Lesson ids whose content synthesis already succeeded. */
  completedLessonIds?: string[]
  /** Module ids whose assessment pool already succeeded. */
  completedQuizModuleIds?: string[]
  /** Accrued estimated spend so the resumed run keeps a truthful running total. */
  totalEstimatedCostUSD?: number
}

export type CourseGenerationJobStatus =
  | 'pending'
  | 'running'
  | 'interrupted'
  | 'completed'
  | 'failed'

export interface CourseGenerationJob {
  id: string
  mode: CourseGenerationMode
  course_id?: string | null
  status: CourseGenerationJobStatus
  config: FullCourseGenerationConfig
  blueprint?: CourseBlueprint | null
  qa_report?: CourseQAQualityReport | null
  models_used: string[]
  duration_ms?: number | null
  error_message?: string | null
  property_id?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  metadata?: (Record<string, unknown> & { checkpoint?: CourseGenerationCheckpoint }) | null
}

export interface CourseGenerationPreset {
  id: string
  name: string
  name_ar?: string
  description?: string
  description_ar?: string
  is_system: boolean
  preset_config: FullCourseGenerationConfig
  created_by?: string | null
  property_id?: string | null
  created_at: string
  updated_at: string
}
