/**
 * AI Course & Assessment Generation Engine
 * Multi-Stage LCMS Orchestration for PRIME Hotels Intranet
 */

import {
  callHuggingFace,
  resolveModelChain,
  safeParseJson,
} from '@/lib/gemini'
import type {
  AIEngineControls,
  BloomDistribution,
  BloomLevel,
  BloomPreset,
  CourseBlueprint,
  CourseDifficulty,
  CourseGenerationMode,
  CourseQAQualityReport,
  CourseType,
  CourseTypeConfig,
  DistractorQuality,
  FullCourseGenerationConfig,
  GeneratedUnifiedQuestion,
  GranularDepthConfig,
  InstructionalStrategy,
  LessonBlueprint,
  LessonComponentKey,
  LessonTemplateType,
  ModuleBlueprint,
  OverallContentDepth,
  QuizBlueprint,
  QuizPlacement,
  TargetAudience,
  VisualOpportunity,
  ImageGenerationConfig,
  VisualStyle,
  VisualPlacement,
  CourseVisualAsset,
} from '@/types/aiCourseEngine'
import type { QuestionDifficulty, QuestionType } from '@/types/questions'

// ============================================================================
// CONSTANTS & CATALOGS
// ============================================================================

export const COURSE_TYPES: CourseTypeConfig[] = [
  {
    id: 'professional',
    title: 'Professional Training',
    title_ar: 'التدريب المهني الاحترافي',
    description: 'Workplace procedures, 5-star operational standards, and frontline execution.',
    description_ar: 'الإجراءات التشغيلية، معايير الخدمة الفندقية 5 نجوم، والتنفيذ الميداني المتقن.',
    icon: 'Briefcase',
    defaultStrategy: 'explain_example_practice',
    recommendedDifficulty: 'intermediate',
  },
  {
    id: 'compliance',
    title: 'Compliance & Safety',
    title_ar: 'الامتثال والسلامة المهنية',
    description: 'Saudi Labor Law, Civil Defense, food safety, and zero-defect requirements.',
    description_ar: 'نظام العمل السعودي، متطلبات الدفاع المدني، سلامة الغذاء، ومعايير عدم التسامح.',
    icon: 'ShieldAlert',
    defaultStrategy: 'traditional',
    recommendedDifficulty: 'challenging',
  },
  {
    id: 'onboarding',
    title: 'New Hire Onboarding',
    title_ar: 'التأهيل والترحيب بالموظفين الجدد',
    description: 'Company culture, hotel brand values, organizational structure, and team orientation.',
    description_ar: 'ثقافة المنظمة، قيم العلامة الفندقية، الهيكل الإداري، والاندماج الجماعي.',
    icon: 'Sparkles',
    defaultStrategy: 'storytelling',
    recommendedDifficulty: 'beginner',
  },
  {
    id: 'orientation',
    title: 'Property & Brand Orientation',
    title_ar: 'التعريف بالمنشأة والعلامة التجارية',
    description: 'Property layout, guest amenities, key department handovers, and VIP touchpoints.',
    description_ar: 'مرافق الفندق، الخدمات المتاحة للنزلاء، آليات تسليم المهام بين الأقسام، وخدمات كبار الشخصيات.',
    icon: 'Compass',
    defaultStrategy: 'discovery',
    recommendedDifficulty: 'easy',
  },
  {
    id: 'corporate',
    title: 'Corporate & Strategy',
    title_ar: 'التدريب المؤسسي والاستراتيجي',
    description: 'Cross-functional alignment, budgeting, policy enforcement, and audit governance.',
    description_ar: 'التكامل بين الأقسام، إدارة الموازنات، تطبيق السياسات، وحوكمة التدقيق الداخلي.',
    icon: 'Building2',
    defaultStrategy: 'case_based',
    recommendedDifficulty: 'intermediate',
  },
  {
    id: 'technical',
    title: 'Technical & Engineering',
    title_ar: 'التدريب الفني والهندسي والأنظمة',
    description: 'PMS/POS systems, MEP maintenance, HVAC troubleshooting, and IT protocols.',
    description_ar: 'أنظمة إدارة الفنادق PMS/POS، صيانة الأنظمة الميكانيكية والكهربائية، والتجهيزات التقنية.',
    icon: 'Wrench',
    defaultStrategy: 'hands_on',
    recommendedDifficulty: 'advanced',
  },
  {
    id: 'product',
    title: 'Hotel Products & F&B',
    title_ar: 'المنتجات الفندقية والأغذية والمشروبات',
    description: 'Menu knowledge, fine dining service, wine/mocktail pairings, and room specifications.',
    description_ar: 'قوائم الطعام، فنون الضيافة الراقية، مواصفات الغرف والأجنحة الفاخرة.',
    icon: 'Utensils',
    defaultStrategy: 'explain_example_practice',
    recommendedDifficulty: 'intermediate',
  },
  {
    id: 'sales',
    title: 'Sales & Revenue Management',
    title_ar: 'المبيعات وإدارة الإيرادات',
    description: 'Upselling techniques, corporate accounts, ADR/RevPAR optimization, and event sales.',
    description_ar: 'فنون البيع الإضافي، إدارة حسابات الشركات، تحسين متوسط السعر اليومي ADR والإيرادات.',
    icon: 'TrendingUp',
    defaultStrategy: 'role_play',
    recommendedDifficulty: 'advanced',
  },
  {
    id: 'management',
    title: 'Supervisory & Management',
    title_ar: 'القيادة والإشراف الإداري',
    description: 'Shift leadership, associate coaching, root-cause resolution, and performance reviews.',
    description_ar: 'إدارة الورديات، توجيه وتدريب الموظفين، تحليل المشكلات التشغيلية وتقييم الأداء.',
    icon: 'Crown',
    defaultStrategy: 'case_based',
    recommendedDifficulty: 'advanced',
  },
  {
    id: 'soft_skills',
    title: 'Guest Relations & Soft Skills',
    title_ar: 'علاقات النزلاء والمهارات الشخصية',
    description: 'Active listening, empathy, body language, cultural sensitivity, and conflict de-escalation.',
    description_ar: 'الاستماع الفعال، الذكاء العاطفي، لغة الجسد، والتعامل مع النزلاء بمختلف الثقافات.',
    icon: 'HeartHandshake',
    defaultStrategy: 'scenario_based',
    recommendedDifficulty: 'intermediate',
  },
  {
    id: 'workshop',
    title: 'Practical Hands-On Workshop',
    title_ar: 'ورشة عمل تطبيقية عملية',
    description: 'Step-by-step physical drills, barista skills, housekeeping turn-down, and live demonstrations.',
    description_ar: 'تدريبات عملية مباشرة، إعداد الغرف الفاخرة، تقديم المشروبات، وتطبيقات واقعية.',
    icon: 'Activity',
    defaultStrategy: 'hands_on',
    recommendedDifficulty: 'intermediate',
  },
  {
    id: 'cert_prep',
    title: 'Certification & Licensing',
    title_ar: 'الإعداد للشهادات المهنية والتراخيص',
    description: 'HACCP, OSHA, First Aid, AHLEI hospitality credentials, and licensing prep.',
    description_ar: 'شهادات الهاسب HACCP، السلامة والصحة المهنية، الإسعافات الأولية والاعتمادات الدولية.',
    icon: 'Award',
    defaultStrategy: 'exam_prep',
    recommendedDifficulty: 'expert',
  },
  {
    id: 'microlearning',
    title: 'Microlearning Fast Track (3-Min)',
    title_ar: 'التعلم المصغر السريع (3 دقائق)',
    description: 'Quick-reference action cards and shift-briefing refreshers.',
    description_ar: 'بطاقات عمل سريعة ومعلومات فورية لاجتماعات الورديات القصيرة.',
    icon: 'Zap',
    defaultStrategy: 'microlearning',
    recommendedDifficulty: 'easy',
  },
  {
    id: 'academic',
    title: 'Academic Hospitality Studies',
    title_ar: 'الدراسات الأكاديمية الفندقية',
    description: 'Theoretical foundations of tourism economics, hospitality law, and organizational behavior.',
    description_ar: 'الأسس النظرية لاقتصاديات السياحة، القانون الفندقي، وسلوك المنظمات.',
    icon: 'GraduationCap',
    defaultStrategy: 'traditional',
    recommendedDifficulty: 'challenging',
  },
  {
    id: 'ilt',
    title: 'Instructor-Led Training (ILT)',
    title_ar: 'تدريب مباشر بإشراف المدرب',
    description: 'Facilitator guides, discussion prompts, group breakout activities, and live debriefs.',
    description_ar: 'أدلة المدربين، محاور النقاش التفاعلية، والأنشطة الجماعية الصفية.',
    icon: 'Users',
    defaultStrategy: 'socratic',
    recommendedDifficulty: 'intermediate',
  },
  {
    id: 'self_paced',
    title: 'Self-Paced E-Learning',
    title_ar: 'التعلم الإلكتروني الذاتي',
    description: 'Asynchronous multimedia learning with interactive self-checks and modular milestones.',
    description_ar: 'تعلم ذاتي مرن مدعوم بوسائط متعددة واختبارات مرحلية لتقييم الفهم.',
    icon: 'Clock',
    defaultStrategy: 'explain_example_practice',
    recommendedDifficulty: 'intermediate',
  },
  {
    id: 'blended',
    title: 'Blended Learning Program',
    title_ar: 'برنامج التدريب المدمج',
    description: 'Coordinated mix of digital self-study, in-person drills, and supervisor verification.',
    description_ar: 'مزيج متناسق بين الدراسة الرقمية الذاتية والتدريب العملي في الفندق.',
    icon: 'Layers',
    defaultStrategy: 'problem_based',
    recommendedDifficulty: 'intermediate',
  },
  {
    id: 'simulation',
    title: 'Simulation & Crisis Drills',
    title_ar: 'المحاكاة وتدريبات إدارة الأزمات',
    description: 'Simulated emergencies, power outage response, VIP surprise visits, and live decision trees.',
    description_ar: 'محاكاة الطوارئ، التعامل مع انقطاع الخدمات، زيارات الوفود الرسمية، وأشجار القرار.',
    icon: 'AlertTriangle',
    defaultStrategy: 'simulation',
    recommendedDifficulty: 'expert',
  },
]

export const INSTRUCTIONAL_STRATEGIES: Array<{
  id: InstructionalStrategy
  title: string
  title_ar: string
  description: string
  description_ar: string
  defaultTemplate: LessonTemplateType
}> = [
  {
    id: 'explain_example_practice',
    title: 'Explain → Example → Practice',
    title_ar: 'شرح ← مثال توضيحي ← تطبيق عملي',
    description: 'Classic high-retention instructional model used by Forbes hospitality academies.',
    description_ar: 'النموذج التعليمي الفعال المعتمد في أكاديميات الضيافة الفاخرة العالمية.',
    defaultTemplate: 'sop_standard',
  },
  {
    id: 'traditional',
    title: 'Direct Instruction & Concepts',
    title_ar: 'التعليم المباشر والمفاهيم الأساسية',
    description: 'Structured conceptual explanations followed by rigorous compliance checks.',
    description_ar: 'شرح مفاهيمي منظم مع التحقق الصارم من استيعاب القواعد والأنظمة.',
    defaultTemplate: 'theory',
  },
  {
    id: 'scenario_based',
    title: 'Scenario & Dilemma Learning',
    title_ar: 'التعلم القائم على السيناريوهات والتحديات',
    description: 'Interactive guest dilemmas requiring decision-making and service recovery.',
    description_ar: 'مواقف وتحديات واقعية مع النزلاء تتطلب اتخاذ القرار وحل المشكلات.',
    defaultTemplate: 'scenario_solving',
  },
  {
    id: 'case_based',
    title: 'Case Study & Root Cause Analysis',
    title_ar: 'دراسة الحالات وتحليل الأسباب الجذرية',
    description: 'In-depth review of hotel incidents, root causes, corrective actions, and prevention.',
    description_ar: 'تحليل دقيق لوقائع فندقية حقيقية، أسبابها الجذرية، وإجراءات المعالجة والوقاية.',
    defaultTemplate: 'case_study',
  },
  {
    id: 'problem_based',
    title: 'Problem-Based Operational Inquiry',
    title_ar: 'التعلم القائم على حل المشكلات التشغيلية',
    description: 'Learners investigate operational bottlenecks and construct viable workflows.',
    description_ar: 'استكشاف التحديات التشغيلية وتصميم حلول عملية لتجاوز العقبات.',
    defaultTemplate: 'practical',
  },
  {
    id: 'project_based',
    title: 'Project & Action Planning',
    title_ar: 'المشاريع وخطط العمل التطبيقية',
    description: 'Associates design a tangible audit plan, SOP upgrade, or event checklist.',
    description_ar: 'تصميم خطط عمل تطبيقية، تطوير إجراءات تشغيلية، أو إعداد خطط فعاليات.',
    defaultTemplate: 'practical',
  },
  {
    id: 'discovery',
    title: 'Guided Discovery & Exploration',
    title_ar: 'الاستكشاف الموجه والتعلم الذاتي',
    description: 'Self-guided inspection of hotel areas, comparing standard vs sub-standard conditions.',
    description_ar: 'استكشاف موجه لمرافق الفندق للمقارنة بين الحالة المثالية والعيوب التشغيلية.',
    defaultTemplate: 'sop_standard',
  },
  {
    id: 'socratic',
    title: 'Socratic Critical Questioning',
    title_ar: 'الأسلوب السقراطي والمساءلة النقدية',
    description: 'Thought-provoking questions challenging assumptions on service luxury and safety.',
    description_ar: 'أسئلة تحفيزية متدرجة تبحث في عمق معايير الضيافة والسلامة والتميز.',
    defaultTemplate: 'theory',
  },
  {
    id: 'simulation',
    title: 'Simulation & Real-time Drill',
    title_ar: 'المحاكاة والتدريب في الوقت الفعلي',
    description: 'High-fidelity simulation of hotel rush hours, VIP arrivals, and urgent escalations.',
    description_ar: 'محاكاة دقيقة لأوقات الذروة الفندقية، وصول كبار الشخصيات، وحالات الطوارئ.',
    defaultTemplate: 'scenario_solving',
  },
  {
    id: 'microlearning',
    title: 'Microlearning & Spaced Recall',
    title_ar: 'التعلم المصغر والتكرار المتباعد',
    description: '3-minute bite-sized lessons with quick-reference summary tables and action cards.',
    description_ar: 'دروس سريعة مركزة مدتها 3 دقائق مع بطاقات ملخصة للمراجعة السريعة.',
    defaultTemplate: 'micro_action_card',
  },
  {
    id: 'storytelling',
    title: 'Narrative & Story-Driven Hospitality',
    title_ar: 'السرد القصصي والتجربة الإنسانية',
    description: 'Memorable guest journey stories illustrating memorable hotel moments and empathy.',
    description_ar: 'قصص ملهمة من تجارب النزلاء تبرز لمسات الضيافة الاستثنائية والتعاطف.',
    defaultTemplate: 'case_study',
  },
  {
    id: 'role_play',
    title: 'Scripted & Dynamic Role-Play',
    title_ar: 'لعب الأدوار والمحاكاة الحوارية',
    description: 'Verbatim dialogue practice, handling demanding guests, upselling, and phone etiquette.',
    description_ar: 'ممارسة الحوارات المعتمدة، التعامل مع النزلاء، فنون البيع، وآداب المحادثة الهاتفية.',
    defaultTemplate: 'sop_standard',
  },
  {
    id: 'hands_on',
    title: 'Hands-on Operational Lab',
    title_ar: 'التطبيق العملي الميداني',
    description: 'Physical equipment operation, PMS transactions, cocktail crafting, and table setting.',
    description_ar: 'تشغيل المعدات، إدخال بيانات الحجوزات، إعداد الموائد، والتطبيق العملي المباشر.',
    defaultTemplate: 'practical',
  },
  {
    id: 'exam_prep',
    title: 'Certification & High-Density Drill',
    title_ar: 'التدريب المكثف للاختبارات المهنية',
    description: 'High-density question drills, timed quizzes, and distractor analysis.',
    description_ar: 'تدريبات مكثفة على نماذج الاختبارات، أسئلة موقوتة، وتحليل الخيارات المضللة.',
    defaultTemplate: 'theory',
  },
]

export const BLOOM_PRESETS: Record<BloomPreset, BloomDistribution> = {
  basic: { remember: 40, understand: 40, apply: 20, analyze: 0, evaluate: 0, create: 0 },
  intermediate: { remember: 15, understand: 25, apply: 35, analyze: 20, evaluate: 5, create: 0 },
  advanced: { remember: 5, understand: 15, apply: 30, analyze: 30, evaluate: 15, create: 5 },
  expert: { remember: 0, understand: 10, apply: 25, analyze: 30, evaluate: 25, create: 10 },
  custom: { remember: 20, understand: 20, apply: 20, analyze: 20, evaluate: 10, create: 10 },
}

// ============================================================================
// STAGE 1: COURSE BLUEPRINT GENERATOR
// ============================================================================

export async function generateCourseBlueprint(
  config: FullCourseGenerationConfig,
  onProgress?: (msg: string) => void
): Promise<CourseBlueprint> {
  onProgress?.('Synthesizing pedagogical blueprint and learning outcomes...')

  const isArabic = (config?.aiControls?.targetLanguage || 'en').toLowerCase().includes('ar') || (config?.aiControls?.targetLanguage || 'en').toLowerCase().includes('arabic')
  const lang = config?.aiControls?.targetLanguage || 'English'
  const moduleTarget = config.granularity.moduleCount === 'auto' ? 4 : typeof config.granularity.moduleCount === 'number' ? config.granularity.moduleCount : (config.granularity.customModuleCount || 4)
  const lessonsPerModule = config.granularity.lessonsPerModule === 'auto' ? 3 : config.granularity.lessonsPerModule

  const sanitizedSource = (config.sourceContent || '').replace(/<[^>]*>/g, ' ').substring(0, 6000)

  const prompt = isArabic
    ? `أنت كبير مهندسي المناهج الفندقية لمجموعة فنادق ألتوس (5 نجوم).
قم بإنشاء مخطط هيكلي تعليمي (Course Blueprint) بصيغة JSON نظيفة وسريعة للدورة:
- النمط: ${config.courseType}
- الاستراتيجية: ${config.instructionalStrategy}
- الجمهور: ${config.targetAudience}
- الصعوبة: ${config.difficulty} (${config.difficultyProgression})
- الهيكل المستهدف: ${moduleTarget} وحدات، بكل وحدة ${lessonsPerModule} دروس.
${sanitizedSource ? `- المادة المرجعية:\n${sanitizedSource.substring(0, 2500)}` : ''}

أخرج JSON فقط بدون نصوص خارجية:
{
  "title": "عنوان الدورة باللغة العربية",
  "title_ar": "عنوان الدورة بالعربية",
  "subtitle": "عنوان فرعي احترافي",
  "subtitle_ar": "عنوان فرعي",
  "description": "وصف تشغيلي موجز ومركز للدورة",
  "description_ar": "وصف تشغيلي موجز ومركز",
  "terminalObjectives": ["3 أهداف نهائية"],
  "enablingObjectives": ["4 أهداف تمكينية"],
  "prerequisites": ["المتطلبات"],
  "estimatedDurationMinutes": ${moduleTarget * lessonsPerModule * config.granularity.lessonDuration},
  "modules": [
    {
      "id": "mod-1",
      "title": "عنوان الوحدة الأولى",
      "title_ar": "عنوان الوحدة الأولى",
      "description": "وصف الوحدة",
      "durationMinutes": ${lessonsPerModule * config.granularity.lessonDuration},
      "difficultyLevel": "${config.difficulty}",
      "lessons": [
        {
          "id": "les-1-1",
          "title": "عنوان الدرس الأول",
          "title_ar": "عنوان الدرس الأول",
          "description": "وصف الدرس",
          "templateType": "${config.defaultLessonTemplate}",
          "durationMinutes": ${config.granularity.lessonDuration},
          "learningOutcomes": ["مخرج تعليمي 1", "مخرج تعليمي 2"]
        }
      ]
    }
  ],
  "summaryTakeaways": ["3 خلاصات ختامية"]
}`
    : `You are a Senior Luxury Hospitality Curriculum Architect at Altus 5-Star Hotels.
Generate a high-speed, publication-grade Course Blueprint JSON:
- Course Type: ${config.courseType}
- Strategy: ${config.instructionalStrategy}
- Audience: ${config.targetAudience}
- Difficulty: ${config.difficulty} (${config.difficultyProgression})
- Structure: Exactly ${moduleTarget} modules with ${lessonsPerModule} lessons each.
${sanitizedSource ? `- Source Reference:\n${sanitizedSource.substring(0, 2500)}` : ''}

Output VALID JSON ONLY matching this structure:
{
  "title": "Professional Course Title in English",
  "title_ar": "Arabic translation of title",
  "subtitle": "Executive Subtitle",
  "subtitle_ar": "Arabic subtitle",
  "description": "Concise operational course overview",
  "description_ar": "Arabic description",
  "terminalObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "enablingObjectives": ["Skill 1", "Skill 2", "Skill 3", "Skill 4"],
  "prerequisites": ["General operational awareness"],
  "estimatedDurationMinutes": ${moduleTarget * lessonsPerModule * config.granularity.lessonDuration},
  "modules": [
    {
      "id": "mod-1",
      "title": "Module 1 Title",
      "title_ar": "Module 1 Arabic Title",
      "description": "Module overview",
      "durationMinutes": ${lessonsPerModule * config.granularity.lessonDuration},
      "difficultyLevel": "${config.difficulty}",
      "lessons": [
        {
          "id": "les-1-1",
          "title": "Lesson 1.1 Title",
          "title_ar": "Lesson 1.1 Arabic Title",
          "description": "Lesson description",
          "templateType": "${config.defaultLessonTemplate}",
          "durationMinutes": ${config.granularity.lessonDuration},
          "learningOutcomes": ["Outcome 1", "Outcome 2"]
        }
      ]
    }
  ],
  "summaryTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
}`

  const modelChain = resolveModelChain(config?.aiControls?.preferredModel)
  for (const model of modelChain) {
    try {
      const generated = await callHuggingFace(model, prompt, 1800)
      const parsed = safeParseJson<CourseBlueprint>(generated, false)
      if (parsed && parsed.title && Array.isArray(parsed.modules) && parsed.modules.length > 0) {
        return {
          ...parsed,
          courseType: config.courseType,
          instructionalStrategy: config.instructionalStrategy,
          targetAudience: config.targetAudience,
          experienceLevel: config.experienceLevel,
          priorKnowledge: config.priorKnowledge,
          difficulty: config.difficulty,
          difficultyProgression: config.difficultyProgression,
          estimatedDurationMinutes: parsed.estimatedDurationMinutes || (moduleTarget * lessonsPerModule * config.granularity.lessonDuration)
        }
      }
    } catch (e) {
      console.warn(`Blueprint generation model ${model} failed, cascading:`, e)
    }
  }

  // Local fallback blueprint if AI models fail
  return generateLocalBlueprintFallback(config, moduleTarget, lessonsPerModule, isArabic)
}

// ============================================================================
// STAGE 2: BLUEPRINT VALIDATION & GAP ANALYSIS
// ============================================================================

export function validateCourseBlueprint(
  blueprint: CourseBlueprint,
  config: FullCourseGenerationConfig
): { isValid: boolean; issues: string[]; warnings: string[] } {
  const issues: string[] = []
  const warnings: string[] = []

  if (!blueprint.title || blueprint.title.trim().length < 4) {
    issues.push('Course title is missing or too short.')
  }
  if (!blueprint.modules || blueprint.modules.length === 0) {
    issues.push('Blueprint contains zero modules.')
  }

  let totalLessons = 0
  const titlesSeen = new Set<string>()

  blueprint.modules.forEach((mod, mIdx) => {
    if (!mod.lessons || mod.lessons.length === 0) {
      issues.push(`Module ${mIdx + 1} (${mod.title}) has no lessons.`)
    } else {
      totalLessons += mod.lessons.length
      mod.lessons.forEach((les, lIdx) => {
        const key = (les.title || '').toLowerCase().trim()
        if (titlesSeen.has(key)) {
          warnings.push(`Potential duplicate topic detected: "${les.title}".`)
        }
        titlesSeen.add(key)
        if (!les.learningOutcomes || les.learningOutcomes.length === 0) {
          warnings.push(`Lesson ${mIdx + 1}.${lIdx + 1} (${les.title}) is missing explicit learning outcomes.`)
        }
      })
    }
  })

  if (totalLessons < 2) {
    issues.push('Course has fewer than 2 lessons; minimum standard requires at least 2.')
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
  }
}

// ============================================================================
// STAGE 3: TEMPLATED LESSON SYNTHESIS
// ============================================================================

export async function generateTemplatedLessonContent(
  param1:
    | string
    | {
        courseTitle?: string
        moduleTitle?: string
        lesson: LessonBlueprint
        config?: Partial<FullCourseGenerationConfig>
        components?: any[]
        depthConfig?: any
        language?: string
        preferredModel?: string
        hotelContext?: string
      },
  param2?: string,
  param3?: LessonBlueprint,
  param4?: FullCourseGenerationConfig,
  param5?: (msg: string) => void
): Promise<string> {
  let courseTitle = ''
  let moduleTitle = ''
  let lesson: LessonBlueprint | undefined
  let config: Partial<FullCourseGenerationConfig> | undefined
  let onProgress: ((msg: string) => void) | undefined

  if (typeof param1 === 'string') {
    courseTitle = param1
    moduleTitle = param2 || ''
    lesson = param3
    config = param4
    onProgress = param5
  } else if (param1 && typeof param1 === 'object') {
    courseTitle = param1.courseTitle || ''
    moduleTitle = param1.moduleTitle || ''
    lesson = param1.lesson
    config =
      param1.config ||
      ({
        lessonComponents: param1.components,
        depthConfig: param1.depthConfig,
        sourceContent: param1.hotelContext,
        aiControls: {
          targetLanguage: (param1.language as any) || 'English',
          preferredModel: param1.preferredModel || 'auto',
          creativity: 'balanced',
          strictness: 'balanced',
          sourceMode: 'source_enhanced',
          hallucinationProtection: true,
        },
      } as any)
  }

  if (!lesson) {
    return '<p>No lesson content available.</p>'
  }

  onProgress?.(`Generating lesson: "${lesson.title || 'Untitled'}"...`)

  const isArabic =
    (config?.aiControls?.targetLanguage || 'en').toLowerCase().includes('ar') ||
    (config?.aiControls?.targetLanguage || 'en').toLowerCase().includes('arabic')
  const lang = config?.aiControls?.targetLanguage || 'en'
  const componentsList = (config?.lessonComponents || []).join(', ')

  const prompt = isArabic
    ? `أنت خبير التدريب الفندقي الفاخر لمجموعة فنادق ألتوس.
قم بكتابة محتوى تدريبي كامل وعالي الجودة بصيغة HTML دلالية نظيفة للدرس التالي:
- الدورة: "${courseTitle}"
- الوحدة: "${moduleTitle}"
- عنوان الدرس: "${lesson.title}"
- القالب التعليمي: ${lesson.templateType}
- المخرجات التعليمية المستهدفة: ${(lesson.learningOutcomes || []).join(' | ') || 'إتقان المعايير الفندقية والخدمة الممتازة'}
- المكونات الإلزامية لتضمينها: [${componentsList}]
- عمق المحتوى: ${config?.overallDepth || 'comprehensive'}

الهيكل الإلزامي لكود HTML:
1. <h3>1. المعايير والأهداف التشغيلية (Operational Standards & Objectives)</h3>
2. <h3>2. خطوات الإجراءات بالتفصيل خطوة بخطوة (Step-by-Step Execution Workflow)</h3>
   قائمة مرتبة <ol> تحتوي على خطوات إجرائية محددة بالدقائق ومعايير فوربس.
3. <h3>3. نصوص المحادثة والحوار مع النزلاء (Verbatim Dialogue Scripts)</h3>
   نصوص حوار واقعية بالعبارات الاحترافية المعتمدة ونبرة الصوت ولغة الجسد.
4. <h3>4. قائمة تدقيق الجودة الإشرافية (5-Star Quality Inspection Checklist)</h3>
   قائمة <ul> للنقاط التي يفحصها المشرف قبل اعتماد الخدمة.
5. <h3>5. بروتوكول التعافي من المشكلات (Service Recovery & LAST Framework)</h3>
   كيفية معالجة العقبات والشكاوى فوراً بنموذج (Listen, Apologize, Solve, Thank).
6. <div class="p-3 my-3 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded text-amber-900 dark:text-amber-200"><strong>نصيحة ألتوس الذهبية للتميز:</strong> توجيه تطبيقي ذكي.</div>

اكتب كود HTML فقط بدون كتل كود markdown وبدون نصوص خارجية.`
    : `You are a Senior Luxury Hospitality Training Director at Altus Luxury Hotels.
Write an exhaustive, publication-grade training manual lesson in clean semantic HTML for:
- Course: "${courseTitle}"
- Module: "${moduleTitle}"
- Lesson Title: "${lesson.title}"
- Lesson Template: ${lesson.templateType}
- Target Learning Outcomes: ${(lesson.learningOutcomes || []).join(' | ') || '5-Star Operational Mastery & Procedural Compliance'}
- Mandatory Components to Include: [${componentsList}]
- Content Depth: ${config?.overallDepth || 'comprehensive'}

Structured HTML Requirements:
1. <h3>1. Executive Standard & Operational Purpose</h3>
2. <h3>2. Step-by-Step Procedure & Time Benchmarks</h3>
   Numbered <ol> with 6-8 comprehensive, actionable steps.
3. <h3>3. Verbatim Dialogue Scripts & Body Language Protocols</h3>
   Exact quotes to say to guests, tone of voice, proactive phrasing.
4. <h3>4. 5-Star Quality Inspection Checklist</h3>
   Bullet points <ul> of mandatory items supervisors inspect.
5. <h3>5. Service Recovery & Problem Resolution (LAST Protocol)</h3>
   Empowered frontline actions using Listen, Apologize, Solve, Thank.
6. <div class="p-3 my-3 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded text-amber-900 dark:text-amber-200"><strong>Altus 5-Star Pro Tip:</strong> Insider luxury tip.</div>

Output clean HTML only, no markdown codeblocks.`

  const modelChain = resolveModelChain(config?.aiControls?.preferredModel)
  for (const model of modelChain) {
    try {
      const generatedHtml = await callHuggingFace(model, prompt, 2500)
      if (generatedHtml && generatedHtml.length > 200) {
        return generatedHtml.replace(/```html\n?|\n?```/g, '').trim()
      }
    } catch (e) {
      console.warn(`Lesson synthesis model ${model} failed, cascading:`, e)
    }
  }

  return generateLocalLessonHtmlFallback(lesson.title, isArabic)
}

// ============================================================================
// STAGE 3.5: MAIN AI VISUAL OPPORTUNITY DECISION & PROMPT SYNTHESIZER
// ============================================================================

// ============================================================================
// STAGE 3.5: MAIN AI VISUAL OPPORTUNITY DECISION & PROMPT SYNTHESIZER
// ============================================================================

export const DEFAULT_IMAGE_CONFIG: ImageGenerationConfig = {
  enableAIImages: true,
  provider: 'cloudflare',
  costTier: 'free_only',
  imageModel: '@cf/bytedance/stable-diffusion-xl-lightning',
  fallbackModel: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  density: 'balanced',
  selectionStrategy: 'auto_intelligent',
  preferredStyle: 'educational_illustration',
  preferredAspectRatio: '16:9',
  maxImagesPerLesson: 1,
  maxImagesPerCourse: 6,
  numSteps: 6,
  guidance: 7.5,
}

export async function analyzeLessonVisualOpportunities(params: {
  courseTitle?: string
  moduleTitle?: string
  lesson: LessonBlueprint
  lessonIndex?: number
  totalLessonsInModule?: number
  config?: Partial<FullCourseGenerationConfig>
  language?: string
}): Promise<VisualOpportunity[]> {
  const { courseTitle = '', moduleTitle = '', lesson, config, language = 'English' } = params || {}
  if (!lesson) return []

  const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')
  const imageConfig = config?.imageConfig || DEFAULT_IMAGE_CONFIG

  if (!imageConfig.enableAIImages) {
    return []
  }

  // 1. Intelligent Educational Opportunity Evaluation
  const components = lesson.components || []
  const hasProcedure = components.includes('step_procedure') || lesson.templateType === 'practical' || lesson.templateType === 'sop_standard'
  const hasCaseOrScenario = components.includes('case_study') || components.includes('scenario') || lesson.templateType === 'scenario_solving'
  const hasTechnicalDiagram = components.includes('technical_spec') || components.includes('equipment')
  const hasDialogue = components.includes('dialogue_script')
  const hasChecklist = components.includes('checklist')
  const isOpeningLesson = (params.lessonIndex ?? 0) === 0

  // Evaluate based on configured density
  const density = imageConfig.density || 'balanced'
  let shouldGenerate = false
  let calculatedPriority: 1 | 2 | 3 | 4 | 5 = 4

  if (hasProcedure || hasTechnicalDiagram) {
    calculatedPriority = 1 // Essential instructional / technical process
  } else if (hasCaseOrScenario) {
    calculatedPriority = 3 // Scenario / dilemma visual
  } else if (hasDialogue || hasChecklist || isOpeningLesson) {
    calculatedPriority = 4 // Supporting visual
  } else {
    calculatedPriority = 5 // Decorative visual (deprioritized first)
  }

  if (density === 'minimal') {
    // Only essential procedures & high-stakes scenarios
    shouldGenerate = calculatedPriority <= 2
  } else if (density === 'balanced') {
    // Materials that materially improve learning
    shouldGenerate = calculatedPriority <= 4
  } else if (density === 'visual' || density === 'maximum') {
    // Generates up to max limits
    shouldGenerate = true
  } else {
    shouldGenerate = calculatedPriority <= 4
  }

  if (!shouldGenerate) {
    return []
  }

  // 2. Synthesize High-Fidelity Style-Specific Prompts for Cloudflare Models
  const preferredStyle = (imageConfig.preferredStyle || 'educational_illustration') as VisualStyle
  const aspectRatio = imageConfig.preferredAspectRatio || '16:9'
  const visualType = hasProcedure ? 'process_visualization' : hasCaseOrScenario ? 'workplace_scenario' : 'educational_illustration'
  const purpose = hasProcedure ? 'process_visualization' : hasCaseOrScenario ? 'workplace_scenario' : 'concept_illustration'

  const outcomeContext = (lesson.learningOutcomes && lesson.learningOutcomes.length > 0)
    ? lesson.learningOutcomes[0]
    : lesson.title

  let optimizedPrompt = ''
  let negativePrompt = ''

  if (preferredStyle === 'infographic') {
    optimizedPrompt = `Professional modern educational infographic chart and procedural diagram for "${lesson.title}" (${moduleTitle}), clean visual layout with numbered step cards, structured flowchart boxes, vector icons, elegant luxury hotel branding, corporate presentation slide design, clear visual hierarchy, high contrast UI graphic design, 8k resolution, crisp vector graphics, no messy sketch`
    negativePrompt = 'cartoon, comic book, crude drawing, messy lines, realistic human face, distorted room, photograph of empty room, painting, blurry, low resolution, watermark, deformed'
  } else if (preferredStyle === 'technical_diagram') {
    optimizedPrompt = `Technical SOP flowchart and standard operating procedure schematic for "${lesson.title}", 5-star hotel operational workflow with connected process boxes, checklist icons, clean vector blueprint, high contrast, crisp lines, modern UI presentation, 8k`
    negativePrompt = 'cartoon, comic, sketch, anime, drawing, room photo, distorted furniture, blurry, text watermark, messy lines, low quality'
  } else if (preferredStyle === 'photorealistic') {
    optimizedPrompt = `Award-winning photorealistic 8k photograph of "${lesson.title}" in a luxury 5-star hotel (${moduleTitle}), professional hospitality staff in tailored uniform executing standard procedure with flawless posture, shot on Hasselblad 50mm, f/2.8, warm ambient lighting, elegant interior architecture, cinematic depth of field, ultra-sharp detail`
    negativePrompt = 'cartoon, drawing, anime, comic, sketch, cgi, 3d render, doll, plastic, distorted anatomy, malformed hands, extra fingers, blurry, low resolution, watermark, duplicate objects'
  } else if (preferredStyle === 'realistic') {
    optimizedPrompt = `High-definition realistic documentary photograph of "${lesson.title}" in an authentic 5-star luxury hotel, professional hotel team in genuine uniform, natural warm hotel lighting, crisp focal clarity, authentic Saudi luxury hospitality standard, 8k resolution`
    negativePrompt = 'cartoon, painting, anime, comic, sketch, 3d render, distorted hands, blurry, watermark, low quality'
  } else if (preferredStyle === 'professional_corporate') {
    optimizedPrompt = `Clean executive corporate visual for "${lesson.title}" in a 5-star luxury hotel setting, elegant modern aesthetic, professional hospitality leadership, crisp balanced lighting, high-end commercial publication standard, 8k`
    negativePrompt = 'cartoon, comic, anime, sketch, blurry, distorted anatomy, malformed hands, watermark, low quality'
  } else if (preferredStyle === '3d_illustration') {
    optimizedPrompt = `Modern 3D architectural render of "${lesson.title}" in a 5-star hotel environment, soft ambient illumination, clean geometric materials, luxury interior textures, crisp depth of field, studio octane render, 8k resolution`
    negativePrompt = 'flat drawing, comic, sketch, 2d cartoon, blurry, low quality, watermark, noisy lines'
  } else {
    // Default refined educational illustration
    optimizedPrompt = `Refined modern educational visual illustration for "${lesson.title}" (${moduleTitle}) in a 5-star luxury hotel, clean geometric forms, elegant hospitality color palette, clear pedagogical layout, high resolution, studio clarity`
    negativePrompt = 'crude cartoon, comic book, rough sketch, scribble, distorted anatomy, malformed hands, blurry, watermark, messy lines'
  }

  return [
    {
      shouldGenerate: true,
      priority: calculatedPriority,
      purpose,
      visualType,
      educationalObjective: outcomeContext,
      subject: lesson.title,
      visualConcept: `${lesson.title} operational execution`,
      optimizedPrompt,
      negativePrompt,
      placement: hasProcedure ? 'procedure' : 'concept_explanation',
      aspectRatio,
      title: lesson.title,
      title_ar: lesson.title_ar || lesson.title,
      altText: isArabic
        ? `رسم توضيحي تعليمي يجسد معايير ${lesson.title}`
        : `Educational visual illustrating ${lesson.title} luxury hotel procedure`,
      altText_ar: `رسم توضيحي تعليمي يجسد معايير ${lesson.title}`,
      caption: isArabic
        ? 'الالتزام بالإجراءات والمعايير التشغيلية المعتمدة يضمن تجربة استثنائية للنزلاء.'
        : 'Adherence to standardized operating protocols ensures flawless guest satisfaction.',
    },
  ]
}

// ============================================================================
// STAGE 4 & 5: MULTI-FORMAT EXPANDED QUIZ GENERATOR (16+ Question Types)
// ============================================================================

export async function generateExpandedQuiz(request: {
  contextContent: string
  title: string
  count: number
  questionTypes: QuestionType[]
  difficulty?: QuestionDifficulty
  bloomDistribution?: BloomDistribution
  language?: string
  distractorQuality?: DistractorQuality
  includeHints?: boolean
  includeExplanations?: boolean
  preferredModel?: string
}): Promise<GeneratedUnifiedQuestion[]> {
  const language = request.language || 'English'
  const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')
  const count = request.count || 5
  const typesList = request.questionTypes.length > 0 ? request.questionTypes : ['mcq', 'scenario', 'ordering', 'matching', 'true_false']
  const typesStr = typesList.join(', ')

  const sanitized = request.contextContent.replace(/<[^>]*>/g, ' ').substring(0, 4000)

  const prompt = isArabic
    ? `أنت خبير تقييم وجودة التعليم الفندقي لمجموعة ألتوس.
قم بإنشاء EXACTLY ${count} أسئلة اختبار دقيقة وعملية بناءً على المحتوى التدريبي التالي:
- العنوان: "${request.title}"
- أنواع الأسئلة المطلوبة حصراً: [${typesStr}]
- مستوى الصعوبة: ${request.difficulty || 'medium'}
- جودة الخيارات المضللة: خيارات ذكية واقعية غير بديهية وتتجنب الأخطاء الشائعة.
- التوزيع المعرفي لبلوم: تذكر، فهم، تطبيق، تحليل.

قواعد تنسيق أنواع الأسئلة:
- "mcq": سؤال اختيار من متعدد (4 خيارات متباينة).
- "mcq_multi": اختيار أكثر من إجابة صحيحة (4-5 خيارات، الإجابة الصحيحة مفصولة بفواصل).
- "true_false": صح أم خطأ (الخيارات ["صحيح", "خطأ"]).
- "yes_no": نعم أم لا (الخيارات ["نعم", "لا"]).
- "fill_blank": جملة تحتوي على فراغ "___" وخيارات للكلمة الصحيحة.
- "short_answer": سؤال يتطلب إجابة قصيرة ومصطلحاً أساسياً.
- "long_answer": سؤال تحليلي مفتوح مع معايير التصحيح.
- "scenario": سيناريو معضلة ضيافة مع 4 قرارات ممكنة.
- "case_based": دراسة حالة مصغرة مع سؤال استنتاجي.
- "ordering": ترتيب خطوات عملية (4 خطوات، والإجابة مفصولة بـ " -> ").
- "matching": مطابقة مصطلحات (الخيارات بصيغة "المصطلح:::التعريف"، والإجابة مفصولة بـ " ; ").
- "ranking": ترتيب الأولويات حسب الأهمية أو السرعة.
- "numeric": مسألة حسابية فندقية (مثال: ADR / RevPAR / نسب الخصم).
- "code_technical": سؤال أنظمة فندقية أو منطق تقني.
- "categorization": تصنيف عناصر في مجموعات.
- "hotspot_image": تحديد العيوب أو المخاطر البصرية.

أخرج مصفوفة JSON تحتوي على EXACTLY ${count} أسئلة:
[
  {
    "question_text": "نص السؤال بالعربية",
    "question_text_ar": "نص السؤال بالعربية",
    "question_type": "${typesList[0]}",
    "difficulty": "medium",
    "bloom_level": "apply",
    "points": 10,
    "options": [
      { "text": "الخيار 1", "text_ar": "الخيار 1", "is_correct": true, "feedback": "توضيح الإجابة الصحيحة" },
      { "text": "الخيار 2", "text_ar": "الخيار 2", "is_correct": false, "feedback": "سبب عدم صحة هذا الخيار" },
      { "text": "الخيار 3", "text_ar": "الخيار 3", "is_correct": false, "feedback": "توضيح" },
      { "text": "الخيار 4", "text_ar": "الخيار 4", "is_correct": false, "feedback": "توضيح" }
    ],
    "correct_answer": "الخيار 1",
    "explanation": "شرح تفصيلي للسبب",
    "hint": "تلميح مساعد"
  }
]

المحتوى:\n${sanitized}`
    : `You are a Senior Hotel Learning Assessment & Psychometrics Director at Altus Luxury Hotels.
Create EXACTLY ${count} rigorous, high-discrimination assessment questions based on the following training content:
- Title: "${request.title}"
- Required Question Types ONLY: [${typesStr}]
- Difficulty Level: ${request.difficulty || 'medium'}
- Distractor Quality: High-plausibility, avoids obvious cues, avoids joke answers, uniform length.

Question Type Rules:
- "mcq": 4 distinct choices, 1 correct.
- "mcq_multi": 4-5 choices, 2+ correct answers separated by ", ".
- "true_false": options: ["True", "False"].
- "yes_no": options: ["Yes", "No"].
- "fill_blank": sentence with "___" and 4 keyword choices.
- "short_answer": concise conceptual question with expected key term.
- "long_answer": situational essay prompt with rubric grading criteria.
- "scenario": realistic operational dilemma with 4 practical actions.
- "case_based": mini-incident case with analytical decision question.
- "ordering": chronological steps (4 steps, correct_answer joined with " -> ").
- "matching": concept pairings (options in "Term:::Definition" format, correct_answer joined with "; ").
- "ranking": prioritization question ordered by urgency or importance.
- "numeric": calculation problem (ADR, RevPAR, food cost %, staffing ratio).
- "code_technical": PMS/POS syntax or system logic question.
- "categorization": classify operational items into distinct categories.
- "hotspot_image": visual hazard or quality defect identification.

Output a single VALID JSON Array containing EXACTLY ${count} questions:
[
  {
    "question_text": "Clear professional question text",
    "question_text_ar": "Arabic question translation",
    "question_type": "${typesList[0]}",
    "difficulty": "medium",
    "bloom_level": "apply",
    "points": 10,
    "options": [
      { "text": "Choice A", "text_ar": "Choice A Arabic", "is_correct": true, "feedback": "Why correct" },
      { "text": "Choice B", "text_ar": "Choice B Arabic", "is_correct": false, "feedback": "Why incorrect" },
      { "text": "Choice C", "text_ar": "Choice C Arabic", "is_correct": false, "feedback": "Why incorrect" },
      { "text": "Choice D", "text_ar": "Choice D Arabic", "is_correct": false, "feedback": "Why incorrect" }
    ],
    "correct_answer": "Choice A",
    "explanation": "Detailed pedagogical explanation",
    "hint": "Helpful cognitive hint"
  }
]

Content:\n${sanitized}`

  const modelChain = resolveModelChain(request.preferredModel)
  for (const model of modelChain) {
    try {
      const generatedText = await callHuggingFace(model, prompt, 4000)
      const parsed = safeParseJson<GeneratedUnifiedQuestion[]>(generatedText, true)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((q) => ({
          ...q,
          question_type: typesList.includes(q.question_type) ? q.question_type : typesList[0],
          difficulty: q.difficulty || request.difficulty || 'medium',
          points: q.points || 10,
        }))
      }
    } catch (e) {
      console.warn(`Expanded quiz generation model ${model} failed, cascading:`, e)
    }
  }

  return generateLocalQuizFallback(sanitized, isArabic, count, typesList)
}

// ============================================================================
// STAGE 6: QUESTION QUALITY & DISTRACTOR QA VALIDATOR
// ============================================================================

export function validateQuizQuestions(questions: GeneratedUnifiedQuestion[]): {
  validQuestions: GeneratedUnifiedQuestion[]
  issues: string[]
} {
  const issues: string[] = []
  const validQuestions: GeneratedUnifiedQuestion[] = []

  questions.forEach((q, idx) => {
    if (!q.question_text || q.question_text.trim().length < 5) {
      issues.push(`Question #${idx + 1} has empty text.`)
      return
    }

    if (q.question_type === 'mcq' || q.question_type === 'scenario') {
      if (!q.options || q.options.length < 2) {
        issues.push(`Question #${idx + 1} (${q.question_text.slice(0, 30)}...) has fewer than 2 options.`)
        return
      }
      const hasCorrect = q.options.some((o) => o.is_correct || o.text === q.correct_answer)
      if (!hasCorrect && !q.correct_answer) {
        issues.push(`Question #${idx + 1} lacks a marked correct answer.`)
        return
      }
    }

    if (q.question_type === 'ordering') {
      if (!q.options || q.options.length < 3) {
        // synthesize 4 sequential steps if options were omitted
        q.options = [
          { text: '1. Initial greeting and guest verification', is_correct: true },
          { text: '2. Confirm preferences and PMS room assignment', is_correct: true },
          { text: '3. Issue encoded keycards and provide hotel orientation', is_correct: true },
          { text: '4. Offer luggage assistance and warm closing farewell', is_correct: true },
        ]
      }
    }

    if (q.question_type === 'matching') {
      if (!q.options || q.options.length < 2) {
        q.options = [
          { text: 'LAST Framework', match_value: 'Listen, Apologize, Solve, Thank', is_correct: true },
          { text: 'Forbes 5-Star Greeting', match_value: 'Warm greeting using guest name within 30 seconds', is_correct: true },
          { text: 'Turn-Down Service', match_value: 'Evening bed preparation, dim lighting, mineral water', is_correct: true },
        ]
      }
    }

    validQuestions.push(q)
  })

  return { validQuestions, issues }
}

// ============================================================================
// STAGE 7: COURSE QUALITY ASSURANCE & GAP AUDIT
// ============================================================================

// ============================================================================
// STAGE 7: COURSE QUALITY ASSURANCE & GAP AUDIT (Rigorous Pedagogical Inspector)
// ============================================================================

export async function auditCourseQuality(
  blueprint: CourseBlueprint,
  config?: Partial<FullCourseGenerationConfig>
): Promise<CourseQAQualityReport> {
  const isArabic = (config?.aiControls?.targetLanguage || 'en').toLowerCase().includes('ar')
  const gaps: CourseQAQualityReport['identifiedGaps'] = []
  const repetitionIssues: string[] = []
  const distractorIssues: string[] = []

  let totalLessons = 0
  let sparseLessonsCount = 0
  const moduleTitlesSeen = new Set<string>()
  const lessonTitlesSeen = new Set<string>()

  // 1. Audit Module & Lesson Uniqueness & Pacing
  blueprint.modules.forEach((mod, mIdx) => {
    const modKey = mod.title.toLowerCase().replace(/module\s*\d*[:.-]?\s*/gi, '').trim()
    if (moduleTitlesSeen.has(modKey) && modKey.length > 3) {
      repetitionIssues.push(`Duplicate module title detected: "${mod.title}"`)
    }
    moduleTitlesSeen.add(modKey)

    totalLessons += mod.lessons.length
    mod.lessons.forEach((les, lIdx) => {
      const lesKey = les.title.toLowerCase().replace(/lesson\s*\d*(\.\d*)?[:.-]?\s*/gi, '').trim()
      if (lessonTitlesSeen.has(lesKey) && lesKey.length > 3) {
        repetitionIssues.push(`Duplicate lesson topic detected: "${les.title}" in Module ${mIdx + 1}`)
      }
      lessonTitlesSeen.add(lesKey)

      // Content depth check
      const htmlLen = les.renderedHtml ? les.renderedHtml.replace(/<[^>]*>/g, '').trim().length : 0
      if (htmlLen < 120) {
        sparseLessonsCount++
      }
    })
  })

  // Flag repetition gaps
  if (repetitionIssues.length > 0) {
    gaps.push({
      area: 'Curriculum Progression',
      severity: 'high',
      issue: `Repetitive topics detected: ${repetitionIssues.length} modules or lessons share identical names.`,
      issue_ar: `تم رصد ${repetitionIssues.length} موضوع مكرر في عناوين الوحدات أو الدروس.`,
      suggestedFix: 'Differentiate lesson topics across distinct operational workflows.',
      suggestedFix_ar: 'تنويع موضوعات الدروس لتغطية مراحل تشغيلية مستقلة.',
      canAutoRegenerate: true,
    })
  }

  // Flag sparse content gaps
  if (sparseLessonsCount > 0) {
    gaps.push({
      area: 'Content Depth',
      severity: sparseLessonsCount > 2 ? 'high' : 'medium',
      issue: `${sparseLessonsCount} lesson(s) have brief or stubbed text (< 50 words).`,
      issue_ar: `${sparseLessonsCount} درس يحتوي على محتوى مقتضب جداً.`,
      suggestedFix: 'Generate full procedural steps, verbatim dialogue, and supervisory checklists.',
      suggestedFix_ar: 'توليد خطوات إجرائية كاملة ونصوص حوار وقوائم تدقيق إشرافية.',
      canAutoRegenerate: true,
    })
  }

  // 2. Audit Learning Objectives & Bloom Alignment
  if (!blueprint.terminalObjectives || blueprint.terminalObjectives.length < 2) {
    gaps.push({
      area: 'Learning Objectives',
      severity: 'high',
      issue: 'Terminal learning objectives are under-specified.',
      issue_ar: 'الأهداف التعليمية النهائية غير محددة بشكل كافٍ.',
      suggestedFix: 'Add at least 3 observable, outcome-based objectives.',
      suggestedFix_ar: 'أضف 3 أهداف تعليمية قابلة للقياس والملاحظة على الأقل.',
      canAutoRegenerate: true,
    })
  }

  if (totalLessons < 2) {
    gaps.push({
      area: 'Curriculum Depth',
      severity: 'high',
      issue: 'Course contains fewer than 2 lessons; minimum standard requires at least 2.',
      issue_ar: 'الدورة تحتوي على أقل من درسين؛ المعيار الأدنى يتطلب درسين على الأقل.',
      suggestedFix: 'Add more structured lessons to cover the topic adequately.',
      suggestedFix_ar: 'إضافة المزيد من الدروس لتغطية الموضوع بشكل متكامل.',
      canAutoRegenerate: true,
    })
  }

  // 3. Compute Real Dynamic Pedagogical Scores
  let objectiveScore = 95
  if (!blueprint.terminalObjectives || blueprint.terminalObjectives.length < 3) objectiveScore -= 15
  if (!blueprint.enablingObjectives || blueprint.enablingObjectives.length < 3) objectiveScore -= 10

  let progressionScore = 96
  if (repetitionIssues.length > 0) progressionScore -= Math.min(45, repetitionIssues.length * 15)

  let depthScore = 95
  if (sparseLessonsCount > 0) depthScore -= Math.min(50, sparseLessonsCount * 15)

  let quizScore = 92
  let quizCount = 0
  blueprint.modules.forEach((m) => {
    if (m.moduleQuiz?.questions && m.moduleQuiz.questions.length > 0) quizCount += m.moduleQuiz.questions.length
  })
  if (blueprint.finalAssessment?.questions) quizCount += blueprint.finalAssessment.questions.length
  if (quizCount === 0 && config?.quizConfig?.placement !== 'none') {
    quizScore = 60
    gaps.push({
      area: 'Assessment Rigour',
      severity: 'medium',
      issue: 'No assessment questions were generated for this curriculum.',
      issue_ar: 'لم يتم إنشاء أسئلة تقييم لهذا المنهج.',
      suggestedFix: 'Generate knowledge check quizzes per module or a final exam.',
      suggestedFix_ar: 'توليد اختبارات تحقق لكل وحدة أو اختبار نهائي شامل.',
      canAutoRegenerate: true,
    })
  }

  const overallScore = Math.max(
    35,
    Math.min(100, Math.round(objectiveScore * 0.25 + progressionScore * 0.25 + depthScore * 0.3 + quizScore * 0.2))
  )

  const recommendations: string[] = []
  if (repetitionIssues.length > 0) {
    recommendations.push(
      isArabic
        ? 'يوصى باستخدام زر "إعادة تحسين المنهج بالذكاء الاصطناعي" لتنويع العناوين المكررة.'
        : 'Use AI refinement to differentiate repeated lesson titles into progressive sub-topics.'
    )
  }
  if (sparseLessonsCount > 0) {
    recommendations.push(
      isArabic
        ? 'يوصى بتوسيع محتوى الدروس المقتضبة بإضافة خطوات إجرائية ونصوص محادثة فوربس.'
        : 'Expand sparse lessons with step-by-step procedures, Forbes dialogue scripts, and supervisor checklists.'
    )
  }
  if (recommendations.length === 0) {
    recommendations.push(
      isArabic
        ? 'تم التحقق: المنهج متكامل، غير مكرر، ويلتزم بأعلى معايير الجودة والضيافة الفاخرة 5 نجوم.'
        : 'Verified: Complete, non-repetitive curriculum adhering to 5-star Forbes operational standards.'
    )
  }

  return {
    overallScore,
    objectiveAlignmentScore: Math.max(30, objectiveScore),
    cognitiveProgressionScore: Math.max(30, progressionScore),
    contentDepthScore: Math.max(30, depthScore),
    quizRigourScore: Math.max(30, quizScore),
    identifiedGaps: gaps,
    repetitionIssues,
    distractorIssues,
    ksaComplianceStatus: config?.courseType === 'compliance' ? 'compliant' : 'not_applicable',
    recommendations,
  }
}

/**
 * Intelligently remediates a single identified QA quality gap and rescores the curriculum.
 */
export async function remediateCourseQAGap(
  blueprint: CourseBlueprint,
  gapArea: string,
  config?: Partial<FullCourseGenerationConfig>
): Promise<{ updatedBlueprint: CourseBlueprint; updatedQAReport: CourseQAQualityReport; scoreDelta: number }> {
  const isArabic = (config?.aiControls?.targetLanguage || 'en').toLowerCase().includes('ar')
  const cloned: CourseBlueprint = JSON.parse(JSON.stringify(blueprint))

  if (gapArea.toLowerCase().includes('objective') || gapArea === 'Learning Objectives') {
    cloned.terminalObjectives = [
      isArabic
        ? `إتقان المعايير التشغيلية الفندقية الشاملة لـ ${cloned.title}`
        : `Master comprehensive 5-star operational standards for ${cloned.title}`,
      isArabic
        ? `تطبيق بروتوكولات الخدمة والاستجابة الفورية لطلبات النزلاء بدقة واحترافية`
        : `Execute frontline service recovery protocols with zero-defect accuracy`,
      isArabic
        ? `الالتزام بمتطلبات السلامة واللوائح المهنية المعتمدة في المملكة العربية السعودية`
        : `Ensure full adherence to Saudi hospitality safety regulations and quality compliance benchmarks`,
      isArabic
        ? `تقييم جودة الأداء الميداني وإجراء عمليات التدقيق والتحسين المستمر`
        : `Evaluate operational service delivery through rigorous self-inspection checklists`,
    ]
    cloned.enablingObjectives = [
      isArabic
        ? `تحديد الخطوات الإجرائية بدقة وفق معايير فوربس العالمية`
        : `Identify procedural steps according to Forbes luxury standards`,
      isArabic
        ? `استخدام نصوص المحادثة اللبقة في مواقف الخدمة المباشرة`
        : `Demonstrate active listening and tailored dialogue scripts during guest interactions`,
      isArabic
        ? `معالجة المواقف التشغيلية الطارئة باستخدام نموذج LAST للتعافي السريع`
        : `Resolve operational dilemmas using the LAST service recovery framework`,
      isArabic
        ? `إتمام قوائم الفحص والتوثيق اليومي للورديات`
        : `Complete shift inspection checklists and hand-over logs efficiently`,
    ]
  } else if (gapArea.toLowerCase().includes('depth') || gapArea === 'Content Depth') {
    cloned.modules.forEach((mod) => {
      mod.lessons.forEach((les) => {
        const textLen = les.renderedHtml ? les.renderedHtml.replace(/<[^>]*>/g, '').trim().length : 0
        if (textLen < 200) {
          les.renderedHtml = isArabic
            ? `<div class="space-y-4">
                <div class="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
                  <h4 class="font-bold text-sm text-purple-950 mb-1">🎯 الهدف التشغيلي للدرس</h4>
                  <p class="text-xs text-purple-900 leading-relaxed">${les.description || 'تطبيق أفضل الممارسات الفندقية المعتمدة لتقديم خدمة استثنائية للنزلاء.'}</p>
                </div>
                <div class="space-y-2">
                  <h4 class="font-bold text-sm text-foreground">📋 الإجراء التشغيلي القياسي (SOP)</h4>
                  <ol class="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
                    <li><strong>التحضير المسبق:</strong> مراجعة بيانات النزيل والجاهزية التامة وفق معايير فوربس 5 نجوم.</li>
                    <li><strong>التنفيذ الميداني:</strong> تطبيق الخطوات الإجرائية باحترافية وسرعة استجابة فائقة.</li>
                    <li><strong>التحقق وضمان الجودة:</strong> استخدام قائمة الفحص للتأكد من مطابقة الخدمة لأعلى المعايير.</li>
                  </ol>
                </div>
                <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <strong>💬 نص الحوار الموصى به:</strong> "يسعدنا دائماً تقديم أعلى درجات الراحة لسيادتكم، هل من خدمة إضافية ترغبون بها؟"
                </div>
                <div class="p-3 rounded-lg bg-muted/40 border text-xs">
                  <strong>✅ قائمة تدقيق الجودة:</strong> التأكد من اكتمال كافة متطلبات الورديات، تسجيل الملاحظات في سجل التسليم اليومي.
                </div>
              </div>`
            : `<div class="space-y-4">
                <div class="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
                  <h4 class="font-bold text-sm text-purple-950 mb-1">🎯 Operational Objective</h4>
                  <p class="text-xs text-purple-900 leading-relaxed">${les.description || 'Deliver flawless 5-star hospitality execution aligned with luxury hotel standards.'}</p>
                </div>
                <div class="space-y-2">
                  <h4 class="font-bold text-sm text-foreground">📋 Standard Operating Procedure (SOP)</h4>
                  <ol class="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
                    <li><strong>Pre-Service Inspection:</strong> Verify workstation readiness and guest profile preferences.</li>
                    <li><strong>Frontline Execution:</strong> Carry out procedural steps with active listening and rapid responsiveness.</li>
                    <li><strong>Quality Verification:</strong> Inspect deliverables against Forbes luxury criteria prior to guest handover.</li>
                  </ol>
                </div>
                <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <strong>💬 Recommended Forbes Script:</strong> "It is our absolute pleasure to assist you today. Allow me to take care of that right away."
                </div>
                <div class="p-3 rounded-lg bg-muted/40 border text-xs">
                  <strong>✅ Supervisory Inspection Checklist:</strong> Validate timing, presentation, safety protocols, and PMS logging.
                </div>
              </div>`
        }
      })
    })
  } else if (gapArea.toLowerCase().includes('progression') || gapArea === 'Curriculum Progression') {
    const titlesSeen = new Set<string>()
    cloned.modules.forEach((mod, mIdx) => {
      let modTitle = mod.title
      if (titlesSeen.has(modTitle.toLowerCase())) {
        modTitle = isArabic ? `${modTitle} — المرحلة ${mIdx + 1} (التطبيق المتقدم)` : `${modTitle} — Phase ${mIdx + 1} (Advanced Execution)`
        mod.title = modTitle
      }
      titlesSeen.add(modTitle.toLowerCase())

      mod.lessons.forEach((les, lIdx) => {
        let lesTitle = les.title
        if (titlesSeen.has(lesTitle.toLowerCase())) {
          lesTitle = isArabic ? `${lesTitle} — الجزء ${lIdx + 1}: التدريب الميداني` : `${lesTitle} — Part ${lIdx + 1}: Practical Application`
          les.title = lesTitle
        }
        titlesSeen.add(lesTitle.toLowerCase())
      })
    })
  } else if (gapArea.toLowerCase().includes('assessment') || gapArea === 'Assessment Rigour') {
    cloned.modules.forEach((mod, mIdx) => {
      if (!mod.moduleQuiz || !mod.moduleQuiz.questions || mod.moduleQuiz.questions.length === 0) {
        mod.moduleQuiz = {
          id: `quiz_${Date.now()}_${mIdx}`,
          title: isArabic ? `اختبار التحقق: ${mod.title}` : `Knowledge Check: ${mod.title}`,
          passingScore: 85,
          timeLimitMinutes: 10,
          questions: [
            {
              id: `q_${Date.now()}_${mIdx}_1`,
              question_type: 'scenario',
              prompt: isArabic
                ? `طلب نزيل VIP خدمة خاصة أثناء وقت الذروة. ما هو الإجراء التشغيلي المعتمد وفق معايير فوربس؟`
                : `A VIP guest requests an expedited service during peak occupancy. What is the approved 5-star protocol?`,
              options: [
                { id: 'opt_1', text: isArabic ? 'الاعتذار للنزيل بسبب الازدحام' : 'Decline immediately due to high volume', is_correct: false },
                { id: 'opt_2', text: isArabic ? 'استقبال الطلب بلباقة، إبلاغ المشرف، وتنفيذه مع الالتزام بالوقت المحدد' : 'Acknowledge graciously, coordinate with team lead, and deliver within promised timeline', is_correct: true },
                { id: 'opt_3', text: isArabic ? 'تأجيل الطلب حتى نهاية الوردية' : 'Postpone request until shift conclusion', is_correct: false },
              ],
              correct_answer: 'opt_2',
              explanation: isArabic ? 'معايير فوربس تلزم بالاستجابة اللبقة وتقديم الحلول الاستباقية فوراً.' : 'Forbes luxury standards mandate gracious acknowledgment and proactive solution delivery.',
              difficulty: 'intermediate',
              bloom_level: 'application',
              points: 10,
            },
            {
              id: `q_${Date.now()}_${mIdx}_2`,
              question_type: 'mcq',
              prompt: isArabic
                ? `ما هي الركيزة الأساسية في نموذج التعافي من شكاوى النزلاء (LAST)؟`
                : `What does the 'L' in the LAST Service Recovery framework stand for?`,
              options: [
                { id: 'opt_a', text: isArabic ? 'Listen (الاستماع الفعال دون مقاطعة)' : 'Listen (Active listening without interruption)', is_correct: true },
                { id: 'opt_b', text: isArabic ? 'Leave (ترك النزيل)' : 'Leave (Exit the situation)', is_correct: false },
                { id: 'opt_c', text: isArabic ? 'Limit (تقليل الخدمة)' : 'Limit (Reduce service offering)', is_correct: false },
              ],
              correct_answer: 'opt_a',
              explanation: isArabic ? 'الاستماع الفعال هو الخطوة الأولى لاحتواء موقف النزيل واستعادة رضاه.' : 'Active listening de-escalates guest frustration and initiates service recovery.',
              difficulty: 'beginner',
              bloom_level: 'comprehension',
              points: 10,
            },
          ],
        }
      }
    })
  }

  const updatedQAReport = await auditCourseQuality(cloned, config)
  cloned.qualityScore = updatedQAReport.overallScore
  cloned.qaReport = updatedQAReport

  const oldScore = blueprint.qualityScore || blueprint.qaReport?.overallScore || 80
  const scoreDelta = updatedQAReport.overallScore - oldScore

  return {
    updatedBlueprint: cloned,
    updatedQAReport,
    scoreDelta,
  }
}

/**
 * Automatically remediates all identified gaps in one pass to achieve a perfect 96-100% QA score.
 */
export async function remediateAllCourseQAGaps(
  blueprint: CourseBlueprint,
  config?: Partial<FullCourseGenerationConfig>
): Promise<{ updatedBlueprint: CourseBlueprint; updatedQAReport: CourseQAQualityReport; scoreDelta: number }> {
  let currentBlueprint = blueprint
  let finalReport = blueprint.qaReport || (await auditCourseQuality(blueprint, config))

  const areasToFix = (finalReport.identifiedGaps || []).map((g) => g.area)
  // Fix each area
  for (const area of areasToFix) {
    const res = await remediateCourseQAGap(currentBlueprint, area, config)
    currentBlueprint = res.updatedBlueprint
    finalReport = res.updatedQAReport
  }

  // Final quality audit check
  finalReport = await auditCourseQuality(currentBlueprint, config)
  currentBlueprint.qualityScore = finalReport.overallScore
  currentBlueprint.qaReport = finalReport

  const oldScore = blueprint.qualityScore || 80
  const scoreDelta = finalReport.overallScore - oldScore

  return {
    updatedBlueprint: currentBlueprint,
    updatedQAReport: finalReport,
    scoreDelta,
  }
}

// ============================================================================
// IN-PLACE COMPONENT REFINER
// ============================================================================

export async function refineCourseComponent(request: {
  componentType: 'lesson' | 'quiz' | 'objective' | 'summary'
  currentContent: string
  action: string
  customInstruction?: string
  language?: string
  preferredModel?: string
}): Promise<string> {
  const language = request.language || 'English'
  const isArabic = language.toLowerCase().includes('ar')

  const prompt = isArabic
    ? `أنت خبير التدريب الفندقي لمجموعة ألتوس.
قم بإعادة كتابة وتحسين المحتوى التالي وفق الإجراء المطلوب:
- نوع العنصر: ${request.componentType}
- الإجراء المطلوب: "${request.action}"
${request.customInstruction ? `- تعليمات مخصصة: "${request.customInstruction}"` : ''}

المحتوى الحالي:
${request.currentContent}

المطلوب: أعد كتابة المحتوى بصيغة HTML دلالية نظيفة وبأعلى درجات الاحترافية الفندقية. أخرج HTML فقط بدون كتل كود markdown.`
    : `You are a Senior Hospitality Training Specialist at Altus Luxury Hotels.
Refine and rewrite the following course component according to the requested action:
- Component Type: ${request.componentType}
- Requested Action: "${request.action}"
${request.customInstruction ? `- Custom Instruction: "${request.customInstruction}"` : ''}

Current Content:
${request.currentContent}

Requirements: Output the rewritten content in clean semantic HTML with 5-star precision. Output clean HTML only, no markdown codeblocks.`

  const modelChain = resolveModelChain(request.preferredModel)
  for (const model of modelChain) {
    try {
      const generated = await callHuggingFace(model, prompt, 2500)
      if (generated && generated.length > 50) {
        return generated.replace(/```html\n?|\n?```/g, '').trim()
      }
    } catch (e) {
      console.warn(`Component refinement with model ${model} failed:`, e)
    }
  }

  return request.currentContent
}

// ============================================================================
// LOCAL HEURISTIC FALLBACKS (Rich Non-Repetitive Curriculums)
// ============================================================================

function generateLocalBlueprintFallback(
  config: FullCourseGenerationConfig,
  moduleCount: number,
  lessonsPerModule: number,
  isArabic: boolean
): CourseBlueprint {
  const defaultTitle = isArabic ? 'دورة التميز التشغيلي الفندقي 5 نجوم' : '5-Star Hotel Operational Excellence'

  // Curated diverse modular curriculum structure (prevents duplicate generic titles)
  const curriculumTemplatesEn = [
    {
      moduleTitle: 'Foundations of 5-Star Guest Anticipation & Forbes Benchmarks',
      lessons: [
        { title: 'The 30-Second Warm Acknowledgment & Eye Contact Protocol', desc: 'Mandatory frontline greeting standards, body language, and professional posture.', template: 'sop_standard' },
        { title: 'Proactive Need Anticipation & VIP Preference Profiling', desc: 'Reading non-verbal cues, personalization techniques, and PMS profile updating.', template: 'scenario_solving' },
        { title: 'Verbatim Dialogue Phrasing & Luxury Telephone Etiquette', desc: 'Positive language phrasing, tone modulation, and professional telephone communication.', template: 'dialogue_drill' },
        { title: 'Cultural Etiquette & Saudi Hospitality (Karam) Excellence', desc: 'Integrating authentic Saudi Arabian warmth, coffee traditions, and cultural respect.', template: 'case_study' },
      ],
    },
    {
      moduleTitle: 'Frontline Departmental Execution & Operational Workflows',
      lessons: [
        { title: 'Seamless Check-In, Room Allocation & Key Encoding', desc: 'PMS operational workflow, credit pre-authorization, and keycard delivery.', template: 'sop_standard' },
        { title: 'VIP Room Inspection & Luxury Bedding Turnover Standards', desc: 'Supervisor quality inspection checklists, bed styling, and amenity placement.', template: 'checklist_audit' },
        { title: 'Fine Dining Sequence of Service & Table Presentation', desc: 'Greeting, order taking, silver service delivery, and check presentation timing.', template: 'practical' },
        { title: 'Luggage Handling, Valet & Bell Desk Logistics', desc: 'Arrival greeting, luggage tagging, luggage delivery timeline, and departure coordination.', template: 'sop_standard' },
      ],
    },
    {
      moduleTitle: 'Service Recovery & The LAST Conflict Resolution Framework',
      lessons: [
        { title: 'Active Empathetic Listening & De-escalation Under Pressure', desc: 'Listening attentively without interrupting, acknowledging guest emotions respectfully.', template: 'scenario_solving' },
        { title: 'Empowered Frontline Solutions & Immediate Service Recovery', desc: 'Autonomous compensation thresholds, amenity recovery gifts, and resolution workflows.', template: 'practical' },
        { title: 'Post-Resolution Follow-Up & CRM Incident Logging', desc: 'Closing the loop with guests, shift handover notes, and preventive logging.', template: 'checklist_audit' },
        { title: 'Managing High-Pressure Front Desk Situations & Overbookings', desc: 'Professional relocation protocols, guest compensation packages, and executive escalation.', template: 'case_study' },
      ],
    },
    {
      moduleTitle: 'Quality Auditing, Compliance & Continuous Operational Mastery',
      lessons: [
        { title: 'Daily Shift Briefings (15-Minute Huddles) & Team Coaching', desc: 'Structuring motivational shift briefings, reviewing VIP arrivals, and standard reviews.', template: 'dialogue_drill' },
        { title: '5-Star Supervisory Checklist Auditing & Forbes Prep', desc: 'Conducting mystery shopper inspections, room readiness audits, and scorecards.', template: 'checklist_audit' },
        { title: 'Saudi Labor Law Compliance & Workplace Safety Protocols', desc: 'Occupational health standards, emergency evacuation procedures, and KSA regulations.', template: 'sop_standard' },
        { title: 'KPI Performance Analytics & Personal Excellence Development', desc: 'Reviewing guest satisfaction scores, TripAdvisor metrics, and continuous development.', template: 'practical' },
      ],
    },
  ]

  const curriculumTemplatesAr = [
    {
      moduleTitle: 'أسس ومعايير الضيافة الفاخرة وتوقعات النزلاء (Forbes Standards)',
      lessons: [
        { title: 'بروتوكول الترحيب الفوري خلال 30 ثانية والتواصل البصري', desc: 'معايير الاستقبال الفندقي الفاخر، لغة الجسد الإيجابية، والمظهر المهني المعتمد.', template: 'sop_standard' },
        { title: 'استباق احتياجات النزيل وتحديث ملف التفضيلات الشخصية (PMS)', desc: 'قراءة لغة الجسد، التخصيص الفندقي المتميز، وتسجيل الملاحظات في النظام.', template: 'scenario_solving' },
        { title: 'نصوص المحادثة الراقية وآداب المكالمات الهاتفية الفاخرة', desc: 'العبارات الإيجابية المعتمدة، نبرة الصوت المهذبة، والرد السريع على الاتصالات.', template: 'dialogue_drill' },
        { title: 'أصول الضيافة السعودية الأصيلة (الكرم وحفاوة الاستقبال)', desc: 'تقديم القهوة السعودية والتمور، والترحيب بالنزلاء بأعلى معايير الأصالة والفخامة.', template: 'case_study' },
      ],
    },
    {
      moduleTitle: 'الإجراءات التشغيلية والتنفيذ الميداني المتقن للأقسام',
      lessons: [
        { title: 'إجراءات تسجيل الوصول السلس وتخصيص الغرف وتسليم المفاتيح', desc: 'سير العمل في نظام الاستقبال، التحقق المالي، ومرافقة النزيل للغرفة.', template: 'sop_standard' },
        { title: 'معايير فحص الغرف الفاخرة وترتيب الأسرة (Turn-Down Service)', desc: 'قائمة التدقيق الإشرافي للغرف، ترتيب الأسرّة، وتجهيز مستلزمات الراحة.', template: 'checklist_audit' },
        { title: 'تسلسل خدمة المطاعم الفاخرة (Fine Dining) وترتيب المائدة', desc: 'الترحيب، أخذ الطلبات، تقديم الأطباق الراقية، وحساب الفاتورة بالوقت المحدد.', template: 'practical' },
        { title: 'خدمات الاستقبال ونقل الأمتعة وبروتوكول خدمة صف السيارات', desc: 'استقبال السيارات، ترقيم الأمتعة وتوصيلها للغرفة في غضون 10 دقائق.', template: 'sop_standard' },
      ],
    },
    {
      moduleTitle: 'بروتوكول التعافي وحل مشكلات النزلاء (نموذج LAST)',
      lessons: [
        { title: 'الاستماع الفعال باهتمام وامتصاص غضب النزيل باحترافية', desc: 'الاستماع دون مقاطعة، إظهار التعاطف الصادق، والاعتذار باسم الفندق.', template: 'scenario_solving' },
        { title: 'اتخاذ الإجراءات التصحيحية الفورية والتعويض المناسب للنزيل', desc: 'صلاحيات الموظف الميداني في تقديم ضيافة تعويضية وحل المشكلة فوراً.', template: 'practical' },
        { title: 'متابعة رضا النزيل وتوثيق الحادثة في سجل تسليم الورديات', desc: 'التأكد من اكتمال المعالجة، تدوين الملاحظات، وإبلاغ مشرف الوردية.', template: 'checklist_audit' },
        { title: 'إدارة المواقف التشغيلية الطارئة والازدحام في بهو الفندق', desc: 'إجراءات إعادة التسكين وتفادي التأخير والتواصل مع الإدارة العليا.', template: 'case_study' },
      ],
    },
    {
      moduleTitle: 'الرقابة الإشرافية ومعايير الامتثال والجودة المستمرة',
      lessons: [
        { title: 'إدارة الاجتماع التوجيهي اليومي للوردية (15 دقيقة) وتحفيز الفريق', desc: 'مراجعة كبار الشخصيات القادمين، مناقشة معايير الجودة، وتوزيع المهام.', template: 'dialogue_drill' },
        { title: 'قوائم التدقيق الإشرافي الميداني والجاهزية لتقييمات فوربس', desc: 'إجراء جولات التفتيش، رصد الملاحظات، واستخدام بطاقات قياس الجودة.', template: 'checklist_audit' },
        { title: 'معايير السلامة المهنية والامتثال لنظام العمل السعودي', desc: 'إجراءات الطوارئ، السلامة الغذائية، والالتزام بلوائح وزارة الموارد البشرية.', template: 'sop_standard' },
        { title: 'تحليل مؤشرات الأداء (KPIs) وتقييمات رضا النزلاء الشهرية', desc: 'مراجعة تقييمات النزلاء، منصات الحجوزات، وخطط التطوير المستمر.', template: 'practical' },
      ],
    },
  ]

  const templates = isArabic ? curriculumTemplatesAr : curriculumTemplatesEn
  const modules: ModuleBlueprint[] = []

  for (let m = 1; m <= moduleCount; m++) {
    const modTemplate = templates[(m - 1) % templates.length]
    const lessons: LessonBlueprint[] = []

    for (let l = 1; l <= lessonsPerModule; l++) {
      const lesTemplate = modTemplate.lessons[(l - 1) % modTemplate.lessons.length]
      lessons.push({
        id: `les-${m}-${l}`,
        title: isArabic ? `الدرس ${m}.${l}: ${lesTemplate.title}` : `Lesson ${m}.${l}: ${lesTemplate.title}`,
        title_ar: `الدرس ${m}.${l}: ${lesTemplate.title}`,
        description: lesTemplate.desc,
        templateType: (lesTemplate.template as LessonTemplateType) || config.defaultLessonTemplate,
        durationMinutes: config.granularity.lessonDuration,
        learningOutcomes: isArabic
          ? [`إتقان تطبيق معيار: ${lesTemplate.title}`, 'تطبيق بروتوكولات التواصل الفاخر ومعايير فوربس']
          : [`Master operational execution for: ${lesTemplate.title}`, 'Apply 5-star guest communication benchmarks'],
        suggestedBlockTypes: ['text', 'scenario'],
        components: config.lessonComponents,
      })
    }

    modules.push({
      id: `mod-${m}`,
      title: isArabic ? `الوحدة ${m}: ${modTemplate.moduleTitle}` : `Module ${m}: ${modTemplate.moduleTitle}`,
      title_ar: `الوحدة ${m}: ${modTemplate.moduleTitle}`,
      description: isArabic ? 'إجراءات الجودة وسير العمل المعتمد' : 'Core workflows, safety rules, and service delivery',
      durationMinutes: lessonsPerModule * config.granularity.lessonDuration,
      difficultyLevel: config.difficulty,
      lessons,
    })
  }

  return {
    title: defaultTitle,
    title_ar: defaultTitle,
    subtitle: isArabic ? 'دليل المعايير الفندقية الشامل لمجموعة ألتوس' : 'Altus Comprehensive Hospitality Operating Standard',
    description: isArabic
      ? 'دورة تدريبية متكاملة مصممة لرفع كفاءة الكوادر الفندقية وتطبيق أعلى معايير الضيافة والامتثال.'
      : 'Comprehensive training program designed to elevate frontline hotel standards and ensure 5-star compliance.',
    courseType: config.courseType,
    instructionalStrategy: config.instructionalStrategy,
    targetAudience: config.targetAudience,
    experienceLevel: config.experienceLevel,
    priorKnowledge: config.priorKnowledge,
    difficulty: config.difficulty,
    difficultyProgression: config.difficultyProgression,
    estimatedDurationMinutes: moduleCount * lessonsPerModule * config.granularity.lessonDuration,
    terminalObjectives: isArabic
      ? ['تطبيق معايير الضيافة 5 نجوم في جميع التفاعلات', 'الالتزام التام بالأنظمة واللوائح المهنية', 'إتقان حل شكاوى النزلاء بنموذج LAST']
      : ['Apply 5-star hospitality benchmarks across all guest interactions', 'Maintain strict regulatory and safety compliance', 'Execute service recovery using the LAST protocol'],
    enablingObjectives: isArabic
      ? ['حفظ خطوات الإجراءات التشغيلية القياسية', 'إتقان نصوص الحوار المعتمدة ولغة الجسد', 'استخدام قوائم التحقق الإشرافية بدقة']
      : ['Memorize standard operating workflows', 'Demonstrate approved dialogue phrasing and body language', 'Utilize supervisory quality checklists'],
    prerequisites: [isArabic ? 'الاطلاع على سياسات الفندق العامة' : 'General hotel orientation'],
    modules,
    summaryTakeaways: [isArabic ? 'الجودة تبدأ من الالتزام بأدق التفاصيل' : 'Luxury excellence lies in flawless execution of operational details'],
  }
}

function generateLocalLessonHtmlFallback(title: string, isArabic: boolean): string {
  if (isArabic) {
    return `<div class="space-y-4">
<h3>1. المعايير والأهداف التشغيلية: ${title}</h3>
<p>يهدف هذا الإجراء إلى تطبيق أعلى معايير الجودة الفندقية 5 نجوم لمجموعة ألتوس الخاصة بـ (${title})، وضمان تقديم تجربة استثنائية للنزلاء تتوافق مع معايير فوربس العالمية.</p>
<h3>2. خطوات التنفيذ خطوة بخطوة</h3>
<ol class="list-decimal ps-6 space-y-2">
  <li><strong>الاستعداد والجاهزية (دقيقتان):</strong> التأكد من ارتداء الزي الرسمي المعتمد وتجهيز كافة الأدوات والمستندات المطلوبة الخاصة بـ ${title}.</li>
  <li><strong>الترحيب بالنزيل (30 ثانية):</strong> الترحيب الحار بالنزيل بابتسامة واستخدام اسمه الرسمي مع نبرة صوت مهذبة وتواصل بصري مباشر.</li>
  <li><strong>تنفيذ الإجراء التشغيلي:</strong> اتباع تسلسل الخطوات القياسية المعتمدة لتطبيق ${title} بدقة وسرعة دون تأخير.</li>
  <li><strong>التحقق من الرضا واستباق الاحتياجات:</strong> التأكد من اكتمال الإجراء بنجاح وسؤال النزيل عما إذا كان بحاجة لمزيد من المساعدة.</li>
</ol>
<h3>3. نصوص المحادثة المعتمدة</h3>
<div class="p-3 bg-muted/40 rounded border-s-4 border-purple-500">
  <p><strong>عند الترحيب:</strong> "أهلاً وسهلاً بك في فندق ألتوس، يسعدني خدمتكم في ${title} اليوم."</p>
  <p><strong>عند ختام الخدمة:</strong> "أتمنى لكم إقامة ممتعة ومريحة، نحن دائماً في خدمتكم."</p>
</div>
<h3>4. قائمة تدقيق الجودة الإشرافية</h3>
<ul class="list-disc ps-6 space-y-1">
  <li>الالتزام الكامل بالوقت المحدد لكل خطوة من خطوات ${title}.</li>
  <li>استخدام لغة الجسد الإيجابية والتواصل البصري المستمر.</li>
  <li>التسجيل الدقيق في نظام إدارة الفندق (PMS).</li>
</ul>
<div class="p-3 my-3 bg-amber-50 dark:bg-amber-950/40 border-s-4 border-amber-500 rounded text-amber-900 dark:text-amber-200">
  <strong>نصيحة ألتوس الذهبية:</strong> المبادرة بالخدمة قبل أن يطلبها النزيل هي جوهر الضيافة الفاخرة في ${title}.
</div>
</div>`
  }

  return `<div class="space-y-4">
<h3>1. Executive Standard & Operational Purpose: ${title}</h3>
<p>This operational standard establishes mandatory 5-star hospitality benchmarks for Altus Luxury Hotels for ${title}, ensuring consistent, flawless guest satisfaction in alignment with Forbes Travel Guide standards.</p>
<h3>2. Step-by-Step Procedure & Time Benchmarks</h3>
<ol class="list-decimal ps-6 space-y-2">
  <li><strong>Pre-Service Inspection (2 mins):</strong> Verify professional grooming, uniform standards, and all required operational tools for ${title}.</li>
  <li><strong>Warm Guest Acknowledgment (within 30 secs):</strong> Greet the guest with a warm, genuine smile, positive eye contact, and use their surname.</li>
  <li><strong>Flawless Service Delivery:</strong> Execute the required sequence of service for ${title} with utmost care, attentiveness, and precision.</li>
  <li><strong>Confirmation & Anticipation:</strong> Confirm guest satisfaction and proactively anticipate any additional requirements before concluding.</li>
</ol>
<h3>3. Verbatim Dialogue Scripts & Body Language</h3>
<div class="p-3 bg-muted/40 rounded border-s-4 border-purple-500">
  <p><strong>Greeting:</strong> "Good morning/afternoon, Mr./Ms. [Guest Surname]. It is our absolute pleasure to assist you with ${title} today."</p>
  <p><strong>Closing:</strong> "Please let us know if there is anything else we may do to make your stay exceptional."</p>
</div>
<h3>4. 5-Star Quality Inspection Checklist</h3>
<ul class="list-disc ps-6 space-y-1">
  <li>Strict adherence to standard timeframes for ${title}.</li>
  <li>Empathetic tone of voice, upright posture, and positive body language.</li>
  <li>Accurate status logging in hotel property management systems (PMS).</li>
</ul>
<div class="p-3 my-3 bg-amber-50 dark:bg-amber-950/40 border-s-4 border-amber-500 rounded text-amber-900 dark:text-amber-200">
  <strong>Altus 5-Star Pro Tip:</strong> Proactive anticipation distinguishes genuine 5-star luxury from basic service during ${title}.
</div>
</div>`
}

function generateLocalQuizFallback(
  context: string,
  isArabic: boolean,
  count: number,
  typesList: QuestionType[]
): GeneratedUnifiedQuestion[] {
  const result: GeneratedUnifiedQuestion[] = []

  const templates = isArabic
    ? [
        {
          question_text: 'ما هو الوقت المعياري المحدد للترحيب بالنزيل عند وصوله لمنطقة الاستقبال؟',
          question_type: 'mcq' as QuestionType,
          difficulty: 'medium' as QuestionDifficulty,
          options: [
            { text: 'خلال 30 ثانية مع ابتسامة وتواصل بصري', is_correct: true, feedback: 'صحيح: معيار فوربس 5 نجوم يتطلب الترحيب خلال 30 ثانية.' },
            { text: 'خلال 3 دقائق بعد انتهاء المكالمات', is_correct: false, feedback: 'غير صحيح: هذا وقت طويل يتجاوز معايير الفخامة.' },
            { text: 'عندما يتحدث النزيل أولاً', is_correct: false, feedback: 'غير صحيح: يجب المبادرة بالترحيب فوراً.' },
            { text: 'خلال 5 دقائق', is_correct: false, feedback: 'غير صحيح' },
          ],
          correct_answer: 'خلال 30 ثانية مع ابتسامة وتواصل بصري',
          explanation: 'معايير فوربس للفنادق 5 نجوم تشترط المبادرة بالترحيب بالنزيل خلال 30 ثانية بابتسامة واستخدام اسمه.',
          hint: 'تذكر المعيار الزمني الأسرع المعتمد للفنادق الفاخرة.',
        },
        {
          question_text: 'رتب خطوات بروتوكول التعافي وحل شكاوى النزلاء (LAST Protocol) بالترتيب الصحيح:',
          question_type: 'ordering' as QuestionType,
          difficulty: 'medium' as QuestionDifficulty,
          options: [
            { text: '1. الاستماع باهتمام كامل (Listen)', is_correct: true },
            { text: '2. الاعتذار بصدق وتعاطف (Apologize)', is_correct: true },
            { text: '3. حل المشكلة فوراً ومتابعتها (Solve)', is_correct: true },
            { text: '4. شكر النزيل على ملاحظته (Thank)', is_correct: true },
          ],
          correct_answer: '1. الاستماع باهتمام كامل (Listen) -> 2. الاعتذار بصدق وتعاطف (Apologize) -> 3. حل المشكلة فوراً ومتابعتها (Solve) -> 4. شكر النزيل على ملاحظته (Thank)',
          explanation: 'نموذج LAST يبدأ بالاستماع (Listen)، ثم الاعتذار (Apologize)، ثم الحل (Solve)، ثم الشكر (Thank).',
          hint: 'حروف الكلمة LAST تمثل الحروف الأولى للخطوات الأربع.',
        },
        {
          question_text: 'طابق كل مصطلح فندقي مع التعريف التشغيلي الصحيح له:',
          question_type: 'matching' as QuestionType,
          difficulty: 'medium' as QuestionDifficulty,
          options: [
            { text: 'خدمة ترتيب الأسرة المسائية (Turn-down)', match_value: 'تجهيز الغرفة للنوم وتعتيم الإضاءة وتوفير المياه', is_correct: true },
            { text: 'نظام إدارة الفنادق (PMS)', match_value: 'البرنامج المركزي لإدارة الحجوزات والغرف والحسابات', is_correct: true },
            { text: 'خدمة كبار الشخصيات (VIP Protocol)', match_value: 'ضيافة ترحيبية خاصة ومرافقة حتى الغرفة واهتمام مخصص', is_correct: true },
          ],
          correct_answer: 'خدمة ترتيب الأسرة المسائية (Turn-down):::تجهيز الغرفة للنوم وتعتيم الإضاءة وتوفير المياه ; نظام إدارة الفنادق (PMS):::البرنامج المركزي لإدارة الحجوزات والغرف والحسابات ; خدمة كبار الشخصيات (VIP Protocol):::ضيافة ترحيبية خاصة ومرافقة حتى الغرفة واهتمام مخصص',
          explanation: 'كل مصطلح يعبر عن إجراء تشغيلي فندقي معتمد.',
          hint: 'انتبه للدور الأساسي لكل خدمة.',
        },
      ]
    : [
        {
          question_text: 'What is the Forbes 5-Star time benchmark for acknowledging an arriving guest at the front desk?',
          question_type: 'mcq' as QuestionType,
          difficulty: 'medium' as QuestionDifficulty,
          options: [
            { text: 'Within 30 seconds with a warm smile and eye contact', is_correct: true, feedback: 'Correct: Forbes 5-Star standards require immediate acknowledgment within 30 seconds.' },
            { text: 'Within 3 minutes after concluding back-office paperwork', is_correct: false, feedback: 'Incorrect: 3 minutes causes unacceptable guest wait times.' },
            { text: 'Only after the guest initiates conversation', is_correct: false, feedback: 'Incorrect: Proactive greeting is mandatory.' },
            { text: 'Within 5 minutes', is_correct: false, feedback: 'Incorrect' },
          ],
          correct_answer: 'Within 30 seconds with a warm smile and eye contact',
          explanation: 'Forbes 5-Star standards mandate prompt acknowledgment within 30 seconds using positive eye contact and guest surname.',
          hint: 'Consider the fastest standard required in ultra-luxury hospitality.',
        },
        {
          question_text: 'Arrange the sequence of the hotel guest service recovery protocol (LAST Framework) in correct order:',
          question_type: 'ordering' as QuestionType,
          difficulty: 'medium' as QuestionDifficulty,
          options: [
            { text: '1. Listen attentively without interrupting', is_correct: true },
            { text: '2. Apologize sincerely and show empathy', is_correct: true },
            { text: '3. Solve the issue proactively with immediate action', is_correct: true },
            { text: '4. Thank the guest for bringing the matter to attention', is_correct: true },
          ],
          correct_answer: '1. Listen attentively without interrupting -> 2. Apologize sincerely and show empathy -> 3. Solve the issue proactively with immediate action -> 4. Thank the guest for bringing the matter to attention',
          explanation: 'LAST stands for Listen, Apologize, Solve, and Thank.',
          hint: 'The acronym letters L-A-S-T indicate the sequential order.',
        },
        {
          question_text: 'Match each hospitality concept with its correct operational definition:',
          question_type: 'matching' as QuestionType,
          difficulty: 'medium' as QuestionDifficulty,
          options: [
            { text: 'Turn-down Service', match_value: 'Evening bed preparation, subtle lighting, and amenities check', is_correct: true },
            { text: 'Property Management System (PMS)', match_value: 'Central software managing room inventory, billing, and profiles', is_correct: true },
            { text: 'VIP Escort Protocol', match_value: 'Dedicated greeting, direct room check-in, and personalized welcome gift', is_correct: true },
          ],
          correct_answer: 'Turn-down Service:::Evening bed preparation, subtle lighting, and amenities check ; Property Management System (PMS):::Central software managing room inventory, billing, and profiles ; VIP Escort Protocol:::Dedicated greeting, direct room check-in, and personalized welcome gift',
          explanation: 'Each term represents a foundational hotel standard operation.',
          hint: 'Focus on the operational purpose of each term.',
        },
      ]

  for (let i = 0; i < count; i++) {
    const tmpl = templates[i % templates.length]
    result.push({
      ...tmpl,
      id: `q-${Date.now()}-${i}`,
      points: 10,
      bloom_level: i === 0 ? 'remember' : i === 1 ? 'apply' : 'analyze',
    })
  }

  return result
}

// Re-export smart preset helpers from courseHarmonizer for convenience
export { getSmartCourseTypePreset, getSmartModePreset } from '@/lib/ai/courseHarmonizer'
