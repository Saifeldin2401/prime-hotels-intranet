import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, GraduationCap, Layers, Loader2, Shield, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Template {
  id: string
  name: string
  description: string
  category: 'safety' | 'policy' | 'skill' | 'onboarding' | 'custom'
  template_structure
}

interface ModuleTemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTemplateSelected: (template: Template) => void
}

const categoryIcons = {
  safety: Shield,
  policy: BookOpen,
  skill: GraduationCap,
  onboarding: Sparkles,
  custom: Layers
}

const categoryColors = {
  safety: 'bg-red-50 text-red-700 border-red-200',
  policy: 'bg-blue-50 text-blue-700 border-blue-200',
  skill: 'bg-green-50 text-green-700 border-green-200',
  onboarding: 'bg-purple-50 text-purple-700 border-purple-200',
  custom: 'bg-gray-50 text-gray-700 border-gray-200'
}

export function ModuleTemplateSelector({
  open,
  onOpenChange,
  onTemplateSelected
}: ModuleTemplateSelectorProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const { data: templates, isLoading, isError } = useQuery({
    queryKey: ['training-templates', selectedCategory],
    queryFn: async () => {
      // training_content_templates keeps its own table (13 seed rows preserved).
      // Future: migrate to documents with content_type='training_template'.
      let query = supabase
        .from('training_content_templates')
        .select('*')
        .eq('is_active', true)

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Template[]
    },
    enabled: open,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false
  })

  const categories = [
    { value: 'all', label: t('hub.templates.allCategories') },
    { value: 'safety', label: t('hub.templates.safety') },
    { value: 'policy', label: t('hub.templates.policy') },
    { value: 'skill', label: t('hub.templates.skill') },
    { value: 'onboarding', label: t('hub.templates.onboarding') },
    { value: 'custom', label: t('hub.templates.custom') }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={cn(isRTL ? "text-right" : "text-left")}>
            {t('hub.templates.title')}
          </DialogTitle>
          <DialogDescription className={cn(isRTL ? "text-right" : "text-left")}>
            {t('hub.templates.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Category Filter */}
        <div className={cn("flex gap-2 flex-wrap mb-6", isRTL ? "flex-row-reverse" : "")}>
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                selectedCategory === cat.value && "bg-hotel-gold hover:bg-hotel-gold-dark",
                isRTL ? "flex-row-reverse" : ""
              )}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
          </div>
        ) : isError ? (
          <div className="flex justify-center py-12 text-sm text-red-500">
            {t('hub.templates.error', 'Failed to load templates')}
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => {
              const Icon = categoryIcons[template.category] || Layers
              const colorClass = categoryColors[template.category] || categoryColors.custom

              return (
                <Card
                  key={template.id}
                  className={cn(
                    "cursor-pointer hover:shadow-lg transition-all border-2 hover:border-hotel-gold",
                    isRTL ? "text-right" : "text-left"
                  )}
                  onClick={() => onTemplateSelected(template)}
                >
                  <CardHeader>
                    <div className={cn("flex items-start justify-between gap-4", isRTL ? "flex-row-reverse" : "")}>
                      <div className="flex-1">
                        <div className={cn("flex items-center gap-2 mb-2", isRTL ? "flex-row-reverse" : "")}>
                          <Icon className="h-5 w-5 text-hotel-navy" />
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                        </div>
                        <CardDescription className={cn("line-clamp-2", isRTL ? "text-right" : "text-left")}>
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge className={cn(colorClass, "shrink-0")}>
                        {categories.find(c => c.value === template.category)?.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                      <span className="text-sm text-muted-foreground">
                        {template.template_structure?.sections?.length || 0} {t('hub.templates.sections')}
                      </span>
                      <Button
                        size="sm"
                        className={cn("bg-hotel-gold hover:bg-hotel-gold-dark", isRTL ? "flex-row-reverse" : "")}
                      >
                        {t('hub.templates.useTemplate')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('hub.templates.noTemplates')}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

