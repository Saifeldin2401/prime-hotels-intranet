import { useState, useEffect, useMemo } from 'react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { useRegisterAttendee } from '@/hooks/useILT'
import { supabase } from '@/lib/supabase'
import { Search, UserPlus, Check, Loader2, Users } from 'lucide-react'

interface StaffProfile {
  id: string
  full_name: string
  email: string
  job_title?: string | null
  avatar_url?: string | null
  organization_id?: string | null
}

interface RegisterLearnerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  organizationId?: string
  existingAttendeeUserIds: string[]
}

export function RegisterLearnerModal({
  open,
  onOpenChange,
  sessionId,
  organizationId,
  existingAttendeeUserIds
}: RegisterLearnerModalProps) {
  const { i18n } = useTranslation('common')
  const isAr = i18n.language === 'ar'
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [profiles, setProfiles] = useState<StaffProfile[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)
  const [registeringUserId, setRegisteringUserId] = useState<string | null>(null)

  const registerAttendeeMutation = useRegisterAttendee()

  useEffect(() => {
    if (!open) return

    async function loadStaff() {
      setIsLoadingProfiles(true)
      try {
        let query = supabase
          .from('profiles')
          .select('id, full_name, email, job_title, avatar_url, organization_id')
          .eq('is_active', true)
          .order('full_name')

        if (organizationId) {
          query = query.eq('organization_id', organizationId)
        }

        const { data, error } = await query
        if (error) throw error
        setProfiles(data || [])
      } catch (err) {
        console.error('Failed to load staff profiles:', err)
      } finally {
        setIsLoadingProfiles(false)
      }
    }

    loadStaff()
  }, [open, organizationId])

  // Filter profiles based on search query
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles
    const q = searchQuery.toLowerCase()
    return profiles.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.job_title?.toLowerCase().includes(q)
    )
  }, [profiles, searchQuery])

  const handleRegister = async (profile: StaffProfile) => {
    setRegisteringUserId(profile.id)
    try {
      await registerAttendeeMutation.mutateAsync({
        sessionId,
        userId: profile.id,
        organizationId: organizationId || profile.organization_id || undefined
      })

      toast({
        title: isAr ? 'تم تسجيل المتدرب بنجاح' : 'Learner Enrolled',
        description: isAr
          ? `تمت إضافة ${profile.full_name} إلى كشف حضور الجلسة.`
          : `${profile.full_name} has been added to the session roster.`
      })
    } catch (err: any) {
      console.error('Failed to register attendee:', err)
      toast({
        title: isAr ? 'فشل تسجيل المتدرب' : 'Registration Failed',
        description: err.message || (isAr ? 'حدث خطأ أثناء التسجيل' : 'Failed to register learner.'),
        variant: 'destructive'
      })
    } finally {
      setRegisteringUserId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <UserPlus className="h-4 w-4" />
            <span>{isAr ? 'تسجيل متدربين في الجلسة' : 'Enroll Session Learners'}</span>
          </div>
          <DialogTitle className="text-xl font-bold font-display text-foreground">
            {isAr ? 'إضافة موظفين إلى كشف الحضور' : 'Add Staff Members to Session Roster'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isAr
              ? 'ابحث بالاسم أو البريد الإلكتروني أو المسمى الوظيفي لإضافة الموظفين إلى هذه الجلسة التدريبية.'
              : 'Search active hotel staff by name, job title, or email to enroll them into this training session.'}
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative my-2">
          <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isAr ? 'البحث عن موظف بالاسم أو الوظيفة...' : 'Search staff by name or job title...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9 text-sm"
          />
        </div>

        {/* Staff List */}
        <div className="flex-1 overflow-y-auto space-y-2 pe-1 min-h-[260px] max-h-[380px]">
          {isLoadingProfiles ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span className="text-xs">{isAr ? 'جاري تحميل قائمة الموظفين...' : 'Loading staff directory...'}</span>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">{isAr ? 'لم يتم العثور على موظفين' : 'No staff members found'}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {isAr ? 'جرب البحث باسم أو مصطلح آخر' : 'Try adjusting your search criteria'}
              </p>
            </div>
          ) : (
            filteredProfiles.map((p) => {
              const isAlreadyRegistered = existingAttendeeUserIds.includes(p.id)
              const isPending = registeringUserId === p.id

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card/60 hover:bg-muted/30 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 border border-border/40">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-amber-500/10 text-amber-600 font-semibold">
                        {p.full_name?.substring(0, 2).toUpperCase() || 'ST'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {p.full_name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                        <span>{p.email}</span>
                        {p.job_title && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                            {p.job_title}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isAlreadyRegistered ? (
                      <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>{isAr ? 'مسجل بالفعل' : 'Enrolled'}</span>
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRegister(p)}
                        className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin me-1" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5 me-1" />
                        )}
                        <span>{isAr ? 'تسجيل' : 'Enroll'}</span>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
