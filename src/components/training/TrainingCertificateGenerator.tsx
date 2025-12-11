import { useState } from 'react'
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
      toast.error('Failed to download certificate')
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
              <div class="certificate-title">Certificate of Completion</div>
              <div class="certificate-subtitle">This is to certify that</div>
            </div>
            
            <div class="certificate-body">
              <div class="recipient-name">${data.recipient_name}</div>
              <div class="certificate-text">
                has successfully completed the training course
              </div>
              <div class="course-name">${data.course_name}</div>
              <div class="certificate-text">
                with a score of ${data.score}% on ${format(new Date(data.completion_date), 'MMMM dd, yyyy')}
              </div>
              ${data.custom_message ? `<div class="certificate-text" style="font-style: italic;">${data.custom_message}</div>` : ''}
            </div>
            
            <div class="certificate-details">
              <div>
                <strong>Course Duration:</strong> ${trainingCompletion?.training_module?.duration_minutes || 60} minutes
              </div>
              <div>
                <strong>Category:</strong> ${trainingCompletion?.training_module?.category || 'General'}
              </div>
              <div>
                <strong>Completion Date:</strong> ${format(new Date(data.completion_date), 'MMMM dd, yyyy')}
              </div>
            </div>
            
            ${data.include_signature && data.instructor_name ? `
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-text">${data.instructor_name}</div>
                <div class="signature-text">Instructor</div>
              </div>
            ` : ''}
            
            ${data.include_seal ? `
              <div class="seal">
                <div>OFFICIAL</div>
                <div>SEAL</div>
              </div>
            ` : ''}
            
            <div class="certificate-footer">
              Certificate Number: ${trainingCompletion?.id || 'N/A'} | 
              Issued on ${format(new Date(), 'MMMM dd, yyyy')}
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certificate Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Training Selection */}
          {!trainingCompletionId && userCompletions && (
            <div className="space-y-2">
              <Label>Select Training Completion</Label>
              <Select value={trainingCompletionId || ''} onValueChange={(value) => {
                // This would typically navigate to the specific completion
                window.location.href = `/training/certificates/${value}`
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a completed training" />
                </SelectTrigger>
                <SelectContent>
                  {userCompletions.map((completion: any) => (
                    <SelectItem key={completion.id} value={completion.id}>
                      {completion.training_module?.title} - {format(new Date(completion.completed_at), 'MMM dd, yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Certificate Template</Label>
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
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{template.name}</h4>
                        {template.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex gap-1">
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
            <div className="space-y-2">
              <Label htmlFor="recipient_name">Recipient Name *</Label>
              <Input
                id="recipient_name"
                value={certificateData.recipient_name}
                onChange={(e) => setCertificateData({ ...certificateData, recipient_name: e.target.value })}
                placeholder="Enter recipient's full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course_name">Course Name *</Label>
              <Input
                id="course_name"
                value={certificateData.course_name}
                onChange={(e) => setCertificateData({ ...certificateData, course_name: e.target.value })}
                placeholder="Enter course name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="completion_date">Completion Date *</Label>
              <Input
                id="completion_date"
                type="date"
                value={certificateData.completion_date}
                onChange={(e) => setCertificateData({ ...certificateData, completion_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="score">Score (%)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={certificateData.score}
                onChange={(e) => setCertificateData({ ...certificateData, score: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructor_name">Instructor Name</Label>
              <Input
                id="instructor_name"
                value={certificateData.instructor_name}
                onChange={(e) => setCertificateData({ ...certificateData, instructor_name: e.target.value })}
                placeholder="Enter instructor name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom_message">Custom Message</Label>
              <Textarea
                id="custom_message"
                value={certificateData.custom_message}
                onChange={(e) => setCertificateData({ ...certificateData, custom_message: e.target.value })}
                placeholder="Optional custom message"
                rows={3}
              />
            </div>
          </div>

          {/* Certificate Options */}
          <div className="space-y-4">
            <Label>Certificate Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_signature"
                  checked={certificateData.include_signature}
                  onCheckedChange={(checked) => setCertificateData({ ...certificateData, include_signature: !!checked })}
                />
                <Label htmlFor="include_signature">Include signature</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_seal"
                  checked={certificateData.include_seal}
                  onCheckedChange={(checked) => setCertificateData({ ...certificateData, include_seal: !!checked })}
                />
                <Label htmlFor="include_seal">Include official seal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_qr_code"
                  checked={certificateData.include_qr_code}
                  onCheckedChange={(checked) => setCertificateData({ ...certificateData, include_qr_code: !!checked })}
                />
                <Label htmlFor="include_qr_code">Include QR code for verification</Label>
              </div>
            </div>
          </div>

          {/* Preview */}
          {selectedTemplateData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Preview</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {previewMode ? 'Hide' : 'Show'} Preview
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
          <div className="flex gap-3">
            <Button
              onClick={() => handleDownloadCertificate()}
              disabled={!selectedTemplate || !certificateData.recipient_name || !certificateData.course_name}
            >
              <Download className="h-4 w-4 mr-2" />
              Generate & Download Certificate
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
