import { useState, useMemo } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Users,
  Building2,
  Briefcase,
  UserPlus,
  GraduationCap,
  Sparkles,
  Rocket,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Search,
  Check,
  Clock,
  Layers,
  AlertCircle,
  FileText
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { persistLearningAssignments } from '@/lib/learningAssignmentMutations'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface AssignTrainingWizardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultTargetType?: 'user' | 'department' | 'role' | 'new_hire' | 'property'
}

type AudienceType = 'user' | 'department' | 'role' | 'new_hire' | 'property'
type ContentCategory = 'onboarding' | 'paths' | 'compliance' | 'modules'

interface SampleContentItem {
  id: string
  title: string
  category: ContentCategory
  duration: string
  moduleCount?: number
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  isMandatory?: boolean
}

const SAMPLE_CONTENT_PACKAGES: SampleContentItem[] = [
  {
    id: 'a1000000-0000-4000-a000-000000000001',
    title: 'ALTUS New Hire Hotel Orientation (KSA)',
    category: 'onboarding',
    duration: '14 Days Journey',
    moduleCount: 6,
    difficulty: 'Beginner',
    isMandatory: true
  },
  {
    id: 'a1000000-0000-4000-a000-000000000002',
    title: 'Front Desk & Guest Services Onboarding',
    category: 'onboarding',
    duration: '7 Days Journey',
    moduleCount: 4,
    difficulty: 'Beginner',
    isMandatory: true
  },
  {
    id: 'a1000000-0000-4000-a000-000000000003',
    title: 'Front Office Operational Excellence Track',
    category: 'paths',
    duration: '4 Hours',
    moduleCount: 5,
    difficulty: 'Intermediate'
  },
  {
    id: 'a1000000-0000-4000-a000-000000000004',
    title: 'Luxury Housekeeping & Room Inspection Standards',
    category: 'paths',
    duration: '3 Hours',
    moduleCount: 4,
    difficulty: 'Intermediate'
  },
  {
    id: 'a1000000-0000-4000-a000-000000000005',
    title: 'Saudi Food Safety & Kitchen Hygiene Standards (SFDA)',
    category: 'compliance',
    duration: '2 Hours',
    moduleCount: 3,
    difficulty: 'Intermediate',
    isMandatory: true
  },
  {
    id: 'a1000000-0000-4000-a000-000000000006',
    title: 'Emergency Response & Hotel Fire Evacuation SOP',
    category: 'compliance',
    duration: '1 Hour',
    moduleCount: 2,
    difficulty: 'Beginner',
    isMandatory: true
  },
  {
    id: 'a1000000-0000-4000-a000-000000000007',
    title: 'Opera PMS Express Guest Check-in & Check-out',
    category: 'modules',
    duration: '45 Mins',
    difficulty: 'Beginner'
  },
  {
    id: 'a1000000-0000-4000-a000-000000000008',
    title: 'Front Desk Room Upselling & Revenue Optimization',
    category: 'modules',
    duration: '30 Mins',
    difficulty: 'Advanced'
  }
]

const DEPARTMENTS_LIST = [
  'Front Office',
  'Housekeeping',
  'Food & Beverage',
  'Engineering & Maintenance',
  'Human Resources',
  'Sales & Marketing',
  'Finance & Accounting',
  'Executive Office'
]

const ROLES_LIST = [
  'staff',
  'department_head',
  'property_hr',
  'property_manager',
  'regional_hr',
  'corporate_admin'
]

export function AssignTrainingWizardModal({
  open,
  onOpenChange,
  onSuccess,
  defaultTargetType = 'user'
}: AssignTrainingWizardModalProps) {
  const { t } = useTranslation('dashboard')
  const { user, profile } = useAuth()
  const { availableProperties, currentProperty } = useProperty()

  // Wizard Step State (1 to 4)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1: Audience Selection
  const [audienceType, setAudienceType] = useState<AudienceType>(defaultTargetType)
  const [selectedTargetId, setSelectedTargetId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Step 2: Content Package Selection
  const [contentCategory, setContentCategory] = useState<ContentCategory>('onboarding')
  const [selectedPackage, setSelectedPackage] = useState<SampleContentItem | null>(SAMPLE_CONTENT_PACKAGES[0])

  // Step 3: Due Date & Schedule
  const [dueDays, setDueDays] = useState<number>(14)
  const [priority, setPriority] = useState<'normal' | 'high' | 'compliance'>('normal')
  const [autoAssignFuture, setAutoAssignFuture] = useState<boolean>(true)

  // Loading state for submitting
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate Due Date String
  const calculatedDueDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + dueDays)
    return d.toISOString().split('T')[0]
  }, [dueDays])

  // Fetch real training modules from Supabase
  const { data: dbModules } = useQuery({
    queryKey: ['real-training-modules-wizard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_modules')
        .select('id, title, category, estimated_duration_minutes, difficulty_level')
        .eq('is_deleted', false)
        .limit(30)
      if (error) return []
      return data || []
    },
    enabled: open
  })

  // Fetch real profiles for employee selection
  const { data: realProfiles } = useQuery({
    queryKey: ['real-profiles-wizard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, job_title, department_name, avatar_url')
        .order('full_name', { ascending: true })
        .limit(30)
      if (error) return []
      return data || []
    },
    enabled: open && audienceType === 'user'
  })

  const filteredContentPackages = useMemo(() => {
    const staticPackages = SAMPLE_CONTENT_PACKAGES.filter(pkg => pkg.category === contentCategory)
    if (contentCategory === 'modules' && dbModules && dbModules.length > 0) {
      const mappedDbModules: SampleContentItem[] = dbModules.map(mod => ({
        id: mod.id,
        title: mod.title,
        category: 'modules',
        duration: mod.estimated_duration_minutes ? `${mod.estimated_duration_minutes} Mins` : '30 Mins',
        difficulty: (mod.difficulty_level as any) || 'Intermediate'
      }))
      return [...mappedDbModules, ...staticPackages]
    }
    return staticPackages
  }, [contentCategory, dbModules])

  const handleNextStep = () => {
    if (step === 1 && !selectedTargetId && audienceType !== 'new_hire') {
      toast.error(t('wizard.select_target_error', 'Please select a target recipient, department, or role to proceed.'))
      return
    }
    if (step === 2 && !selectedPackage) {
      toast.error(t('wizard.select_content_error', 'Please select a training package or onboarding journey.'))
      return
    }
    setStep((prev) => Math.min(4, prev + 1) as 1 | 2 | 3 | 4)
  }

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4)
  }

  const handleSubmitAssignment = async () => {
    if (!selectedPackage) return

    setIsSubmitting(true)
    try {
      const payload = [{
        target_type: audienceType,
        target_id: audienceType === 'new_hire' ? null : (selectedTargetId || null),
        content_type: selectedPackage.category === 'onboarding' ? 'path' : 'module',
        content_id: selectedPackage.id,
        assigned_by: user?.id || null,
        due_date: calculatedDueDate,
        priority: priority,
        is_deleted: false
      }]

      const queryClient = useQueryClient()
      const result = await persistLearningAssignments(payload)

      queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-processes'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['training-progress'] })

      toast.success(t('wizard.success_toast', 'Training & Onboarding assignment created successfully!'), {
        description: `Assigned "${selectedPackage.title}" to ${audienceType.replace('_', ' ')}.`
      })

      onSuccess?.()
      onOpenChange(false)
      // Reset wizard
      setStep(1)
    } catch (err) {
      console.error('[AssignTrainingWizard] Submission error:', err)
      toast.error(t('wizard.error_toast', 'Failed to save assignment. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-[28px] p-0 overflow-hidden shadow-2xl">
        
        <DialogHeader className="sr-only">
          <DialogTitle>Assign Training & Onboarding</DialogTitle>
          <DialogDescription>Assign training modules, onboarding paths, and compliance packages to staff members, departments, or roles.</DialogDescription>
        </DialogHeader>

        {/* Wizard Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 end-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block mb-0.5">
                  ALTUS CONNECT • ASSIGNMENT STUDIO
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Assign Training & Onboarding
                </h3>
              </div>
            </div>

            <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3 py-1 font-bold text-xs">
              Step {step} of 4
            </Badge>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 gap-2 mt-6 relative z-10">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= stepNum ? 'bg-gradient-to-r from-amber-400 to-yellow-300' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Body Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto font-sans">
          
          {/* STEP 1: TARGET RECIPIENT */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Step 1: Choose Target Audience (Who)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Select whether you are assigning to a specific employee, a whole department, a job role, or onboarding new hires.
                </p>
              </div>

              {/* Audience Type Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => { setAudienceType('user'); setSelectedTargetId('') }}
                  className={`p-4 rounded-2xl border text-start transition-all flex flex-col justify-between gap-3 ${
                    audienceType === 'user'
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${audienceType === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Specific Employee</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Assign to single staff member</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setAudienceType('department'); setSelectedTargetId(DEPARTMENTS_LIST[0]) }}
                  className={`p-4 rounded-2xl border text-start transition-all flex flex-col justify-between gap-3 ${
                    audienceType === 'department'
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${audienceType === 'department' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Entire Department</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Front Office, F&B, Housekeeping...</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setAudienceType('role'); setSelectedTargetId(ROLES_LIST[0]) }}
                  className={`p-4 rounded-2xl border text-start transition-all flex flex-col justify-between gap-3 ${
                    audienceType === 'role'
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${audienceType === 'role' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Job Role Level</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Staff, Supervisors, Managers...</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setAudienceType('new_hire'); setSelectedTargetId('new_hires') }}
                  className={`p-4 rounded-2xl border text-start transition-all flex flex-col justify-between gap-3 ${
                    audienceType === 'new_hire'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${audienceType === 'new_hire' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">New Hires (Onboarding)</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Joined in last 30 days</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setAudienceType('property'); setSelectedTargetId(currentProperty?.id || availableProperties[0]?.id || '') }}
                  className={`p-4 rounded-2xl border text-start transition-all flex flex-col justify-between gap-3 ${
                    audienceType === 'property'
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${audienceType === 'property' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Entire Hotel Property</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">All staff in selected hotel</p>
                  </div>
                </button>
              </div>

              {/* Sub-Selection Dropdown / Search Input based on Audience Type */}
              {audienceType === 'department' && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Department:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DEPARTMENTS_LIST.map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setSelectedTargetId(dept)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          selectedTargetId === dept
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-200'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {audienceType === 'user' && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Search & Select Staff Member:</label>
                  <div className="relative">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email, or department..."
                      className="ps-10 h-11 rounded-xl"
                    />
                    <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pe-1 pt-1">
                    {realProfiles && realProfiles.length > 0 ? (
                      realProfiles
                        .filter(p => !searchQuery || (p.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.email || '').toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedTargetId(p.id)}
                            className={`w-full p-2.5 rounded-xl border text-start flex items-center justify-between transition-all ${
                              selectedTargetId === p.id
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                                selectedTargetId === p.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {(p.full_name || p.email || 'U').charAt(0)}
                              </div>
                              <div>
                                <p className={`text-xs font-bold ${selectedTargetId === p.id ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                                  {p.full_name || 'Staff Member'}
                                </p>
                                <p className={`text-[10px] ${selectedTargetId === p.id ? 'text-white/80' : 'text-slate-500'}`}>
                                  {p.job_title || 'Employee'} • {p.email}
                                </p>
                              </div>
                            </div>
                            {selectedTargetId === p.id && <Check className="w-4 h-4 text-white shrink-0" />}
                          </button>
                        ))
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-500 italic">
                        No employee profiles found. Type a valid employee ID directly.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CONTENT SELECTION */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  Step 2: Choose Content Package (What)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Select an Onboarding Package, a multi-module Learning Path, a Compliance SOP, or a single training module.
                </p>
              </div>

              {/* Category Filter Tabs */}
              <Tabs value={contentCategory} onValueChange={(val) => setContentCategory(val as ContentCategory)}>
                <TabsList className="grid grid-cols-4 bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
                  <TabsTrigger value="onboarding" className="text-xs font-bold gap-1 rounded-lg">
                    <Rocket className="w-3.5 h-3.5 me-1 text-emerald-500" />
                    Onboarding
                  </TabsTrigger>
                  <TabsTrigger value="paths" className="text-xs font-bold gap-1 rounded-lg">
                    <Layers className="w-3.5 h-3.5 me-1 text-blue-500" />
                    Learning Paths
                  </TabsTrigger>
                  <TabsTrigger value="compliance" className="text-xs font-bold gap-1 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5 me-1 text-rose-500" />
                    Compliance
                  </TabsTrigger>
                  <TabsTrigger value="modules" className="text-xs font-bold gap-1 rounded-lg">
                    <FileText className="w-3.5 h-3.5 me-1 text-amber-500" />
                    Modules
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Content Package List */}
              <div className="space-y-3">
                {filteredContentPackages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg)}
                    className={`w-full p-4 rounded-2xl border text-start transition-all flex items-center justify-between gap-4 ${
                      selectedPackage?.id === pkg.id
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`p-3 rounded-xl shrink-0 ${
                        pkg.category === 'onboarding' ? 'bg-emerald-100 text-emerald-600' :
                        pkg.category === 'compliance' ? 'bg-rose-100 text-rose-600' :
                        pkg.category === 'paths' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {pkg.category === 'onboarding' ? <Rocket className="w-5 h-5" /> :
                         pkg.category === 'compliance' ? <ShieldCheck className="w-5 h-5" /> :
                         pkg.category === 'paths' ? <Layers className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{pkg.title}</p>
                          {pkg.isMandatory && (
                            <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[9px] font-bold">MANDATORY</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {pkg.duration}
                          </span>
                          {pkg.moduleCount && (
                            <span className="font-semibold text-indigo-600">
                              • {pkg.moduleCount} Modules Included
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {pkg.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border shrink-0 ${
                      selectedPackage?.id === pkg.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-transparent border-slate-300'
                    }`}>
                      <Check className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: SCHEDULE & AUTO-ASSIGNMENT */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  Step 3: Schedule & Auto-Assignment Rules (When)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Set target completion deadlines and enable automatic trigger rules for future new hires.
                </p>
              </div>

              {/* Due Date Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Completion Deadline:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[7, 14, 30, 60].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDueDays(days)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        dueDays === days
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
                <p className="text-xs text-indigo-600 font-semibold pt-1">
                  Calculated Target Date: <span className="font-bold underline">{calculatedDueDate}</span>
                </p>
              </div>

              {/* Priority Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Assignment Priority:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      priority === 'normal'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 border-slate-200'
                    }`}
                  >
                    Normal Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('high')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      priority === 'high'
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 border-slate-200'
                    }`}
                  >
                    High Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('compliance')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      priority === 'compliance'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 border-slate-200'
                    }`}
                  >
                    Mandatory Compliance
                  </button>
                </div>
              </div>

              {/* Auto-Assignment Toggle Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="auto-assign"
                  checked={autoAssignFuture}
                  onChange={(e) => setAutoAssignFuture(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                />
                <div>
                  <label htmlFor="auto-assign" className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer block">
                    Automatically Assign to Future New Hires
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    When enabled, any employee joining this department or role in the future will automatically receive this training package upon onboarding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Step 4: Review & Confirm Assignment
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Please confirm the details below before issuing this assignment to the organization.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">Target Audience:</span>
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs font-bold capitalize">
                    {audienceType.replace('_', ' ')}: {selectedTargetId || 'All New Hires'}
                  </Badge>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">Content Package:</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{selectedPackage?.title}</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">Completion Deadline:</span>
                  <span className="text-xs font-mono font-bold text-emerald-600">{calculatedDueDate} ({dueDays} Days)</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Auto-Assignment Rule:</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {autoAssignFuture ? '✓ Active for Future Joinees' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Wizard Footer Navigation Buttons */}
        <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevStep}
            disabled={step === 1 || isSubmitting}
            className="rounded-xl px-5"
          >
            <ChevronLeft className="w-4 h-4 me-1" />
            Back
          </Button>

          {step < 4 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 font-bold"
            >
              Continue Next
              <ChevronRight className="w-4 h-4 ms-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmitAssignment}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 rounded-xl px-8 font-black shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? (
                <span>Publishing Assignment...</span>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Confirm & Issue Assignment</span>
                </div>
              )}
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
