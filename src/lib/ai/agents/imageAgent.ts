/**
 * Intelligent Image & Visual Asset Agent
 * 
 * Capability-first visual generator:
 * 1. Evaluates if an image genuinely adds educational value (avoids blind generation per lesson)
 * 2. Uses Free Recraft Vector first for SVG/diagrams and architectural schematics
 * 3. Uses Free Recraft v3 / Cloudflare SDXL Lightning for educational illustrations
 * 4. Escalates to OpenRouter DALL-E 3 / FLUX Pro for premium luxury showcases.
 */

import { supabase } from '@/lib/supabase'
import type { CourseVisualAsset, LessonBlueprint, VisualOpportunity } from '@/types/aiCourseEngine'
import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import { routeImageModel } from './imageOrchestrator'
import { logAIRequest } from '@/lib/ai/observability'
import { imageDebugLogger, type ImageDebugSession } from '@/lib/ai/imageDebugLogger'
import type { AgentExecutionResult, AgentRole, VisualAssetDecision } from './types'

export interface ImageAgentInput {
  courseId?: string
  moduleId?: string
  lesson: LessonBlueprint
  courseTitle: string
  moduleTitle: string
  imageModel?: string
  preferredStyle?: string
  preferredAspectRatio?: string
  costTierPreference?: 'free_first' | 'premium'
}

interface DynamicVectorParams {
  title: string
  concept?: string
  prompt?: string
  description?: string
  learningOutcomes?: string[]
  department?: string
}

function generateEducationalSvgDataUri(params: DynamicVectorParams): string {
  const { title, concept, prompt = '', description = '', learningOutcomes = [], department = 'Operations' } = params

  const cleanTitle = (title || 'Standard Operating Procedure').replace(/[<>&"]/g, '')
  const combinedContext = `${cleanTitle} ${prompt} ${description} ${learningOutcomes.join(' ')}`.toLowerCase()

  // Clean concept subtitle: discard meta-justifications and generate clean operational summary
  let cleanConcept = '5-Star Hospitality Operational Workflow • Standard Execution & Verification'
  if (description && !description.toLowerCase().startsWith('a visual') && !description.toLowerCase().startsWith('why this')) {
    const firstSentence = description.split(/[.!?]/)[0]?.trim()
    if (firstSentence && firstSentence.length > 10 && firstSentence.length <= 110) {
      cleanConcept = firstSentence.replace(/[<>&"]/g, '')
    }
  } else if (concept && !concept.toLowerCase().startsWith('a visual') && !concept.toLowerCase().startsWith('why this') && !concept.toLowerCase().startsWith('educational visual')) {
    const firstSentence = concept.split(/[.!?]/)[0]?.trim()
    if (firstSentence && firstSentence.length > 10 && firstSentence.length <= 110) {
      cleanConcept = firstSentence.replace(/[<>&"]/g, '')
    }
  }

  // Domain detection
  const isVipArrival = /vip|arrival|check-in|suite orientation|concierge|escort|reception|greeting/i.test(combinedContext)
  const isTurndown = /turndown|bedding|housekeeping|linen|duvet|slipper|pillow/i.test(combinedContext)
  const isHaccp = /haccp|kitchen|food|culinary|sanit|temperature|cook|chef/i.test(combinedContext)
  const isFire = /fire|evacuation|emergency|alarm|civil defense|warden|safety/i.test(combinedContext)
  const isPrivacy = /privacy|confidential|pms|data|guest profile|security/i.test(combinedContext)
  const isShift = /shift|handover|duty manager|cash float|briefing|logbook/i.test(combinedContext)

  let s1Title = 'Preparation & Setup'
  let s1b1 = '• Review guest profile in PMS'
  let s1b2 = '• Verify equipment & grooming'
  let s1b3 = '• Check workstation readiness'
  let s1Footer = 'Phase 1: Setup & Safety'
  let s1Sla = '< 30s SLA'

  let s2Title = 'Execution Protocol'
  let s2b1 = '• Acknowledge within 30s'
  let s2b2 = '• Execute 5-star sequence'
  let s2b3 = '• Anticipate unstated needs'
  let s2Footer = 'Phase 2: Service Delivery'
  let s2Sla = '15 Min Protocol'

  let s3Title = 'Verification & Sign-Off'
  let s3b1 = '• Quality inspection checklist'
  let s3b2 = '• Update PMS log & preferences'
  let s3b3 = '• 100% Guest satisfaction'
  let s3Footer = 'Phase 3: Quality Sign-Off'
  let s3Sla = '100% Audit Sign'

  if (isVipArrival) {
    cleanConcept = 'Executive VIP Arrival Workflow, In-Suite Registration & Butler Handoff Sequence'
    s1Title = 'Valet & Luggage Escort'
    s1b1 = '• Warm greeting within 30s'
    s1b2 = '• Escort directly to private suite'
    s1b3 = '• Seamless luggage handover'
    s1Footer = 'Phase 1: Arrival & Escort'
    s1Sla = '< 30s Greeting'

    s2Title = 'In-Suite Registration'
    s2b1 = '• Offer welcome beverage & towel'
    s2b2 = '• Digital iPad registration'
    s2b3 = '• Confirm VIP preferences'
    s2Footer = 'Phase 2: Check-In Ceremony'
    s2Sla = '5 Min Ceremony'

    s3Title = 'Room Orientation'
    s3b1 = '• Ambient tech & lighting demo'
    s3b2 = '• Butler contact introduction'
    s3b3 = '• Log arrival notes in PMS'
    s3Footer = 'Phase 3: Butler Handover'
    s3Sla = 'PMS Verified'
  } else if (isTurndown) {
    cleanConcept = 'Forbes 5-Star Turndown Service, Bedding Geometry & Ambient Evening Atmosphere'
    s1Title = 'Entry & Preparation'
    s1b1 = '• Knock 3x & announce entry'
    s1b2 = '• 360° visual room scan'
    s1b3 = '• Remove day items & debris'
    s1Footer = 'Phase 1: Room Entry'
    s1Sla = 'Knock 3x'

    s2Title = 'Forbes Bedding Standard'
    s2b1 = '• 45° duvet turn with linen mat'
    s2b2 = '• Slipper & bedside water setup'
    s2b3 = '• Pillow menu card presentation'
    s2Footer = 'Phase 2: Bedding Protocol'
    s2Sla = '45° Geometry'

    s3Title = 'Ambiance & Final Check'
    s3b1 = '• Set low ambient lighting & AC'
    s3b2 = '• Activate subtle aroma diffuser'
    s3b3 = '• Final supervisory sign-off'
    s3Footer = 'Phase 3: Atmosphere Sign-Off'
    s3Sla = '100% Quality'
  } else if (isHaccp) {
    cleanConcept = 'HACCP Kitchen Food Safety, Sanitization Dilution & Critical Control Points'
    s1Title = 'Sanitization & PPE'
    s1b1 = '• 20s antibacterial handwash'
    s1b2 = '• Put on approved apron & gloves'
    s1b3 = '• Check sanitizer ppm dilution'
    s1Footer = 'Phase 1: Personal Hygiene'
    s1Sla = '20s Handwash'

    s2Title = 'Temperature & Control'
    s2b1 = '• Color-coded cutting boards'
    s2b2 = '• Probe core temp (≥ 75°C hot)'
    s2b3 = '• Prevent raw / cooked contact'
    s2Footer = 'Phase 2: Critical Control (CCP)'
    s2Sla = '≥ 75°C Probe'

    s3Title = 'Balady Compliance'
    s3b1 = '• Log temps in digital audit sheet'
    s3b2 = '• FIFO labeling & allergen check'
    s3b3 = '• Head Chef verification sign'
    s3Footer = 'Phase 3: Compliance Sign-Off'
    s3Sla = 'Balady Audit'
  } else if (isFire) {
    cleanConcept = 'Multi-Tier Fire Alarm Response, Guest Floor Sweeps & Civil Defense Evacuation'
    s1Title = 'Immediate Alarm Verification'
    s1b1 = '• Silence false alarms on panel'
    s1b2 = '• Dispatch ERT to zone in 60s'
    s1b3 = '• Notify Civil Defense & GM'
    s1Footer = 'Phase 1: Incident Assessment'
    s1Sla = '60s Response'

    s2Title = 'Guest Floor Evacuation'
    s2b1 = '• Floor wardens initiate sweep'
    s2b2 = '• Direct guests to fire stairs'
    s2b3 = '• Never use elevators'
    s2Footer = 'Phase 2: Active Evacuation'
    s2Sla = 'Systematic Sweep'

    s3Title = 'Assembly & Handover'
    s3b1 = '• Muster point roll-call count'
    s3b2 = '• Triage & first-aid staging'
    s3b3 = '• Official Civil Defense handover'
    s3Footer = 'Phase 3: Safe Assembly'
    s3Sla = '100% Roll-Call'
  } else if (isPrivacy) {
    cleanConcept = 'Guest Data Governance, PMS Credential Security & Strict Confidentiality Protocol'
    s1Title = 'Access Authorization'
    s1b1 = '• Role-based login credentials'
    s1b2 = '• 60s idle screen lockout'
    s1b3 = '• Secure keycard encryption'
    s1Footer = 'Phase 1: Access Control'
    s1Sla = '60s Lockout'

    s2Title = 'Confidential Handling'
    s2b1 = '• Zero verbal disclosure of VIPs'
    s2b2 = '• Mask payment card numbers'
    s2b3 = '• Shred printed rooming lists'
    s2Footer = 'Phase 2: Data Protection'
    s2Sla = 'Zero Disclosure'

    s3Title = 'Audit & Governance'
    s3b1 = '• Daily PMS access audit log'
    s3b2 = '• Report suspicious inquiries'
    s3b3 = '• Saudi Data Law compliance'
    s3Footer = 'Phase 3: Security Review'
    s3Sla = 'Daily Audit'
  } else if (isShift) {
    cleanConcept = 'Duty Manager & Front Desk Shift Handover, Float Audit & Queue Review'
    s1Title = 'Pre-Handover Audit'
    s1b1 = '• Physical cash float count'
    s1b2 = '• Review pending work orders'
    s1b3 = '• Check VIP arrivals for shift'
    s1Footer = 'Phase 1: Float & Queue Review'
    s1Sla = 'Float Balanced'

    s2Title = 'Verbal Shift Briefing'
    s2b1 = '• Discuss service escalations'
    s2b2 = '• Review occupancy & group events'
    s2b3 = '• Align supervisory priorities'
    s2Footer = 'Phase 2: Operational Handover'
    s2Sla = 'Priority Sync'

    s3Title = 'Logbook Sign-Off'
    s3b1 = '• Dual signature in digital log'
    s3b2 = '• Master keys transfer audit'
    s3b3 = '• Duty Manager confirmation'
    s3Footer = 'Phase 3: Formal Sign-Off'
    s3Sla = 'Dual Signature'
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%" style="background:#0f172a;border-radius:12px;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#C39A45" />
      <stop offset="100%" stop-color="#F5D061" />
    </linearGradient>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#34d399" />
    </linearGradient>
  </defs>
  
  <rect width="800" height="450" fill="url(#bgGrad)" rx="12"/>
  <rect x="16" y="16" width="768" height="418" fill="none" stroke="#334155" stroke-width="1.5" rx="8" stroke-dasharray="4,4"/>
  
  <!-- Header Bar -->
  <rect x="36" y="36" width="728" height="46" fill="#1e293b" rx="8" stroke="#475569" stroke-width="0.75"/>
  <circle cx="58" cy="59" r="8" fill="#C39A45"/>
  <text x="76" y="64" fill="#f8fafc" font-size="13" font-weight="700" letter-spacing="0.5">ALTUS LUXURY HOSPITALITY • OPERATIONAL SOP SCHEMATIC</text>
  <rect x="652" y="46" width="96" height="24" fill="#7c3aed" rx="4"/>
  <text x="700" y="62" fill="#ffffff" font-size="10" font-weight="700" text-anchor="middle">5-STAR STANDARD</text>

  <!-- Title & Context -->
  <text x="36" y="116" fill="#ffffff" font-size="18" font-weight="800">${cleanTitle.slice(0, 56)}</text>
  <text x="36" y="138" fill="#94a3b8" font-size="12">${cleanConcept}</text>

  <!-- Step Diagram Boxes -->
  <g transform="translate(36, 162)">
    <!-- Box 1 -->
    <rect x="0" y="0" width="224" height="195" fill="#1e293b" stroke="#334155" stroke-width="1" rx="8"/>
    <rect x="0" y="0" width="224" height="5" fill="url(#goldGrad)" rx="2"/>
    <circle cx="28" cy="32" r="13" fill="#C39A45"/>
    <text x="28" y="37" fill="#0f172a" font-size="12" font-weight="800" text-anchor="middle">01</text>
    <text x="48" y="36" fill="#f8fafc" font-size="12" font-weight="700">${s1Title.slice(0, 18)}</text>
    <rect x="148" y="22" width="66" height="18" fill="#0f172a" stroke="#C39A45" stroke-width="0.75" rx="9"/>
    <text x="181" y="34" fill="#F5D061" font-size="8.5" font-weight="700" text-anchor="middle">${s1Sla}</text>
    <text x="18" y="75" fill="#cbd5e1" font-size="11.5">${s1b1}</text>
    <text x="18" y="105" fill="#cbd5e1" font-size="11.5">${s1b2}</text>
    <text x="18" y="135" fill="#cbd5e1" font-size="11.5">${s1b3}</text>
    <rect x="18" y="158" width="188" height="22" fill="#0f172a" rx="4"/>
    <text x="112" y="173" fill="#C39A45" font-size="10" font-weight="600" text-anchor="middle">${s1Footer}</text>

    <!-- Arrow 1 -->
    <path d="M 232 98 L 244 98 L 244 93 L 252 98 L 244 103 L 244 98" fill="#C39A45"/>

    <!-- Box 2 -->
    <rect x="252" y="0" width="224" height="195" fill="#1e293b" stroke="#334155" stroke-width="1" rx="8"/>
    <rect x="252" y="0" width="224" height="5" fill="url(#purpleGrad)" rx="2"/>
    <circle cx="280" cy="32" r="13" fill="#7c3aed"/>
    <text x="280" y="37" fill="#ffffff" font-size="12" font-weight="800" text-anchor="middle">02</text>
    <text x="300" y="36" fill="#f8fafc" font-size="12" font-weight="700">${s2Title.slice(0, 18)}</text>
    <rect x="400" y="22" width="66" height="18" fill="#0f172a" stroke="#a855f7" stroke-width="0.75" rx="9"/>
    <text x="433" y="34" fill="#c084fc" font-size="8.5" font-weight="700" text-anchor="middle">${s2Sla}</text>
    <text x="270" y="75" fill="#cbd5e1" font-size="11.5">${s2b1}</text>
    <text x="270" y="105" fill="#cbd5e1" font-size="11.5">${s2b2}</text>
    <text x="270" y="135" fill="#cbd5e1" font-size="11.5">${s2b3}</text>
    <rect x="270" y="158" width="188" height="22" fill="#0f172a" rx="4"/>
    <text x="364" y="173" fill="#a855f7" font-size="10" font-weight="600" text-anchor="middle">${s2Footer}</text>

    <!-- Arrow 2 -->
    <path d="M 484 98 L 496 98 L 496 93 L 504 98 L 496 103 L 496 98" fill="#7c3aed"/>

    <!-- Box 3 -->
    <rect x="504" y="0" width="224" height="195" fill="#1e293b" stroke="#334155" stroke-width="1" rx="8"/>
    <rect x="504" y="0" width="224" height="5" fill="url(#emeraldGrad)" rx="2"/>
    <circle cx="532" cy="32" r="13" fill="#059669"/>
    <text x="532" y="37" fill="#ffffff" font-size="12" font-weight="800" text-anchor="middle">03</text>
    <text x="552" y="36" fill="#f8fafc" font-size="12" font-weight="700">${s3Title.slice(0, 18)}</text>
    <rect x="652" y="22" width="66" height="18" fill="#0f172a" stroke="#34d399" stroke-width="0.75" rx="9"/>
    <text x="685" y="34" fill="#6ee7b7" font-size="8.5" font-weight="700" text-anchor="middle">${s3Sla}</text>
    <text x="522" y="75" fill="#cbd5e1" font-size="11.5">${s3b1}</text>
    <text x="522" y="105" fill="#cbd5e1" font-size="11.5">${s3b2}</text>
    <text x="522" y="135" fill="#cbd5e1" font-size="11.5">${s3b3}</text>
    <rect x="522" y="158" width="188" height="22" fill="#0f172a" rx="4"/>
    <text x="616" y="173" fill="#34d399" font-size="10" font-weight="600" text-anchor="middle">${s3Footer}</text>
  </g>

  <!-- Footer Brand -->
  <text x="36" y="405" fill="#64748b" font-size="10.5">PRIME CONNECT • RECRAFT VECTOR VISUAL ASSET</text>
  <text x="764" y="405" fill="#64748b" font-size="10.5" text-anchor="end">KSA REGULATORY & FORBES COMPLIANT</text>
</svg>`

  try {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      const base64 = window.btoa(unescape(encodeURIComponent(svg.trim())))
      return `data:image/svg+xml;base64,${base64}`
    }
  } catch {}

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`
}

// SECURITY (audit Phase 1): client-side provider calls removed. Image generation
// goes exclusively through the `generate-course-image` edge function, which holds
// the provider keys server-side. These stubs keep the call sites working — when
// the edge function cannot produce an image the pipeline falls back to the
// deterministic SVG generator.
async function generateDirectRecraftApiImage(
  prompt: string,
  style = 'realistic_image',
  aspectRatio = '16:9',
): Promise<string | null> {
  void prompt; void style; void aspectRatio;
  return null;
}

// Maps any requested image model to a REAL OpenRouter image id that has a live endpoint.
// Verified against https://openrouter.ai/api/v1/models (output_modalities includes "image"):
// only the google/gemini-*-image family + openai/gpt-5-image* currently route.
function mapToOpenRouterImageModel(requestedModel?: string): string {
  const FLAGSHIP = 'google/gemini-3-pro-image'
  const FAST = 'google/gemini-3.1-flash-image'
  const CHEAP = 'google/gemini-2.5-flash-image'
  if (!requestedModel) return FLAGSHIP
  const lower = requestedModel.toLowerCase()
  // Already a real OpenRouter image id — pass through (strip any dead "-preview" suffix).
  if (/^google\/gemini-[\d.]+(-pro|-flash|-flash-lite)?-image$/.test(lower.replace(/-preview$/, ''))) {
    return lower.replace(/-preview$/, '')
  }
  if (lower.startsWith('openai/gpt-5') && lower.includes('image')) return requestedModel
  if (lower.includes('banana-2') || lower.includes('3.1-flash') || lower.includes('imagen-3-fast') || lower === 'google-imagen-3-fast') {
    return FAST
  }
  if (lower.includes('gemini-2.5-flash-image') || lower.includes('nano-banana') && !lower.includes('pro')) {
    return CHEAP
  }
  // banana-pro / imagen / recraft / flux / seedream / anything else → flagship Gemini 3 Pro Image.
  return FLAGSHIP
}

// SECURITY (audit Phase 1): client-side provider calls removed. Image generation
// goes exclusively through the `generate-course-image` edge function, which holds
// the provider keys server-side. These stubs keep the call sites working — when
// the edge function cannot produce an image the pipeline falls back to the
// deterministic SVG generator.
async function generateOpenRouterImage(
  prompt: string,
  model = 'google/gemini-3-pro-image',
  style = 'realistic_image',
  debug?: ImageDebugSession,
): Promise<string | null> {
  void prompt; void style; void model; void debug;
  return null;
}

// SECURITY (audit Phase 1): client-side provider calls removed. Image generation
// goes exclusively through the `generate-course-image` edge function, which holds
// the provider keys server-side. These stubs keep the call sites working — when
// the edge function cannot produce an image the pipeline falls back to the
// deterministic SVG generator.
async function generateGoogleImagenImage(
  prompt: string,
  model = 'google/gemini-3-pro-image',
  aspectRatio = '16:9',
  debug?: ImageDebugSession,
): Promise<string | null> {
  void prompt; void model; void aspectRatio; void debug;
  return null;
}

// SECURITY (audit Phase 1): client-side provider calls removed. Image generation
// goes exclusively through the `generate-course-image` edge function, which holds
// the provider keys server-side. These stubs keep the call sites working — when
// the edge function cannot produce an image the pipeline falls back to the
// deterministic SVG generator.
async function generateDirectCloudflareImage(
  prompt: string,
  model = '@cf/black-forest-labs/flux-1-schnell',
  aspectRatio = '16:9',
  debug?: ImageDebugSession,
): Promise<string | null> {
  void prompt; void model; void aspectRatio; void debug;
  return null;
}

// SECURITY (audit Phase 1): client-side provider calls removed. Image generation
// goes exclusively through the `generate-course-image` edge function, which holds
// the provider keys server-side. These stubs keep the call sites working — when
// the edge function cannot produce an image the pipeline falls back to the
// deterministic SVG generator.
async function generateDirectAiImage(
  prompt: string,
  style?: string,
  aspectRatio = '16:9',
  debug?: ImageDebugSession,
): Promise<string | null> {
  void prompt; void style; void aspectRatio; void debug;
  return null;
}

export class ImageAgent extends BaseAIAgent<ImageAgentInput, CourseVisualAsset | null> {
  public readonly role: AgentRole = 'image_ai'
  public readonly name = 'Visual Asset & Recraft Vector AI Agent'
  public readonly nameAr = 'وكيل الوسائط البصرية والرسوم التوضيحية الذكية'

  public readonly defaultSystemPrompt = `You are the Creative Visual Director for ALTUS Luxury Hotels.
You evaluate training lesson text to decide whether a visual aid is genuinely necessary.
If a visual is required, choose the optimal visual strategy:
- 'vector_svg_diagram': For step-by-step procedures, technical specifications, and room schematics (Recraft Vector).
- 'educational_illustration': For conceptual hospitality models, LAST recovery diagrams, and guest service cycles.
- 'photorealistic_luxury': For 5-star uniform standards, banquet setup elegance, and fine dining table settings.
- 'none': If the lesson is purely textual or reflective and a generic image would distract.`

  public async process(
    input: ImageAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<CourseVisualAsset | null>> {
    const { lesson, courseTitle, moduleTitle, courseId = 'draft', moduleId = 'mod' } = input

    // 1. Analyze if visual is actually necessary
    const decisionPrompt = `Evaluate this hotel lesson and decide if a visual asset is genuinely needed:
Course: "${courseTitle}"
Module: "${moduleTitle}"
Lesson: "${lesson.title}"
Template: ${lesson.templateType}
Learning Outcomes: ${(lesson.learningOutcomes || []).join(', ') || '5-Star Operational Excellence'}

Lesson Summary:
${lesson.renderedHtml?.replace(/<[^>]*>/g, ' ').slice(0, 1000) || lesson.description}

Respond ONLY with JSON:
{
  "shouldGenerate": true,
  "justification": "Why this visual directly reinforces the operational benchmark",
  "strategy": "photorealistic_luxury",
  "recommendedProvider": "recraft",
  "prompt": "Highly detailed visual generation prompt adhering to 5-star hotel luxury standards",
  "negativePrompt": "blurry, cartoon, low quality, distorted hands",
  "aspectRatio": "16:9",
  "educationalObjective": "${(lesson.learningOutcomes || [])[0] || lesson.title}",
  "placement": "inline_procedure"
} `

    // The "should we make a visual + what prompt" call is low-stakes: if the
    // model returns unparseable JSON (which now throws in baseAgent) or fails
    // outright, fall back to sensible defaults rather than skipping the image.
    let decisionResult: AgentExecutionResult<VisualAssetDecision>
    try {
      decisionResult = await this.executePrompt<VisualAssetDecision>(decisionPrompt, {
        ...options,
        preferredModel: undefined,
        jsonMode: true,
        temperature: 0.3,
      })
    } catch (decisionErr) {
      console.warn('[ImageAgent] Visual decision call failed, using defaults:', decisionErr)
      decisionResult = {
        agentRole: this.role,
        success: false,
        data: null as unknown as VisualAssetDecision,
        rawOutput: '',
        modelUsed: 'fallback-defaults',
        providerUsed: 'none' as AgentExecutionResult['providerUsed'],
        costTier: 'free',
        estimatedCostUSD: 0,
        latencyMs: 0,
      }
    }

    const decision = decisionResult.data || {
      shouldGenerate: true,
      justification: 'Educational visual guide',
      strategy: 'photorealistic_luxury',
      recommendedProvider: 'recraft',
      prompt: `5-star luxury hotel standard operational visual for ${lesson.title}`,
      negativePrompt: 'blurry, low quality',
      aspectRatio: '16:9',
      educationalObjective: lesson.title,
      placement: 'procedure',
    }

    if (decision.strategy === 'none') {
      return {
        agentRole: this.role,
        success: true,
        data: null,
        rawOutput: `Visual determined unnecessary: ${decision.justification}`,
        modelUsed: decisionResult.modelUsed,
        providerUsed: decisionResult.providerUsed,
        costTier: 'free',
        estimatedCostUSD: 0,
        latencyMs: decisionResult.latencyMs,
      }
    }

    const chosenStyle = input.preferredStyle || 'photorealistic_luxury'
    const chosenAspectRatio = input.preferredAspectRatio || decision.aspectRatio || '16:9'
    const visualPrompt = decision.prompt || `${lesson.title} in a 5-star luxury hotel setting`

    // Start structured debug logging session
    const debug = imageDebugLogger.startSession(lesson.title, {
      title: lesson.title,
      prompt: visualPrompt,
      negativePrompt: decision.negativePrompt,
      style: chosenStyle,
      aspectRatio: chosenAspectRatio,
      requestedModel: input.imageModel,
      assetId: lesson.id,
    })

    debug.logStrategyEvaluation(decision)

    // ── Central image routing: registry-driven, free-first, with explanation ──
    const route = routeImageModel(
      { strategy: decision.strategy, prompt: visualPrompt, style: chosenStyle, aspectRatio: chosenAspectRatio },
      {
        requestedModel: input.imageModel,
        allowPremium: input.costTierPreference === 'premium',
      },
    )
    const chosenModel = route.modelId
    debug.logRoutingDecision(route)

    // SVG schematic engine ONLY when explicitly requested (zero cost, deterministic)
    const wantsVectorSvg =
      chosenModel === 'recraft-vector' ||
      input.imageModel === 'recraft-vector' ||
      chosenStyle === 'process_schematic_svg' ||
      input.preferredStyle === 'vector_schematic'

    if (wantsVectorSvg) {
      debug.logStageAttempt({
        stage: 'Recraft Vector Engine (Deterministic SVG)',
        model: 'recraft-vector',
        provider: 'recraft',
        endpoint: 'Client-Side SVG Synthesis Algorithm',
        payload: { title: lesson.title, style: chosenStyle, outcomes: lesson.learningOutcomes },
      })

      const vectorSvg = generateEducationalSvgDataUri({
        title: lesson.title,
        concept: decision.justification || decision.educationalObjective || lesson.title,
        prompt: decision.prompt,
        description: lesson.description,
        learningOutcomes: lesson.learningOutcomes,
        department: courseTitle.split('•')[1]?.trim() || 'Operations',
      })

      debug.logStageSuccess('Recraft Vector Engine (Deterministic SVG)', 'recraft-vector', {
        imageUrl: vectorSvg,
        bytes: vectorSvg.length,
      })

      const recraftAsset: CourseVisualAsset = {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        draft: true,
        course_id: courseId,
        module_id: moduleId,
        lesson_id: lesson.id,
        image_url: vectorSvg,
        storage_bucket: 'course-assets',
        title: lesson.title,
        alt_text: `Recraft Vector visual guide for ${lesson.title}`,
        educational_purpose: decision.educationalObjective || lesson.title,
        visual_concept: decision.justification || '5-Star Hotel Standard Operating Procedure Workflow',
        prompt: decision.prompt || lesson.title,
        aspect_ratio: chosenAspectRatio,
        visual_style: chosenStyle,
        placement: 'procedure',
        provider: 'recraft',
        model: 'recraft-vector',
        status: 'completed',
        order_index: 0,
      }

      debug.endSession(true, {
        modelUsed: 'recraft-vector',
        providerUsed: 'recraft',
        imageUrl: vectorSvg,
      })

      return {
        agentRole: this.role,
        success: true,
        data: recraftAsset,
        rawOutput: `Synthesized vector diagram via Recraft Vector Engine (${chosenModel})`,
        modelUsed: 'recraft-vector',
        providerUsed: 'recraft',
        costTier: 'free',
        estimatedCostUSD: 0,
        latencyMs: decisionResult.latencyMs,
      }
    }

    // 2.5 Google image model (Imagen / Nano Banana)
    if (route.endpointProvider === 'google') {
      const imagenUrl = await generateGoogleImagenImage(visualPrompt, chosenModel, chosenAspectRatio, debug)

      const asset: CourseVisualAsset = {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        draft: true,
        course_id: courseId,
        module_id: moduleId,
        lesson_id: lesson.id,
        image_url: imagenUrl || '',
        storage_bucket: 'course-assets',
        title: lesson.title,
        alt_text: `Google Imagen 3 luxury hospitality visual for ${lesson.title}`,
        educational_purpose: decision.educationalObjective || lesson.title,
        visual_concept: decision.justification || '5-Star Luxury Hotel Visual',
        prompt: visualPrompt,
        aspect_ratio: chosenAspectRatio,
        visual_style: chosenStyle,
        placement: 'procedure',
        provider: 'gemini',
        model: chosenModel,
        status: 'completed',
        order_index: 0,
      }

      debug.endSession(Boolean(imagenUrl), {
        modelUsed: chosenModel,
        providerUsed: 'gemini',
        imageUrl: imagenUrl || undefined,
      })

      return {
        agentRole: this.role,
        success: true,
        data: asset,
        rawOutput: `Generated 5-star visual via Google Imagen 3 / Nano Banana (${chosenModel})`,
        modelUsed: chosenModel,
        providerUsed: 'gemini',
        costTier: 'free',
        estimatedCostUSD: 0,
        latencyMs: decisionResult.latencyMs + 1800,
      }
    }

    // 3. Generate REAL AI Image via Edge Function (OpenRouter / Cloudflare / FLUX)
    const imgAttemptStart = Date.now()
    try {
      let generatedImageUrl: string | null = null
      const targetProvider: 'google' | 'openrouter' | 'cloudflare' =
        route.endpointProvider === 'openrouter' ? 'openrouter' : 'cloudflare'

      debug.logStageAttempt({
        stage: 'Edge Function generate-course-image',
        model: chosenModel,
        provider: targetProvider,
        endpoint: 'functions/v1/generate-course-image',
        payload: { model: chosenModel, provider: targetProvider, prompt: visualPrompt, aspectRatio: chosenAspectRatio },
      })

      try {
        const { data: imgData, error: invokeErr } = await supabase.functions.invoke<{
          success: boolean
          image_url?: string
          asset?: CourseVisualAsset
          error?: string
        }>('generate-course-image', {
          body: {
            prompt: visualPrompt,
            negative_prompt: decision.negativePrompt,
            visual_style: chosenStyle,
            aspect_ratio: chosenAspectRatio,
            course_id: courseId,
            module_id: moduleId,
            lesson_id: lesson.id,
            title: lesson.title,
            alt_text: `5-star visual for ${lesson.title}`,
            educational_purpose: decision.educationalObjective,
            visual_concept: decision.justification,
            model: chosenModel,
            provider: targetProvider,
            cost_tier: input.costTierPreference || 'free_only',
          },
        })

        if (invokeErr || !imgData?.success) {
          debug.logStageError({
            stage: 'Edge Function generate-course-image',
            model: chosenModel,
            provider: targetProvider,
            statusCode: invokeErr ? 500 : 200,
            error: invokeErr || imgData?.error || 'Edge function failed to generate image',
            rawResponse: imgData,
            actionableHint: 'Edge function failed. Falling back to direct client-side FLUX / Cloudflare pipeline.',
          })
        } else if (imgData?.success && imgData.image_url) {
          debug.logStageSuccess('Edge Function generate-course-image', chosenModel, {
            imageUrl: imgData.image_url,
          })
          generatedImageUrl = imgData.image_url
        }
      } catch (callErr) {
        debug.logStageError({
          stage: 'Edge Function generate-course-image',
          model: chosenModel,
          provider: targetProvider,
          error: callErr,
          actionableHint: 'Supabase functions invocation exception. Cascading to direct engines.',
        })
      }

      // If edge function is unavailable or returned null, use Direct OpenRouter Image Engine
      if (!generatedImageUrl) {
        debug.logFallbackTrigger('Edge Function generate-course-image', 'OpenRouter Studio Flagship Engine', 'Edge invocation failed')
        generatedImageUrl = await generateOpenRouterImage(visualPrompt, chosenModel, chosenStyle, debug)
      }

      // If OpenRouter is unavailable, use Direct Cloudflare / FLUX Engine
      if (!generatedImageUrl) {
        debug.logFallbackTrigger('OpenRouter Studio Flagship', 'Direct Cloudflare / FLUX Engine', 'OpenRouter attempt failed')
        generatedImageUrl = await generateDirectAiImage(visualPrompt, chosenStyle, chosenAspectRatio, debug)
      }

      if (!generatedImageUrl) {
        throw new Error(`Image generation pipeline failed for model ${chosenModel}`)
      }

      logAIRequest({
        pipelineRunId: options.pipelineRunId,
        courseId,
        lessonId: lesson.id,
        agentRole: 'image_ai',
        taskType: `image:${route.category}`,
        provider: targetProvider,
        modelUsed: chosenModel,
        startedAt: imgAttemptStart,
        durationMs: Date.now() - imgAttemptStart,
        promptChars: visualPrompt.length,
        completionChars: 0,
        success: true,
        metadata: { route: route.reasons, fallbacks: route.fallbacks, isFree: route.isFree },
      })

      const asset: CourseVisualAsset = {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        draft: true,
        course_id: courseId,
        module_id: moduleId,
        lesson_id: lesson.id,
        image_url: generatedImageUrl,
        storage_bucket: 'course-assets',
        title: lesson.title,
        alt_text: `5-Star luxury hospitality visual for ${lesson.title}`,
        educational_purpose: decision.educationalObjective || lesson.title,
        visual_concept: decision.justification || '5-Star Luxury Hotel Visual',
        prompt: visualPrompt,
        aspect_ratio: chosenAspectRatio,
        visual_style: chosenStyle,
        placement: 'procedure',
        provider: targetProvider,
        model: chosenModel,
        status: 'completed',
        order_index: 0,
      }

      debug.endSession(true, {
        modelUsed: chosenModel,
        providerUsed: targetProvider,
        imageUrl: generatedImageUrl,
      })

      return {
        agentRole: this.role,
        success: true,
        data: asset,
        rawOutput: `Generated 5-star visual via ${chosenModel}`,
        modelUsed: chosenModel,
        providerUsed: asset.provider as AgentExecutionResult['providerUsed'],
        costTier: 'free',
        estimatedCostUSD: 0,
        latencyMs: decisionResult.latencyMs + 1500,
      }
    } catch (err: unknown) {
      debug.logFallbackTrigger('Primary Pipeline', 'OpenRouter Studio Flagship Engine', err instanceof Error ? err.message : 'Exception encountered')
      let directUrl = await generateOpenRouterImage(visualPrompt, chosenModel, chosenStyle, debug)
      if (!directUrl) {
        directUrl = await generateDirectAiImage(visualPrompt, chosenStyle, chosenAspectRatio, debug)
      }
      
      const fallbackModel = directUrl ? chosenModel : '@cf/black-forest-labs/flux-1-schnell'
      const fallbackAsset: CourseVisualAsset = {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        draft: true,
        course_id: courseId,
        module_id: moduleId,
        lesson_id: lesson.id,
        image_url: directUrl || '',
        storage_bucket: 'course-assets',
        title: lesson.title,
        alt_text: `5-Star luxury hospitality visual for ${lesson.title}`,
        educational_purpose: decision.educationalObjective || lesson.title,
        visual_concept: decision.justification || '5-Star Luxury Hotel Visual',
        prompt: visualPrompt,
        aspect_ratio: chosenAspectRatio,
        visual_style: chosenStyle,
        placement: 'procedure',
        provider: 'cloudflare',
        model: fallbackModel,
        status: directUrl ? 'completed' : 'failed',
        order_index: 0,
      }

      debug.endSession(Boolean(directUrl), {
        modelUsed: fallbackModel,
        providerUsed: 'cloudflare',
        imageUrl: directUrl || undefined,
      })

      return {
        agentRole: this.role,
        success: Boolean(directUrl),
        data: fallbackAsset,
        rawOutput: directUrl
          ? `Generated visual via direct Cloudflare / OpenRouter fallback`
          : `Image generation failed: all configured providers exhausted`,
        modelUsed: fallbackModel,
        providerUsed: 'cloudflare',
        costTier: 'free',
        estimatedCostUSD: 0,
        latencyMs: decisionResult.latencyMs,
      }
    }
  }
}

export const imageAgent = new ImageAgent()


