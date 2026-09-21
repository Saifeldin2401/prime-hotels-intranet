import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useCreatePracticalAssessment } from '@/hooks/usePracticalAssessments'
import { supabase } from '@/lib/supabase'
import type { RubricCriterion } from '@/types/enterpriseOperatingModel'
import { ClipboardCheck, Plus, Trash2, Building, Percent } from 'lucide-react'

interface CreateAssessmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId?: string
}

interface DepartmentOption {
  id: string
  name: string
}

export function CreateAssessmentModal({
  open,
  onOpenChange,
  organizationId
}: CreateAssessmentModalProps) {
  const { i18n } = useTranslation('common')
  const isAr = i18n.language === 'ar'
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [description, setDescription] = useState('')
  const [departmentId, setDepartmentId] = useState<string>('none')
  const [passingScore, setPassingScore] = useState<number>(85)

  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)

  // Rubric criteria list
  const [criteria, setCriteria] = useState<RubricCriterion[]>([
    {
      id: 'c_1',
      label: 'Warm eye contact and greeting within 15 seconds',
      label_ar: 'التواصل البصري والترحيب بالضيف خلال 15 ثانية',
      max_points: 20
    },
    {
      id: 'c_2',
      label: 'Accurate and professional execution of SOP guidelines',
      label_ar: 'التنفيذ الدقيق والاحترافي لإجراءات التشغيل القياسية',
      max_points: 30
    },
    {
      id: 'c_3',
      label: 'Polite closing statement and guest satisfaction confirmation',
      label_ar: 'عبارة ختامية مهذبة والتحقق من رضا الضيف',
      max_points: 50
    }
  ])

  const createMutation = useCreatePracticalAssessment()

  // Load departments
  useEffect(() => {
    if (!open) return
    async function loadDepts() {
      setIsLoadingDepartments(true)
      try {
        let q = supabase.from('departments').select('id, name').order('name')
        if (organizationId) {
          q = q.eq('organization_id', organizationId)
        }
        const { data } = await q
        if (data) setDepartments(data)
      } catch (err) {
        console.error('Failed to load departments', err)
      } finally {
        setIsLoadingDepartments(false)
      }
    }
    loadDepts()
  }, [open, organizationId])

  const handleAddCriterion = () => {
    const newId = `c_${Date.now()}`
    setCriteria((prev) => [
      ...prev,
      {
        id: newId,
        label: '',
        label_ar: '',
        max_points: 20
      }
    ])
  }

  const handleRemoveCriterion = (id: string) => {
    if (criteria.length <= 1) {
      toast({
        title: isAr ? 'تنبيه' : 'Minimum Criteria Required',
        description: isAr ? 'يجب أن يحتوي التقييم على معيار واحد على الأقل' : 'At least one criterion is required',
        variant: 'destructive'
      })
      return
    }
    setCriteria((prev) => prev.filter((c) => c.id !== id))
  }

  const handleCriterionChange = (
    id: string,
    field: 'label' | 'label_ar' | 'max_points',
    val: string | number
  ) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({
        title: isAr ? 'خطأ في الإدخال' : 'Validation Error',
        description: isAr ? 'يرجى إدخال اسم قائمة التقييم' : 'Please provide an assessment title',
        variant: 'destructive'
      })
      return
    }

    const invalidCriteria = criteria.some((c) => !c.label.trim())
    if (invalidCriteria) {
      toast({
        title: isAr ? 'خطأ في المعايير' : 'Incomplete Criteria',
        description: isAr ? 'يرجى ملء وصف جميع المعايير' : 'Please provide labels for all criteria',
        variant: 'destructive'
      })
      return
    }

    const effectiveOrgId = organizationId || 'e0000000-0000-0000-0000-000000000001'

    try {
      await createMutation.mutateAsync({
        organization_id: effectiveOrgId,
        department_id: departmentId === 'none' ? null : departmentId,
        title: title.trim(),
        title_ar: titleAr.trim() || null,
        description: description.trim() || null,
        passing_score_percentage: Number(passingScore) || 80,
        rubric_criteria: criteria,
        is_active: true
      })

      toast({
        title: isAr ? 'تم إنشاء قائمة التقييم بنجاح' : 'Practical Assessment Created',
        description: isAr
          ? `تمت إضافة: ${titleAr || title}`
          : `Assessment checklist "${title}" is now available for supervisor evaluations`
      })

      // Reset
      setTitle('')
      setTitleAr('')
      setDescription('')
      setDepartmentId('none')
      onOpenChange(false)
    } catch (err: any) {
      console.error('Failed to create practical assessment:', err)
      toast({
        title: isAr ? 'فشل إنشاء التقييم' : 'Creation Failed',
        description: err.message || (isAr ? 'حدث خطأ غير متوقع' : 'An error occurred while saving assessment.'),
        variant: 'destructive'
      })
    }
  }

  const totalPoints = criteria.reduce((sum, c) => sum + (Number(c.max_points) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <ClipboardCheck className="h-4 w-4" />
            <span>{isAr ? 'إنشاء أداة تقييم وملاحظة ميدانية' : 'New Practical Observation Checklist'}</span>
          </div>
          <DialogTitle className="text-xl font-bold font-display text-foreground">
            {isAr ? 'تصميم قائمة التحقق العملية للمشرفين' : 'Create On-the-Job Practical Rubric'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isAr
              ? 'حدد معايير الأداء التشغيلي الفندقي، الدرجات المخصصة لكل معيار، ونسبة النجاح المطلوبة للمشرفين.'
              : 'Define operational hotel standards, scoring rubrics, and passing criteria for supervisor audits.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-2 pe-1">
          {/* Titles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {isAr ? 'عنوان التقييم (بالإنجليزية) *' : 'Assessment Title (English) *'}
              </Label>
              <Input
                placeholder="e.g. Front Desk Forbes 5-Star Check-in Checklist"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5" dir="rtl">
              <Label className="text-xs font-medium">
                {isAr ? 'عنوان التقييم (بالعربية)' : 'Assessment Title (Arabic)'}
              </Label>
              <Input
                placeholder="مثال: قائمة التحقق الميدانية للاستقبال (معايير فوربس)"
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                className="text-sm text-end"
              />
            </div>
          </div>

          {/* Department & Passing Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-amber-500" />
                {isAr ? 'القسم الفندقي' : 'Hotel Department'}
              </Label>
              <Select value={departmentId} onValueChange={setDepartmentId} disabled={isLoadingDepartments}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={isAr ? 'اختر القسم...' : 'Select department...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">{isAr ? 'عام لكافة الأقسام' : 'Cross-Department / General'}</span>
                  </SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-amber-500" />
                {isAr ? 'نسبة النجاح المطلوبة (%)' : 'Passing Threshold (%)'}
              </Label>
              <Input
                type="number"
                min={50}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="text-sm font-semibold"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isAr ? 'وصف التقييم وتعليمات الملاحظة' : 'Description & Observation Instructions'}
            </Label>
            <Textarea
              rows={2}
              placeholder={isAr ? 'اكتب إرشادات وتوجيهات المشرف عند إجراء هذا التقييم...' : 'Guidance notes for supervisors conducting this observation audit...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm resize-none"
            />
          </div>

          {/* Criteria Builder */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? 'بنود ومعايير التقييم' : 'Rubric Criteria Items'}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {isAr ? `إجمالي النقاط المتاحة: ${totalPoints}` : `Total Maximum Points: ${totalPoints}`}
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddCriterion}
                className="h-7 text-xs border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                <Plus className="h-3.5 w-3.5 me-1" />
                <span>{isAr ? 'إضافة معيار' : 'Add Criterion'}</span>
              </Button>
            </div>

            <div className="space-y-2.5">
              {criteria.map((crit, index) => (
                <div
                  key={crit.id}
                  className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-muted-foreground">
                      #{index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <Label className="text-[11px] text-muted-foreground">
                        {isAr ? 'الدرجة:' : 'Max Pts:'}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={crit.max_points}
                        onChange={(e) => handleCriterionChange(crit.id, 'max_points', Number(e.target.value))}
                        className="w-16 h-7 text-xs font-bold text-center"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCriterion(crit.id)}
                        className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      placeholder="Criterion in English (e.g. Greeting with eye contact)"
                      value={crit.label}
                      onChange={(e) => handleCriterionChange(crit.id, 'label', e.target.value)}
                      className="text-xs h-8"
                    />
                    <Input
                      placeholder="المعيار بالعربية (مثال: الترحيب مع التواصل البصري)"
                      value={crit.label_ar || ''}
                      onChange={(e) => handleCriterionChange(crit.id, 'label_ar', e.target.value)}
                      className="text-xs h-8 text-end"
                      dir="rtl"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md"
            >
              {createMutation.isPending
                ? (isAr ? 'جاري الحفظ...' : 'Creating...')
                : (isAr ? 'حفظ قائمة التقييم' : 'Save Practical Checklist')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
