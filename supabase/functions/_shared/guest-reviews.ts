import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { fetchWithRetry, generateRequestId, sleep } from './utils.ts'

export type ReviewIssueCategory =
  | 'cleanliness'
  | 'staff_behavior'
  | 'room_issues'
  | 'maintenance'
  | 'food_beverage'
  | 'internet_tech'
  | 'check_in_out'
  | 'reservation_billing'
  | 'noise'
  | 'safety_security'
  | 'amenities'
  | 'location'
  | 'value'
  | 'other'

export type ResponsibilityCode =
  | 'general_manager'
  | 'area_general_manager'
  | 'corporate_reputation_owner'
  | 'rooms_manager'
  | 'housekeeping_manager'
  | 'fnb_manager'
  | 'maintenance_manager'
  | 'it_manager'

export interface GuestReviewRecord {
  id: string
  property_id: string
  platform: string
  review_url: string | null
  reviewer_name: string | null
  review_title: string | null
  review_text: string
  review_language: string | null
  rating_normalized_10: number | null
  rating_normalized_5: number | null
  vip_flag: boolean | null
  source_id: string | null
  summary_en?: string | null
}

export interface GuestReviewIssue {
  category: ReviewIssueCategory
  summary_en: string
  summary_ar: string
  evidence_text: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  polarity: 'positive' | 'neutral' | 'negative' | 'mixed'
}

export interface GuestReviewAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  sentimentScore: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  language: string
  summaryEn: string
  summaryAr: string
  managerBriefEn: string
  managerBriefAr: string
  issues: GuestReviewIssue[]
  positiveMentions: string[]
  vipFlag: boolean
  recommendedActions: string[]
  draftResponseEn: string
  draftResponseAr: string
  critical: boolean
}

export interface GuestReviewContext {
  supabaseUrl: string
  serviceRoleKey: string
  appBaseUrl: string
}

export interface AssignmentResolution {
  assigneeProfileId: string | null
  backupProfileId: string | null
  assigneeName: string
  assigneeEmail: string | null
  backupEmail: string | null
}

const NEGATIVE_WORDS = [
  'dirty',
  'rude',
  'slow',
  'broken',
  'terrible',
  'poor',
  'bad',
  'awful',
  'smell',
  'issue',
  'problem',
  'complaint',
  'late',
  'unacceptable',
  'noisy',
  'unsafe',
  'wifi',
  'internet',
  'billing',
  'charge',
  'cold',
  'hot',
  'maintenance',
  'delay',
]

const POSITIVE_WORDS = [
  'great',
  'excellent',
  'amazing',
  'clean',
  'friendly',
  'helpful',
  'comfortable',
  'perfect',
  'wonderful',
  'pleasant',
  'fast',
  'delicious',
  'professional',
]

const CATEGORY_KEYWORDS: Record<ReviewIssueCategory, string[]> = {
  cleanliness: ['clean', 'dirty', 'dust', 'smell', 'housekeeping', 'linen', 'bathroom'],
  staff_behavior: ['staff', 'service', 'rude', 'friendly', 'helpful', 'attitude', 'behavior'],
  room_issues: ['room', 'bed', 'check-in', 'check in', 'checkout', 'check out', 'reservation', 'front desk'],
  maintenance: ['ac', 'air conditioning', 'maintenance', 'broken', 'repair', 'water', 'leak', 'elevator', 'hot water'],
  food_beverage: ['breakfast', 'food', 'restaurant', 'coffee', 'buffet', 'dinner', 'lunch', 'drink'],
  internet_tech: ['wifi', 'wi-fi', 'internet', 'network', 'tv', 'key card', 'technology'],
  check_in_out: ['check-in', 'check in', 'check-out', 'check out', 'arrival', 'departure'],
  reservation_billing: ['billing', 'charge', 'refund', 'reservation', 'booking', 'payment', 'invoice'],
  noise: ['noise', 'noisy', 'loud', 'disturbance'],
  safety_security: ['unsafe', 'security', 'danger', 'harassment', 'discrimination', 'abuse', 'accident'],
  amenities: ['pool', 'gym', 'amenities', 'spa', 'parking'],
  location: ['location', 'distance', 'area', 'access'],
  value: ['value', 'price', 'expensive', 'worth'],
  other: [],
}

const CATEGORY_TO_RESPONSIBILITY: Record<ReviewIssueCategory, ResponsibilityCode[]> = {
  cleanliness: ['housekeeping_manager'],
  staff_behavior: ['general_manager'],
  room_issues: ['rooms_manager'],
  maintenance: ['maintenance_manager'],
  food_beverage: ['fnb_manager'],
  internet_tech: ['it_manager'],
  check_in_out: ['rooms_manager'],
  reservation_billing: ['rooms_manager'],
  noise: ['general_manager'],
  safety_security: ['general_manager', 'maintenance_manager'],
  amenities: ['rooms_manager'],
  location: ['general_manager'],
  value: ['general_manager'],
  other: ['general_manager'],
}

export function cleanReviewText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function inferLanguage(text: string, explicitLanguage?: string | null): string {
  if (explicitLanguage && explicitLanguage.trim()) return explicitLanguage.trim().toLowerCase()
  return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en'
}

export function normalizeRating(
  rating: number | null | undefined,
  scale: number | null | undefined,
): { normalized5: number | null; normalized10: number | null } {
  if (rating == null || Number.isNaN(Number(rating))) {
    return { normalized5: null, normalized10: null }
  }

  const numericRating = Number(rating)
  const numericScale = Number(scale)
  const safeScale = Number.isFinite(numericScale) && numericScale > 0 ? numericScale : 5

  const normalized10 = Number(((numericRating / safeScale) * 10).toFixed(2))
  const normalized5 = Number((normalized10 / 2).toFixed(2))

  return {
    normalized5,
    normalized10,
  }
}

export async function computeReviewHash(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function extractJsonObject(payload: string): Record<string, unknown> | null {
  const trimmed = payload.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null

  try {
    return JSON.parse(trimmed.slice(start, end + 1))
  } catch {
    return null
  }
}

function summarizeText(text: string, maxLength = 240): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trim()}…`
}

function detectCategories(text: string): GuestReviewIssue[] {
  const lower = text.toLowerCase()
  const detected: GuestReviewIssue[] = []

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[ReviewIssueCategory, string[]]>) {
    if (category === 'other') continue
    const matchedKeyword = keywords.find((keyword) => lower.includes(keyword))
    if (!matchedKeyword) continue

    detected.push({
      category,
      summary_en: `${category.replace(/_/g, ' ')} concern mentioned by the guest.`,
      summary_ar: 'تم ذكر ملاحظة تحتاج إلى متابعة تشغيلية.',
      evidence_text: matchedKeyword,
      severity: ['safety_security', 'maintenance'].includes(category) ? 'high' : 'medium',
      confidence: 0.78,
      polarity: 'negative',
    })
  }

  return detected
}

export function buildFallbackAnalysis(
  review: GuestReviewRecord,
  tone: 'luxury' | 'business' | 'casual_hospitality' = 'business',
): GuestReviewAnalysisResult {
  const text = cleanReviewText(`${review.review_title ?? ''} ${review.review_text}`)
  const language = inferLanguage(text, review.review_language)
  const lower = text.toLowerCase()
  const issues = detectCategories(text)
  const negativeHits = NEGATIVE_WORDS.filter((word) => lower.includes(word)).length
  const positiveHits = POSITIVE_WORDS.filter((word) => lower.includes(word)).length
  const rating10 = review.rating_normalized_10 ?? 7

  let sentiment: GuestReviewAnalysisResult['sentiment'] = 'neutral'
  if (rating10 <= 6 || negativeHits > positiveHits) sentiment = 'negative'
  if (rating10 >= 8.5 && positiveHits >= negativeHits) sentiment = 'positive'
  if (negativeHits > 0 && positiveHits > 0) sentiment = 'mixed'

  let severity: GuestReviewAnalysisResult['severity'] = 'medium'
  if (rating10 <= 4 || issues.some((issue) => issue.category === 'safety_security')) severity = 'critical'
  else if (rating10 <= 6 || issues.length >= 2) severity = 'high'
  else if (rating10 >= 8) severity = 'low'

  const critical = Boolean(
    review.vip_flag ||
    rating10 <= 4 ||
    issues.some((issue) => issue.category === 'safety_security') ||
    /discrimination|abuse|harassment/.test(lower)
  )

  const finalIssues = issues.length > 0
    ? issues
    : sentiment === 'positive'
      ? []
      : [{
          category: 'other' as const,
          summary_en: 'General guest dissatisfaction requires review.',
          summary_ar: 'يوجد انطباع سلبي عام يحتاج إلى مراجعة.',
          evidence_text: summarizeText(text, 120),
          severity,
          confidence: 0.55,
          polarity: sentiment,
        }]

  const positiveMentions = POSITIVE_WORDS.filter((word) => lower.includes(word))
  const recommendedActions = Array.from(new Set(finalIssues.map((issue) => {
    const owners = CATEGORY_TO_RESPONSIBILITY[issue.category]
    return `Review ${issue.category.replace(/_/g, ' ')} handling and confirm follow-up with ${owners[0].replace(/_/g, ' ')}.`
  })))

  const summaryEn = sentiment === 'positive'
    ? `Guest feedback is largely positive. ${summarizeText(text)}`
    : `Guest feedback highlights service concerns. ${summarizeText(text)}`
  const summaryAr = sentiment === 'positive'
    ? 'المراجعة إيجابية بشكل عام مع إشادة بتجربة الضيف.'
    : 'تتضمن المراجعة ملاحظات تشغيلية تحتاج إلى متابعة سريعة.'

  const managerBriefEn = critical
    ? 'Critical review detected. Immediate manager acknowledgment and cross-department coordination are required.'
    : 'Review has been categorized and routed for operational follow-up.'
  const managerBriefAr = critical
    ? 'تم رصد مراجعة حرجة وتتطلب متابعة إدارية فورية وتنسيقاً بين الأقسام.'
    : 'تم تصنيف المراجعة وتوجيهها للجهة المسؤولة للمتابعة.'

  const toneLead = tone === 'luxury'
    ? 'Thank you for taking the time to share this detailed feedback.'
    : tone === 'casual_hospitality'
      ? 'Thanks for sharing your experience with us.'
      : 'Thank you for sharing your feedback.'

  const draftResponseEn = sentiment === 'positive'
    ? `${toneLead} We are pleased to know that your stay left a positive impression, and we appreciate your recognition of our team. We look forward to welcoming you again.`
    : `${toneLead} We are sorry that parts of your stay did not meet expectations. Your comments have been shared with the responsible team for immediate follow-up, and we appreciate the opportunity to improve.`

  const draftResponseAr = sentiment === 'positive'
    ? 'نشكر لكم مشاركتنا هذه الملاحظات الإيجابية، ويسعدنا أن إقامتكم كانت موفقة. نتطلع للترحيب بكم مجدداً.'
    : 'نشكركم على مشاركتنا ملاحظاتكم، ونعتذر عن الجوانب التي لم ترتقِ إلى توقعاتكم. تم تحويل ملاحظاتكم إلى الفريق المعني للمتابعة الفورية واتخاذ الإجراءات اللازمة.'

  return {
    sentiment,
    sentimentScore: Number((sentiment === 'positive' ? 0.9 : sentiment === 'negative' ? -0.8 : sentiment === 'mixed' ? -0.2 : 0.1).toFixed(2)),
    severity,
    language,
    summaryEn,
    summaryAr,
    managerBriefEn,
    managerBriefAr,
    issues: finalIssues,
    positiveMentions,
    vipFlag: Boolean(review.vip_flag),
    recommendedActions,
    draftResponseEn,
    draftResponseAr,
    critical,
  }
}

export function buildAiAnalysisPrompt(
  review: GuestReviewRecord,
  tone: 'luxury' | 'business' | 'casual_hospitality',
  propertyName: string,
): string {
  return `You are PHG Connect's guest review intelligence engine for a hotel group.

Analyze this guest review and return valid JSON only.

Property: ${propertyName}
Platform: ${review.platform}
Tone profile: ${tone}
Reviewer: ${review.reviewer_name ?? 'Guest'}
Rating /10: ${review.rating_normalized_10 ?? 'unknown'}
Language hint: ${review.review_language ?? 'unknown'}
VIP flag: ${review.vip_flag ? 'true' : 'false'}
Review title: ${review.review_title ?? ''}
Review text: ${review.review_text}

Required JSON shape:
{
  "sentiment": "positive|neutral|negative|mixed",
  "sentimentScore": number,
  "severity": "low|medium|high|critical",
  "language": "en|ar|...",
  "summaryEn": "string",
  "summaryAr": "string",
  "managerBriefEn": "string",
  "managerBriefAr": "string",
  "vipFlag": boolean,
  "critical": boolean,
  "positiveMentions": ["string"],
  "recommendedActions": ["string"],
  "issues": [
    {
      "category": "cleanliness|staff_behavior|room_issues|maintenance|food_beverage|internet_tech|check_in_out|reservation_billing|noise|safety_security|amenities|location|value|other",
      "summaryEn": "string",
      "summaryAr": "string",
      "evidenceText": "string",
      "severity": "low|medium|high|critical",
      "confidence": number,
      "polarity": "positive|neutral|negative|mixed"
    }
  ],
  "draftResponseEn": "string",
  "draftResponseAr": "string"
}`
}

export interface CallStructuredAiOptions {
  maxRetries?: number
  requestId?: string
}

export async function callStructuredAi(
  context: GuestReviewContext,
  prompt: string,
  options: CallStructuredAiOptions = {},
): Promise<Record<string, unknown> | null> {
  const { maxRetries = 3, requestId = generateRequestId() } = options
  const logPrefix = `[${requestId}]`
  
  const url = `${context.supabaseUrl}/functions/v1/process-ai-request`
  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${context.serviceRoleKey}`,
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
    body: JSON.stringify({
      task: 'chat',
      prompt,
      temperature: 0.1,
      max_tokens: 1800,
      request_id: requestId,
    }),
  }

  try {
    const response = await fetchWithRetry(url, fetchOptions, maxRetries, requestId)
    const payload = await response.json().catch(() => null)
    
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || `AI request failed with HTTP ${response.status}`)
    }

    console.log(`${logPrefix} AI request completed successfully`)
    return extractJsonObject(String(payload.result ?? payload.response ?? ''))
  } catch (error) {
    console.error(`${logPrefix} AI request failed after ${maxRetries} retries:`, error)
    throw error
  }
}

function coerceIssueCategory(value: unknown): ReviewIssueCategory {
  const allowed = new Set<ReviewIssueCategory>([
    'cleanliness',
    'staff_behavior',
    'room_issues',
    'maintenance',
    'food_beverage',
    'internet_tech',
    'check_in_out',
    'reservation_billing',
    'noise',
    'safety_security',
    'amenities',
    'location',
    'value',
    'other',
  ])

  if (typeof value === 'string' && allowed.has(value as ReviewIssueCategory)) {
    return value as ReviewIssueCategory
  }

  return 'other'
}

function coerceSeverity(value: unknown): GuestReviewAnalysisResult['severity'] {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical'
    ? value
    : 'medium'
}

function coerceSentiment(value: unknown): GuestReviewAnalysisResult['sentiment'] {
  return value === 'positive' || value === 'neutral' || value === 'negative' || value === 'mixed'
    ? value
    : 'neutral'
}

function normalizeAnalysisPayload(
  aiPayload: Record<string, unknown> | null,
  fallback: GuestReviewAnalysisResult,
): GuestReviewAnalysisResult {
  if (!aiPayload) return fallback

  const aiIssues = Array.isArray(aiPayload.issues)
    ? aiPayload.issues
        .map((issue) => {
          if (!issue || typeof issue !== 'object') return null
          const issueRecord = issue as Record<string, unknown>
          return {
            category: coerceIssueCategory(issueRecord.category),
            summary_en: String(issueRecord.summaryEn || issueRecord.summary_en || fallback.summaryEn),
            summary_ar: String(issueRecord.summaryAr || issueRecord.summary_ar || fallback.summaryAr),
            evidence_text: String(issueRecord.evidenceText || issueRecord.evidence_text || ''),
            severity: coerceSeverity(issueRecord.severity),
            confidence: Number(issueRecord.confidence || 0.75),
            polarity: coerceSentiment(issueRecord.polarity),
          } satisfies GuestReviewIssue
        })
        .filter(Boolean) as GuestReviewIssue[]
    : fallback.issues

  return {
    sentiment: coerceSentiment(aiPayload.sentiment),
    sentimentScore: Number(aiPayload.sentimentScore ?? fallback.sentimentScore),
    severity: coerceSeverity(aiPayload.severity),
    language: String(aiPayload.language || fallback.language || 'en'),
    summaryEn: String(aiPayload.summaryEn || fallback.summaryEn),
    summaryAr: String(aiPayload.summaryAr || fallback.summaryAr),
    managerBriefEn: String(aiPayload.managerBriefEn || fallback.managerBriefEn),
    managerBriefAr: String(aiPayload.managerBriefAr || fallback.managerBriefAr),
    issues: aiIssues.length > 0 ? aiIssues : fallback.issues,
    positiveMentions: Array.isArray(aiPayload.positiveMentions)
      ? aiPayload.positiveMentions.map(String).filter(Boolean)
      : fallback.positiveMentions,
    vipFlag: Boolean(aiPayload.vipFlag ?? fallback.vipFlag),
    recommendedActions: Array.isArray(aiPayload.recommendedActions)
      ? aiPayload.recommendedActions.map(String).filter(Boolean)
      : fallback.recommendedActions,
    draftResponseEn: String(aiPayload.draftResponseEn || fallback.draftResponseEn),
    draftResponseAr: String(aiPayload.draftResponseAr || fallback.draftResponseAr),
    critical: Boolean(aiPayload.critical ?? fallback.critical),
  }
}

export function formatRatingDisplay(review: Pick<GuestReviewRecord, 'rating_normalized_10' | 'rating_normalized_5'>): string {
  if (review.rating_normalized_10 != null) {
    return `${review.rating_normalized_10.toFixed(1)}/10`
  }

  if (review.rating_normalized_5 != null) {
    return `${review.rating_normalized_5.toFixed(1)}/5`
  }

  return 'Unrated'
}

export async function createGuestReviewAuditEvent(
  supabase: SupabaseClient,
  payload: {
    propertyId?: string | null
    reviewId?: string | null
    assignmentId?: string | null
    responseId?: string | null
    actorId?: string | null
    eventType: string
    eventPayload?: Record<string, unknown>
  },
) {
  await supabase.from('guest_review_audit_events').insert({
    property_id: payload.propertyId ?? null,
    review_id: payload.reviewId ?? null,
    assignment_id: payload.assignmentId ?? null,
    response_id: payload.responseId ?? null,
    actor_id: payload.actorId ?? null,
    event_type: payload.eventType,
    event_payload: payload.eventPayload ?? {},
  })
}

async function resolveFallbackAssignee(
  supabase: SupabaseClient,
  propertyId: string,
  responsibilityCode: ResponsibilityCode,
): Promise<AssignmentResolution> {
  if (responsibilityCode === 'general_manager') {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_roles!inner(role), user_properties!inner(property_id)')
      .eq('user_roles.role', 'property_manager')
      .eq('user_properties.property_id', propertyId)
      .limit(1)

    const row = data?.[0] as Record<string, unknown> | undefined
    return {
      assigneeProfileId: String(row?.id ?? '') || null,
      backupProfileId: null,
      assigneeName: String(row?.full_name || 'Property General Manager'),
      assigneeEmail: typeof row?.email === 'string' ? row.email : null,
      backupEmail: null,
    }
  }

  if (responsibilityCode === 'area_general_manager') {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_roles!inner(role)')
      .eq('user_roles.role', 'regional_admin')
      .limit(1)

    const row = data?.[0] as Record<string, unknown> | undefined
    return {
      assigneeProfileId: String(row?.id ?? '') || null,
      backupProfileId: null,
      assigneeName: String(row?.full_name || 'Area General Manager'),
      assigneeEmail: typeof row?.email === 'string' ? row.email : null,
      backupEmail: null,
    }
  }

  if (responsibilityCode === 'corporate_reputation_owner') {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_roles!inner(role)')
      .eq('user_roles.role', 'corporate_admin')
      .limit(1)

    const row = data?.[0] as Record<string, unknown> | undefined
    return {
      assigneeProfileId: String(row?.id ?? '') || null,
      backupProfileId: null,
      assigneeName: String(row?.full_name || 'Corporate Reputation Owner'),
      assigneeEmail: typeof row?.email === 'string' ? row.email : null,
      backupEmail: null,
    }
  }

  return {
    assigneeProfileId: null,
    backupProfileId: null,
    assigneeName: responsibilityCode.replace(/_/g, ' '),
    assigneeEmail: null,
    backupEmail: null,
  }
}

export async function resolveAssignmentOwner(
  supabase: SupabaseClient,
  propertyId: string,
  responsibilityCode: ResponsibilityCode,
): Promise<AssignmentResolution> {
  const { data: mappings } = await supabase
    .from('property_review_owner_mappings')
    .select(`
      primary_profile_id,
      backup_profile_id,
      primary_profile:profiles!property_review_owner_mappings_primary_profile_id_fkey(id, full_name, email),
      backup_profile:profiles!property_review_owner_mappings_backup_profile_id_fkey(id, full_name, email)
    `)
    .eq('property_id', propertyId)
    .eq('responsibility_code', responsibilityCode)
    .eq('is_active', true)
    .maybeSingle()

  const primaryProfile = mappings?.primary_profile as Record<string, unknown> | null | undefined
  const backupProfile = mappings?.backup_profile as Record<string, unknown> | null | undefined

  if (primaryProfile?.id || backupProfile?.id) {
    return {
      assigneeProfileId: typeof primaryProfile?.id === 'string' ? primaryProfile.id : null,
      backupProfileId: typeof backupProfile?.id === 'string' ? backupProfile.id : null,
      assigneeName: String(primaryProfile?.full_name || responsibilityCode.replace(/_/g, ' ')),
      assigneeEmail: typeof primaryProfile?.email === 'string' ? primaryProfile.email : null,
      backupEmail: typeof backupProfile?.email === 'string' ? backupProfile.email : null,
    }
  }

  return resolveFallbackAssignee(supabase, propertyId, responsibilityCode)
}

function collectResponsibilities(issues: GuestReviewIssue[]): Map<ResponsibilityCode, GuestReviewIssue[]> {
  const map = new Map<ResponsibilityCode, GuestReviewIssue[]>()

  for (const issue of issues) {
    const responsibilities = CATEGORY_TO_RESPONSIBILITY[issue.category] ?? ['general_manager']
    for (const responsibility of responsibilities) {
      const existing = map.get(responsibility) ?? []
      existing.push(issue)
      map.set(responsibility, existing)
    }
  }

  return map
}

export async function enqueueGuestReviewNotifications(
  supabase: SupabaseClient,
  review: GuestReviewRecord,
  propertyName: string,
  analysis: GuestReviewAnalysisResult,
  assignments: Array<Record<string, unknown>>,
  appBaseUrl: string,
) {
  const actionUrl = `${appBaseUrl.replace(/\/+$/, '')}/reviews?reviewId=${review.id}`
  const ratingDisplay = formatRatingDisplay(review)
  const issueCategories = Array.from(new Set(analysis.issues.map((issue) => issue.category))).join(', ')
  const { data: endpoints } = await supabase
    .from('guest_review_notification_endpoints')
    .select('*')
    .eq('is_active', true)

  const endpointRows = (endpoints ?? []) as Array<Record<string, unknown>>
  const queueRows: Array<Record<string, unknown>> = []

  for (const assignment of assignments) {
    const assigneeEmail = typeof assignment.assignee_email === 'string' ? assignment.assignee_email : null
    const assignmentId = String(assignment.id)
    const assigneeName = String(assignment.assignee_name || assignment.responsibility_code || 'Assigned owner')
    const responsibilityCode = String(assignment.responsibility_code || '')

    const payload = {
      propertyName,
      platform: review.platform,
      ratingDisplay,
      summaryEn: analysis.summaryEn,
      managerBriefEn: analysis.managerBriefEn,
      severity: analysis.severity,
      issueCategories,
      assigneeName,
      escalationLevel: assignment.escalation_level ?? 0,
      actionUrl,
      reviewId: review.id,
      reviewUrl: review.review_url,
      templateKey: analysis.critical ? 'review_critical_vip_alert' : 'review_negative_alert',
      recipientEmails: assigneeEmail ? [assigneeEmail] : [],
    }

    if (assigneeEmail) {
      queueRows.push({
        review_id: review.id,
        assignment_id: assignmentId,
        notification_kind: analysis.critical ? 'critical_alert' : 'review_alert',
        channel: 'email',
        payload,
      })
    }

    for (const endpoint of endpointRows) {
      const endpointPropertyId = typeof endpoint.property_id === 'string' ? endpoint.property_id : null
      const endpointScope = String(endpoint.scope || 'property')
      const endpointResponsibility = typeof endpoint.responsibility_code === 'string' ? endpoint.responsibility_code : null

      const propertyMatch = endpointPropertyId === null || endpointPropertyId === review.property_id
      const responsibilityMatch = endpointResponsibility === null || endpointResponsibility === responsibilityCode
      const scopeMatch = endpointScope === 'global'
        || endpointScope === 'executive'
        || (endpointScope === 'property' && endpointResponsibility === null)
        || endpointScope === 'department'

      if (!propertyMatch || !responsibilityMatch || !scopeMatch) continue

      queueRows.push({
        review_id: review.id,
        assignment_id: assignmentId,
        endpoint_id: endpoint.id,
        notification_kind: analysis.critical ? 'critical_alert' : 'review_alert',
        channel: endpoint.channel,
        payload: {
          ...payload,
          endpointLabel: endpoint.label,
          secretName: endpoint.secret_name,
          recipientEmails: Array.isArray(endpoint.recipients) ? endpoint.recipients : payload.recipientEmails,
        },
      })
    }
  }

  if (queueRows.length > 0) {
    await supabase.from('guest_review_notification_queue').insert(queueRows)
  }
}

export interface RunGuestReviewAnalysisOptions {
  force?: boolean
  actorId?: string | null
  maxRetries?: number
  requestId?: string
}

export async function runGuestReviewAnalysis(
  supabase: SupabaseClient,
  context: GuestReviewContext,
  reviewId: string,
  options: RunGuestReviewAnalysisOptions = {},
): Promise<GuestReviewAnalysisResult> {
  const requestId = options.requestId || generateRequestId()
  const logPrefix = `[${requestId}]`
  const { data: reviewData, error: reviewError } = await supabase
    .from('guest_reviews')
    .select('id, property_id, platform, review_url, reviewer_name, review_title, review_text, review_language, rating_normalized_10, rating_normalized_5, vip_flag, source_id, summary_en')
    .eq('id', reviewId)
    .single()

  if (reviewError || !reviewData) {
    throw new Error(reviewError?.message || `Review ${reviewId} not found`)
  }

  const review = reviewData as GuestReviewRecord

  const [propertyResult, settingResult] = await Promise.all([
    supabase.from('properties').select('name').eq('id', review.property_id).maybeSingle(),
    supabase.from('guest_review_property_settings').select('default_tone').eq('property_id', review.property_id).maybeSingle(),
  ])

  const propertyName = propertyResult.data?.name || 'PHG Property'
  const tone = (settingResult.data?.default_tone || 'business') as 'luxury' | 'business' | 'casual_hospitality'

  const fallback = buildFallbackAnalysis(review, tone)
  let analysis = fallback

  try {
    const prompt = buildAiAnalysisPrompt(review, tone, propertyName)
    const aiPayload = await callStructuredAi(context, prompt, {
      maxRetries: options.maxRetries ?? 3,
      requestId,
    })
    analysis = normalizeAnalysisPayload(aiPayload, fallback)
  } catch (error) {
    console.warn(`${logPrefix} guest-review-analysis fallback triggered:`, error instanceof Error ? error.message : String(error))
  }

  const dueHours = analysis.critical ? 12 : 24
  const dueAt = new Date(Date.now() + dueHours * 60 * 60 * 1000).toISOString()
  const responsibilities = collectResponsibilities(analysis.issues)

  if (responsibilities.size === 0) {
    responsibilities.set('general_manager', [])
  }

  if ((analysis.sentiment === 'negative' || (review.rating_normalized_10 ?? 10) <= 6) && !responsibilities.has('general_manager')) {
    responsibilities.set('general_manager', [])
  }

  await supabase
    .from('guest_review_issues')
    .delete()
    .eq('review_id', review.id)

  let issueRows: Array<Record<string, unknown>> = []
  if (analysis.issues.length > 0) {
    const { data, error: issueInsertError } = await supabase
      .from('guest_review_issues')
      .insert(
        analysis.issues.map((issue) => ({
          review_id: review.id,
          category: issue.category,
          label: issue.category.replace(/_/g, ' '),
          polarity: issue.polarity,
          severity: issue.severity,
          confidence: issue.confidence,
          evidence_text: issue.evidence_text,
          issue_summary_en: issue.summary_en,
          issue_summary_ar: issue.summary_ar,
        })),
      )
      .select('id, category')

    if (issueInsertError) {
      throw issueInsertError
    }

    issueRows = (data ?? []) as Array<Record<string, unknown>>
  }

  await supabase
    .from('guest_review_assignments')
    .delete()
    .eq('review_id', review.id)
    .neq('status', 'closed')

  const issueIdByCategory = new Map<ReviewIssueCategory, string[]>()
  for (const row of issueRows) {
    const category = coerceIssueCategory(row.category)
    const existing = issueIdByCategory.get(category) ?? []
    existing.push(String(row.id))
    issueIdByCategory.set(category, existing)
  }

  const assignmentRows: Array<Record<string, unknown>> = []

  for (const [responsibilityCode, responsibilityIssues] of responsibilities.entries()) {
    const fallbackResponsibility = responsibilityCode === 'it_manager' ? 'maintenance_manager' : responsibilityCode
    const owner = await resolveAssignmentOwner(supabase, review.property_id, responsibilityCode)
    const resolvedOwner = owner.assigneeProfileId || owner.backupProfileId
      ? owner
      : (fallbackResponsibility !== responsibilityCode
          ? await resolveAssignmentOwner(supabase, review.property_id, fallbackResponsibility)
          : owner)

    const categories = Array.from(new Set(responsibilityIssues.map((issue) => issue.category)))
    const issueIds = categories.flatMap((category) => issueIdByCategory.get(category) ?? [])
    const isSecondary = responsibilityCode === 'general_manager' && responsibilityIssues.length === 0
    const routingReason = isSecondary ? 'negative_gm_copy' : 'ai_category_detection'

    assignmentRows.push({
      review_id: review.id,
      property_id: review.property_id,
      responsibility_code: resolvedOwner.assigneeProfileId || resolvedOwner.backupProfileId ? responsibilityCode : fallbackResponsibility,
      assignee_profile_id: resolvedOwner.assigneeProfileId,
      backup_profile_id: resolvedOwner.backupProfileId,
      issue_categories: categories,
      issue_ids: issueIds,
      due_at: dueAt,
      is_secondary: isSecondary,
      routing_reason: routingReason,
      assignee_name: resolvedOwner.assigneeName,
      assignee_email: resolvedOwner.assigneeEmail,
      escalation_level: 0,
    })
  }

  const { data: insertedAssignments, error: assignmentInsertError } = await supabase
    .from('guest_review_assignments')
    .insert(assignmentRows.map(({ assignee_name, assignee_email, ...row }) => row))
    .select('id, responsibility_code, escalation_level')

  if (assignmentInsertError) {
    throw assignmentInsertError
  }

  const assignmentMap = new Map<string, Record<string, unknown>>()
  for (const row of (insertedAssignments ?? []) as Array<Record<string, unknown>>) {
    assignmentMap.set(String(row.responsibility_code), row)
  }

  const responsePayload = {
    review_id: review.id,
    selected_tone: tone,
    draft_response_en: analysis.draftResponseEn,
    draft_response_ar: analysis.draftResponseAr,
    metadata: { auto_generated: true },
  }

  const { data: existingResponse } = await supabase
    .from('guest_review_responses')
    .select('id')
    .eq('review_id', review.id)
    .maybeSingle()

  if (existingResponse?.id) {
    await supabase
      .from('guest_review_responses')
      .update(responsePayload)
      .eq('id', existingResponse.id)
  } else {
    await supabase.from('guest_review_responses').insert(responsePayload)
  }

  await supabase
    .from('guest_reviews')
    .update({
      sentiment: analysis.sentiment,
      sentiment_score: analysis.sentimentScore,
      severity: analysis.severity,
      review_language: analysis.language,
      summary_en: analysis.summaryEn,
      summary_ar: analysis.summaryAr,
      manager_brief_en: analysis.managerBriefEn,
      manager_brief_ar: analysis.managerBriefAr,
      positive_mentions: analysis.positiveMentions,
      recommended_actions: analysis.recommendedActions,
      vip_flag: analysis.vipFlag,
      critical_flag: analysis.critical,
      ai_analysis_status: 'completed',
      ai_analyzed_at: new Date().toISOString(),
      response_sla_due_at: dueAt,
      first_assigned_at: new Date().toISOString(),
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', review.id)

  await createGuestReviewAuditEvent(supabase, {
    propertyId: review.property_id,
    reviewId: review.id,
    actorId: options?.actorId ?? null,
    eventType: 'review_analyzed',
    eventPayload: {
      sentiment: analysis.sentiment,
      severity: analysis.severity,
      critical: analysis.critical,
      issueCount: analysis.issues.length,
    },
  })

  const hydratedAssignments = assignmentRows.map((row) => ({
    ...row,
    id: assignmentMap.get(String(row.responsibility_code))?.id || null,
  }))

  await enqueueGuestReviewNotifications(supabase, review, propertyName, analysis, hydratedAssignments, context.appBaseUrl)

  for (const assignment of hydratedAssignments) {
    await createGuestReviewAuditEvent(supabase, {
      propertyId: review.property_id,
      reviewId: review.id,
      assignmentId: typeof assignment.id === 'string' ? assignment.id : null,
      actorId: options?.actorId ?? null,
      eventType: 'assignment_created',
      eventPayload: {
        responsibilityCode: assignment.responsibility_code,
        dueAt,
        isSecondary: assignment.is_secondary,
      },
    })
  }

  return analysis
}
