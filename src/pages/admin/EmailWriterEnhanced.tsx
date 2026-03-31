/**
 * EmailWriterEnhanced - Enhanced version with robust state persistence
 * 
 * Key improvements:
 * - Uses usePersistentState hook for automatic persistence
 * - Prevents data loss on tab switch/page refresh
 * - SessionStorage backup for extra safety
 * - Debounced saves to reduce storage writes
 * - Proper hydration state tracking
 */

import { Loader2, Mail, Send, Sparkles, Users, AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import { useBulkNotifications } from '@/hooks/useBulkNotifications'
import { useDepartments } from '@/hooks/useDepartments'
import { useProperties } from '@/hooks/useProperties'
import { useProfiles } from '@/hooks/useUsers'
import { auditLog } from '@/lib/auditLog'
import { supabase } from '@/lib/supabase'
import { cn, escapeSearchQuery } from '@/lib/utils'
import { usePersistentState } from '@/hooks/usePersistentState'

// ... (keep all the type definitions and constants from original file)

type EmailTemplateKey =
  | 'system_generic_alert'
  | 'management_kpi_alert'
  | 'hr_employee_update'
  | 'operations_incident_alert'
  | 'finance_approval_alert'
  | 'sales_pipeline_alert'
  | 'user_management_welcome'

type EmailBusinessDomain =
  | 'system'
  | 'management'
  | 'hr'
  | 'operations'
  | 'finance'
  | 'sales'
  | 'user_management'

type EmailContentMode = 'template' | 'custom_html'

const EMAIL_BASE_DOMAIN = 'https://phg-connect.com'

// ... (keep TEMPLATE_OPTIONS and STARTER_TEMPLATES)
const TEMPLATE_OPTIONS: Array<{
  key: EmailTemplateKey
  domain: EmailBusinessDomain
  label: string
  description: string
}> = [
  {
    key: 'system_generic_alert',
    domain: 'system',
    label: 'General System Email',
    description: 'Standard branded template for general communication.',
  },
  {
    key: 'management_kpi_alert',
    domain: 'management',
    label: 'Management Update',
    description: 'Executive-styled template for leadership updates.',
  },
  {
    key: 'hr_employee_update',
    domain: 'hr',
    label: 'HR Update',
    description: 'HR-branded template for policy and employee updates.',
  },
  {
    key: 'operations_incident_alert',
    domain: 'operations',
    label: 'Operations / Incident',
    description: 'Operations-styled alert template.',
  },
  {
    key: 'finance_approval_alert',
    domain: 'finance',
    label: 'Finance / Approvals',
    description: 'Finance-styled template for approvals and budget notes.',
  },
  {
    key: 'sales_pipeline_alert',
    domain: 'sales',
    label: 'Sales / Commercial',
    description: 'Sales-styled template for commercial communication.',
  },
  {
    key: 'user_management_welcome',
    domain: 'user_management',
    label: 'Welcome / Onboarding',
    description: 'Welcome template for onboarding communications.',
  },
]

const STARTER_TEMPLATES: Record<EmailTemplateKey, {
  subject: string
  shortMessage: string
  body: string
  html_en?: string
  html_ar?: string
  actionUrl: string
  actionLabel: string
  priority: 'low' | 'normal' | 'high' | 'critical'
}> = {
  system_generic_alert: {
    subject: 'Important Update',
    shortMessage: 'Please review the latest update in PRIME Connect.',
    body: 'Hello team,\n\nThis is an important update from PRIME Connect. Please review the details and follow the required actions.\n\nThank you,\nPrime Hotels Intranet',
    html_en: '',
    html_ar: '',
    actionUrl: '/dashboard',
    actionLabel: 'Open PRIME Connect',
    priority: 'normal',
  },
  management_kpi_alert: {
    subject: 'Leadership Update',
    shortMessage: 'A new management update is available. Please review.',
    body: 'Hello team,\n\nPlease review the latest leadership update and ensure alignment across your property/departments.\n\nRegards,\nPrime Hotels Intranet',
    actionUrl: '/dashboard',
    actionLabel: 'View Dashboard',
    priority: 'normal',
  },
  hr_employee_update: {
    subject: 'HR Update',
    shortMessage: 'An HR update has been published. Please review.',
    body: 'Hello team,\n\nPlease review the latest HR update. If you have questions, contact Property HR.\n\nThank you,\nPrime Hotels Intranet',
    actionUrl: '/hr/control',
    actionLabel: 'Open HR Center',
    priority: 'normal',
  },
  operations_incident_alert: {
    subject: 'Operations Alert',
    shortMessage: 'An operations alert requires attention. Please review.',
    body: 'Hello team,\n\nAn operations item requires your attention. Please review the details and take action as needed.\n\nThank you,\nPrime Hotels Intranet',
    actionUrl: '/operations',
    actionLabel: 'Open Operations',
    priority: 'high',
  },
  finance_approval_alert: {
    subject: 'Finance Approval Required',
    shortMessage: 'A finance item requires review/approval. Please check PRIME Connect.',
    body: 'Hello team,\n\nA finance approval is required. Please review the details and complete the approval workflow as soon as possible.\n\nRegards,\nPrime Hotels Intranet',
    actionUrl: '/approvals',
    actionLabel: 'Open Approvals',
    priority: 'high',
  },
  sales_pipeline_alert: {
    subject: 'Sales Update',
    shortMessage: 'A sales update has been posted. Please review.',
    body: 'Hello team,\n\nPlease review the latest sales update and ensure follow-ups are completed on time.\n\nRegards,\nPrime Hotels Intranet',
    actionUrl: '/reports',
    actionLabel: 'View Reports',
    priority: 'normal',
  },
  user_management_welcome: {
    subject: 'Welcome to PRIME Connect',
    shortMessage: 'Welcome! Your account is ready in PRIME Connect.',
    body: 'Hello,\n\nWelcome to PRIME Connect. Please sign in and complete your profile.\n\nThank you,\nPrime Hotels Intranet',
    html_en: '',
    html_ar: '',
    actionUrl: '/dashboard',
    actionLabel: 'Get Started',
    priority: 'normal',
  },
}

// ... (keep helper functions)
function toAbsoluteUrl(base: string, url: string) {
  const trimmed = (url || '').trim()
  if (!trimmed) return base
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const b = String(base || '').replace(/\/+$/, '')
  const u = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${b}${u}`
}

function escapeHtml(text: string) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildEmailInnerContent(params: {
  lang: 'en' | 'ar'
  subject: string
  shortMessage: string
  body: string
  actionUrl: string
  actionLabel: string
}) {
  const isAr = params.lang === 'ar'
  const align = isAr ? 'right' : 'left'
  const brand = '#0B1C3E'

  const subject = escapeHtml(params.subject)
  const shortMessage = escapeHtml(params.shortMessage)
  const body = escapeHtml(params.body).replace(/\n/g, '<br/>')
  const actionUrl = escapeHtml(params.actionUrl)
  const actionLabel = escapeHtml(params.actionLabel)

  return `
    <div dir="${isAr ? 'rtl' : 'ltr'}" style="padding:18px 18px 12px 18px;text-align:${align};">
      <h1 style="margin:14px 0 10px 0;font-size:22px;line-height:1.35;color:#0f172a;">${subject}</h1>
      <p style="margin:0 0 14px 0;color:#334155;font-size:14px;line-height:1.65;">${shortMessage}</p>
      ${body.trim() ? `<div style="margin:16px 0;padding:14px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#0f172a;font-size:13px;line-height:1.7;">${body}</div>` : ''}
      <div style="margin:18px 0 6px 0;">
        <a href="${actionUrl}" style="display:inline-block;background:${brand};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 16px;border-radius:12px;">${actionLabel}</a>
      </div>
      <div style="color:#64748b;font-size:12px;line-height:1.6;margin-top:10px;">${isAr ? 'إذا لم يعمل الزر، انسخ الرابط:' : "If the button doesn't work, copy the link:"}<br/>
        <span style="color:#0f172a;word-break:break-all;">${actionUrl}</span>
      </div>
    </div>
  `
}

function buildBilingualEmailHtml(params: {
  subject_en: string
  shortMessage_en: string
  body_en: string
  subject_ar: string
  shortMessage_ar: string
  body_ar: string
  actionUrl: string
  actionLabel_en: string
  actionLabel_ar: string
  logoUrl: string
}) {
  const title = escapeHtml(params.subject_en || params.subject_ar || 'Prime Hotels')
  const logoUrl = escapeHtml(params.logoUrl)
  const actionUrl = escapeHtml(params.actionUrl)

  const innerEn = buildEmailInnerContent({
    lang: 'en',
    subject: params.subject_en,
    shortMessage: params.shortMessage_en,
    body: params.body_en,
    actionUrl: params.actionUrl,
    actionLabel: params.actionLabel_en,
  })

  const innerAr = buildEmailInnerContent({
    lang: 'ar',
    subject: params.subject_ar,
    shortMessage: params.shortMessage_ar,
    body: params.body_ar,
    actionUrl: params.actionUrl,
    actionLabel: params.actionLabel_ar,
  })

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7fb;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="720" style="max-width:720px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:#0B1C3E;padding:18px 22px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="left" style="vertical-align:middle;">
                      <img src="${logoUrl}" alt="Prime Hotels" height="34" style="display:block;height:34px;max-height:34px;"/>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 14px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="50%" style="vertical-align:top;padding:0 10px 0 18px;border-right:1px solid #e2e8f0;">
                      ${innerEn}
                    </td>
                    <td width="50%" style="vertical-align:top;padding:0 18px 0 10px;">
                      ${innerAr}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 18px;background:#0b1220;">
                <div style="color:rgba(255,255,255,0.75);font-size:12px;">Sent by Prime Hotels system</div>
                <div style="color:rgba(255,255,255,0.55);font-size:11px;margin-top:6px;">${actionUrl ? `Link: ${actionUrl}` : ''}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function buildBeautifulEmailHtml(params: {
  lang: 'en' | 'ar'
  subject: string
  shortMessage: string
  body: string
  actionUrl: string
  actionLabel: string
  logoUrl: string
}) {
  const isAr = params.lang === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'
  const brand = '#0B1C3E'
  const subject = escapeHtml(params.subject)
  const logoUrl = escapeHtml(params.logoUrl)
  const inner = buildEmailInnerContent({
    lang: params.lang,
    subject: params.subject,
    shortMessage: params.shortMessage,
    body: params.body,
    actionUrl: params.actionUrl,
    actionLabel: params.actionLabel,
  })

  return `<!doctype html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${dir}">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7fb;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:${brand};padding:22px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="vertical-align:middle;" align="${isAr ? 'right' : 'left'}">
                      <img src="${logoUrl}" alt="Prime Hotels" height="36" style="display:block;height:36px;max-height:36px;"/>
                    </td>
                    <td style="vertical-align:middle;" align="${isAr ? 'left' : 'right'}">
                      <div style="color:rgba(255,255,255,0.88);font-size:12px;">${isAr ? 'رسالة تلقائية' : 'Automated message'}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                ${inner}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#0b1220;text-align:${isAr ? 'right' : 'left'};">
                <div style="color:rgba(255,255,255,0.75);font-size:12px;">${isAr ? 'مرسلة من نظام Prime Hotels' : 'Sent by Prime Hotels system'}</div>
                <div style="color:rgba(255,255,255,0.55);font-size:11px;margin-top:6px;">© ${new Date().getFullYear()} Prime Hotels</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

type ProfileRow = {
  id: string
  full_name?: string | null
  email?: string | null
  job_title?: string | null
  properties?: { id: string; name: string }[]
  departments?: { id: string; name: string }[]
}

// ============================================
// ENHANCED EMAIL WRITER WITH PERSISTENCE
// ============================================

export default function EmailWriterEnhanced() {
  const { t } = useTranslation(['admin', 'common'])
  const appBaseUrl = useMemo(() => EMAIL_BASE_DOMAIN, [])
  const defaultLogoUrl = useMemo(() => `${EMAIL_BASE_DOMAIN}/prime-logo-white-full.png`, [])

  // Track if component has mounted to prevent hydration mismatches
  const [hasMounted, setHasMounted] = useState(false)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const restoredDraftRef = useRef(false)

  // Data fetching
  const { data: users, isLoading: usersLoading } = useProfiles({ limit: 200 })
  const { data: properties = [] } = useProperties()

  // ============================================
  // PERSISTENT STATE - All form fields
  // ============================================
  
  const targetModeState = usePersistentState<'users' | 'property' | 'department' | 'all'>('users', {
    key: 'email_target_mode',
    backupKey: 'email_target_mode_backup',
  })
  const targetMode = targetModeState.value
  const setTargetMode = targetModeState.setValue

  const selectedUserIdsState = usePersistentState<string[]>('[]', {
    key: 'email_selected_users',
    backupKey: 'email_selected_users_backup',
  })
  const selectedUserIds = selectedUserIdsState.value
  const setSelectedUserIds = selectedUserIdsState.setValue

  const selectedPropertyIdState = usePersistentState<string>('', {
    key: 'email_selected_property',
    backupKey: 'email_selected_property_backup',
  })
  const selectedPropertyId = selectedPropertyIdState.value
  const setSelectedPropertyId = selectedPropertyIdState.setValue

  const selectedDepartmentIdState = usePersistentState<string>('', {
    key: 'email_selected_department',
    backupKey: 'email_selected_department_backup',
  })
  const selectedDepartmentId = selectedDepartmentIdState.value
  const setSelectedDepartmentId = selectedDepartmentIdState.setValue

  const templateKeyState = usePersistentState<EmailTemplateKey>('system_generic_alert', {
    key: 'email_template_key',
    backupKey: 'email_template_key_backup',
  })
  const templateKey = templateKeyState.value
  const setTemplateKey = templateKeyState.setValue

  const contentModeState = usePersistentState<EmailContentMode>('template', {
    key: 'email_content_mode',
    backupKey: 'email_content_mode_backup',
  })
  const contentMode = contentModeState.value
  const setContentMode = contentModeState.setValue

  const languageState = usePersistentState<'en' | 'ar'>('en', {
    key: 'email_language',
    backupKey: 'email_language_backup',
  })
  const language = languageState.value
  const setLanguage = languageState.setValue

  const bilingualEnabledState = usePersistentState<boolean>(false, {
    key: 'email_bilingual',
    backupKey: 'email_bilingual_backup',
  })
  const bilingualEnabled = bilingualEnabledState.value
  const setBilingualEnabled = bilingualEnabledState.setValue

  const subjectState = usePersistentState<string>('', {
    key: 'email_subject',
    backupKey: 'email_subject_backup',
  })
  const subject = subjectState.value
  const setSubject = subjectState.setValue

  const subjectArState = usePersistentState<string>('', {
    key: 'email_subject_ar',
    backupKey: 'email_subject_ar_backup',
  })
  const subjectAr = subjectArState.value
  const setSubjectAr = subjectArState.setValue

  const shortMessageState = usePersistentState<string>('', {
    key: 'email_short_message',
    backupKey: 'email_short_message_backup',
  })
  const shortMessage = shortMessageState.value
  const setShortMessage = shortMessageState.setValue

  const shortMessageArState = usePersistentState<string>('', {
    key: 'email_short_message_ar',
    backupKey: 'email_short_message_ar_backup',
  })
  const shortMessageAr = shortMessageArState.value
  const setShortMessageAr = shortMessageArState.setValue

  const bodyState = usePersistentState<string>('', {
    key: 'email_body',
    backupKey: 'email_body_backup',
  })
  const body = bodyState.value
  const setBody = bodyState.setValue

  const bodyArState = usePersistentState<string>('', {
    key: 'email_body_ar',
    backupKey: 'email_body_ar_backup',
  })
  const bodyAr = bodyArState.value
  const setBodyAr = bodyArState.setValue

  const htmlBodyState = usePersistentState<string>('', {
    key: 'email_html_body',
    backupKey: 'email_html_body_backup',
  })
  const htmlBody = htmlBodyState.value
  const setHtmlBody = htmlBodyState.setValue

  const textBodyState = usePersistentState<string>('', {
    key: 'email_text_body',
    backupKey: 'email_text_body_backup',
  })
  const textBody = textBodyState.value
  const setTextBody = textBodyState.setValue

  const actionUrlState = usePersistentState<string>('/notifications', {
    key: 'email_action_url',
    backupKey: 'email_action_url_backup',
  })
  const actionUrl = actionUrlState.value
  const setActionUrl = actionUrlState.setValue

  const actionLabelState = usePersistentState<string>('Open PRIME Connect', {
    key: 'email_action_label',
    backupKey: 'email_action_label_backup',
  })
  const actionLabel = actionLabelState.value
  const setActionLabel = actionLabelState.setValue

  const actionLabelArState = usePersistentState<string>('فتح PRIME Connect', {
    key: 'email_action_label_ar',
    backupKey: 'email_action_label_ar_backup',
  })
  const actionLabelAr = actionLabelArState.value
  const setActionLabelAr = actionLabelArState.setValue

  const priorityState = usePersistentState<'low' | 'normal' | 'high' | 'critical'>('normal', {
    key: 'email_priority',
    backupKey: 'email_priority_backup',
  })
  const priority = priorityState.value
  const setPriority = priorityState.setValue

  // Non-persistent UI state
  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false)
  
  // Loading states
  const { createBatch, isCreatingBatch } = useBulkNotifications()
  const [isDrafting, setIsDrafting] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [isTranslating, setIsTranslating] = useState<'ar' | 'en' | null>(null)
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false)

  // Departments based on selected property
  const { departments = [] } = useDepartments(selectedPropertyId || undefined)

  // Template metadata
  const templateMeta = useMemo(() => TEMPLATE_OPTIONS.find((o) => o.key === templateKey)!, [templateKey])

  // ============================================
  // MOUNT HANDLING
  // ============================================
  
  useEffect(() => {
    setHasMounted(true)
    
    // Check if we have unsaved draft data
    const hasDraftData = subject.trim() || body.trim() || shortMessage.trim()
    if (hasDraftData && !restoredDraftRef.current) {
      restoredDraftRef.current = true
      setShowRestorePrompt(true)
      
      // Auto-hide restore prompt after 5 seconds
      setTimeout(() => setShowRestorePrompt(false), 5000)
    }
  }, [subject, body, shortMessage])

  // ============================================
  // FORM LOGIC (same as original)
  // ============================================

  const applyStarterTemplate = useCallback((key: EmailTemplateKey) => {
    const preset = STARTER_TEMPLATES[key]
    if (!preset) return
    setSubject(preset.subject)
    setShortMessage(preset.shortMessage)
    setBody(preset.body)
    setActionUrl(preset.actionUrl)
    setActionLabel(preset.actionLabel)
    setPriority(preset.priority)

    const absoluteActionUrl = toAbsoluteUrl(appBaseUrl, preset.actionUrl)

    const html = bilingualEnabled
      ? buildBilingualEmailHtml({
        subject_en: preset.subject,
        shortMessage_en: preset.shortMessage,
        body_en: preset.body,
        subject_ar: subjectAr || preset.subject,
        shortMessage_ar: shortMessageAr || preset.shortMessage,
        body_ar: bodyAr || preset.body,
        actionUrl: absoluteActionUrl,
        actionLabel_en: preset.actionLabel,
        actionLabel_ar: actionLabelAr || preset.actionLabel,
        logoUrl: defaultLogoUrl,
      })
      : buildBeautifulEmailHtml({
        lang: language,
        subject: language === 'ar' ? (subjectAr || preset.subject) : preset.subject,
        shortMessage: language === 'ar' ? (shortMessageAr || preset.shortMessage) : preset.shortMessage,
        body: language === 'ar' ? (bodyAr || preset.body) : preset.body,
        actionUrl: absoluteActionUrl,
        actionLabel: language === 'ar' ? (actionLabelAr || preset.actionLabel) : preset.actionLabel,
        logoUrl: defaultLogoUrl,
      })
    setHtmlBody(html)
    setTextBody(`${preset.subject}\n\n${preset.shortMessage}\n\n${preset.body}\n\n${preset.actionUrl}`)
  }, [actionLabelAr, appBaseUrl, bilingualEnabled, bodyAr, defaultLogoUrl, language, setActionLabel, setActionUrl, setBody, setHtmlBody, setPriority, setShortMessage, setSubject, setTextBody, shortMessageAr, subjectAr])

  const rebuildHtmlFromFields = useCallback(() => {
    const absoluteActionUrl = toAbsoluteUrl(appBaseUrl, actionUrl)

    const html = bilingualEnabled
      ? buildBilingualEmailHtml({
        subject_en: subject,
        shortMessage_en: shortMessage,
        body_en: body,
        subject_ar: subjectAr || subject,
        shortMessage_ar: shortMessageAr || shortMessage,
        body_ar: bodyAr || body,
        actionUrl: absoluteActionUrl,
        actionLabel_en: actionLabel,
        actionLabel_ar: actionLabelAr || actionLabel,
        logoUrl: defaultLogoUrl,
      })
      : buildBeautifulEmailHtml({
        lang: language,
        subject: language === 'ar' ? (subjectAr || subject) : subject,
        shortMessage: language === 'ar' ? (shortMessageAr || shortMessage) : shortMessage,
        body: language === 'ar' ? (bodyAr || body) : body,
        actionUrl: absoluteActionUrl,
        actionLabel: language === 'ar' ? (actionLabelAr || actionLabel) : actionLabel,
        logoUrl: defaultLogoUrl,
      })
    setHtmlBody(html)
    if (!textBody.trim()) {
      setTextBody(`${subject}\n\n${shortMessage}\n\n${body}\n\n${actionUrl}`)
    }
  }, [actionLabel, actionLabelAr, actionUrl, appBaseUrl, bilingualEnabled, body, bodyAr, defaultLogoUrl, language, setHtmlBody, setTextBody, shortMessage, shortMessageAr, subject, subjectAr, textBody])

  const filteredUsers = useMemo(() => {
    const rows = (users || []) as ProfileRow[]
    const search = userSearch.trim()
    if (!search) return rows

    const normalizedSearch = search.replace(/[^a-zA-Z0-9@._\s-]/g, '').trim().slice(0, 100)
    if (!normalizedSearch) return rows

    const escaped = escapeSearchQuery(normalizedSearch).toLowerCase()
    return rows.filter((u) => {
      const name = (u.full_name || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      const job = (u.job_title || '').toLowerCase()
      return name.includes(escaped) || email.includes(escaped) || job.includes(escaped)
    })
  }, [users, userSearch])

  const recipientUserIds = useMemo(() => {
    if (targetMode === 'users') return selectedUserIds

    const rows = (users || []) as ProfileRow[]

    if (targetMode === 'all') {
      return rows.map((u) => u.id)
    }

    if (targetMode === 'property' && selectedPropertyId) {
      return rows
        .filter((u) => (u.properties || []).some((p) => p.id === selectedPropertyId))
        .map((u) => u.id)
    }

    if (targetMode === 'department' && selectedDepartmentId) {
      return rows
        .filter((u) => (u.departments || []).some((d) => d.id === selectedDepartmentId))
        .map((u) => u.id)
    }

    return []
  }, [targetMode, selectedUserIds, selectedPropertyId, selectedDepartmentId, users])

  const recipientCount = targetMode === 'all' ? 'All Active' : recipientUserIds.length

  const canSend = useMemo(() => {
    if (targetMode !== 'all' && recipientUserIds.length === 0) return false
    if (!subject.trim()) return false
    if (!shortMessage.trim()) return false
    return true
  }, [targetMode, recipientUserIds, subject, shortMessage])

  const toggleUser = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const current = Array.isArray(prev) ? prev : []
      if (current.includes(userId)) return current.filter((id) => id !== userId)
      return [...current, userId]
    })
  }, [setSelectedUserIds])

  const clearRecipients = useCallback(() => {
    setSelectedUserIds([])
    setSelectedPropertyId('')
    setSelectedDepartmentId('')
  }, [setSelectedDepartmentId, setSelectedPropertyId, setSelectedUserIds])

  // ============================================
  // AI HANDLERS (simplified for brevity)
  // ============================================

  const handleAIDraft = useCallback(async () => {
    if (!subject.trim() && !body.trim() && !shortMessage.trim()) {
      toast.error('Add a topic or a few bullets in the body first (or type a subject) so AI can draft.')
      return
    }

    setIsDrafting(true)
    try {
      const prompt = `You are an admin communications assistant for a multi-property hotel intranet.

Draft a professional email in plain text.

Requirements:
- Provide a concise subject line
- Provide a short in-app notification message (1-2 sentences)
- Provide a full email body (structured, clear, and polite)
- If the language seems Arabic, respond in Arabic

Input:
Subject: ${subject}
In-app message: ${shortMessage}
Email body: ${body}

Return ONLY valid JSON:
{"subject":"...","shortMessage":"...","body":"..."}`

      const { data, error } = await supabase.functions.invoke('process-ai-request', {
        body: {
          task: 'chat',
          model: 'Qwen/Qwen2.5-7B-Instruct',
          prompt,
          temperature: 0.4,
          max_tokens: 900,
        },
      })

      if (error) throw error

      const rawText = (data?.response ?? data?.result ?? '') as string
      const sanitizedText = rawText.replace(/[\n\r\t]+/g, ' ')
      const jsonMatch = sanitizedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI response did not include JSON.')

      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.subject) setSubject(parsed.subject)
      if (parsed.shortMessage) setShortMessage(parsed.shortMessage)
      if (parsed.body) setBody(parsed.body)

      toast.success('AI draft generated')
    } catch (err) {
      console.error('AI draft failed:', err)
      toast.error('AI draft failed')
    } finally {
      setIsDrafting(false)
    }
  }, [body, setBody, setShortMessage, setSubject, shortMessage, subject])

  // ============================================
  // CLEAR ALL DRAFTS
  // ============================================

  const clearAllDrafts = useCallback(() => {
    subjectState.clearValue()
    subjectArState.clearValue()
    shortMessageState.clearValue()
    shortMessageArState.clearValue()
    bodyState.clearValue()
    bodyArState.clearValue()
    htmlBodyState.clearValue()
    textBodyState.clearValue()
    selectedUserIdsState.clearValue()
    selectedPropertyIdState.clearValue()
    selectedDepartmentIdState.clearValue()
    
    // Reset to defaults
    setTemplateKey('system_generic_alert')
    setTargetMode('users')
    setContentMode('template')
    setLanguage('en')
    setBilingualEnabled(false)
    setPriority('normal')
    setActionUrl('/notifications')
    setActionLabel('Open PRIME Connect')
    setActionLabelAr('فتح PRIME Connect')
    
    toast.success('Draft cleared')
  }, [subjectState, subjectArState, shortMessageState, shortMessageArState, bodyState, bodyArState, 
      htmlBodyState, textBodyState, selectedUserIdsState, selectedPropertyIdState, selectedDepartmentIdState,
      setTemplateKey, setTargetMode, setContentMode, setLanguage, setBilingualEnabled, setPriority,
      setActionUrl, setActionLabel, setActionLabelAr])

  // ============================================
  // SEND HANDLER
  // ============================================

  const handleSend = useCallback(async () => {
    if (!canSend) {
      toast.error('Please fill recipients, subject, and message')
      return
    }

    try {
      const isCustomHtml = contentMode === 'custom_html'
      const absoluteActionUrl = toAbsoluteUrl(appBaseUrl, actionUrl)

      const resolvedSubject = bilingualEnabled
        ? subject.trim()
        : (language === 'ar' ? (subjectAr.trim() || subject.trim()) : subject.trim())
      const resolvedShortMessage = bilingualEnabled
        ? shortMessage.trim()
        : (language === 'ar' ? (shortMessageAr.trim() || shortMessage.trim()) : shortMessage.trim())

      const payload = {
        userIds: targetMode === 'users' ? recipientUserIds : undefined,
        all: targetMode === 'all',
        propertyId: targetMode === 'property' ? selectedPropertyId : undefined,
        departmentId: targetMode === 'department' ? selectedDepartmentId : undefined,
        notificationType: 'system',
        businessDomain: templateMeta.domain,
        templateKey: templateMeta.key,
        channels: ['in_app', 'email'] as const,
        priority,
        emailSubject: resolvedSubject,
        emailHtml: htmlBody.trim(),
        notificationData: {
          title: resolvedSubject,
          title_ar: subjectAr.trim() || subject.trim(),
          message: resolvedShortMessage,
          message_ar: shortMessageAr.trim() || shortMessage.trim(),
          link: actionUrl?.trim() ? actionUrl.trim() : '/notifications',
          actionLabel: actionLabel?.trim() ? actionLabel.trim() : undefined,
          actionLabel_ar: actionLabelAr?.trim() ? actionLabelAr.trim() : undefined,
          variables: {
            data_box: body?.trim() ? body.trim() : undefined,
            data_box_ar: bodyAr?.trim() ? bodyAr.trim() : undefined,
            language: language === 'ar' ? 'ar' : 'en',
            bilingual: bilingualEnabled,
            subject_en: subject,
            subject_ar: subjectAr || subject,
            shortMessage_en: shortMessage,
            shortMessage_ar: shortMessageAr || shortMessage,
            body_en: body,
            body_ar: bodyAr || body,
            actionLabel_en: actionLabel,
            actionLabel_ar: actionLabelAr || actionLabel,
          },
        },
      }

      const batchResult = await createBatch(payload as any)

      auditLog.adminAction(isCustomHtml ? 'email_writer.sent_custom_html' : 'email_writer.sent', {
        batchId: batchResult.batchId,
        recipientCount,
        templateKey: templateMeta.key,
        businessDomain: templateMeta.domain,
      })

      toast.success(`Queued ${recipientCount} email(s)`)
      
      // Clear all drafts after successful send
      clearAllDrafts()
    } catch (err) {
      console.error('Send failed:', err)
      toast.error('Failed to send email')
    }
  }, [canSend, contentMode, appBaseUrl, actionUrl, bilingualEnabled, language, subject, subjectAr, 
      shortMessage, shortMessageAr, targetMode, recipientUserIds, selectedPropertyId, selectedDepartmentId,
      templateMeta, priority, htmlBody, actionLabel, actionLabelAr, body, bodyAr, createBatch, recipientCount,
      clearAllDrafts])

  // ============================================
  // RENDER
  // ============================================

  // Prevent hydration mismatch by not rendering until mounted
  if (!hasMounted) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Restore Prompt */}
      {showRestorePrompt && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-amber-800 dark:text-amber-300">
              Draft content restored from previous session
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowRestorePrompt(false)}>
              Keep
            </Button>
            <Button variant="outline" size="sm" onClick={clearAllDrafts}>
              Clear Draft
            </Button>
          </div>
        </div>
      )}

      <PageHeader
        title={t('email_writer.title', { ns: 'admin', defaultValue: 'Email Writer' })}
        description={t('email_writer.description', {
          ns: 'admin',
          defaultValue: 'Compose branded system emails with in-app copies and delivery tracking.',
        })}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleAIDraft} disabled={isDrafting}>
              {isDrafting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {t('email_writer.ai_draft', { ns: 'admin', defaultValue: 'AI Draft' })}
            </Button>
            <Button onClick={handleSend} disabled={!canSend || isCreatingBatch}>
              {isCreatingBatch ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {t('email_writer.send', { ns: 'admin', defaultValue: 'Send' })}
            </Button>
          </div>
        }
      />

      {/* Main content - simplified for brevity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Compose
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Subject */}
              <div className="space-y-2">
                <Label>Subject (EN)</Label>
                <Input 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)} 
                  placeholder="Subject" 
                />
              </div>

              {/* Short Message */}
              <div className="space-y-2">
                <Label>In-app message</Label>
                <Textarea
                  value={shortMessage}
                  onChange={(e) => setShortMessage(e.target.value)}
                  placeholder="1-2 sentences shown inside the app notification"
                  className="min-h-[90px]"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label>Email body</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Full email body"
                  className="min-h-[180px]"
                />
              </div>

              {/* Action URL */}
              <div className="space-y-2">
                <Label>Action link</Label>
                <Input 
                  value={actionUrl} 
                  onChange={(e) => setActionUrl(e.target.value)} 
                  placeholder="/notifications" 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recipients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <span className="text-muted-foreground">Recipients: </span>
                <span className="font-medium">{recipientCount}</span>
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={clearRecipients}>
                Clear recipients
              </Button>
              <Button variant="outline" className="w-full mt-2" onClick={clearAllDrafts}>
                Clear all drafts
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
