/**
 * AI-Powered Interactive Guest Roleplay Simulator Engine
 * 
 * Simulates real-time 5-star hotel guest dilemmas across 10 departments,
 * evaluating staff responses with five-star Hospitality standards and Saudi Karam etiquette.
 */

import { multiProviderRouter } from './providers/multiProviderRouter'

export type HotelDepartmentRoleplay =
  | 'FRONT_DESK'
  | 'FOOD_AND_BEVERAGE'
  | 'HOUSEKEEPING'
  | 'CONCIERGE'
  | 'BILLING_FINANCE'
  | 'VALET_BELL'
  | 'SPA_WELLNESS'
  | 'NIGHT_AUDIT'
  | 'EXECUTIVE_LOUNGE'
  | 'BANQUETING_EVENTS'

export type GuestTemperament = 'CALM' | 'FRUSTRATED' | 'DEMANDING_VIP' | 'HURRIED_EXECUTIVE' | 'DISTRESSED'

export interface RoleplayScenario {
  id: string
  department: HotelDepartmentRoleplay
  title: string
  titleAr: string
  guestName: string
  guestProfile: string
  guestProfileAr: string
  guestTemperament: GuestTemperament
  scenarioContext: string
  scenarioContextAr: string
  initialGuestDialogue: string
  initialGuestDialogueAr: string
  learningObjectives: string[]
  learningObjectivesAr: string[]
  serviceStandardsTarget: string[]
}

export interface RoleplayMessage {
  sender: 'guest' | 'trainee' | 'coach'
  text: string
  timestamp: string
  temperament?: GuestTemperament
}

export interface RoleplayTurnEvaluation {
  empathyScore: number // 0-100
  problemResolutionScore: number // 0-100
  serviceStandardScore: number // 0-100
  saudiKaramScore: number // 0-100
  deescalationScore: number // 0-100
  overallScore: number // 0-100
  feedback: string
  feedbackAr: string
  coachingTips: string[]
  suggestedAlternativeResponse: string
  suggestedAlternativeResponseAr: string
  guestNextTemperament: GuestTemperament
  isResolved: boolean
}

export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'SCENARIO-FO-01',
    department: 'FRONT_DESK',
    title: 'VIP Presidential Suite Upgrade & Delayed Check-In',
    titleAr: 'تأخر تسجيل وصول جناح كبار الشخصيات VIP والمطالبة بترقية',
    guestName: 'Mr. Khalid Al-Sulaiman',
    guestProfile: 'Frequent Diamond Guest, Flying 14 hours from London for an urgent board meeting',
    guestProfileAr: 'ضيف ماسي دائم، قادم بعد رحلة 14 ساعة من لندن لحضور اجتماع مجلس إدارة عاجل',
    guestTemperament: 'FRUSTRATED',
    scenarioContext: 'Guest arrives at 11:30 AM (standard check-in is 3:00 PM). His booked Executive Suite is currently occupied and undergoing deep cleaning.',
    scenarioContextAr: 'وصل الضيف الساعة 11:30 صباحاً (تسجيل الوصول المعتاد 3:00 عصراً). جناحه المحجوز ما زال قيد التنظيف والتعقيم.',
    initialGuestDialogue: "I specifically arranged for early check-in before landing. I have a critical investment presentation in 2 hours and you are telling me my room isn't ready?!",
    initialGuestDialogueAr: 'لقد نسقت مسبقاً لتسجيل وصول مبكر قبل إقلاع طائرتي. لدي عرض استثماري هام بعد ساعتين وأنتم تخبرونني أن الغرفة غير جاهزة؟!',
    learningObjectives: ['Acknowledge high status without making excuses', 'Offer immediate hospitality lounge comfort and garment pressing', 'Provide concrete timeline resolution'],
    learningObjectivesAr: ['الاعتراف بمكانة الضيف دون أعذار', 'تقديم ضيافة الصالة التنفيذية وكي الملابس فوراً', 'تقديم حل زمني محدد ودقيق'],
    serviceStandardsTarget: ['Address guest by surname', 'Never say "no" or blame housekeeping', 'Anticipate unexpressed business needs'],
  },
  {
    id: 'SCENARIO-FB-01',
    department: 'FOOD_AND_BEVERAGE',
    title: 'Severe Nut Allergy Emergency in Fine Dining',
    titleAr: 'حالة حساسية مكسرات شديدة في مطعم راقٍ',
    guestName: 'Dr. Sarah Jenkins',
    guestProfile: 'Attending World Health Summit, highly vigilant about severe cross-contamination allergies',
    guestProfileAr: 'مشاركة في قمة الصحة العالمية، شديدة الحرص على تجنب تلوث الأطعمة بمسببات الحساسية',
    guestTemperament: 'DISTRESSED',
    scenarioContext: 'Guest explicitly stated she has an anaphylactic tree-nut allergy. The salad served contains crushed pine nuts as a garnish.',
    scenarioContextAr: 'ذكرت الضيفة صراحةً معاناتها من حساسية مفرطة للمكسرات، ومع ذلك تم تقديم طبق السلطة وفوقه صنوبر مطحون.',
    initialGuestDialogue: "Wait! Are these pine nuts on my salad? I repeated three times to your order taker that nuts could send me to the emergency room!",
    initialGuestDialogueAr: 'لحظة! هل هذا صنوبر على سلطتي؟ لقد كررت ثلاث مرات أن المكسرات قد تسبب لي صدمة حساسية تنقلني للمستشفى!',
    learningObjectives: ['Instant apology and table safety intervention', 'Immediate retrieval and quarantine of contaminated plate', 'Executive Chef direct table consultation'],
    learningObjectivesAr: ['اعتذار فوري وتدخل مباشر لسلامة الطاولة', 'سحب وعزل الطبق فوراً', 'استدعاء الشيف التنفيذي مباشرة لطاولة الضيفة'],
    serviceStandardsTarget: ['Immediate physical removal of risk item', 'Demonstrate sincere concern for guest safety', 'Full re-verification of entire table order'],
  },
  {
    id: 'SCENARIO-HK-01',
    department: 'HOUSEKEEPING',
    title: 'Disturbed Privacy During "Do Not Disturb" Status',
    titleAr: 'دخول الغرفة أثناء تفعيل علامة الرجاء عدم الإزعاج DND',
    guestName: 'H.E. Ambassador Mansour',
    guestProfile: 'Dignitary staying for multilateral diplomatic talks, working on confidential documents',
    guestProfileAr: 'سفير ودبلوماسي يعمل على ملفات سرية ويحتاج لأقصى درجات الخصوصية',
    guestTemperament: 'DEMANDING_VIP',
    scenarioContext: 'An attendant knocked and opened the room door with a master key to replenish bottled water while the electronic DND indicator was active.',
    scenarioContextAr: 'قام عامل الغرف بالطرق وفتح الباب بالمفتاح الرئيسي لتزويد المياه أثناء تفعيل إشارة الرجاء عدم الإزعاج الإلكترونية.',
    initialGuestDialogue: "Excuse me! My electronic Do Not Disturb sign is on! Why did your staff just open my door while I am in an active diplomatic conference call?",
    initialGuestDialogueAr: 'عفواً! إشارة عدم الإزعاج مفعلة! كيف يفتح موظفكم الباب وأنا في منتصف مكالمة دبلوماسية سرية؟!',
    learningObjectives: ['Immediate ownership and profuse apology', 'Investigation of DND indicator system malfunction vs staff procedure', 'Restoration of absolute privacy and security audit'],
    learningObjectivesAr: ['تحمل المسؤولية والاعتذار البالغ', 'فحص نظام الإشارة الإلكترونية وتدريب العاملين', 'استعادة الخصوصية الكاملة وإجراء تدقيق أمني'],
    serviceStandardsTarget: ['Total accountability without defensive posture', 'Management level follow-up within 15 minutes', 'Personalized recovery gesture'],
  },
  {
    id: 'SCENARIO-CON-01',
    department: 'CONCIERGE',
    title: 'VIP Private Falconry & Desert Safari Booking Crisis',
    titleAr: 'أزمة حجز رحلة صيد الصقور والسفاري لكبار الشخصيات',
    guestName: 'Lady Catherine Howard',
    guestProfile: 'High-net-worth VIP family visiting Saudi Arabia for the first time',
    guestProfileAr: 'عائلة رفيعة المستوى تزور المملكة العربية السعودية للمرة الأولى',
    guestTemperament: 'HURRIED_EXECUTIVE',
    scenarioContext: 'The third-party desert safari partner cancelled due to private camp maintenance 45 minutes before departure.',
    scenarioContextAr: 'ألغت الشركة الشريكة رحلة السفاري فجأة بسبب صيانة خاصة في المخيم قبل 45 دقيقة من الانطلاق.',
    initialGuestDialogue: "We have dressed our children and are waiting in the lobby. Your partner just texted that the excursion is cancelled?! You promised a flawless experience!",
    initialGuestDialogueAr: 'أطفالي جاهزون ونحن ننتظر في الردهة، وشريككم أرسل رسالة بإلغاء الرحلة؟! لقد وعدتمونا بتجربة استثنائية!',
    learningObjectives: ['Swift deployment of elite alternative itinerary (e.g. Private Diriyah / Al Bujairi Heritage VIP access)', 'Complimentary luxury transportation and private guide', 'Transforming potential disaster into a memorable highlight'],
    learningObjectivesAr: ['توفير برنامج بديل نخبوي فوراً (مثل جولة كبار الشخصيات في الدرعية ومطل البجيري)', 'توفير سيارة فاخرة ومرشد خاص مجاناً', 'تحويل الموقف إلى تجربة استثنائية تفوق التوقعات'],
    serviceStandardsTarget: ['Resourcefulness and immediate empowerment', 'Never blame third-party vendor', 'Deliver a higher-value alternative within 10 minutes'],
  },
]

export const HOTEL_ROLEPLAY_SCENARIOS = ROLEPLAY_SCENARIOS

export interface EvaluateTraineeTurnOptions {
  scenario: RoleplayScenario
  conversationHistory?: RoleplayMessage[]
  history?: RoleplayMessage[]
  latestTraineeResponse?: string
  traineeResponse?: string
  language?: 'en' | 'ar'
}

export interface GenerateGuestTurnOptions {
  scenario: RoleplayScenario
  conversationHistory?: RoleplayMessage[]
  history?: RoleplayMessage[]
  latestTraineeResponse?: string
  currentTemperament?: GuestTemperament
  language?: 'en' | 'ar'
}

export class RoleplayEngine {
  private static instance: RoleplayEngine

  private constructor() {}

  public static getInstance(): RoleplayEngine {
    if (!RoleplayEngine.instance) {
      RoleplayEngine.instance = new RoleplayEngine()
    }
    return RoleplayEngine.instance
  }

  /**
   * Generate next guest turn in dialogue
   */
  public async generateGuestTurn(
    scenarioOrOptions: RoleplayScenario | GenerateGuestTurnOptions,
    historyArg?: RoleplayMessage[],
    languageArg: 'en' | 'ar' = 'en'
  ): Promise<{ guestReply: string; newTemperament: GuestTemperament; nextTemperament: GuestTemperament }> {
    let scenario: RoleplayScenario
    let history: RoleplayMessage[]
    let language: 'en' | 'ar'

    if ('scenario' in scenarioOrOptions) {
      scenario = scenarioOrOptions.scenario
      history = scenarioOrOptions.conversationHistory || scenarioOrOptions.history || []
      language = scenarioOrOptions.language || 'en'
    } else {
      scenario = scenarioOrOptions
      history = historyArg || []
      language = languageArg
    }

    const prompt = `You are a 5-Star Hotel Guest in a live roleplay training simulation.
Guest Identity: ${scenario.guestName} (${scenario.guestProfile})
Current Temperament: ${scenario.guestTemperament}
Scenario: ${scenario.scenarioContext}

Conversation History:
${history.map((m) => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}

Based on the Trainee's latest response, generate the Guest's natural next spoken dialogue.
If the trainee demonstrated exceptional empathy, active listening, and concrete solutions, soften the guest's temperament toward CALM.
If the trainee gave robotic, defensive, or dismissive answers, maintain or escalate the guest's frustration.

Language: ${language === 'ar' ? 'Authentic Gulf/Saudi Arabic' : 'English'}

Return strict JSON:
{
  "guestReply": "...",
  "nextTemperament": "CALM" | "FRUSTRATED" | "DEMANDING_VIP" | "HURRIED_EXECUTIVE" | "DISTRESSED"
}`

    try {
      const res = await multiProviderRouter.execute<{
        guestReply: string
        nextTemperament: GuestTemperament
      }>(prompt, {
        task: 'roleplay',
        jsonMode: true,
        temperature: 0.8,
      })

      if (res.data?.guestReply) {
        const nextTemp = res.data.nextTemperament || 'CALM'
        return {
          guestReply: res.data.guestReply,
          newTemperament: nextTemp,
          nextTemperament: nextTemp,
        }
      }

      return {
        guestReply: res.rawText || 'Thank you for your assistance.',
        newTemperament: 'CALM',
        nextTemperament: 'CALM',
      }
    } catch {
      // Heuristic fallback dialogue
      const fallbackEn =
        "I appreciate your assistance. Please make sure this is handled quickly so I can prepare for my meeting."
      const fallbackAr =
        'أقدر اهتمامكم. أرجو إنهاء الأمر في أسرع وقت حتى أتمكن من التحضير لالتزاماتي.'

      return {
        guestReply: language === 'ar' ? fallbackAr : fallbackEn,
        newTemperament: 'CALM',
        nextTemperament: 'CALM',
      }
    }
  }

  public async generateGuestNextTurn(
    scenarioOrOptions: RoleplayScenario | GenerateGuestTurnOptions,
    historyArg?: RoleplayMessage[],
    languageArg: 'en' | 'ar' = 'en'
  ) {
    return this.generateGuestTurn(scenarioOrOptions, historyArg, languageArg)
  }

  /**
   * Evaluate the trainee's response against five-star standards and Saudi Karam
   */
  public async evaluateTraineeTurn(
    scenarioOrOptions: RoleplayScenario | EvaluateTraineeTurnOptions,
    historyArg?: RoleplayMessage[],
    traineeResponseArg?: string,
    languageArg: 'en' | 'ar' = 'en'
  ): Promise<RoleplayTurnEvaluation> {
    let scenario: RoleplayScenario
    let history: RoleplayMessage[]
    let traineeResponse: string
    let language: 'en' | 'ar'

    if ('scenario' in scenarioOrOptions) {
      scenario = scenarioOrOptions.scenario
      history = scenarioOrOptions.conversationHistory || scenarioOrOptions.history || []
      traineeResponse = scenarioOrOptions.latestTraineeResponse || scenarioOrOptions.traineeResponse || ''
      language = scenarioOrOptions.language || 'en'
    } else {
      scenario = scenarioOrOptions
      history = historyArg || []
      traineeResponse = traineeResponseArg || ''
      language = languageArg
    }

    const prompt = `You are an elite five-star Hotel Quality & Training Evaluator.
Scenario: ${scenario.title}
Guest: ${scenario.guestName} (${scenario.guestTemperament})
Target Standards: ${(scenario.serviceStandardsTarget || []).join(', ') || '5-Star Guest Engagement'}

Conversation History:
${history.map((m) => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}

Trainee's Latest Response: "${traineeResponse}"

Evaluate the trainee's response rigorously across 5 dimensions (0 to 100):
1. empathyScore: Warmth, sincere validation of guest emotions, eye contact mindset.
2. problemResolutionScore: Speed of solution, empowerment, actionable steps.
3. serviceStandardScore: 5-star phrasing (using guest surname, avoiding negative words like "no/policy").
4. saudiKaramScore: Saudi generosity, welcoming spirit, and hospitality grace.
5. deescalationScore: Lowering guest tension.

Return strict JSON:
{
  "empathyScore": 85,
  "problemResolutionScore": 90,
  "serviceStandardScore": 88,
  "saudiKaramScore": 92,
  "deescalationScore": 87,
  "overallScore": 88,
  "feedback": "Concise pedagogical feedback in English.",
  "feedbackAr": "Concise pedagogical feedback in Arabic.",
  "coachingTips": ["Tip 1", "Tip 2"],
  "suggestedAlternativeResponse": "Ideal 5-star response in English",
  "suggestedAlternativeResponseAr": "Ideal 5-star response in Arabic",
  "guestNextTemperament": "CALM" | "FRUSTRATED" | "DEMANDING_VIP" | "HURRIED_EXECUTIVE" | "DISTRESSED",
  "isResolved": true | false
}`

    try {
      const res = await multiProviderRouter.execute<RoleplayTurnEvaluation>(prompt, {
        task: 'roleplay',
        jsonMode: true,
        temperature: 0.3,
      })

      if (res.data?.overallScore !== undefined) {
        return res.data
      }
    } catch {
      // Fall through to heuristic evaluation
    }

    // Heuristic fallback evaluator
    const hasSurname = traineeResponse.toLowerCase().includes('mr.') || traineeResponse.toLowerCase().includes('أستاذ') || traineeResponse.toLowerCase().includes('سعادة')
    const hasApology = traineeResponse.toLowerCase().includes('apolog') || traineeResponse.toLowerCase().includes('اعتذر') || traineeResponse.toLowerCase().includes('آسف')
    const hasSolution = traineeResponse.toLowerCase().includes('immediate') || traineeResponse.toLowerCase().includes('right away') || traineeResponse.toLowerCase().includes('فوراً')

    const baseScore = 70 + (hasSurname ? 10 : 0) + (hasApology ? 10 : 0) + (hasSolution ? 10 : 0)

    return {
      empathyScore: hasApology ? 90 : 75,
      problemResolutionScore: hasSolution ? 92 : 70,
      serviceStandardScore: hasSurname ? 88 : 72,
      saudiKaramScore: 85,
      deescalationScore: 82,
      overallScore: Math.min(98, baseScore),
      feedback: 'Good professional composure. Ensure you use the guest surname and offer an immediate hospitality comfort.',
      feedbackAr: 'تعامل احترافي جيد. تذكر استخدام اللقب الرسمي للضيف وتقديم واجب الضيافة الفورية.',
      coachingTips: [
        'Always address the guest by surname throughout the conversation.',
        'Offer an immediate comfort (e.g. Executive Lounge access, Turkish coffee, dates) while resolving the issue.',
      ],
      suggestedAlternativeResponse: `Mr. Al-Sulaiman, please allow me to personally escort you to our Executive Lounge with our compliments while I expedite your suite.`,
      suggestedAlternativeResponseAr: `أهلاً بك سعادة الأستاذ خالد، يشرفني مرافقتك شخصياً إلى الصالة التنفيذية للاستراحة وتناول القهوة السعودية ريثما يتم تجهيز جناحك فوراً.`,
      guestNextTemperament: 'CALM',
      isResolved: baseScore >= 85,
    }
  }
}

export const roleplayEngine = RoleplayEngine.getInstance()
