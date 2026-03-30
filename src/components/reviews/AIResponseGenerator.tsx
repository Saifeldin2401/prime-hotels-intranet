import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Wand2, Lightbulb, RotateCcw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuestReview {
  id: string
  review_text?: string
  review_title?: string
  sentiment?: string
  severity?: string
  issues?: Array<{
    category: string
    issue_summary_en?: string
  }>
}

interface AIResponseGeneratorProps {
  review: GuestReview
  onGenerate: (response: { en: string; ar: string }) => void
  className?: string
}

interface GeneratedResponse {
  id: string
  tone: 'professional' | 'empathetic' | 'formal'
  en: string
  ar: string
  confidence: number
  reasoning: string
}

export function AIResponseGenerator({ review, onGenerate, className }: AIResponseGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedResponses, setGeneratedResponses] = useState<GeneratedResponse[]>([])
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null)
  const [showReasoning, setShowReasoning] = useState(false)

  const generateResponses = async () => {
    setIsGenerating(true)
    
    // Simulate AI generation with different tones
    // In production, this would call an AI service
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    const sentiment = review.sentiment?.toLowerCase()
    const hasIssues = review.issues && review.issues.length > 0
    const isNegative = sentiment === 'negative' || sentiment === 'mixed'
    
    const responses: GeneratedResponse[] = [
      {
        id: '1',
        tone: 'professional',
        confidence: 92,
        reasoning: 'Balanced professional tone suitable for all guest types',
        en: generateProfessionalResponse(review, isNegative, hasIssues),
        ar: generateArabicResponse(review, isNegative, hasIssues, 'professional'),
      },
      {
        id: '2',
        tone: 'empathetic',
        confidence: 88,
        reasoning: 'Warm empathetic tone acknowledging guest concerns',
        en: generateEmpatheticResponse(review, isNegative, hasIssues),
        ar: generateArabicResponse(review, isNegative, hasIssues, 'empathetic'),
      },
      {
        id: '3',
        tone: 'formal',
        confidence: 85,
        reasoning: 'Formal corporate tone for VIP or business guests',
        en: generateFormalResponse(review, isNegative, hasIssues),
        ar: generateArabicResponse(review, isNegative, hasIssues, 'formal'),
      },
    ]
    
    setGeneratedResponses(responses)
    setIsGenerating(false)
  }

  const handleSelect = (response: GeneratedResponse) => {
    setSelectedResponse(response.id)
    onGenerate({ en: response.en, ar: response.ar })
  }

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm">AI Response Generator</h3>
          </div>
          <Button
            size="sm"
            onClick={generateResponses}
            disabled={isGenerating}
            className="h-8"
          >
            {isGenerating ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5 mr-2" />
                Generate Responses
              </>
            )}
          </Button>
        </div>

        {generatedResponses.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">
                Select the tone that best fits this response
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs ml-auto"
                onClick={() => setShowReasoning(!showReasoning)}
              >
                {showReasoning ? 'Hide' : 'Show'} reasoning
              </Button>
            </div>

            <div className="grid gap-3">
              {generatedResponses.map((response) => (
                <div
                  key={response.id}
                  onClick={() => handleSelect(response)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    selectedResponse === response.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-primary/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {response.tone}
                      </Badge>
                      {showReasoning && (
                        <span className="text-[10px] text-muted-foreground">
                          {response.reasoning}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {response.confidence}% match
                      </span>
                      {selectedResponse === response.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Textarea
                      value={response.en.substring(0, 120) + '...'}
                      readOnly
                      className="text-xs h-16 resize-none bg-muted/30"
                    />
                    <Textarea
                      value={response.ar.substring(0, 120) + '...'}
                      readOnly
                      className="text-xs h-16 resize-none bg-muted/30"
                      dir="rtl"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          AI-generated responses are suggestions only. Please review and edit before posting.
        </p>
      </CardContent>
    </Card>
  )
}

// Helper functions to generate responses based on review context
function generateProfessionalResponse(review: GuestReview, isNegative: boolean, hasIssues: boolean): string {
  if (isNegative && hasIssues) {
    return `Dear Guest,

Thank you for taking the time to share your feedback regarding your recent stay. We sincerely apologize for the issues you experienced with ${review.issues?.[0]?.category || 'our services'}.

Please be assured that this is not reflective of our usual standards. We have immediately addressed this matter with the relevant department to ensure improvements are made.

We would appreciate the opportunity to restore your confidence in us. Please contact our Guest Relations team directly to discuss how we can make this right.

Sincerely,
Management Team`
  }
  
  if (isNegative) {
    return `Dear Guest,

Thank you for your feedback. We are sorry to hear that your recent experience did not meet your expectations.

We take all feedback seriously and would like to understand more about your concerns. Please reach out to us directly so we can address them personally.

We hope to have the opportunity to provide you with a better experience in the future.

Best regards,
Management Team`
  }
  
  return `Dear Guest,

Thank you for sharing your positive feedback about your recent stay. We are delighted to hear that you had an enjoyable experience with us.

Your kind words about our team and services are greatly appreciated. We look forward to welcoming you back on your next visit.

Warm regards,
Management Team`
}

function generateEmpatheticResponse(review: GuestReview, isNegative: boolean, hasIssues: boolean): string {
  if (isNegative && hasIssues) {
    return `Dear Guest,

We truly appreciate you sharing your experience, and we want you to know how sorry we are that things didn't go as planned during your stay. Hearing about the issues with ${review.issues?.[0]?.category || 'your experience'} concerns us deeply.

We completely understand your frustration, and we want to make this right. Please know that we're taking your feedback to heart and have already begun making improvements.

We would love the chance to show you the experience you deserve. Please reach out to us directly.

With sincere apologies,
Management Team`
  }
  
  if (isNegative) {
    return `Dear Guest,

We're truly sorry your stay didn't meet the high standards we set for ourselves. Your experience matters deeply to us, and we hate that we let you down.

We'd love to learn more about what happened and how we can make it up to you. Please contact us directly.

Hoping for another chance,
Management Team`
  }
  
  return `Dear Guest,

What a joy to read your wonderful review! We're absolutely thrilled that you had such a great experience with us. Stories like yours remind us why we love what we do.

Thank you for your kind words about our team - they'll be so happy to hear them!

Can't wait to welcome you back!

With gratitude,
Management Team`
}

function generateFormalResponse(review: GuestReview, isNegative: boolean, hasIssues: boolean): string {
  if (isNegative && hasIssues) {
    return `Dear Valued Guest,

We acknowledge receipt of your feedback regarding your recent accommodation. Please accept our formal apologies for the deficiencies in service that you have brought to our attention.

Rest assured, we have escalated this matter to senior management for immediate review and corrective action. We maintain rigorous standards and are committed to addressing these shortcomings.

We invite you to contact our Executive Office directly to discuss a resolution that meets your satisfaction.

Respectfully,
General Manager`
  }
  
  if (isNegative) {
    return `Dear Valued Guest,

We acknowledge your feedback and express our sincere regrets that our services did not meet your expectations during your recent visit.

We would welcome the opportunity to discuss your experience in greater detail. Please contact our management team at your earliest convenience.

We remain at your service.

Respectfully,
General Manager`
  }
  
  return `Dear Valued Guest,

It is with great pleasure that we acknowledge your favorable comments regarding your recent stay.

We are gratified to learn that our facilities and services met with your approval. Your commendation of our staff has been duly noted and will be shared with the team.

We consider it an honor to have served you and look forward to your return.

With highest regards,
General Manager`
}

function generateArabicResponse(review: GuestReview, isNegative: boolean, hasIssues: boolean, tone: string): string {
  const toneMap: Record<string, { apology: string; closing: string }> = {
    professional: {
      apology: 'نعتذر بصدق',
      closing: 'مع أطيب التحيات،\nفريق الإدارة',
    },
    empathetic: {
      apology: 'نأسف بشدة',
      closing: 'مع خالص التقدير،\nفريق الإدارة',
    },
    formal: {
      apology: 'نقدم اعتذارنا الرسمي',
      closing: 'بتقدير واحترام،\nالمدير العام',
    },
  }
  
  const t = toneMap[tone]
  
  if (isNegative) {
    return `عزيزي الضيف،

شكراً لك على مشاركة ملاحظاتك. ${t.apology} لأن تجربتك الأخيرة لم تكن كما كنت تتوقع.

نأخذ جميع الملاحظات على محمل الجد ونود فهم المزيد عن مخاوفك. يرجى التواصل معنا مباشرة لنتمكن من معالجتها بشكل شخصي.

نأمل في الحصول على فرصة لتقديم تجربة أفضل لك في المستقبل.

${t.closing}`
  }
  
  return `عزيزي الضيف،

شكراً لك على مشاركة ملاحظاتك الإيجابية عن إقامتك الأخيرة. يسعدنا أن نسمع أنك قد قضيت تجربة ممتعة معنا.

كلماتك الطيبة عن فريقنا محل تقدير كبير. نتطلع لاستقبالك مجدداً في زيارتك القادمة.

${t.closing}`
}
