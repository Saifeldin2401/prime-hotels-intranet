import { useCallback, useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Loader2, Sparkles, Send, Users } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { cn, escapeSearchQuery } from '@/lib/utils'
import { auditLog } from '@/lib/auditLog'
import { supabase } from '@/lib/supabase'
import { useProfiles } from '@/hooks/useUsers'
import { useProperties } from '@/hooks/useProperties'
import { useDepartments } from '@/hooks/useDepartments'
import { useBulkNotifications } from '@/hooks/useBulkNotifications'

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

function toAbsoluteUrl(base: string, url: string) {
  const trimmed = (url || '').trim()
  if (!trimmed) return base
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const b = String(base || '').replace(/\/+$/, '')
  const u = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${b}${u}`
}

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
  const accent = '#D4AF37'
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

export default function EmailWriter() {
  const { t } = useTranslation(['admin', 'common'])

  const appBaseUrl = useMemo(() => EMAIL_BASE_DOMAIN, [])
  const defaultLogoUrl = useMemo(() => `${EMAIL_BASE_DOMAIN}/prime-logo-white-full.png`, [])

  const { data: users, isLoading: usersLoading } = useProfiles({ limit: 200 })
  const { data: properties = [] } = useProperties()

  const [targetMode, setTargetMode] = useState<'users' | 'property' | 'department' | 'all'>('users')

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('')

  const { departments = [] } = useDepartments(selectedPropertyId || undefined)

  const [templateKey, setTemplateKey] = useState<EmailTemplateKey>('system_generic_alert')
  const templateMeta = useMemo(() => TEMPLATE_OPTIONS.find((o) => o.key === templateKey)!, [templateKey])

  const [contentMode, setContentMode] = useState<EmailContentMode>('template')
  const [language, setLanguage] = useState<'en' | 'ar'>(() => (localStorage.getItem('email_writer_language') as 'en' | 'ar') || 'en')
  const [bilingualEnabled, setBilingualEnabled] = useState(() => localStorage.getItem('email_writer_bilingual') === 'true')

  const [subject, setSubject] = useState(() => localStorage.getItem('email_writer_subject') || '')
  const [subjectAr, setSubjectAr] = useState(() => localStorage.getItem('email_writer_subjectAr') || '')
  const [shortMessage, setShortMessage] = useState(() => localStorage.getItem('email_writer_shortMessage') || '')
  const [shortMessageAr, setShortMessageAr] = useState(() => localStorage.getItem('email_writer_shortMessageAr') || '')
  const [body, setBody] = useState(() => localStorage.getItem('email_writer_body') || '')
  const [bodyAr, setBodyAr] = useState(() => localStorage.getItem('email_writer_bodyAr') || '')
  const [htmlBody, setHtmlBody] = useState(() => localStorage.getItem('email_writer_htmlBody') || '')
  const [textBody, setTextBody] = useState(() => localStorage.getItem('email_writer_textBody') || '')
  const [actionUrl, setActionUrl] = useState(() => localStorage.getItem('email_writer_actionUrl') || '/notifications')
  const [actionLabel, setActionLabel] = useState(() => localStorage.getItem('email_writer_actionLabel') || 'Open PRIME Connect')
  const [actionLabelAr, setActionLabelAr] = useState(() => localStorage.getItem('email_writer_actionLabelAr') || 'فتح PRIME Connect')

  useEffect(() => {
    localStorage.setItem('email_writer_language', language)
    localStorage.setItem('email_writer_bilingual', String(bilingualEnabled))
    localStorage.setItem('email_writer_subject', subject)
    localStorage.setItem('email_writer_subjectAr', subjectAr)
    localStorage.setItem('email_writer_shortMessage', shortMessage)
    localStorage.setItem('email_writer_shortMessageAr', shortMessageAr)
    localStorage.setItem('email_writer_body', body)
    localStorage.setItem('email_writer_bodyAr', bodyAr)
    localStorage.setItem('email_writer_htmlBody', htmlBody)
    localStorage.setItem('email_writer_textBody', textBody)
    localStorage.setItem('email_writer_actionUrl', actionUrl)
    localStorage.setItem('email_writer_actionLabel', actionLabel)
    localStorage.setItem('email_writer_actionLabelAr', actionLabelAr)
  }, [language, bilingualEnabled, subject, subjectAr, shortMessage, shortMessageAr, body, bodyAr, htmlBody, textBody, actionUrl, actionLabel, actionLabelAr])
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal')

  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  const { createBatch, isCreatingBatch } = useBulkNotifications()
  const [isDrafting, setIsDrafting] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [isTranslating, setIsTranslating] = useState<'ar' | 'en' | null>(null)
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false)
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false)

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
        subject: preset.subject,
        shortMessage: preset.shortMessage,
        body: preset.body,
        actionUrl: absoluteActionUrl,
        actionLabel: preset.actionLabel,
        logoUrl: defaultLogoUrl,
      })
    setHtmlBody(html)
    setTextBody(`${preset.subject}\n\n${preset.shortMessage}\n\n${preset.body}\n\n${preset.actionUrl}`)
  }, [appBaseUrl, bilingualEnabled, defaultLogoUrl, language])

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
        subject,
        shortMessage,
        body,
        actionUrl: absoluteActionUrl,
        actionLabel,
        logoUrl: defaultLogoUrl,
      })
    setHtmlBody(html)
    if (!textBody.trim()) {
      setTextBody(`${subject}\n\n${shortMessage}\n\n${body}\n\n${actionUrl}`)
    }
  }, [actionLabel, actionUrl, appBaseUrl, bilingualEnabled, body, defaultLogoUrl, language, shortMessage, subject, textBody])

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
      if (prev.includes(userId)) return prev.filter((id) => id !== userId)
      return [...prev, userId]
    })
  }, [])

  const clearRecipients = useCallback(() => {
    setSelectedUserIds([])
    setSelectedPropertyId('')
    setSelectedDepartmentId('')
  }, [])

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
      // Log for debugging
      console.log('AI Draft Raw:', rawText)

      // Clean up common JSON output errors from small LLMs (literal newlines inside string values break JSON parse)
      const sanitizedText = rawText.replace(/[\n\r\t]+/g, ' ')

      const jsonMatch = sanitizedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI response did not include JSON. Raw: ' + rawText.slice(0, 50))
      }

      let parsed: { subject?: string; shortMessage?: string; body?: string } = {}
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error('Failed to parse AI JSON block. Raw text:', rawText)
        throw new Error('AI returned invalid JSON syntax: ' + (parseError instanceof Error ? parseError.message : String(parseError)))
      }

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
  }, [subject, shortMessage, body])

  const handleAIGenerateHtml = useCallback(async () => {
    if (!subject.trim() && !body.trim() && !shortMessage.trim()) {
      toast.error('Add some context first, then generate HTML.')
      return
    }

    setIsGeneratingHtml(true)
    try {
      const prompt = `You are an expert email designer for a luxury hotel group intranet.

Create a beautiful, modern HTML email with inline styles. It must look professional in Gmail/Outlook.

Requirements:
- Output JSON only
- Provide: subject, shortMessage, html, text
- HTML must include: header branding, title, short message, a content box with details, CTA button, footer
- Support language direction: if input is Arabic or lang=ar, generate RTL Arabic HTML
- ALWAYS use this exact img tag for the logo in the header: <img src="https://phg-connect.com/prime-logo-white-full.png" alt="Prime Hotels" height="34" style="display:block;height:34px;max-height:34px;"/>
- The header MUST have a dark blue background (e.g., #0B1C3E) so the white logo is visible.

Inputs:
lang: ${language}
bilingual: ${bilingualEnabled ? 'true (EN+AR in one email)' : 'false'}
logoUrl: ${defaultLogoUrl}
baseDomain: ${appBaseUrl}
subject: ${subject}
shortMessage: ${shortMessage}
details/body: ${body}
actionUrl: ${actionUrl}
actionLabel: ${actionLabel}

If bilingual=true, you MUST use a <table width="100%"> with a single row and two <td> columns (width="50%"). One column must contain the English content (LTR), and the other column must contain the Arabic translation (RTL) side-by-side. Both must look identical but translated.
Return ONLY valid JSON:
{"subject":"...","shortMessage":"...","html":"...","text":"..."}

WARNING: Ensure that you do NOT include any raw, unescaped newlines inside the JSON string values. Use \\n to represent line breaks in the text.`

      const { data, error } = await supabase.functions.invoke('process-ai-request', {
        body: {
          task: 'chat',
          model: 'Qwen/Qwen2.5-7B-Instruct',
          prompt,
          temperature: 0.35,
          max_tokens: 1400,
        },
      })

      if (error) throw error
      const rawText = (data?.response ?? data?.result ?? '') as string
      console.log('AI HTML Raw:', rawText)

      // Clean up common JSON output errors from small LLMs (like unescaped newlines in JSON strings)
      const sanitizedText = rawText
        .replace(/[\n\r\t]+/g, ' ')
        // Also fix cases where HTML might contain unescaped quotes
        .replace(/\\"/g, "'") // Temporary swap to avoid breaking JSON parse if the model spits out bad escapes

      const jsonMatch = sanitizedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI response did not include JSON. Raw: ' + rawText.slice(0, 50))

      let parsed: { subject?: string; shortMessage?: string; html?: string; text?: string } = {}
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error('Failed to parse AI JSON block. Raw text:', rawText)
        throw new Error('AI returned invalid JSON syntax: ' + (parseError instanceof Error ? parseError.message : String(parseError)))
      }

      if (parsed.subject) setSubject(parsed.subject)
      if (parsed.shortMessage) setShortMessage(parsed.shortMessage)
      if (parsed.html) setHtmlBody(parsed.html)
      if (parsed.text) setTextBody(parsed.text)

      setContentMode('custom_html')
      toast.success('HTML email generated')
    } catch (err) {
      console.error('AI HTML generation failed:', err)
      toast.error('AI HTML generation failed')
    } finally {
      setIsGeneratingHtml(false)
    }
  }, [actionLabel, actionUrl, appBaseUrl, bilingualEnabled, body, defaultLogoUrl, language, shortMessage, subject])

  const handleAIImprove = useCallback(async () => {
    if (!subject.trim() && !body.trim() && !shortMessage.trim()) {
      toast.error('Add content first, then use AI Improve.')
      return
    }

    setIsImproving(true)
    try {
      const prompt = `You are an admin communications assistant for a multi - property hotel intranet.

Improve the following email content.

        Goals:
      - Make it clear, professional, and concise
        - Keep a warm, respectful tone
          - Keep meaning the same
            - Return JSON only

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
          temperature: 0.3,
          max_tokens: 900,
        },
      })

      if (error) throw error

      const rawText = (data?.response ?? data?.result ?? '') as string
      console.log('AI Improve Raw:', rawText)

      // Replace literal newlines/tabs with spaces to prevent JSON.parse syntax errors inside string values
      const sanitizedText = rawText.replace(/[\n\r\t]+/g, ' ')

      const jsonMatch = sanitizedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI response did not include JSON. Raw: ' + rawText.slice(0, 50))

      let parsed: { subject?: string; shortMessage?: string; body?: string } = {}
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error('Failed to parse AI JSON block. Raw text:', rawText)
        throw new Error('AI returned invalid JSON syntax: ' + (parseError instanceof Error ? parseError.message : String(parseError)))
      }

      if (parsed.subject) setSubject(parsed.subject)
      if (parsed.shortMessage) setShortMessage(parsed.shortMessage)
      if (parsed.body) setBody(parsed.body)

      // Also generate Arabic version if bilingual is enabled
      if (bilingualEnabled) {
        toast.info('Generating Arabic version...')
        const arPrompt = `Translate this improved email content into Arabic. 
        Keep it professional and warm. 
        Return JSON only: {"subject":"...","shortMessage":"...","body":"..."}
        
        Input:
        Subject: ${parsed.subject || subject}
        ShortMessage: ${parsed.shortMessage || shortMessage}
        Body: ${parsed.body || body}`

        const { data: arData } = await supabase.functions.invoke('process-ai-request', {
          body: {
            task: 'chat',
            model: 'Qwen/Qwen2.5-7B-Instruct',
            prompt: arPrompt,
            temperature: 0.2,
          },
        })

        const arText = (arData?.response ?? arData?.result ?? '') as string
        const arJsonMatch = arText.replace(/[\n\r\t]+/g, ' ').match(/\{[\s\S]*\}/)
        if (arJsonMatch) {
          try {
            const arParsed = JSON.parse(arJsonMatch[0])
            if (arParsed.subject) setSubjectAr(arParsed.subject)
            if (arParsed.shortMessage) setShortMessageAr(arParsed.shortMessage)
            if (arParsed.body) setBodyAr(arParsed.body)
          } catch (e) {
            console.warn('Failed to parse AR fallback improve:', e)
          }
        }
      }

      toast.success('AI improved the message')
    } catch (err) {
      console.error('AI improve failed:', err)
      toast.error('AI improve failed')
    } finally {
      setIsImproving(false)
    }
  }, [subject, shortMessage, body])

  const handleAITranslate = useCallback(async (target: 'ar' | 'en') => {
    if (!subject.trim() && !body.trim() && !shortMessage.trim()) {
      toast.error('Add content first, then translate.')
      return
    }

    setIsTranslating(target)
    try {
      const targetLabel = target === 'ar' ? 'Arabic' : 'English'
      const prompt = `Translate the following email content into ${targetLabel}.

Rules:
- Keep formatting and line breaks
- Keep it professional for a hotel internal system
- Return JSON only

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
          temperature: 0.2,
          max_tokens: 900,
        },
      })

      if (error) throw error

      const rawText = (data?.response ?? data?.result ?? '') as string
      console.log('AI Translate Raw:', rawText)

      // Replace literal newlines/tabs with spaces to prevent JSON.parse syntax errors inside string values
      const sanitizedText = rawText.replace(/[\n\r\t]+/g, ' ')

      const jsonMatch = sanitizedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI response did not include JSON. Raw: ' + rawText.slice(0, 50))

      let parsed: { subject?: string; shortMessage?: string; body?: string } = {}
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error('Failed to parse AI JSON block. Raw text:', rawText)
        throw new Error('AI returned invalid JSON syntax: ' + (parseError instanceof Error ? parseError.message : String(parseError)))
      }

      if (target === 'ar') {
        if (parsed.subject) setSubjectAr(parsed.subject)
        if (parsed.shortMessage) setShortMessageAr(parsed.shortMessage)
        if (parsed.body) setBodyAr(parsed.body)
        setLanguage('ar')
      } else {
        if (parsed.subject) setSubject(parsed.subject)
        if (parsed.shortMessage) setShortMessage(parsed.shortMessage)
        if (parsed.body) setBody(parsed.body)
        setLanguage('en')
      }

      toast.success(`${targetLabel} translation complete`)
    } catch (err) {
      console.error('AI translate failed:', err)
      toast.error('AI translate failed')
    } finally {
      setIsTranslating(null)
    }
  }, [subject, shortMessage, body])

  const handleSend = useCallback(async () => {
    if (!canSend) {
      toast.error('Please fill recipients, subject, and message')
      return
    }

    try {
      const isCustomHtml = contentMode === 'custom_html';
      const absoluteActionUrl = toAbsoluteUrl(appBaseUrl, actionUrl)

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
        emailSubject: subject.trim(),
        emailHtml: isCustomHtml ? htmlBody.trim() : undefined,
        notificationData: {
          title: subject.trim(),
          title_ar: subjectAr.trim() || subject.trim(),
          message: shortMessage.trim(),
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
      };

      const batchResult = await createBatch(payload as any);

      // Ensure email sends clear drafts upon success
      const clearDraft = () => {
        setSubject('')
        setSubjectAr('')
        setShortMessage('')
        setShortMessageAr('')
        setBody('')
        setBodyAr('')
        setHtmlBody('')
        setTextBody('')
        localStorage.removeItem('email_writer_subject')
        localStorage.removeItem('email_writer_subjectAr')
        localStorage.removeItem('email_writer_shortMessage')
        localStorage.removeItem('email_writer_shortMessageAr')
        localStorage.removeItem('email_writer_body')
        localStorage.removeItem('email_writer_bodyAr')
        localStorage.removeItem('email_writer_htmlBody')
        localStorage.removeItem('email_writer_textBody')
      }

      auditLog.adminAction(isCustomHtml ? 'email_writer.sent_custom_html' : 'email_writer.sent', {
        batchId: batchResult.batchId,
        recipientCount,
        templateKey: templateMeta.key,
        businessDomain: templateMeta.domain,
      })

      toast.success(`Queued ${recipientCount} email(s)`)
      setSubject('')
      setShortMessage('')
      setBody('')
      setHtmlBody('')
      setTextBody('')
      setActionUrl('/notifications')
      setActionLabel('Open PRIME Connect')
      clearRecipients()
    } catch (err) {
      console.error('Send failed:', err)
      toast.error('Failed to send email')
    }
  }, [actionLabel, actionUrl, body, canSend, clearRecipients, createBatch, priority, recipientCount, recipientUserIds, shortMessage, subject, templateMeta.domain, templateMeta.key])

  return (
    <div className="space-y-6">
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
            <Button variant="outline" onClick={handleAIImprove} disabled={isImproving}>
              {isImproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {t('email_writer.ai_improve', { ns: 'admin', defaultValue: 'AI Improve' })}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAITranslate('ar')}
              disabled={isTranslating === 'ar'}
            >
              {isTranslating === 'ar' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {t('email_writer.translate_ar', { ns: 'admin', defaultValue: 'Translate AR' })}
            </Button>
            <Button
              variant="outline"
              onClick={handleAIGenerateHtml}
              disabled={isGeneratingHtml}
            >
              {isGeneratingHtml ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {t('email_writer.ai_html', { ns: 'admin', defaultValue: 'AI HTML' })}
            </Button>
            <Button onClick={handleSend} disabled={!canSend || isCreatingBatch}>
              {isCreatingBatch ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {t('email_writer.send', { ns: 'admin', defaultValue: 'Send' })}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {t('email_writer.compose', { ns: 'admin', defaultValue: 'Compose' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('email_writer.template', { ns: 'admin', defaultValue: 'Template' })}</Label>
                  <Select value={templateKey} onValueChange={(v) => {
                    const next = v as EmailTemplateKey
                    setTemplateKey(next)
                    applyStarterTemplate(next)
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{templateMeta.description}</p>
                </div>

                <div className="space-y-2">
                  <Label>{t('email_writer.priority', { ns: 'admin', defaultValue: 'Priority' })}</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">{t('email_writer.bilingual', { ns: 'admin', defaultValue: 'Bilingual (EN + AR in one email)' })}</div>
                  <div className="text-xs text-muted-foreground">{t('email_writer.bilingual_desc', { ns: 'admin', defaultValue: 'Include English and Arabic together in the same email.' })}</div>
                </div>
                <Switch
                  checked={bilingualEnabled}
                  onCheckedChange={(checked) => {
                    setBilingualEnabled(Boolean(checked))
                    setTimeout(() => rebuildHtmlFromFields(), 0)
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('email_writer.mode', { ns: 'admin', defaultValue: 'Mode' })}</Label>
                  <Select value={contentMode} onValueChange={(v) => setContentMode(v as EmailContentMode)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="template">Template (email + in-app)</SelectItem>
                      <SelectItem value="custom_html">Custom HTML (email) + in-app copy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('email_writer.language', { ns: 'admin', defaultValue: 'Language' })}</Label>
                  <Select value={language} onValueChange={(v) => {
                    setLanguage(v as 'en' | 'ar')
                    // keep current content but rebuild HTML wrapper
                    setTimeout(() => rebuildHtmlFromFields(), 0)
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      {t('email_writer.subject', { ns: 'admin', defaultValue: 'Subject' })}
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">EN</span>
                    </Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
                  </div>
                  {(bilingualEnabled || language === 'ar') && (
                    <div className="space-y-2">
                      <Label className="flex items-center justify-end gap-1 text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">AR</span>
                        الموضوع
                      </Label>
                      <Input
                        value={subjectAr}
                        onChange={(e) => setSubjectAr(e.target.value)}
                        placeholder="الموضوع"
                        dir="rtl"
                        className="text-right"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      {t('email_writer.in_app_message', { ns: 'admin', defaultValue: 'In-app message' })}
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">EN</span>
                    </Label>
                    <Textarea
                      value={shortMessage}
                      onChange={(e) => setShortMessage(e.target.value)}
                      placeholder="1-2 sentences shown inside the app notification"
                      className="min-h-[90px]"
                    />
                  </div>
                  {(bilingualEnabled || language === 'ar') && (
                    <div className="space-y-2">
                      <Label className="flex items-center justify-end gap-1 text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">AR</span>
                        رسالة الإشعار
                      </Label>
                      <Textarea
                        value={shortMessageAr}
                        onChange={(e) => setShortMessageAr(e.target.value)}
                        placeholder="جملة أو جملتين تظهر في إشعارات التطبيق"
                        className="min-h-[90px] text-right"
                        dir="rtl"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      {t('email_writer.email_body', { ns: 'admin', defaultValue: 'Email body (optional)' })}
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">EN</span>
                    </Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Full email body"
                      className="min-h-[180px]"
                    />
                  </div>
                  {(bilingualEnabled || language === 'ar') && (
                    <div className="space-y-2">
                      <Label className="flex items-center justify-end gap-1 text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">AR</span>
                        محتوى البريد الإلكتروني
                      </Label>
                      <Textarea
                        value={bodyAr}
                        onChange={(e) => setBodyAr(e.target.value)}
                        placeholder="نص البريد الإلكتروني كاملاً"
                        className="min-h-[180px] text-right"
                        dir="rtl"
                      />
                    </div>
                  )}
                </div>

                {contentMode === 'custom_html' && (
                  <div className="space-y-2 pt-2">
                    <Label>{t('email_writer.html', { ns: 'admin', defaultValue: 'HTML Email' })}</Label>
                    <div className="flex gap-2 mb-2">
                      <Button type="button" variant="outline" size="sm" onClick={rebuildHtmlFromFields}>
                        {t('email_writer.build_html', { ns: 'admin', defaultValue: 'Build HTML' })}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setFullPreviewOpen(true)} disabled={!htmlBody.trim()}>
                        {t('email_writer.full_preview', { ns: 'admin', defaultValue: 'Full preview' })}
                      </Button>
                    </div>
                    <Textarea
                      value={htmlBody}
                      onChange={(e) => setHtmlBody(e.target.value)}
                      placeholder="Full HTML email"
                      className="min-h-[220px] font-mono text-xs"
                    />
                    <Label className="text-xs text-muted-foreground">
                      {t('email_writer.text_fallback', { ns: 'admin', defaultValue: 'Text fallback (optional)' })}
                    </Label>
                    <Textarea
                      value={textBody}
                      onChange={(e) => setTextBody(e.target.value)}
                      placeholder="Plain text fallback"
                      className="min-h-[100px] font-mono text-xs"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('email_writer.action_url', { ns: 'admin', defaultValue: 'Action link' })}</Label>
                    <Input value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} placeholder="/documents/123" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex flex-col gap-1">
                      <span>{t('email_writer.action_labels', { ns: 'admin', defaultValue: 'Action labels (EN / AR)' })}</span>
                      <div className="flex gap-2">
                        <Input value={actionLabel} onChange={(e) => setActionLabel(e.target.value)} placeholder="EN Label" className="h-8 text-xs" />
                        <Input value={actionLabelAr} onChange={(e) => setActionLabelAr(e.target.value)} placeholder="AR Label" className="h-8 text-xs text-right" dir="rtl" />
                      </div>
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('email_writer.recipients', { ns: 'admin', defaultValue: 'Recipients' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('email_writer.target_mode', { ns: 'admin', defaultValue: 'Target' })}</Label>
                <Select
                  value={targetMode}
                  onValueChange={(v) => {
                    setTargetMode(v as any)
                    clearRecipients()
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="users">Specific users</SelectItem>
                    <SelectItem value="property">Entire property</SelectItem>
                    <SelectItem value="department">Entire department</SelectItem>
                    <SelectItem value="all">All employees (Network-wide)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetMode === 'users' && (
                <div className="space-y-2">
                  <Label>Select users</Label>
                  <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={usersLoading}
                        className="w-full justify-between"
                        role="combobox"
                        aria-expanded={userPickerOpen}
                      >
                        <span className="truncate">
                          {selectedUserIds.length > 0 ? `${selectedUserIds.length} selected` : 'Select recipients...'}
                        </span>
                        <span className="text-muted-foreground">+</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-3" align="start">
                      <div className="space-y-2">
                        <Input
                          placeholder="Search users..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                        />
                        <div className="max-h-[340px] overflow-auto rounded-md border">
                          {filteredUsers.slice(0, 80).map((u) => {
                            const isSelected = selectedUserIds.includes(u.id)
                            return (
                              <button
                                key={u.id}
                                type="button"
                                className={cn(
                                  'w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/40',
                                  isSelected ? 'bg-muted/60' : ''
                                )}
                                onClick={() => toggleUser(u.id)}
                              >
                                <div className="flex items-start gap-2">
                                  <div
                                    className={cn(
                                      'mt-0.5 flex h-4 w-4 items-center justify-center rounded-sm border border-primary/30 text-[10px]',
                                      isSelected ? 'bg-primary text-primary-foreground border-primary' : 'opacity-60',
                                    )}
                                  >
                                    {isSelected ? '✓' : ''}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">{u.full_name || u.email || 'Unknown'}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {u.job_title ? `${u.job_title} · ` : ''}{u.email || ''}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                          {filteredUsers.length === 0 && (
                            <div className="p-4 text-sm text-muted-foreground">No users found.</div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {selectedUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedUserIds.slice(0, 8).map((id) => {
                        const u = (users as ProfileRow[] | undefined)?.find((x) => x.id === id)
                        const label = u?.full_name || u?.email || id
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => toggleUser(id)}
                          >
                            {label}
                          </Badge>
                        )
                      })}
                      {selectedUserIds.length > 8 && (
                        <Badge variant="outline">+{selectedUserIds.length - 8}</Badge>
                      )}
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => setSelectedUserIds([])}>
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {targetMode === 'property' && (
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {targetMode === 'department' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Property</Label>
                    <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select
                      value={selectedDepartmentId}
                      onValueChange={setSelectedDepartmentId}
                      disabled={!selectedPropertyId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedPropertyId ? 'Select department' : 'Select property first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {targetMode === 'all' && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/30 p-3 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    ⚠️ Sending to Everyone
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    This email will be delivered to every active user across all properties in the entire network. Please use this option carefully.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Recipients</span>
                  <span className={cn('font-medium', recipientCount === 0 ? 'text-destructive' : '')}>
                    {recipientCount}
                  </span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={clearRecipients}>
                {t('email_writer.clear_recipients', { ns: 'admin', defaultValue: 'Clear recipients' })}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('email_writer.preview', { ns: 'admin', defaultValue: 'Preview' })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <div className="font-semibold truncate">{subject || 'Subject…'}</div>
                <div className="text-muted-foreground whitespace-pre-wrap break-words mt-2">
                  {shortMessage || 'In-app message…'}
                </div>
                {body?.trim() && (
                  <div className="mt-3 rounded-md border bg-muted/20 p-3 text-xs whitespace-pre-wrap break-words">
                    {body}
                  </div>
                )}
                {contentMode === 'custom_html' && htmlBody?.trim() && (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-2">HTML preview</div>
                    <div className="rounded-md border overflow-hidden bg-white">
                      <iframe title="email-preview" className="w-full h-[640px]" srcDoc={htmlBody} />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Dialog open={fullPreviewOpen} onOpenChange={setFullPreviewOpen}>
            <DialogContent className="max-w-5xl">
              <DialogHeader>
                <DialogTitle>{t('email_writer.full_preview', { ns: 'admin', defaultValue: 'Full preview' })}</DialogTitle>
                <DialogDescription>{t('email_writer.full_preview_desc', { ns: 'admin', defaultValue: 'Preview the final HTML email as recipients will see it.' })}</DialogDescription>
              </DialogHeader>
              <div className="rounded-md border overflow-hidden bg-white">
                <iframe title="email-preview-full" className="w-full h-[80vh]" srcDoc={htmlBody} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div >
  )
}
