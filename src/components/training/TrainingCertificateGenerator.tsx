import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Award,
  Download,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
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

export function TrainingCertificateGenerator({
  trainingCompletionId,
  userId,
  className
}: TrainingCertificateGeneratorProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const { user } = useAuth()

  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [certificateData, setCertificateData] = useState({
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
        .from('training_completions')
        .select(`
          *,
          training_module:training_module_id(id, title, description, duration_minutes, category),
          user:user_id(id, full_name, email, user_profiles(department_id, position))
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

      const { data, error } = await supabase
        .from('training_completions')
        .select(`
          *,
          training_module:training_module_id(id, title, description, category)
        `)
        .eq('user_id', targetUserId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !trainingCompletionId
  })


  const handleDownloadCertificate = async () => {
    try {
      const template = templates?.find(t => t.id === selectedTemplate)
      if (!template) return

      // Generate HTML certificate
      const certificateHtml = generateCertificateHTML(template, certificateData)

      // Create download link
      const blob = new Blob([certificateHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `certificate-${certificateData.recipient_name.replace(/\s+/g, '-')}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('certificateGenerator.failedDownload'))
    }
  }

  const generateCertificateHTML = (template: CertificateTemplate, data: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Certificate of Completion</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=${template.font_family.replace(' ', '+')}&display=swap');
            
            body {
              margin: 0;
              padding: 0;
              font-family: '${template.font_family}', serif;
              background-color: ${template.background_color};
              color: ${template.text_color};
            }
            
            .certificate {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              position: relative;
              min-height: 600px;
              border: 10px solid ${template.accent_color};
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            
            .certificate-header {
              text-align: center;
              margin-bottom: 30px;
            }
            
            .certificate-title {
              font-size: 36px;
              font-weight: bold;
              color: ${template.accent_color};
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
              color: ${template.accent_color};
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
              color: ${template.accent_color};
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
              color: ${template.text_color}80;
            }
            
            .seal {
              position: absolute;
              bottom: 40px;
              right: 40px;
              width: 100px;
              height: 100px;
              border-radius: 50%;
              border: 3px solid ${template.accent_color};
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: ${template.accent_color};
            }
            
            .signature {
              position: absolute;
              bottom: 40px;
              left: 40px;
              text-align: center;
            }
            
            .signature-line {
              border-bottom: 2px solid ${template.text_color};
              width: 200px;
              margin-bottom: 5px;
            }
            
            .signature-text {
              font-size: 12px;
              color: ${template.text_color}80;
            }
            
            @media print {
              body { margin: 0; }
              .certificate { 
                box-shadow: none;
                border: 5px solid ${template.accent_color};
              }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            ${template.logo_url ? `<img src="${template.logo_url}" alt="Logo" style="max-width: 150px; margin-bottom: 20px;">` : ''}
            
            <div class="certificate-header">
              <div class="certificate-title">${t('certificateGenerator.certificateOfCompletion')}</div>
              <div class="certificate-subtitle">${t('certificateGenerator.certifyThat')}</div>
            </div>
            
            <div class="certificate-body">
              <div class="recipient-name">${data.recipient_name}</div>
              <div class="certificate-text">
                ${t('certificateGenerator.completedCourse')}
              </div>
              <div class="course-name">${data.course_name}</div>
              <div class="certificate-text">
                ${t('certificateGenerator.withScoreOf')} ${data.score}% ${t('certificateGenerator.on')} ${format(new Date(data.completion_date), 'MMMM dd, yyyy')}
              </div>
              ${data.custom_message ? `<div class="certificate-text" style="font-style: italic;">${data.custom_message}</div>` : ''}
            </div>
            
            <div class="certificate-details">
              <div>
                <strong>${t('certificateGenerator.courseDuration')}:</strong> ${trainingCompletion?.training_module?.duration_minutes || 60} ${t('minutes')}
              </div>
              <div>
                <strong>${t('wizard.category')}:</strong> ${trainingCompletion?.training_module?.category || t('categories.general')}
              </div>
              <div>
                <strong>${t('certificateGenerator.completionDate')}:</strong> ${format(new Date(data.completion_date), 'MMMM dd, yyyy')}
              </div>
            </div>
            
            ${data.include_signature && data.instructor_name ? `
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-text">${data.instructor_name}</div>
                <div class="signature-text">${t('certificateGenerator.instructor')}</div>
              </div>
            ` : ''}
            
            ${data.include_seal ? `
              <div class="seal">
                <div>${t('certificateGenerator.official')}</div>
                <div>${t('certificateGenerator.seal')}</div>
              </div>
            ` : ''}
            
            <div class="certificate-footer">
              ${t('certificateGenerator.certificateNumber')}: ${trainingCompletion?.id || 'N/A'} | 
              ${t('certificateGenerator.issuedOn')} ${format(new Date(), 'MMMM dd, yyyy')}
            </div>
          </div>
        </body>
      </html>
    `
  }

  // Auto-populate data from training completion
  if (trainingCompletion && !certificateData.recipient_name) {
    setCertificateData({
      ...certificateData,
      recipient_name: trainingCompletion.user?.full_name || '',
      course_name: trainingCompletion.training_module?.title || '',
      completion_date: trainingCompletion.completed_at?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
      score: trainingCompletion.score || 100
    })
  }

  // Set default template
  if (templates && templates.length > 0 && !selectedTemplate) {
    const defaultTemplate = templates.find(t => t.is_default) || templates[0]
    setSelectedTemplate(defaultTemplate.id)
  }

  const selectedTemplateData = templates?.find(t => t.id === selectedTemplate)

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
                window.location.href = `/training/certificates/${value}`
              }}>
                <SelectTrigger className={isRTL ? 'flex-row-reverse' : ''}>
                  <SelectValue placeholder={t('certificateGenerator.selectCompletionPlaceholder')} />
                </SelectTrigger>
                <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                  {userCompletions.map((completion: any) => (
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
                onChange={(e) => setCertificateData({ ...certificateData, score: parseInt(e.target.value) || 0 })}
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
