import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    Award,
    Download,
    Eye
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface CertificateTemplate {
  id: string
  name: string
  description: string
  template_html: string
  background_color: string
  text_color: string
  accent_color: string
  font_family: string
  logo_url?: string
  signature_url?: string
  is_default: boolean
}

interface TrainingCertificateGeneratorProps {
  trainingCompletionId?: string
  userId?: string
  className?: string
}

interface CertificateFormData {
  recipient_name: string
  course_name: string
  completion_date: string
  score: number
  instructor_name: string
  custom_message: string
  include_signature: boolean
  include_seal: boolean
  include_qr_code: boolean
}

interface UserCompletion {
  id: string
  completed_at: string
  training_module?: {
    title?: string | null
  } | null
}

const SAFE_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(?:0|0?\.\d+|1))?\s*\)|hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%(?:\s*,\s*(?:0|0?\.\d+|1))?\s*\))$/

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeCssColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  const normalized = value.trim()
  return SAFE_COLOR_RE.test(normalized) ? normalized : fallback
}

function sanitizeFontFamily(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  const normalized = value.trim()
  if (!normalized) return fallback
  return normalized.replace(/[^a-zA-Z0-9 ,'-]/g, '')
}

function sanitizeExternalUrl(value: string | undefined): string | null {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized) return null
  try {
    const parsed = new URL(normalized)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

function safeFormattedDate(value: string, fallback: Date = new Date()): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return format(fallback, 'MMMM dd, yyyy')
  return format(parsed, 'MMMM dd, yyyy')
}

export function TrainingCertificateGenerator({
  trainingCompletionId,
  userId,
  className
}: TrainingCertificateGeneratorProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { user } = useAuth()

  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [certificateData, setCertificateData] = useState<CertificateFormData>({
    recipient_name: '',
    course_name: '',
    completion_date: format(new Date(), 'yyyy-MM-dd'),
    score: 100,
    instructor_name: '',
    custom_message: '',
    include_signature: true,
    include_seal: true,
    include_qr_code: true
  })

  const [previewMode, setPreviewMode] = useState(false)

  const { data: templates } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error
      return data as CertificateTemplate[]
    }
  })

  const { data: trainingCompletion } = useQuery({
    queryKey: ['training-completion', trainingCompletionId],
    queryFn: async () => {
      if (!trainingCompletionId) return null

      const { data, error } = await supabase
        .from('training_progress')
        .select(`
          *,
          training_module:training_modules(id, title, description, estimated_duration_minutes, category),
          user:profiles(id, full_name, email)
        `)
        .eq('id', trainingCompletionId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!trainingCompletionId
  })

  const { data: userCompletions } = useQuery({
    queryKey: ['user-completions', userId || user?.id],
    queryFn: async () => {
      const targetUserId = userId || user?.id
      if (!targetUserId) return []

      const buildCompletionsQuery = () => supabase
        .from('training_progress')
        .select(`
          *,
          training_module:training_modules(id, title, description, category)
        `)
        .eq('user_id', targetUserId)
        .eq('status', 'completed')

      let { data, error } = await buildCompletionsQuery()
        .order('completed_at', { ascending: false })

      if (error) {
        const fallback = await buildCompletionsQuery().order('updated_at', { ascending: false })
        if (!fallback.error) {
          data = fallback.data
          error = null
        }
      }

      if (error) throw error
      return (data || []) as UserCompletion[]
    },
    enabled: !trainingCompletionId
  })

  const generateCertificateHTML = (template: CertificateTemplate, data: CertificateFormData) => {
    const safeFontFamily = sanitizeFontFamily(template.font_family, 'serif')
    const safeFontQuery = encodeURIComponent(safeFontFamily)
    const safeBackgroundColor = sanitizeCssColor(template.background_color, '#ffffff')
    const safeTextColor = sanitizeCssColor(template.text_color, '#111827')
    const safeAccentColor = sanitizeCssColor(template.accent_color, '#1f2937')
    const safeLogoUrl = sanitizeExternalUrl(template.logo_url)

    const safeRecipientName = escapeHtml(data.recipient_name.trim())
    const safeCourseName = escapeHtml(data.course_name.trim())
    const safeInstructorName = escapeHtml(data.instructor_name.trim())
    const safeCustomMessage = escapeHtml(data.custom_message.trim())
    const safeScore = Number.isFinite(data.score) ? Math.min(100, Math.max(0, Math.round(data.score))) : 0
    const safeCategory = escapeHtml(trainingCompletion?.training_module?.category || t('categories.general'))
    const safeCertificateId = escapeHtml(trainingCompletion?.id || 'N/A')
    const safeDuration = Number.isFinite(trainingCompletion?.training_module?.estimated_duration_minutes)
      ? String(trainingCompletion?.training_module?.estimated_duration_minutes)
      : '60'
    const completionDateLabel = safeFormattedDate(data.completion_date)
    const issuedOnLabel = format(new Date(), 'MMMM dd, yyyy')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Certificate of Completion</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=${safeFontQuery}&display=swap');

            body {
              margin: 0;
              padding: 0;
              font-family: '${safeFontFamily}', serif;
              background-color: ${safeBackgroundColor};
              color: ${safeTextColor};
            }

            .certificate {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              position: relative;
              min-height: 600px;
              border: 10px solid ${safeAccentColor};
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }

            .certificate-header {
              text-align: center;
              margin-bottom: 30px;
            }

            .certificate-title {
              font-size: 36px;
              font-weight: bold;
              color: ${safeAccentColor};
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }

            .certificate-subtitle {
              font-size: 18px;
              font-style: italic;
              margin-bottom: 40px;
            }

            .certificate-body {
              text-align: center;
              margin-bottom: 40px;
            }

            .recipient-name {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 20px;
              color: ${safeAccentColor};
            }

            .certificate-text {
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 30px;
            }

            .course-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 20px;
              color: ${safeAccentColor};
            }

            .certificate-details {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              font-size: 14px;
            }

            .certificate-footer {
              text-align: center;
              margin-top: 40px;
              font-size: 12px;
              color: ${safeTextColor}80;
            }

            .seal {
              position: absolute;
              bottom: 40px;
              right: 40px;
              width: 100px;
              height: 100px;
              border-radius: 50%;
              border: 3px solid ${safeAccentColor};
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: ${safeAccentColor};
            }

            .signature {
              position: absolute;
              bottom: 40px;
              left: 40px;
              text-align: center;
            }

            .signature-line {
              border-bottom: 2px solid ${safeTextColor};
              width: 200px;
              margin-bottom: 5px;
            }

            .signature-text {
              font-size: 12px;
              color: ${safeTextColor}80;
            }

            @media print {
              body { margin: 0; }
              .certificate {
                box-shadow: none;
                border: 5px solid ${safeAccentColor};
              }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            ${safeLogoUrl ? `<img src="${safeLogoUrl}" alt="Logo" style="max-width: 150px; margin-bottom: 20px;">` : ''}

            <div class="certificate-header">
              <div class="certificate-title">${escapeHtml(t('certificateGenerator.certificateOfCompletion'))}</div>
              <div class="certificate-subtitle">${escapeHtml(t('certificateGenerator.certifyThat'))}</div>
            </div>

            <div class="certificate-body">
              <div class="recipient-name">${safeRecipientName}</div>
              <div class="certificate-text">
                ${escapeHtml(t('certificateGenerator.completedCourse'))}
              </div>
              <div class="course-name">${safeCourseName}</div>
              <div class="certificate-text">
                ${escapeHtml(t('certificateGenerator.withScoreOf'))} ${safeScore}% ${escapeHtml(t('certificateGenerator.on'))} ${completionDateLabel}
              </div>
              ${safeCustomMessage ? `<div class="certificate-text" style="font-style: italic;">${safeCustomMessage}</div>` : ''}
            </div>

            <div class="certificate-details">
              <div>
                <strong>${escapeHtml(t('certificateGenerator.courseDuration'))}:</strong> ${safeDuration} ${escapeHtml(t('minutes'))}
              </div>
              <div>
                <strong>${escapeHtml(t('wizard.category'))}:</strong> ${safeCategory}
              </div>
              <div>
                <strong>${escapeHtml(t('certificateGenerator.completionDate'))}:</strong> ${completionDateLabel}
              </div>
            </div>

            ${data.include_signature && safeInstructorName ? `
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-text">${safeInstructorName}</div>
                <div class="signature-text">${escapeHtml(t('certificateGenerator.instructor'))}</div>
              </div>
            ` : ''}

            ${data.include_seal ? `
              <div class="seal">
                <div>${escapeHtml(t('certificateGenerator.official'))}</div>
                <div>${escapeHtml(t('certificateGenerator.seal'))}</div>
              </div>
            ` : ''}

            <div class="certificate-footer">
              ${escapeHtml(t('certificateGenerator.certificateNumber'))}: ${safeCertificateId} |
              ${escapeHtml(t('certificateGenerator.issuedOn'))} ${issuedOnLabel}
            </div>
          </div>
        </body>
      </html>
    `
  }

  const handleDownloadCertificate = async () => {
    const template = templates?.find(tpl => tpl.id === selectedTemplate)
    if (!template) return

    let container: HTMLDivElement | null = null
    try {
      const certificateHtml = generateCertificateHTML(template, certificateData)
      const parser = new DOMParser()
      const parsed = parser.parseFromString(certificateHtml, 'text/html')
      const parsedCertificate = parsed.querySelector('.certificate')
      if (!parsedCertificate) {
        throw new Error('Invalid certificate HTML structure')
      }

      container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '-9999px'
      container.appendChild(document.importNode(parsedCertificate, true))
      document.body.appendChild(container)

      const renderElement = container.querySelector('.certificate')
      if (!renderElement) {
        throw new Error('Unable to prepare certificate for PDF generation')
      }

      const html2pdfModule = await import('html2pdf.js')
      const html2pdf = html2pdfModule.default as unknown as () => {
        set: (options: unknown) => {
          from: (element: HTMLElement) => { save: () => Promise<void> }
        }
      }
      const filenameBase = certificateData.recipient_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'certificate'

      const options = {
        margin: 0,
        filename: `certificate-${filenameBase}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'px', format: [800, 600] as [number, number], orientation: 'landscape' as const }
      }

      await html2pdf().set(options).from(renderElement as HTMLElement).save()
      toast.success(t('certificateGenerator.downloadSuccess', 'Certificate downloaded successfully'))
    } catch (error) {
      console.error(error)
      toast.error(t('certificateGenerator.failedDownload', 'Failed to generate PDF download'))
    } finally {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container)
      }
    }
  }

  useEffect(() => {
    if (!trainingCompletion) return

    setCertificateData((prev) => {
      const isInitialHydration = !prev.recipient_name.trim() && !prev.course_name.trim()
      return {
        ...prev,
        recipient_name: prev.recipient_name.trim() ? prev.recipient_name : (trainingCompletion.user?.full_name || ''),
        course_name: prev.course_name.trim() ? prev.course_name : (trainingCompletion.training_module?.title || ''),
        completion_date: isInitialHydration
          ? (toDateInputValue(trainingCompletion.completed_at) || format(new Date(), 'yyyy-MM-dd'))
          : prev.completion_date,
        score: isInitialHydration
          ? Math.min(100, Math.max(0, Math.round(trainingCompletion.quiz_score || 100)))
          : prev.score
      }
    })
  }, [trainingCompletion])

  useEffect(() => {
    if (!templates?.length || selectedTemplate) return
    const defaultTemplate = templates.find(tpl => tpl.is_default) || templates[0]
    setSelectedTemplate(defaultTemplate.id)
  }, [templates, selectedTemplate])

  const selectedTemplateData = useMemo(
    () => templates?.find(tpl => tpl.id === selectedTemplate),
    [selectedTemplate, templates]
  )

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Award className="h-5 w-5" />
            {t('certificateGenerator.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Training Selection */}
          {!trainingCompletionId && userCompletions && (
            <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <Label>{t('certificateGenerator.selectCompletion')}</Label>
              <Select value={trainingCompletionId || ''} onValueChange={(value) => {
                // This would typically navigate to the specific completion
                navigate(`/training/certificates/${value}`)
              }}>
                <SelectTrigger className={isRTL ? 'flex-row-reverse' : ''}>
                  <SelectValue placeholder={t('certificateGenerator.selectCompletionPlaceholder')} />
                </SelectTrigger>
                <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                  {userCompletions.map((completion: UserCompletion) => (
                    <SelectItem key={completion.id} value={completion.id} className={isRTL ? 'flex-row-reverse' : ''}>
                      {completion.training_module?.title} - {format(new Date(completion.completed_at), 'MMM dd, yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template Selection */}
          <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            <Label>{t('certificateGenerator.template')}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates?.map((template) => (
                <Card
                  key={template.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedTemplate === template.id && "ring-2 ring-blue-500"
                  )}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <h4 className="font-medium">{template.name}</h4>
                        {template.is_default && (
                          <Badge variant="secondary" className="text-xs">{t('certificateGenerator.default')}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div
                          className="w-6 h-6 rounded border-2"
                          style={{ backgroundColor: template.background_color, borderColor: template.accent_color }}
                        />
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: template.accent_color }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Certificate Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <Label htmlFor="recipient_name">{t('certificateGenerator.recipientName')}</Label>
              <Input
                id="recipient_name"
                value={certificateData.recipient_name}
                onChange={(e) => setCertificateData({ ...certificateData, recipient_name: e.target.value })}
                placeholder={t('certificateGenerator.recipientNamePlaceholder')}
                className={isRTL ? 'text-right' : 'text-left'}
              />
            </div>

            <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <Label htmlFor="course_name">{t('certificateGenerator.courseName')}</Label>
              <Input
                id="course_name"
                value={certificateData.course_name}
                onChange={(e) => setCertificateData({ ...certificateData, course_name: e.target.value })}
                placeholder={t('certificateGenerator.courseNamePlaceholder')}
                className={isRTL ? 'text-right' : 'text-left'}
              />
            </div>

            <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <Label htmlFor="completion_date">{t('certificateGenerator.completionDate')}</Label>
              <Input
                id="completion_date"
                type="date"
                value={certificateData.completion_date}
                onChange={(e) => setCertificateData({ ...certificateData, completion_date: e.target.value })}
                className={isRTL ? 'text-right flex-row-reverse' : 'text-left'}
              />
            </div>

            <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <Label htmlFor="score">{t('certificateGenerator.score')}</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={certificateData.score}
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10)
                  const nextScore = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0
                  setCertificateData({ ...certificateData, score: nextScore })
                }}
                className={isRTL ? 'text-right' : 'text-left'}
              />
            </div>

            <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <Label htmlFor="instructor_name">{t('certificateGenerator.instructorName')}</Label>
              <Input
                id="instructor_name"
                value={certificateData.instructor_name}
                onChange={(e) => setCertificateData({ ...certificateData, instructor_name: e.target.value })}
                placeholder={t('certificateGenerator.instructorNamePlaceholder')}
                className={isRTL ? 'text-right' : 'text-left'}
              />
            </div>

            <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <Label htmlFor="custom_message">{t('certificateGenerator.customMessage')}</Label>
              <Textarea
                id="custom_message"
                value={certificateData.custom_message}
                onChange={(e) => setCertificateData({ ...certificateData, custom_message: e.target.value })}
                placeholder={t('certificateGenerator.customMessagePlaceholder')}
                rows={3}
                className={isRTL ? 'text-right' : 'text-left'}
              />
            </div>
          </div>

          {/* Certificate Options */}
          <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            <Label>{t('certificateGenerator.options')}</Label>
            <div className="space-y-2">
              <div className={`flex items-center space-x-2 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}>
                <Checkbox
                  id="include_signature"
                  checked={certificateData.include_signature}
                  onCheckedChange={(checked) => setCertificateData({ ...certificateData, include_signature: !!checked })}
                />
                <Label htmlFor="include_signature" className={isRTL ? 'mr-2' : ''}>{t('certificateGenerator.includeSignature')}</Label>
              </div>
              <div className={`flex items-center space-x-2 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}>
                <Checkbox
                  id="include_seal"
                  checked={certificateData.include_seal}
                  onCheckedChange={(checked) => setCertificateData({ ...certificateData, include_seal: !!checked })}
                />
                <Label htmlFor="include_seal" className={isRTL ? 'mr-2' : ''}>{t('certificateGenerator.includeSeal')}</Label>
              </div>
              <div className={`flex items-center space-x-2 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}>
                <Checkbox
                  id="include_qr_code"
                  checked={certificateData.include_qr_code}
                  onCheckedChange={(checked) => setCertificateData({ ...certificateData, include_qr_code: !!checked })}
                />
                <Label htmlFor="include_qr_code" className={isRTL ? 'mr-2' : ''}>{t('certificateGenerator.includeQr')}</Label>
              </div>
            </div>
          </div>

          {/* Preview */}
          {selectedTemplateData && (
            <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <Label>{t('certificateGenerator.preview')}</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                    className={isRTL ? 'flex-row-reverse' : ''}
                  >
                    <Eye className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                    {previewMode ? t('certificateGenerator.hide') : t('certificateGenerator.show')} {t('certificateGenerator.preview')}
                  </Button>
                </div>
              </div>

              {previewMode && (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={generateCertificateHTML(selectedTemplateData, certificateData)}
                    className="w-full h-96"
                    title="Certificate Preview"
                    sandbox=""
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Button
              onClick={() => handleDownloadCertificate()}
              disabled={!selectedTemplate || !certificateData.recipient_name || !certificateData.course_name}
              className={isRTL ? 'flex-row-reverse' : ''}
            >
              <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t('certificateGenerator.generateDownload')}
            </Button>

            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              className={isRTL ? 'flex-row-reverse' : ''}
            >
              <Eye className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t('certificateGenerator.preview')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
