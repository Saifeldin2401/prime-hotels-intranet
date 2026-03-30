import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Clock, Star, AlertCircle, Sparkles } from 'lucide-react'

interface ResponseTemplate {
  id: string
  name: string
  category: 'complaint' | 'praise' | 'question' | 'general' | 'maintenance' | 'service'
  tone: 'professional' | 'empathetic' | 'formal' | 'friendly'
  contentEn: string
  contentAr: string
  tags: string[]
}

const TEMPLATES: ResponseTemplate[] = [
  {
    id: '1',
    name: 'General Thank You',
    category: 'praise',
    tone: 'friendly',
    contentEn: `Dear {guest_name},

Thank you so much for taking the time to share your wonderful feedback about your recent stay at {property_name}. We are thrilled to hear that you had a memorable experience with us.

Your kind words about our team and services mean a great deal to us. We look forward to welcoming you back soon.

Warm regards,
{property_name} Management`,
    contentAr: `عزيزي {guest_name}،

شكراً جزيلاً لك على تخصيص وقتك لمشاركة ملاحظاتك الرائعة عن إقامتك الأخيرة في {property_name}. يسعدنا أن نسمع أنك قد قضيت تجربة لا تُنسى معنا.

كلماتك الطيبة عن فريقنا وخدماتنا تعني الكثير بالنسبة لنا. نتطلع لاستقبالك مجدداً قريباً.

مع أطيب التحيات،
إدارة {property_name}`,
    tags: ['positive', 'thank you', 'simple']
  },
  {
    id: '2',
    name: 'Service Complaint Response',
    category: 'complaint',
    tone: 'empathetic',
    contentEn: `Dear {guest_name},

Thank you for sharing your feedback regarding your recent stay. Please accept our sincere apologies for the service issues you experienced. This is not the standard we strive to maintain.

We have immediately addressed this matter with our team to ensure it does not happen again. We would appreciate the opportunity to make this right and hope to welcome you back for a much-improved experience.

Please contact us directly at {contact_email} so we can discuss how to restore your confidence in us.

Sincerely,
{property_name} Management`,
    contentAr: `عزيزي {guest_name}،

شكراً لك على مشاركة ملاحظاتك بخصوص إقامتك الأخيرة. يرجى قبول اعتذارنا الصادق عن مشاكل الخدمة التي واجهتها. هذا ليس المستوى الذي نسعى للحفاظ عليه.

لقد عالجنا هذا الأمر على الفور مع فريقنا لضمان عدم تكراره مرة أخرى. نقدر الفرصة لتصحيح الوضع ونأمل في استقبالك مجدداً لتجربة محسنة.

يرجى التواصل معنا مباشرة على {contact_email} لمناقشة كيفية استعادة ثقتك بنا.

بإخلاص،
إدارة {property_name}`,
    tags: ['service', 'complaint', 'apology']
  },
  {
    id: '3',
    name: 'Maintenance Issue',
    category: 'maintenance',
    tone: 'professional',
    contentEn: `Dear {guest_name},

Thank you for bringing the maintenance concern to our attention. We sincerely apologize for any inconvenience this may have caused during your stay.

Our engineering team has been notified and the issue has been promptly resolved. We have also implemented additional preventive measures to avoid similar occurrences in the future.

Your feedback helps us improve, and we hope to have the opportunity to provide you with a flawless stay in the future.

Best regards,
{property_name} Management`,
    contentAr: `عزيزي {guest_name}،

شكراً لك لإبلاغنا بمشكلة الصيانة. نعتذر بصدق عن أي إزعاج قد تكونسبببه لك خلال إقامتك.

تم إبلاغ فريق الهندسة لدينا وتم حل المشكلة على الفور. كما قمنا بتنفيذ تدابير وقائية إضافية لتجنب حدوث مماثل في المستقبل.

ملاحظاتك تساعدنا على التحسن، ونأمل في الحصول على فرصة لتقديم إقامة مثالية لك في المستقبل.

مع أفضل التحيات،
إدارة {property_name}`,
    tags: ['maintenance', 'facilities', 'technical']
  },
  {
    id: '4',
    name: 'VIP Guest Recognition',
    category: 'general',
    tone: 'formal',
    contentEn: `Dear {guest_name},

It was an absolute honor to have you as our guest at {property_name}. We are delighted that you chose to stay with us and that we could provide you with an exceptional experience.

As one of our valued VIP guests, your satisfaction is our top priority. We have noted your preferences and look forward to exceeding your expectations on your next visit.

Please do not hesitate to contact me personally for any future reservations.

With highest regards,
{manager_name}
General Manager`,
    contentAr: `عزيزي {guest_name}،

كان شرفاً كبيراً أن نستضيفك في {property_name}. يسعدنا أنك اخترت الإقامة معنا وأننا تمكنا من تقديم تجربة استثنائية لك.

بصفتك أحد ضيوف VIP المميزين، رضاك هو أولويتنا القصوى. لقد قمنا بتدوين تفضيلاتك ونتطلع لتجاوز توقعاتك في زيارتك القادمة.

لا تتردد في التواصل معي شخصياً لأي حجوزات مستقبلية.

مع أطيب التحيات،
{manager_name}
المدير العام`,
    tags: ['vip', 'loyalty', 'personal']
  },
  {
    id: '5',
    name: 'Question/Inquiry Response',
    category: 'question',
    tone: 'professional',
    contentEn: `Dear {guest_name},

Thank you for your inquiry regarding {topic}. We appreciate your interest in {property_name}.

{answer}

If you have any further questions or need additional information, please feel free to reach out to us at any time. We are here to assist you.

We look forward to the possibility of welcoming you as our guest.

Best regards,
{property_name} Team`,
    contentAr: `عزيزي {guest_name}،

شكراً لاستفسارك بخصوص {topic}. نقدر اهتمامك بـ {property_name}.

{answer}

إذا كان لديك أي أسئلة أخرى أو تحتاج إلى معلومات إضافية، فلا تتردد في التواصل معنا في أي وقت. نحن هنا لمساعدتك.

نتطلع لإمكانية استقبالك كضيف لدينا.

مع أفضل التحيات،
فريق {property_name}`,
    tags: ['question', 'information', 'inquiry']
  },
  {
    id: '6',
    name: 'Quick Acknowledgment',
    category: 'general',
    tone: 'friendly',
    contentEn: `Dear {guest_name},

Thank you for sharing your feedback! We're so glad you enjoyed your stay with us. Hope to see you again soon!

Best,
{property_name} Team`,
    contentAr: `عزيزي {guest_name}،

شكراً لمشاركة ملاحظاتك! نحن سعداء جداً بأنك استمتعت بإقامتك معنا. نأمل أن نراك مجدداً قريباً!

أطيب التحيات،
فريق {property_name}`,
    tags: ['short', 'quick', 'positive']
  }
]

const CATEGORY_ICONS = {
  complaint: AlertCircle,
  praise: Star,
  question: MessageSquare,
  general: MessageSquare,
  maintenance: AlertCircle,
  service: Clock,
}

const CATEGORY_COLORS = {
  complaint: 'bg-red-100 text-red-700',
  praise: 'bg-green-100 text-green-700',
  question: 'bg-blue-100 text-blue-700',
  general: 'bg-gray-100 text-gray-700',
  maintenance: 'bg-orange-100 text-orange-700',
  service: 'bg-purple-100 text-purple-700',
}

interface ResponseTemplatesProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: ResponseTemplate) => void
  propertyName?: string
}

export function ResponseTemplates({ isOpen, onClose, onSelect, propertyName }: ResponseTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<ResponseTemplate | null>(null)

  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const categories = Array.from(new Set(TEMPLATES.map((t) => t.category)))

  const handleSelect = (template: ResponseTemplate) => {
    // Replace placeholders
    const processed = {
      ...template,
      contentEn: template.contentEn
        .replace(/{property_name}/g, propertyName || 'Our Hotel')
        .replace(/{guest_name}/g, '[Guest Name]')
        .replace(/{manager_name}/g, '[Manager Name]')
        .replace(/{contact_email}/g, '[email@hotel.com]')
        .replace(/{topic}/g, '[Topic]')
        .replace(/{answer}/g, '[Your answer here]'),
      contentAr: template.contentAr
        .replace(/{property_name}/g, propertyName || 'فندقنا')
        .replace(/{guest_name}/g, '[اسم الضيف]')
        .replace(/{manager_name}/g, '[اسم المدير]')
        .replace(/{contact_email}/g, '[email@hotel.com]')
        .replace(/{topic}/g, '[الموضوع]')
        .replace(/{answer}/g, '[إجابتك هنا]'),
    }
    onSelect(processed)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Response Templates
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-[280px_1fr] h-[600px]">
          {/* Sidebar */}
          <div className="border-r p-4 space-y-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Categories */}
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                All Templates
              </button>
              {categories.map((category) => {
                const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      selectedCategory === category ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Template List */}
          <div className="flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {filteredTemplates.map((template) => {
                  const Icon = CATEGORY_ICONS[template.category]
                  return (
                    <div
                      key={template.id}
                      onClick={() => setPreviewTemplate(template)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        previewTemplate?.id === template.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{template.name}</span>
                        </div>
                        <Badge className={CATEGORY_COLORS[template.category]} variant="secondary">
                          {template.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {template.contentEn.substring(0, 100)}...
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            {/* Preview */}
            {previewTemplate && (
              <div className="border-t p-4 bg-muted/30">
                <h4 className="font-medium mb-3">Preview: {previewTemplate.name}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">English</label>
                    <Textarea
                      value={previewTemplate.contentEn.substring(0, 200) + '...'}
                      readOnly
                      className="text-xs h-24 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Arabic</label>
                    <Textarea
                      value={previewTemplate.contentAr.substring(0, 200) + '...'}
                      readOnly
                      className="text-xs h-24 resize-none"
                      dir="rtl"
                    />
                  </div>
                </div>
                <Button 
                  onClick={() => handleSelect(previewTemplate)}
                  className="w-full mt-3"
                >
                  Use This Template
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { TEMPLATES }
export type { ResponseTemplate }
