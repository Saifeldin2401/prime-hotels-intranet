/**
 * Content Writer & Lesson Synthesis Agent
 * 
 * Synthesizes publication-grade, 5-star hotel operational training lessons in semantic HTML.
 * Embeds procedural time benchmarks, verbatim dialogue scripts, supervisory inspection checklists,
 * and LAST service recovery protocols.
 */

import type { LessonBlueprint, FullCourseGenerationConfig } from '@/types/aiCourseEngine'
import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import type { AgentExecutionResult, AgentRole } from './types'

export interface ContentWriterInput {
  courseTitle: string
  moduleTitle: string
  lesson: LessonBlueprint
  config: Partial<FullCourseGenerationConfig>
  researchContext?: string
  groundedSopsContext?: string
  /** Raw text of the user's grounding document. Lesson content must be adapted
   *  from this — not invented — when present. */
  sourceMaterial?: string
  language?: 'en' | 'ar' | 'bilingual'
}

export class ContentWriterAgent extends BaseAIAgent<ContentWriterInput, string> {
  public readonly role: AgentRole = 'content_writer'
  public readonly name = 'Content Writer & Instructional Synthesis Agent'
  public readonly nameAr = 'كاتب المحتوى التشغيلي والدروس التدريبية'

  public readonly defaultSystemPrompt = `You are the Senior Executive Content Director at a five-star luxury hotel group.
Your role is to write thorough, practical, and highly engaging training lessons in clean semantic HTML.
Do NOT output markdown fences or conversational wrappers. Output HTML only.`

  public async process(
    input: ContentWriterInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<string>> {
    const { courseTitle, moduleTitle, lesson, config, researchContext, groundedSopsContext, sourceMaterial } = input
    const isArabic =
      input.language === 'ar' ||
      (config?.aiControls?.targetLanguage || 'en').toLowerCase().includes('ar') ||
      (config?.aiControls?.targetLanguage || 'en').toLowerCase().includes('arabic')

    const selectedComponentsList = config?.lessonComponents || ['objectives', 'step_procedure', 'checklist', 'case_study']
    const components = selectedComponentsList.join(', ')
    const hasDialogue = selectedComponentsList.includes('dialogue_script')
    const hasChecklist = selectedComponentsList.includes('checklist')
    const hasLastProtocol = selectedComponentsList.includes('last_protocol')

    let extraContext = ''
    const trimmedSource = (sourceMaterial || '').trim()
    if (trimmedSource.length > 40) {
      extraContext += isArabic
        ? `\nالمستند المصدر (اكتب هذا الدرس بالاعتماد على هذا المحتوى؛ اقتبس الإجراءات والمصطلحات منه ولا تخترع ما يخالفه):\n"""\n${trimmedSource.slice(0, 16000)}\n"""`
        : `\nSOURCE DOCUMENT (write this lesson FROM this material — quote its procedures, steps and terminology; never invent anything that contradicts it):\n"""\n${trimmedSource.slice(0, 16000)}\n"""`
    }
    if (researchContext) extraContext += `\nINDUSTRY BENCHMARKS:\n${researchContext}`
    if (groundedSopsContext) extraContext += `\nGROUNDED HOTEL PROCEDURES:\n${groundedSopsContext}`

    // Honour the author's depth / difficulty / strategy choices.
    const depth = config?.overallDepth || 'comprehensive'
    const depthDirective =
      depth === 'quick'
        ? 'Keep this lesson SHORT — 2-3 tight paragraphs plus the required sections. No filler.'
        : depth === 'standard'
          ? 'Standard length — clear and practical, roughly 4-6 paragraphs across the sections.'
          : depth === 'expert'
            ? 'Deep and exhaustive — cover edge cases, exceptions, escalation paths and rationale.'
            : 'Comprehensive — thorough coverage with concrete examples and timing benchmarks.'
    const difficulty = config?.difficulty || 'intermediate'
    const strategy = config?.instructionalStrategy || 'explain_example_practice'
    const settingsDirective = `AUTHOR SETTINGS (follow these — do not substitute your own): depth "${depth}" (${depthDirective}); difficulty "${difficulty}"; teaching style "${strategy}". Output ONLY the sections implied by the mandatory components list — do not invent extra sections.`
    const maxTokensForDepth = depth === 'quick' ? 2200 : depth === 'expert' ? 6000 : 4000

    const dialogueSectionAr = hasDialogue
      ? `
  <h3>3. نصوص المحادثة والحوار مع النزلاء (Verbatim Dialogue Scripts)</h3>
  <div class="p-4 bg-muted/40 rounded border-s-4 border-purple-500 space-y-2">
    <p><strong>عند الترحيب:</strong> "نص الترحيب الرسمي بالاسم والابتسامة والتواصل البصري."</p>
    <p><strong>عند التعامل مع طلب إضافي:</strong> "العبارة الإيجابية المعتمدة دون قول كلمة لا."</p>
    <p><strong>عند الختام والمغادرة:</strong> "عبارة التوديع الفاخرة واستباق الخدمة القادمة."</p>
  </div>`
      : ''

    const checklistSectionAr = hasChecklist
      ? `
  <h3>4. قائمة تدقيق الجودة الإشرافية (5-Star Quality Inspection Checklist)</h3>
  <ul class="list-disc ps-6 space-y-1">
    <li>التأكد من مطابقة الوقت المحدد للإجراء.</li>
    <li>فحص لغة الجسد والهندام المعتمد.</li>
    <li>التوثيق الدقيق في نظام إدارة الفندق (PMS).</li>
  </ul>`
      : ''

    const lastProtocolSectionAr = hasLastProtocol
      ? `
  <h3>5. بروتوكول التعافي من المشكلات (LAST Framework)</h3>
  <ul class="list-disc ps-6 space-y-1">
    <li><strong>Listen (الاستماع):</strong> الاستماع الكامل دون مقاطعة.</li>
    <li><strong>Apologize (الاعتذار):</strong> الاعتذار الصادق باسم الفندق.</li>
    <li><strong>Solve (الحل):</strong> اتخاذ إجراء فوري وتعويض مناسب ضمن صلاحيات الموظف.</li>
    <li><strong>Thank (الشكر):</strong> شكر النزيل على مشاركة الملاحظة.</li>
  </ul>`
      : ''

    const dialogueSectionEn = hasDialogue
      ? `
  <h3>3. Verbatim Dialogue Scripts & Body Language Protocols</h3>
  <div class="p-4 bg-muted/40 rounded border-s-4 border-purple-500 space-y-2">
    <p><strong>Initial Greeting:</strong> "Good morning/afternoon, Mr./Ms. [Surname]. It is our absolute pleasure to welcome you."</p>
    <p><strong>Handling Special Inquiries:</strong> "Certainly, I would be delighted to arrange that for you right away."</p>
    <p><strong>Warm Closing:</strong> "Please let us know if there is anything else we may do to make your stay exceptional."</p>
  </div>`
      : ''

    const checklistSectionEn = hasChecklist
      ? `
  <h3>4. 5-Star Quality Inspection Checklist</h3>
  <ul class="list-disc ps-6 space-y-1">
    <li>Strict adherence to time benchmark.</li>
    <li>Positive posture, attentive body language, and clean workstation.</li>
    <li>Accurate logging in hotel Property Management System (PMS).</li>
  </ul>`
      : ''

    const lastProtocolSectionEn = hasLastProtocol
      ? `
  <h3>5. Service Recovery & Problem Resolution (LAST Protocol)</h3>
  <ul class="list-disc ps-6 space-y-1">
    <li><strong>Listen:</strong> Active, empathetic listening without interrupting.</li>
    <li><strong>Apologize:</strong> Sincere, genuine apology on behalf of the hotel.</li>
    <li><strong>Solve:</strong> Immediate empowered resolution and compensatory gesture.</li>
    <li><strong>Thank:</strong> Thanking the guest for bringing the matter to our attention.</li>
  </ul>`
      : ''

    const prompt = isArabic
      ? `أنت كبير مدربي الضيافة الفاخرة لمجموعة فنادق فاخرة.
اكتب درساً تدريبياً متكاملاً وعالي الاحترافية بصيغة HTML دلالية نظيفة للدرس التالي:
- الدورة: "${courseTitle}"
- الوحدة: "${moduleTitle}"
- عنوان الدرس: "${lesson.title}"
- القالب: ${lesson.templateType}
- المخرجات التعليمية المستهدفة: ${(lesson.learningOutcomes || []).join(' | ') || 'إتقان المعايير الفندقية والتميز في الخدمة'}
- المكونات الإلزامية: [${components}]
${settingsDirective}
${extraContext}

الهيكل الإلزامي لكود HTML:
<div class="space-y-4">
  <h3>1. المعايير والأهداف التشغيلية (Operational Standards & Objectives)</h3>
  <p>شرح واضح لأهمية الإجراء، الوقت المعتمد لتنفيذه، وتأثيره المباشر على تقييم 5 نجوم.</p>

  <h3>2. خطوات التنفيذ خطوة بخطوة (Step-by-Step Execution Workflow)</h3>
  <ol class="list-decimal ps-6 space-y-2">
    <li><strong>المرحلة الأولى - الاستعداد (دقيقتان):</strong> تفاصيل الاستعداد المهني.</li>
    <li><strong>المرحلة الثانية - الترحيب الفوري (30 ثانية):</strong> بروتوكول التواصل مع النزيل.</li>
    <li><strong>المرحلة الثالثة - تنفيذ الخدمة بدقة:</strong> التسلسل الإجرائي المتقن.</li>
    <li><strong>المرحلة الرابعة - التحقق واستباق الاحتياجات:</strong> التأكد من رضا النزيل وتلبية رغباته.</li>
  </ol>${dialogueSectionAr}${checklistSectionAr}${lastProtocolSectionAr}

  <div class="p-3 my-3 bg-amber-50 dark:bg-amber-950/40 border-s-4 border-amber-500 rounded text-amber-900 dark:text-amber-200">
    <strong>نصيحة التميز الذهبية:</strong> المبادرة بالخدمة قبل أن يطلبها النزيل هي جوهر الضيافة الفاخرة.
  </div>
</div>

اكتب كود HTML فقط بدون وسوم markdown وبدون كتل كود خارجية.`
      : `You are the Senior Executive Content Director at a five-star luxury hotel group.
Write an exhaustive, publication-grade training lesson in clean semantic HTML for:
- Course: "${courseTitle}"
- Module: "${moduleTitle}"
- Lesson Title: "${lesson.title}"
- Lesson Template: ${lesson.templateType}
- Target Outcomes: ${(lesson.learningOutcomes || []).join(' | ') || '5-Star Operational Mastery & Procedural Compliance'}
- Mandatory Components: [${components}]
${settingsDirective}
${extraContext}

Structured HTML Requirements:
<div class="space-y-4">
  <h3>1. Executive Standard & Operational Purpose</h3>
  <p>Detailed explanation of 5-star benchmarks, target completion timeframes, and international five-star relevance.</p>

  <h3>2. Step-by-Step Procedure & Time Benchmarks</h3>
  <ol class="list-decimal ps-6 space-y-2">
    <li><strong>Pre-Service Inspection (2 mins):</strong> Grooming, tools, and workstation readiness.</li>
    <li><strong>Immediate Guest Acknowledgment (within 30 secs):</strong> Eye contact, smile, surname.</li>
    <li><strong>Flawless Service Execution:</strong> Comprehensive operational sequence.</li>
    <li><strong>Confirmation & Anticipation:</strong> Confirming satisfaction and anticipating unexpressed needs.</li>
  </ol>${dialogueSectionEn}${checklistSectionEn}${lastProtocolSectionEn}

  <div class="p-3 my-3 bg-amber-50 dark:bg-amber-950/40 border-s-4 border-amber-500 rounded text-amber-900 dark:text-amber-200">
    <strong>Five-Star Pro Tip:</strong> Proactive anticipation distinguishes genuine 5-star luxury from basic service.
  </div>
</div>

Output clean HTML only, no markdown codeblocks.`

    const result = await this.executePrompt<string>(prompt, {
      ...options,
      jsonMode: false,
      temperature: 0.4,
      maxTokens: maxTokensForDepth,
    })

    const cleanHtml = (result.rawOutput || '')
      .replace(/^```html\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim()

    return {
      ...result,
      data: cleanHtml,
    }
  }
}

export const contentWriterAgent = new ContentWriterAgent()
