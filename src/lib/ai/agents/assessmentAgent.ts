/**
 * Psychometric Assessment & Quiz Specialist Agent
 * 
 * Generates high-discrimination hospitality evaluations across 16+ question types,
 * mapped to Bloom's taxonomy, plausible distractors, and targeted remediation paths.
 */

import type { GeneratedUnifiedQuestion } from '@/types/aiCourseEngine'
import type { QuestionDifficulty, QuestionType } from '@/types/questions'
import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import type { AgentExecutionResult, AgentRole, ObjectiveAssessmentContext } from './types'

export interface AssessmentAgentInput {
  title: string
  contextContent: string
  count: number
  questionTypes?: QuestionType[]
  difficulty?: QuestionDifficulty
  objectiveContexts?: ObjectiveAssessmentContext[]
  language?: 'en' | 'ar' | 'bilingual'
}

export class AssessmentAgent extends BaseAIAgent<AssessmentAgentInput, GeneratedUnifiedQuestion[]> {
  public readonly role: AgentRole = 'assessments'
  public readonly name = 'Psychometric Assessment & Quiz Specialist Agent'
  public readonly nameAr = 'أخصائي التقييمات والاختبارات القياسية'

  public readonly defaultSystemPrompt = `You are the Chief Psychometrician and Assessment Architect for ALTUS Luxury Hotels.
You create rigorous, high-discrimination questions that verify genuine frontline operational capability.
Distractors must represent realistic operational misconceptions, not obvious wrong answers.`

  public async process(
    input: AssessmentAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<GeneratedUnifiedQuestion[]>> {
    const isArabic =
      input.language === 'ar' || (input.language || '').toLowerCase().includes('arabic')
    const count = input.count || 4
    const questionTypes = (Array.isArray(input.questionTypes) && input.questionTypes.length > 0)
      ? input.questionTypes
      : ['mcq', 'scenario', 'ordering', 'matching', 'true_false']

    const sanitizedContext = (input.contextContent || '').replace(/<[^>]*>/g, ' ').slice(0, 3500)

    const prompt = isArabic
      ? `أنت خبير قياس وتقويم التعليم الفندقي لمجموعة ألتوس (5 نجوم).
قم بإنشاء بالضبط ${count} أسئلة اختبار دقيقة وعملية بناءً على المحتوى التالي:
- عنوان المحتوى: "${input.title || 'الوحدة التدريبية'}"
- أنواع الأسئلة المطلوبة حصراً: [${questionTypes.join(', ')}]
- مستوى الصعوبة: ${input.difficulty || 'medium'}
- جودة الخيارات المضللة: خيارات ذكية واقعية غير بديهية وتتجنب الأخطاء الشائعة.

قواعد التنسيق لأنواع الأسئلة:
- "mcq": سؤال اختيار من متعدد (4 خيارات متباينة).
- "mcq_multi": اختيار متعدد (4-5 خيارات، إجابات صحيحة متعددة).
- "true_false": صح أم خطأ.
- "scenario": معضلة خدمة مع 4 قرارات بديلة.
- "ordering": ترتيب خطوات تشغيلية (4 خطوات، الإجابة مفصولة بـ " -> ").
- "matching": مطابقة مصطلحات (الخيارات بصيغة "المصطلح:::التعريف").

أخرج مصفوفة JSON تحتوي على بالضبط ${count} أسئلة:
[
  {
    "question_text": "نص السؤال بالعربية",
    "question_text_ar": "نص السؤال بالعربية",
    "question_type": "${questionTypes[0]}",
    "difficulty": "${input.difficulty || 'medium'}",
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

المحتوى:\n${sanitizedContext}`
      : `You are the Chief Psychometrician at Altus Luxury Hotels.
Create EXACTLY ${count} rigorous, high-discrimination assessment questions based on:
- Title: "${input.title}"
- Required Question Types: [${questionTypes.join(', ')}]
- Difficulty: ${input.difficulty || 'medium'}
- Distractor Quality: Plausible, avoiding joke answers or grammatical giveaways.

Question Type Rules:
- "mcq": 4 distinct choices, 1 correct.
- "mcq_multi": 4-5 choices, multiple correct answers.
- "true_false": True or False options.
- "scenario": Workplace dilemma with 4 operational actions.
- "ordering": Chronological steps (correct_answer joined with " -> ").
- "matching": Term-to-definition pairs (options formatted as "Term:::Definition").

Output a valid JSON Array with EXACTLY ${count} questions:
[
  {
    "question_text": "Clear professional question text",
    "question_text_ar": "Arabic question translation",
    "question_type": "${questionTypes[0]}",
    "difficulty": "${input.difficulty || 'medium'}",
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

Content:\n${sanitizedContext}`

    // Structurally validate the question array (question_text + recognized
    // question_type, options for option-based types) — a wrong-shape response
    // cascades to the next model. If every model fails, fall back to the
    // hand-written question bank below rather than aborting the pipeline.
    let result: AgentExecutionResult<GeneratedUnifiedQuestion[]> | null = null
    try {
      result = await this.executePrompt<GeneratedUnifiedQuestion[]>(prompt, {
        ...options,
        jsonMode: true,
        schema: 'questions',
        temperature: 0.3,
      })
    } catch (genErr) {
      console.warn('[AssessmentAgent] generation failed all models, using fallback bank:', genErr)
    }

    let questions = Array.isArray(result?.data) ? result.data : []

    if (questions.length === 0) {
      const fallbackQuestions: GeneratedUnifiedQuestion[] = [
        {
          question_text: `What is the primary operational objective outlined in "${input.title}"?`,
          question_text_ar: `ما هو الهدف التشغيلي الأساسي الموضح في "${input.title}"؟`,
          question_type: 'mcq',
          difficulty: input.difficulty || 'medium',
          bloom_level: 'understand',
          points: 10,
          options: [
            {
              text: 'Adhering strictly to 5-star brand standards and procedural guidelines',
              text_ar: 'الالتزام الصارم بمعايير الجودة الفندقية فئة 5 نجوم والإجراءات التشغيلية',
              is_correct: true,
              feedback: 'Correct: Adherence to brand SOPs ensures consistent 5-star service delivery.',
            },
            {
              text: 'Prioritizing speed over quality and guest compliance',
              text_ar: 'تقديم السرعة على الجودة والالتزام بمعايير الضيوف',
              is_correct: false,
              feedback: 'Incorrect: Quality and procedural standards must never be compromised.',
            },
            {
              text: 'Delegating guest communications entirely to unsupervised trainees',
              text_ar: 'تفويض التواصل مع الضيوف بالكامل للمتدربين دون إشراف',
              is_correct: false,
              feedback: 'Incorrect: Proper supervision and standards must be maintained at all times.',
            },
            {
              text: 'Bypassing documentation protocols during peak occupancy hours',
              text_ar: 'تجاوز بروتوكولات التوثيق أثناء ساعات الإشغال العالية',
              is_correct: false,
              feedback: 'Incorrect: Operational protocols apply consistently across all shifts.',
            },
          ],
          correct_answer: 'Adhering strictly to 5-star brand standards and procedural guidelines',
          explanation: 'Standard Operating Procedures are mandatory to maintain consistent luxury service and Saudi regulatory compliance.',
          hint: 'Consider the overarching quality and compliance objectives of the hotel.',
        },
        {
          question_text: `When handling guest requests related to "${input.title}", which service protocol should be prioritized?`,
          question_text_ar: `عند التعامل مع طلبات الضيوف المتعلقة بـ "${input.title}"، ما هو البروتوكول الخدمي الواجب تقديمه؟`,
          question_type: 'scenario',
          difficulty: input.difficulty || 'medium',
          bloom_level: 'apply',
          points: 10,
          options: [
            {
              text: 'Acknowledge warmly, verify guest preferences, and execute standard operating steps promptly',
              text_ar: 'الترحيب الحار، التأكد من تفضيلات الضيف، وتنفيذ خطوات الإجراء التشغيلي بسرعة وكفاءة',
              is_correct: true,
              feedback: 'Correct: Proactive listening and warm engagement reflect authentic Saudi hospitality.',
            },
            {
              text: 'Inform the guest to wait until the next operational shift change',
              text_ar: 'إبلاغ الضيف بالانتظار حتى تغيير وردية العمل التالية',
              is_correct: false,
              feedback: 'Incorrect: Guest requests should be resolved immediately or escalated promptly.',
            },
            {
              text: 'Handle the request without recording the standard service log entry',
              text_ar: 'تنفيذ الطلب دون تسجيله في سجل الخدمة المعتمد',
              is_correct: false,
              feedback: 'Incorrect: All guest interactions must be documented in the hotel management system.',
            },
            {
              text: 'Transfer the guest to multiple departments before understanding their need',
              text_ar: 'تحويل الضيف بين عدة أقسام قبل فهم احتياجه بدقة',
              is_correct: false,
              feedback: 'Incorrect: First-contact resolution is a core Forbes standard.',
            },
          ],
          correct_answer: 'Acknowledge warmly, verify guest preferences, and execute standard operating steps promptly',
          explanation: 'Active listening, empathy, and immediate procedural follow-through are foundational to prime hotel guest satisfaction.',
          hint: 'Think about Forbes 5-star first-contact resolution standards.',
        },
      ]
      questions = fallbackQuestions.slice(0, count)
    }

    // Respect the requested question count exactly — trim over-delivery, and if
    // the model came up short, top up from the deterministic fallback bank so
    // the admin's chosen count is never silently reduced.
    if (questions.length > count) {
      questions = questions.slice(0, count)
    } else if (questions.length < count) {
      const topUp: GeneratedUnifiedQuestion[] = [
        {
          question_text: `Which action best upholds the 5-star standard described in "${input.title}"?`,
          question_text_ar: `أي إجراء يحافظ على معيار الـ5 نجوم الموضح في "${input.title}"؟`,
          question_type: 'mcq',
          difficulty: input.difficulty || 'medium',
          bloom_level: 'apply',
          points: 10,
          options: [
            { text: 'Follow the documented SOP precisely, then confirm guest satisfaction', text_ar: 'اتباع الإجراء الموثّق بدقّة ثم التأكد من رضا الضيف', is_correct: true, feedback: 'Correct: procedure first, then verification.' },
            { text: 'Improvise a faster shortcut to save time', text_ar: 'ارتجال اختصار أسرع لتوفير الوقت', is_correct: false, feedback: 'Incorrect: shortcuts break consistency.' },
            { text: 'Wait for a supervisor before doing anything', text_ar: 'الانتظار حتى حضور المشرف قبل أي تصرف', is_correct: false, feedback: 'Incorrect: frontline staff act within their SOP authority.' },
            { text: 'Skip documentation during busy periods', text_ar: 'تجاهل التوثيق في أوقات الازدحام', is_correct: false, feedback: 'Incorrect: documentation is always required.' },
          ],
          correct_answer: 'Follow the documented SOP precisely, then confirm guest satisfaction',
          explanation: 'Standard operating procedure adherence with a satisfaction check is the core 5-star delivery loop.',
          hint: 'Procedure first, then confirm the outcome.',
        },
      ]
      let i = 0
      while (questions.length < count) {
        questions.push({ ...topUp[i % topUp.length], question_text: `${topUp[i % topUp.length].question_text} (${questions.length + 1})` })
        i++
      }
    }

    return {
      agentRole: this.role,
      success: questions.length > 0,
      modelUsed: result?.modelUsed ?? 'fallback-bank',
      providerUsed: result?.providerUsed ?? ('none' as AgentExecutionResult['providerUsed']),
      costTier: result?.costTier ?? 'free',
      estimatedCostUSD: result?.estimatedCostUSD ?? 0,
      latencyMs: result?.latencyMs ?? 0,
      rawOutput: result?.rawOutput ?? '',
      data: questions,
    }
  }
}

export const assessmentAgent = new AssessmentAgent()
