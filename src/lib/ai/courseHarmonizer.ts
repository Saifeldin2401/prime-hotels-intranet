/**
 * Course Configuration Auto-Harmonizer & Consistency Guard
 * Ensures instructional design, duration, depth, and assessments remain logically aligned.
 */

import type {
  CourseDifficulty,
  CourseGenerationMode,
  CourseType,
  DifficultyProgression,
  FullCourseGenerationConfig,
  InstructionalStrategy,
  LessonComponentKey,
  LessonDurationMinutes,
  LessonTemplateType,
  OverallContentDepth,
  QuizPlacement,
} from '@/types/aiCourseEngine'
import type { QuestionType } from '@/types/questions'

export interface ConsistencyIssue {
  id: string
  severity: 'info' | 'warning' | 'critical'
  field: string
  message: string
  message_ar: string
  suggestedAction: string
  suggestedAction_ar: string
  patch: Partial<FullCourseGenerationConfig>
}

export interface ConsistencyReport {
  isConsistent: boolean
  score: number // 0 to 100
  issues: ConsistencyIssue[]
  summary: string
  summary_ar: string
}

/**
 * Validates whether the current course configuration has conflicting parameters across tabs.
 */
export function checkCourseConfigConsistency(
  config: Partial<FullCourseGenerationConfig>
): ConsistencyReport {
  const issues: ConsistencyIssue[] = []

  const mode = config.generationMode || 'full_course'
  const type = config.courseType || 'professional'
  const strategy = config.instructionalStrategy || 'explain_example_practice'
  const duration = config.granularity?.lessonDuration || 15
  const modCount = config.granularity?.moduleCount || 4
  const lessonsPerMod = config.granularity?.lessonsPerModule || 3
  const depth = config.overallDepth || 'comprehensive'
  const difficulty = config.difficulty || 'intermediate'
  const progression = config.difficultyProgression || 'progressive'
  const quizPlacement = config.quizConfig?.placement || 'per_module'
  const passingScore = config.quizConfig?.passingScore || 85
  const questionTypes = config.questionTypes || ['mcq', 'scenario']
  const components = config.lessonComponents || []

  // RULE 1: Microlearning Consistency
  if (type === 'microlearning') {
    if (duration > 10) {
      issues.push({
        id: 'micro_duration_mismatch',
        severity: 'critical',
        field: 'lessonDuration',
        message: 'Microlearning courses require bite-sized lessons (5-10 minutes max). Current duration is ' + duration + 'm.',
        message_ar: 'دورات التعلم المصغر تتطلب دروساً مقتضبة (5-10 دقائق كحد أقصى). المدة الحالية ' + duration + ' دقيقة.',
        suggestedAction: 'Set lesson duration to 5 or 10 minutes.',
        suggestedAction_ar: 'تعديل مدة الدرس إلى 5 أو 10 دقائق.',
        patch: {
          granularity: {
            ...config.granularity,
            moduleCount: modCount > 3 ? 2 : modCount,
            lessonsPerModule: lessonsPerMod > 3 ? 2 : lessonsPerMod,
            lessonDuration: 5 as LessonDurationMinutes,
          },
          overallDepth: 'quick',
        },
      })
    }
  }

  // RULE 2: Compliance & Regulatory Certification
  if (type === 'compliance') {
    if (passingScore < 80 || quizPlacement === 'none') {
      issues.push({
        id: 'compliance_rigour_mismatch',
        severity: 'critical',
        field: 'quizPassingScore',
        message: 'Compliance training requires formal assessment verification with minimum 85% passing benchmark.',
        message_ar: 'تدريب الامتثال والسلامة يتطلب تقييماً رسمياً بدرجة اجتياز لا تقل عن 85%.',
        suggestedAction: 'Enable per-module assessments with 85% passing threshold.',
        suggestedAction_ar: 'تفعيل التقييمات بدرجة اجتياز 85%.',
        patch: {
          quizConfig: {
            ...config.quizConfig,
            placement: 'per_module',
            passingScore: 85,
            questionCount: Math.max(5, config.quizConfig?.questionCount || 5),
          } as any,
        },
      })
    }
  }

  // RULE 3: Single Lesson Mode Alignment
  if (mode === 'lesson_generation') {
    if (modCount !== 1 || (typeof lessonsPerMod === 'number' && lessonsPerMod !== 1)) {
      issues.push({
        id: 'single_lesson_structure',
        severity: 'warning',
        field: 'granularity',
        message: 'Single Lesson mode focuses on synthesizing 1 standalone standard. Multi-module structure will be scoped down.',
        message_ar: 'وضع الدرس الواحد يركز على صياغة معيار تشغيلي واحد.',
        suggestedAction: 'Set scope to 1 module with 1 focused lesson.',
        suggestedAction_ar: 'ضبط النطاق على وحدة واحدة بدرس واحد.',
        patch: {
          granularity: {
            ...config.granularity,
            moduleCount: 1,
            lessonsPerModule: 1,
            lessonDuration: duration,
          },
          quizConfig: {
            ...config.quizConfig,
            placement: 'none',
          } as any,
        },
      })
    }
  }

  // RULE 4: Single Module Mode Alignment
  if (mode === 'module_generation') {
    if (modCount !== 1) {
      issues.push({
        id: 'single_module_structure',
        severity: 'warning',
        field: 'moduleCount',
        message: 'Single Module mode generates 1 cohesive departmental unit.',
        message_ar: 'وضع الوحدة الواحدة يولد وحدة تدريبية متكاملة واحدة.',
        suggestedAction: 'Set module count to 1.',
        suggestedAction_ar: 'تحديد عدد الوحدات بوحدة واحدة.',
        patch: {
          granularity: {
            ...config.granularity,
            moduleCount: 1,
            lessonsPerModule: typeof lessonsPerMod === 'number' ? Math.min(5, Math.max(2, lessonsPerMod)) : 3,
            lessonDuration: duration,
          },
        },
      })
    }
  }

  // RULE 5: Assessment & Exam Only Modes
  if (mode === 'quiz_generation' || mode === 'assessment_generation') {
    if (quizPlacement === 'none' || (config.quizConfig?.questionCount || 0) < 3) {
      issues.push({
        id: 'assessment_mode_zero_questions',
        severity: 'critical',
        field: 'quizConfig',
        message: 'Standalone Assessment mode requires active quiz synthesis.',
        message_ar: 'وضع الاختبار المستقل يتطلب تفعيل توليد الأسئلة.',
        suggestedAction: 'Enable assessment pool with at least 5 questions.',
        suggestedAction_ar: 'تفعيل بنك الأسئلة بعدد 5 أسئلة على الأقل.',
        patch: {
          quizConfig: {
            ...config.quizConfig,
            placement: mode === 'assessment_generation' ? 'final_exam' : 'per_module',
            questionCount: mode === 'assessment_generation' ? 20 : 5,
            passingScore: 85,
          } as any,
        },
      })
    }
  }

  // RULE 6: Soft Skills & Scenario Alignment
  if (type === 'soft_skills' || strategy === 'scenario_based') {
    if (!questionTypes.includes('scenario') || !components.includes('dialogue_script')) {
      issues.push({
        id: 'soft_skills_dialogue_missing',
        severity: 'info',
        field: 'lessonComponents',
        message: 'Soft skills & guest relations benefit from dialogue scripts and scenario decision questions.',
        message_ar: 'مهارات الضيافة والتواصل تستفيد من نصوص الحوار وسيناريوهات اتخاذ القرار.',
        suggestedAction: 'Include verbatim dialogue scripts and scenario-based questions.',
        suggestedAction_ar: 'إضافة نصوص المحادثة وأسئلة السيناريوهات.',
        patch: {
          lessonComponents: Array.from(new Set([...components, 'dialogue_script', 'last_protocol'])),
          questionTypes: Array.from(new Set([...questionTypes, 'scenario'])),
        },
      })
    }
  }

  // RULE 7: Difficulty vs Progression Harmony
  if (difficulty === 'beginner' && progression === 'steep') {
    issues.push({
      id: 'beginner_steep_conflict',
      severity: 'warning',
      field: 'difficultyProgression',
      message: 'Steep difficulty escalation may overwhelm foundational beginner learners.',
      message_ar: 'التصعيد الحاد في الصعوبة قد يرهق المتدربين المبتدئين.',
      suggestedAction: 'Change progression to progressive or flat.',
      suggestedAction_ar: 'تغيير التدرج إلى تدريجي منتظم.',
      patch: {
        difficultyProgression: 'progressive',
      },
    })
  }

  // Calculate consistency score
  let score = 100
  issues.forEach((issue) => {
    if (issue.severity === 'critical') score -= 25
    else if (issue.severity === 'warning') score -= 12
    else score -= 5
  })
  score = Math.max(20, Math.min(100, score))

  const isConsistent = issues.filter((i) => i.severity === 'critical').length === 0

  let summary = 'Optimal alignment across all learning design parameters.'
  let summary_ar = 'توافق تعليمي مثالي عبر كافة إعدادات وهيكل الدورة.'

  if (issues.length > 0) {
    const critCount = issues.filter((i) => i.severity === 'critical').length
    if (critCount > 0) {
      summary = `${critCount} critical design conflict(s) detected across tabs.`
      summary_ar = `تم رصد ${critCount} تعارض في إعدادات التصميم التعليمي.`
    } else {
      summary = `${issues.length} suggested pedagogical enhancement(s) available.`
      summary_ar = `يوجد ${issues.length} تحسين تعليمي مقترح لضمان التوافق.`
    }
  }

  return {
    isConsistent,
    score,
    issues,
    summary,
    summary_ar,
  }
}

/**
 * Automatically harmonizes all conflicting or unaligned properties in a config object.
 */
export function harmonizeCourseConfig(
  config: FullCourseGenerationConfig
): FullCourseGenerationConfig {
  let harmonized = { ...config }
  const report = checkCourseConfigConsistency(harmonized)

  report.issues.forEach((issue) => {
    harmonized = {
      ...harmonized,
      ...issue.patch,
      granularity: {
        ...harmonized.granularity,
        ...(issue.patch.granularity || {}),
      },
      quizConfig: {
        ...harmonized.quizConfig,
        ...(issue.patch.quizConfig || {}),
      },
      aiControls: {
        ...harmonized.aiControls,
        ...(issue.patch.aiControls || {}),
      },
    }
  })

  return harmonized
}

/**
 * Returns smart preset defaults when switching Generation Mode
 */
export function getSmartModePreset(
  mode: CourseGenerationMode
): Partial<FullCourseGenerationConfig> {
  switch (mode) {
    case 'full_course':
      return {
        generationMode: 'full_course',
        courseType: 'professional',
        instructionalStrategy: 'explain_example_practice',
        difficulty: 'intermediate',
        difficultyProgression: 'progressive',
        granularity: {
          moduleCount: 4,
          lessonsPerModule: 3,
          lessonDuration: 15,
        },
        overallDepth: 'comprehensive',
        depthConfig: {
          theory: 3,
          examples: 4,
          practical: 5,
          caseStudies: 4,
          assessments: 4,
        },
        defaultLessonTemplate: 'sop_standard',
        lessonComponents: ['intro', 'objectives', 'step_procedure', 'checklist', 'pro_tips', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 5,
          passingScore: 85,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['mcq', 'scenario', 'ordering'],
      }

    case 'topic_based':
      return {
        generationMode: 'topic_based',
        courseType: 'professional',
        instructionalStrategy: 'case_based',
        difficulty: 'intermediate',
        difficultyProgression: 'progressive',
        granularity: {
          moduleCount: 3,
          lessonsPerModule: 3,
          lessonDuration: 15,
        },
        overallDepth: 'standard',
        depthConfig: {
          theory: 2,
          examples: 5,
          practical: 4,
          caseStudies: 5,
          assessments: 3,
        },
        defaultLessonTemplate: 'scenario_solving',
        lessonComponents: ['objectives', 'step_procedure', 'dialogue_script', 'scenario_branch', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 4,
          passingScore: 85,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['scenario', 'mcq', 'ordering'],
      }

    case 'document_based':
      return {
        generationMode: 'document_based',
        courseType: 'compliance',
        instructionalStrategy: 'traditional',
        difficulty: 'intermediate',
        difficultyProgression: 'flat',
        granularity: {
          moduleCount: 3,
          lessonsPerModule: 3,
          lessonDuration: 15,
        },
        overallDepth: 'comprehensive',
        depthConfig: {
          theory: 4,
          examples: 3,
          practical: 5,
          caseStudies: 2,
          assessments: 5,
        },
        defaultLessonTemplate: 'sop_standard',
        lessonComponents: ['objectives', 'step_procedure', 'checklist', 'last_protocol', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 5,
          passingScore: 90,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: true,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['mcq', 'ordering', 'matching'],
      }

    case 'course_remix':
      return {
        generationMode: 'course_remix',
        courseType: 'corporate',
        instructionalStrategy: 'scenario_based',
        difficulty: 'intermediate',
        difficultyProgression: 'progressive',
        granularity: {
          moduleCount: 3,
          lessonsPerModule: 3,
          lessonDuration: 10,
        },
        overallDepth: 'standard',
        depthConfig: {
          theory: 2,
          examples: 4,
          practical: 4,
          caseStudies: 4,
          assessments: 3,
        },
        defaultLessonTemplate: 'case_study',
        lessonComponents: ['objectives', 'step_procedure', 'dialogue_script', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 4,
          passingScore: 85,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['mcq', 'scenario'],
      }

    case 'outline_only':
      return {
        generationMode: 'outline_only',
        courseType: 'management',
        instructionalStrategy: 'case_based',
        difficulty: 'advanced',
        difficultyProgression: 'progressive',
        granularity: {
          moduleCount: 4,
          lessonsPerModule: 3,
          lessonDuration: 15,
        },
        overallDepth: 'standard',
        depthConfig: {
          theory: 3,
          examples: 3,
          practical: 3,
          caseStudies: 3,
          assessments: 3,
        },
        defaultLessonTemplate: 'sop_standard',
        lessonComponents: ['objectives', 'step_procedure', 'summary'],
        quizConfig: {
          placement: 'none',
          questionCount: 0,
          passingScore: 85,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: false,
        },
        questionTypes: ['mcq'],
      }

    case 'module_generation':
      return {
        generationMode: 'module_generation',
        courseType: 'professional',
        instructionalStrategy: 'hands_on',
        difficulty: 'intermediate',
        difficultyProgression: 'progressive',
        granularity: {
          moduleCount: 1,
          lessonsPerModule: 3,
          lessonDuration: 15,
        },
        overallDepth: 'comprehensive',
        depthConfig: {
          theory: 2,
          examples: 4,
          practical: 5,
          caseStudies: 3,
          assessments: 4,
        },
        defaultLessonTemplate: 'sop_standard',
        lessonComponents: ['objectives', 'step_procedure', 'checklist', 'pro_tips', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 4,
          passingScore: 85,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['mcq', 'scenario'],
      }

    case 'lesson_generation':
      return {
        generationMode: 'lesson_generation',
        courseType: 'professional',
        instructionalStrategy: 'explain_example_practice',
        difficulty: 'intermediate',
        difficultyProgression: 'flat',
        granularity: {
          moduleCount: 1,
          lessonsPerModule: 1,
          lessonDuration: 10,
        },
        overallDepth: 'focused',
        depthConfig: {
          theory: 2,
          examples: 4,
          practical: 5,
          caseStudies: 2,
          assessments: 2,
        },
        defaultLessonTemplate: 'sop_standard',
        lessonComponents: ['objectives', 'step_procedure', 'checklist', 'pro_tips', 'summary'],
        quizConfig: {
          placement: 'none',
          questionCount: 0,
          passingScore: 85,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: false,
        },
        questionTypes: ['mcq'],
      }

    case 'quiz_generation':
      return {
        generationMode: 'quiz_generation',
        courseType: 'compliance',
        instructionalStrategy: 'socratic',
        difficulty: 'intermediate',
        difficultyProgression: 'adaptive',
        granularity: {
          moduleCount: 1,
          lessonsPerModule: 1,
          lessonDuration: 5,
        },
        overallDepth: 'focused',
        quizConfig: {
          placement: 'per_module',
          questionCount: 5,
          passingScore: 85,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: true,
          adaptiveDifficulty: true,
          distractorQuality: 'expert_plausible',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['mcq', 'scenario', 'ordering', 'matching'],
      }

    case 'assessment_generation':
      return {
        generationMode: 'assessment_generation',
        courseType: 'management',
        instructionalStrategy: 'scenario_based',
        difficulty: 'advanced',
        difficultyProgression: 'adaptive',
        granularity: {
          moduleCount: 1,
          lessonsPerModule: 1,
          lessonDuration: 30,
        },
        overallDepth: 'expert',
        quizConfig: {
          placement: 'final_exam',
          questionCount: 20,
          passingScore: 85,
          maxAttempts: 2,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: true,
          adaptiveDifficulty: true,
          distractorQuality: 'expert_plausible',
          includeHints: false,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['mcq', 'scenario', 'ordering', 'matching', 'fill_blank'],
      }

    case 'course_improvement':
      return {
        generationMode: 'course_improvement',
        courseType: 'corporate',
        instructionalStrategy: 'case_based',
        difficulty: 'advanced',
        difficultyProgression: 'progressive',
        granularity: {
          moduleCount: 4,
          lessonsPerModule: 3,
          lessonDuration: 15,
        },
        overallDepth: 'expert',
        depthConfig: {
          theory: 3,
          examples: 4,
          practical: 5,
          caseStudies: 5,
          assessments: 4,
        },
        defaultLessonTemplate: 'checklist_audit',
        lessonComponents: ['objectives', 'step_procedure', 'checklist', 'dialogue_script', 'last_protocol', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 5,
          passingScore: 85,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['mcq', 'scenario', 'ordering'],
      }

    default:
      return {}
  }
}

/**
 * Returns smart preset defaults when switching Course Type
 */
export function getSmartCourseTypePreset(
  courseType: CourseType
): Partial<FullCourseGenerationConfig> {
  switch (courseType) {
    case 'microlearning':
      return {
        courseType: 'microlearning',
        instructionalStrategy: 'explain_example_practice',
        difficulty: 'intermediate',
        difficultyProgression: 'flat',
        granularity: {
          moduleCount: 2,
          lessonsPerModule: 2,
          lessonDuration: 5,
        },
        overallDepth: 'quick',
        depthConfig: {
          theory: 1,
          examples: 3,
          practical: 4,
          caseStudies: 1,
          assessments: 3,
        },
        defaultLessonTemplate: 'sop_standard',
        lessonComponents: ['objectives', 'step_procedure', 'checklist', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 3,
          passingScore: 80,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
      }

    case 'compliance':
      return {
        courseType: 'compliance',
        instructionalStrategy: 'traditional',
        difficulty: 'challenging',
        difficultyProgression: 'flat',
        granularity: {
          moduleCount: 3,
          lessonsPerModule: 3,
          lessonDuration: 15,
        },
        overallDepth: 'comprehensive',
        depthConfig: {
          theory: 4,
          examples: 3,
          practical: 5,
          caseStudies: 3,
          assessments: 5,
        },
        defaultLessonTemplate: 'sop_standard',
        lessonComponents: ['objectives', 'step_procedure', 'checklist', 'last_protocol', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 5,
          passingScore: 90,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: true,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['mcq', 'scenario', 'ordering'],
      }

    case 'soft_skills':
    case 'guest_relations':
      return {
        courseType,
        instructionalStrategy: 'scenario_based',
        difficulty: 'intermediate',
        difficultyProgression: 'progressive',
        granularity: {
          moduleCount: 3,
          lessonsPerModule: 3,
          lessonDuration: 15,
        },
        overallDepth: 'comprehensive',
        depthConfig: {
          theory: 2,
          examples: 5,
          practical: 5,
          caseStudies: 5,
          assessments: 4,
        },
        defaultLessonTemplate: 'scenario_solving',
        lessonComponents: ['objectives', 'dialogue_script', 'scenario_branch', 'last_protocol', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 4,
          passingScore: 85,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['scenario', 'mcq', 'ordering'],
      }

    case 'onboarding':
    case 'orientation':
      return {
        courseType,
        instructionalStrategy: 'storytelling',
        difficulty: 'beginner',
        difficultyProgression: 'progressive',
        granularity: {
          moduleCount: 3,
          lessonsPerModule: 3,
          lessonDuration: 10,
        },
        overallDepth: 'standard',
        depthConfig: {
          theory: 3,
          examples: 4,
          practical: 3,
          caseStudies: 3,
          assessments: 3,
        },
        defaultLessonTemplate: 'sop_standard',
        lessonComponents: ['intro', 'objectives', 'step_procedure', 'pro_tips', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 4,
          passingScore: 80,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['mcq', 'scenario'],
      }

    case 'management':
    case 'executive':
      return {
        courseType,
        instructionalStrategy: 'case_based',
        difficulty: 'advanced',
        difficultyProgression: 'progressive',
        granularity: {
          moduleCount: 4,
          lessonsPerModule: 3,
          lessonDuration: 20,
        },
        overallDepth: 'expert',
        depthConfig: {
          theory: 4,
          examples: 4,
          practical: 5,
          caseStudies: 5,
          assessments: 4,
        },
        defaultLessonTemplate: 'case_study',
        lessonComponents: ['objectives', 'step_procedure', 'dialogue_script', 'scenario_branch', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 5,
          passingScore: 85,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: true,
          distractorQuality: 'expert_plausible',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['scenario', 'mcq', 'ordering', 'matching'],
      }

    case 'technical':
    case 'culinary':
      return {
        courseType,
        instructionalStrategy: 'hands_on',
        difficulty: 'advanced',
        difficultyProgression: 'progressive',
        granularity: {
          moduleCount: 4,
          lessonsPerModule: 3,
          lessonDuration: 15,
        },
        overallDepth: 'comprehensive',
        depthConfig: {
          theory: 2,
          examples: 4,
          practical: 5,
          caseStudies: 3,
          assessments: 4,
        },
        defaultLessonTemplate: 'sop_standard',
        lessonComponents: ['objectives', 'step_procedure', 'checklist', 'pro_tips', 'summary'],
        quizConfig: {
          placement: 'per_module',
          questionCount: 5,
          passingScore: 85,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          useQuestionPools: false,
          adaptiveDifficulty: false,
          distractorQuality: 'high',
          includeHints: true,
          includeExplanations: true,
          storeInQuestionBank: true,
        },
        questionTypes: ['mcq', 'ordering', 'matching'],
      }

    default:
      return {}
  }
}

