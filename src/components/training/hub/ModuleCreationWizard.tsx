import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wand2, Sparkles, BookOpen, Settings, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/use-toast'

interface ModuleCreationWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (moduleId: string) => void
}

type WizardStep = 'topic' | 'details' | 'settings' | 'review'

interface WizardData {
  topic: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedDuration: string
  validityPeriod: string
  certificateEnabled: boolean
  passingScore: string
}

const steps: { key: WizardStep; title: string; icon: any }[] = [
  { key: 'topic', title: 'Topic & Purpose', icon: Sparkles },
  { key: 'details', title: 'Details', icon: BookOpen },
  { key: 'settings', title: 'Settings', icon: Settings },
  { key: 'review', title: 'Review', icon: CheckCircle2 }
]

export function ModuleCreationWizard({
  open,
  onOpenChange,
  onComplete
}: ModuleCreationWizardProps) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const { toast } = useToast()

  const [currentStep, setCurrentStep] = useState<WizardStep>('topic')
  const [data, setData] = useState<WizardData>({
    topic: '',
    description: '',
    category: '',
    difficulty: 'beginner',
    estimatedDuration: '30',
    validityPeriod: '365',
    certificateEnabled: true,
    passingScore: '80'
  })

  const createModuleMutation = useMutation({
    mutationFn: async (values: Partial<WizardData>) => {
      const { data: module, error } = await supabase
        .from('training_modules')
        .insert({
          title: values.topic,
          description: values.description,
          category: values.category,
          difficulty_level: values.difficulty,
          estimated_duration: values.estimatedDuration,
          validity_period_days: parseInt(values.validityPeriod || '365'),
          certificate_enabled: values.certificateEnabled,
          passing_score_percentage: parseInt(values.passingScore || '80'),
          created_by: profile?.id,
          status: 'draft'
        })
        .select()
        .single()

      if (error) throw error
      return module
    },
    onSuccess: (module) => {
      toast({
        title: t('hub.wizard.moduleCreated'),
        description: t('hub.wizard.moduleCreatedDesc')
      })
      onComplete(module.id)
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: t('hub.wizard.createError'),
        variant: 'destructive'
      })
    }
  })

  const currentStepIndex = steps.findIndex(s => s.key === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const handleNext = () => {
    const stepOrder: WizardStep[] = ['topic', 'details', 'settings', 'review']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const stepOrder: WizardStep[] = ['topic', 'details', 'settings', 'review']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }

  const handleComplete = () => {
    createModuleMutation.mutate(data)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'topic':
        return !!data.topic && !!data.category
      case 'details':
        return !!data.description && !!data.difficulty
      case 'settings':
        return true
      case 'review':
        return true
      default:
        return false
    }
  }

  const resetWizard = () => {
    setCurrentStep('topic')
    setData({
      topic: '',
      description: '',
      category: '',
      difficulty: 'beginner',
      estimatedDuration: '30',
      validityPeriod: '365',
      certificateEnabled: true,
      passingScore: '80'
    })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetWizard()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse text-right" : "text-left")}>
            <Wand2 className="h-5 w-5 text-hotel-gold" />
            {t('hub.wizard.title')}
          </DialogTitle>
          <DialogDescription className={cn(isRTL ? "text-right" : "text-left")}>
            {t('hub.wizard.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t('hub.wizard.step')} {currentStepIndex + 1} {t('common:of')} {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className={cn("flex justify-between mb-8", isRTL ? "flex-row-reverse" : "")}>
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = step.key === currentStep
            const isCompleted = index < currentStepIndex

            return (
              <div
                key={step.key}
                className={cn("flex flex-col items-center gap-2 flex-1", isRTL ? "flex-col-reverse" : "")}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    isActive && "border-hotel-gold bg-hotel-gold text-white",
                    isCompleted && "border-green-500 bg-green-500 text-white",
                    !isActive && !isCompleted && "border-gray-300 bg-white text-gray-400"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn(
                  "text-xs text-center",
                  isActive && "font-semibold text-hotel-gold",
                  isCompleted && "text-green-600",
                  !isActive && !isCompleted && "text-gray-400"
                )}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === 'topic' && (
            <Card>
              <CardHeader>
                <CardTitle className={cn(isRTL ? "text-right" : "text-left")}>
                  {t('hub.wizard.step1.title')}
                </CardTitle>
                <CardDescription className={cn(isRTL ? "text-right" : "text-left")}>
                  {t('hub.wizard.step1.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className={cn(isRTL ? "text-right block w-full" : "")}>
                    {t('hub.wizard.step1.topicLabel')}
                  </Label>
                  <Input
                    value={data.topic}
                    onChange={(e) => setData({ ...data, topic: e.target.value })}
                    placeholder={t('hub.wizard.step1.topicPlaceholder')}
                    className={cn(isRTL ? "text-right" : "")}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={cn(isRTL ? "text-right block w-full" : "")}>
                    {t('category')}
                  </Label>
                  <Select value={data.category} onValueChange={(value) => setData({ ...data, category: value })}>
                    <SelectTrigger className={cn(isRTL ? "flex-row-reverse" : "")}>
                      <SelectValue placeholder={t('hub.wizard.step1.categoryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onboarding" className={isRTL ? "flex-row-reverse" : ""}>
                        {t('builder.onboarding')}
                      </SelectItem>
                      <SelectItem value="compliance" className={isRTL ? "flex-row-reverse" : ""}>
                        {t('builder.compliance')}
                      </SelectItem>
                      <SelectItem value="skills" className={isRTL ? "flex-row-reverse" : ""}>
                        {t('builder.skills')}
                      </SelectItem>
                      <SelectItem value="operations" className={isRTL ? "flex-row-reverse" : ""}>
                        {t('operations')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'details' && (
            <Card>
              <CardHeader>
                <CardTitle className={cn(isRTL ? "text-right" : "text-left")}>
                  {t('hub.wizard.step2.title')}
                </CardTitle>
                <CardDescription className={cn(isRTL ? "text-right" : "text-left")}>
                  {t('hub.wizard.step2.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className={cn(isRTL ? "text-right block w-full" : "")}>
                    {t('description')}
                  </Label>
                  <Textarea
                    value={data.description}
                    onChange={(e) => setData({ ...data, description: e.target.value })}
                    placeholder={t('hub.wizard.step2.descriptionPlaceholder')}
                    rows={4}
                    className={cn(isRTL ? "text-right" : "")}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={cn(isRTL ? "text-right block w-full" : "")}>
                    {t('difficulty')}
                  </Label>
                  <Select
                    value={data.difficulty}
                    onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') =>
                      setData({ ...data, difficulty: value })
                    }
                  >
                    <SelectTrigger className={cn(isRTL ? "flex-row-reverse" : "")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner" className={isRTL ? "flex-row-reverse" : ""}>
                        {t('beginner')}
                      </SelectItem>
                      <SelectItem value="intermediate" className={isRTL ? "flex-row-reverse" : ""}>
                        {t('intermediate')}
                      </SelectItem>
                      <SelectItem value="advanced" className={isRTL ? "flex-row-reverse" : ""}>
                        {t('advanced')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle className={cn(isRTL ? "text-right" : "text-left")}>
                  {t('hub.wizard.step3.title')}
                </CardTitle>
                <CardDescription className={cn(isRTL ? "text-right" : "text-left")}>
                  {t('hub.wizard.step3.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={cn(isRTL ? "text-right block w-full" : "")}>
                      {t('duration')} (min)
                    </Label>
                    <Input
                      type="number"
                      value={data.estimatedDuration}
                      onChange={(e) => setData({ ...data, estimatedDuration: e.target.value })}
                      className={cn(isRTL ? "text-right" : "")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={cn(isRTL ? "text-right block w-full" : "")}>
                      {t('builder.validity')} (days)
                    </Label>
                    <Input
                      type="number"
                      value={data.validityPeriod}
                      onChange={(e) => setData({ ...data, validityPeriod: e.target.value })}
                      className={cn(isRTL ? "text-right" : "")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                    <span>{t('certificateEnabled')}</span>
                    <Button
                      variant={data.certificateEnabled ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setData({ ...data, certificateEnabled: !data.certificateEnabled })}
                      className={cn(
                        data.certificateEnabled && "bg-emerald-500 hover:bg-emerald-600",
                        isRTL ? "flex-row-reverse" : ""
                      )}
                    >
                      {data.certificateEnabled ? t('common:status_options.enabled') : t('common:status_options.disabled')}
                    </Button>
                  </Label>
                </div>
                {data.certificateEnabled && (
                  <div className="space-y-2">
                    <Label className={cn(isRTL ? "text-right block w-full" : "")}>
                      {t('builder.passingScore')} (%)
                    </Label>
                    <Input
                      type="number"
                      value={data.passingScore}
                      onChange={(e) => setData({ ...data, passingScore: e.target.value })}
                      min="0"
                      max="100"
                      className={cn(isRTL ? "text-right" : "")}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle className={cn(isRTL ? "text-right" : "text-left")}>
                  {t('hub.wizard.step4.title')}
                </CardTitle>
                <CardDescription className={cn(isRTL ? "text-right" : "text-left")}>
                  {t('hub.wizard.step4.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className={cn("flex justify-between", isRTL ? "flex-row-reverse" : "")}>
                    <span className="text-muted-foreground">{t('title')}:</span>
                    <span className="font-medium">{data.topic}</span>
                  </div>
                  <div className={cn("flex justify-between", isRTL ? "flex-row-reverse" : "")}>
                    <span className="text-muted-foreground">{t('category')}:</span>
                    <span className="font-medium">{data.category}</span>
                  </div>
                  <div className={cn("flex justify-between", isRTL ? "flex-row-reverse" : "")}>
                    <span className="text-muted-foreground">{t('difficulty')}:</span>
                    <span className="font-medium">{t(data.difficulty)}</span>
                  </div>
                  <div className={cn("flex justify-between", isRTL ? "flex-row-reverse" : "")}>
                    <span className="text-muted-foreground">{t('duration')}:</span>
                    <span className="font-medium">{data.estimatedDuration} {t('min')}</span>
                  </div>
                  <div className={cn("flex justify-between", isRTL ? "flex-row-reverse" : "")}>
                    <span className="text-muted-foreground">{t('certificateEnabled')}:</span>
                    <span className="font-medium">
                      {data.certificateEnabled ? t('common:status_options.enabled') : t('common:status_options.disabled')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className={cn("flex justify-between mt-6", isRTL ? "flex-row-reverse" : "")}>
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className={cn(isRTL ? "flex-row-reverse" : "")}
          >
            <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('common:actions.back')}
          </Button>
          {currentStep === 'review' ? (
            <Button
              onClick={handleComplete}
              disabled={createModuleMutation.isPending}
              className={cn("bg-hotel-gold hover:bg-hotel-gold-dark", isRTL ? "flex-row-reverse" : "")}
            >
              {createModuleMutation.isPending ? (
                <>
                  <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                  {t('hub.wizard.creating')}
                </>
              ) : (
                <>
                  {t('hub.wizard.createModule')}
                  <CheckCircle2 className={cn("h-4 w-4", isRTL ? "mr-2" : "ml-2")} />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn("bg-hotel-gold hover:bg-hotel-gold-dark", isRTL ? "flex-row-reverse" : "")}
            >
              {t('common:actions.next')}
              <ArrowRight className={cn("h-4 w-4", isRTL ? "mr-2" : "ml-2")} />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

