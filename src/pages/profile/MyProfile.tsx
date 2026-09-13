import { UserSkillsDisplay } from '@/components/profile/UserSkillsDisplay'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { getReportingLineDisplay } from '@/lib/displayHelpers'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { differenceInMonths, differenceInYears, format } from 'date-fns'
import { Award, BookOpen, Briefcase, Building, Calendar, CheckCircle2, Compass, FileText, Key, Loader2, Mail, Phone, Save, Shield, Star, Upload, User as UserIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import EmployeeDocuments from './EmployeeDocuments'

// ─── Profile Completion ────────────────────────────────────────────────────────
function computeCompletion(p: {
    full_name?: string | null
    avatar_url?: string | null
    phone?: string | null
    nationality?: string | null
    bio?: string | null
    phone_extension?: string | null
    job_title?: string | null
    hire_date?: string | null
}): { percent: number; missing: string[] } {
    const fields: Array<{ label: string; value: string | null | undefined }> = [
        { label: 'Full Name', value: p.full_name },
        { label: 'Profile Photo', value: p.avatar_url },
        { label: 'Phone', value: p.phone },
        { label: 'Nationality', value: p.nationality },
        { label: 'Bio / About', value: p.bio },
        { label: 'Phone Extension', value: p.phone_extension },
        { label: 'Job Title', value: p.job_title },
        { label: 'Joining Date', value: p.hire_date },
    ]
    const missing = fields.filter(f => !f.value).map(f => f.label)
    const percent = Math.round(((fields.length - missing.length) / fields.length) * 100)
    return { percent, missing }
}

export default function MyProfile() {
    const { user, profile: authProfile, refreshSession } = useAuth()
    const { t, i18n } = useTranslation('profile')
    const navigate = useNavigate()
    const isRTL = i18n.dir() === 'rtl'
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form state
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [nationality, setNationality] = useState('')
    const [bio, setBio] = useState('')
    const [phoneExtension, setPhoneExtension] = useState('')

    useEffect(() => {
        if (authProfile) {
            setFullName(authProfile.full_name || '')
            setPhone(authProfile.phone || '')
            setAvatarUrl(authProfile.avatar_url)
            setNationality(authProfile.nationality || '')
            setBio(authProfile.bio || '')
            setPhoneExtension(authProfile.phone_extension || '')
        }
    }, [authProfile])

    // Compute completion from live form values
    const completion = computeCompletion({
        full_name: fullName,
        avatar_url: avatarUrl,
        phone,
        nationality,
        bio,
        phone_extension: phoneExtension,
        job_title: authProfile?.job_title,
        hire_date: authProfile?.hire_date,
    })

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        try {
            setLoading(true)
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone,
                    nationality,
                    bio: bio || null,
                    phone_extension: phoneExtension || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)
            if (error) throw error
            await refreshSession()
            toast.success(t('messages.profile_updated', 'Profile Updated'), {
                description: t('messages.profile_updated_desc', 'Your profile has been updated successfully.')
            })
        } catch (error) {
            console.error('Error updating profile:', error)
            toast.error(t('common:messages.error_action_failed', 'Failed to update profile'))
        } finally {
            setLoading(false)
        }
    }

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!event.target.files || event.target.files.length === 0) throw new Error('You must select an image to upload.')
            if (!user?.id) throw new Error('User not authenticated')
            const file = event.target.files[0]
            if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.')
            if (file.size > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5 MB.')

            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { cacheControl: '3600', upsert: false })
            if (uploadError) throw uploadError

            // eslint-disable-next-line no-restricted-properties -- 'avatars' is one of the two intentionally public buckets; avatar_url is read as a plain <img src> in ~42 places and must be durable.
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: urlData.publicUrl })
                .eq('id', user.id)
            if (updateError) throw updateError

            setAvatarUrl(urlData.publicUrl)
            await refreshSession()
            toast.success(t('messages.avatar_updated', 'Avatar Updated'))
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : t('common:messages.error_action_failed', 'Failed to upload avatar'))
        } finally {
            setUploading(false)
        }
    }

    const handleSetPresetAvatar = async (presetUrl: string) => {
        if (!user?.id) return
        try {
            setUploading(true)
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: presetUrl })
                .eq('id', user.id)
            if (updateError) throw updateError

            setAvatarUrl(presetUrl)
            await refreshSession()
            toast.success(isRTL ? 'تم تعيين الصورة الرسمية' : 'Official avatar preset selected')
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : t('common:messages.error_action_failed', 'Failed to update avatar'))
        } finally {
            setUploading(false)
        }
    }

    const getTenure = () => {
        if (!authProfile?.hire_date) return null
        const hireDate = new Date(authProfile.hire_date)
        const years = differenceInYears(new Date(), hireDate)
        const months = differenceInMonths(new Date(), hireDate) % 12
        if (years > 0) return `${years}y ${months}m`
        return `${months}m`
    }

    const tenure = getTenure()

    return (
        <div className="container mx-auto py-0 max-w-5xl">
            {/* Hero Header */}
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 rounded-b-2xl overflow-hidden mb-8">
                <div className="absolute top-0 end-0 w-1/3 h-full bg-indigo-500/10 -skew-x-12 transform translate-x-1/2" />
                <div className="absolute -bottom-16 -start-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="relative z-10 px-8 pt-10 pb-20">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative group">
                                <Avatar className="w-28 h-28 text-4xl ring-4 ring-white/20 shadow-2xl">
                                    <AvatarImage src={avatarUrl || undefined} className="object-cover object-center" />
                                    <AvatarFallback className="bg-indigo-700 text-white text-3xl">
                                        {fullName ? fullName.charAt(0).toUpperCase() : <UserIcon className="w-12 h-12" />}
                                    </AvatarFallback>
                                </Avatar>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    title={isRTL ? 'رفع صورة شخصية' : 'Upload custom photo'}
                                    className="absolute bottom-0 end-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                            </div>

                            {/* Official ALTUS Avatar Presets */}
                            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => handleSetPresetAvatar('/assets/altus/learner-male.jpg')}
                                    title={isRTL ? 'الصورة الرسمية (رجال)' : 'ALTUS Male Executive Preset'}
                                    className={cn(
                                        "w-6 h-6 rounded-full overflow-hidden border transition-all",
                                        avatarUrl === '/assets/altus/learner-male.jpg' ? "border-amber-400 ring-2 ring-amber-400/50 scale-110" : "border-white/30 opacity-70 hover:opacity-100"
                                    )}
                                >
                                    <img src="/assets/altus/learner-male.jpg" alt="Male preset" className="w-full h-full object-cover" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetPresetAvatar('/assets/altus/learner-female.jpg')}
                                    title={isRTL ? 'الصورة الرسمية (سيدات)' : 'ALTUS Female Executive Preset'}
                                    className={cn(
                                        "w-6 h-6 rounded-full overflow-hidden border transition-all",
                                        avatarUrl === '/assets/altus/learner-female.jpg' ? "border-amber-400 ring-2 ring-amber-400/50 scale-110" : "border-white/30 opacity-70 hover:opacity-100"
                                    )}
                                >
                                    <img src="/assets/altus/learner-female.jpg" alt="Female preset" className="w-full h-full object-cover" />
                                </button>
                            </div>
                        </div>

                        {/* Name / Role Info */}
                        <div className="text-center md:text-start flex-1">
                            <h1 className="text-3xl font-bold text-white mb-1">{authProfile?.full_name || user?.email}</h1>
                            <p className="text-white/70 text-lg mb-3">{authProfile?.job_title || t('not_specified', 'Not specified')}</p>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <Badge className="bg-white/10 text-white/90 border-white/20 hover:bg-white/15">
                                    <Briefcase className="w-3 h-3 me-1.5" />
                                    {authProfile?.role?.replace('_', ' ') || t('staff', 'Staff')}
                                </Badge>
                                {authProfile?.property?.name && (
                                    <Badge className="bg-white/10 text-white/90 border-white/20 hover:bg-white/15">
                                        <Building className="w-3 h-3 me-1.5" />
                                        {authProfile.property.name}
                                    </Badge>
                                )}
                                {tenure && (
                                    <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 hover:bg-indigo-500/40">
                                        <Calendar className="w-3 h-3 me-1.5" />
                                        {tenure}
                                    </Badge>
                                )}
                                <Badge variant={authProfile?.is_active ? "default" : "secondary"} className={authProfile?.is_active ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" : ""}>
                                    {authProfile?.is_active ? t('active') : t('inactive')}
                                </Badge>
                            </div>
                        </div>

                        {/* Quick info pills */}
                        <div className="hidden md:flex flex-col gap-2 text-sm text-white/60">
                            {user?.email && (
                                <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
                            )}
                            {authProfile?.staff_id && (
                                <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> {authProfile.staff_id}</span>
                            )}
                            {phoneExtension && (
                                <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Ext. {phoneExtension}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Completion Banner */}
            {completion.percent < 100 && (
                <div className="px-4 mb-6 -mt-12 relative z-20">
                    <Card className="border-amber-200 bg-amber-50/70 shadow-sm">
                        <CardContent className="py-4 px-5">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm font-semibold text-amber-800">Profile {completion.percent}% Complete</span>
                                </div>
                                <span className="text-xs text-amber-600">{completion.missing.length} field{completion.missing.length !== 1 ? 's' : ''} missing</span>
                            </div>
                            <Progress value={completion.percent} className="h-2 bg-amber-200" />
                            {completion.missing.length > 0 && (
                                <p className="text-xs text-amber-700 mt-2">
                                    Missing: {completion.missing.slice(0, 4).join(', ')}{completion.missing.length > 4 ? ` +${completion.missing.length - 4} more` : ''}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs */}
            <div className={`px-4 relative z-20 ${completion.percent < 100 ? 'pt-2' : '-mt-12'}`}>
                <Tabs defaultValue="personal" className="space-y-6">
                    <TabsList className="bg-white shadow-lg rounded-xl border border-gray-100 grid w-full grid-cols-3 lg:w-[500px] p-1 h-auto">
                        <TabsTrigger value="personal" className="py-2.5 text-sm">
                            <UserIcon className="w-4 h-4 me-2" />{t('personal_info')}
                        </TabsTrigger>
                        <TabsTrigger value="skills" className="py-2.5 text-sm">
                            <Star className="w-4 h-4 me-2" />{t('skills', 'Skills')}
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="py-2.5 text-sm">
                            <Briefcase className="w-4 h-4 me-2" />{t('documents')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-6">
                        <Card className="border-gray-100 shadow-sm">
                            <CardHeader>
                                <CardTitle>{t('personal_info')}</CardTitle>
                                <CardDescription>{t('personal_info_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdateProfile} className="space-y-8">
                                    {/* General Info */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <UserIcon className="w-4 h-4 text-indigo-500" />
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-500">{t('general_info')}</h3>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="fullName">{t('full_name')}</Label>
                                                <Input id="fullName" name="name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="email">{t('email')}</Label>
                                                <Input id="email" name="email" autoComplete="email" value={user?.email || ''} disabled className="bg-gray-50" />
                                            </div>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="phone">{t('phone_number')}</Label>
                                                <Input id="phone" name="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="phoneExtension">Phone Extension</Label>
                                                <Input id="phoneExtension" placeholder="e.g. 1234" value={phoneExtension} onChange={(e) => setPhoneExtension(e.target.value)} style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }} />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="nationality">{t('nationality')}</Label>
                                            <Input id="nationality" name="country-name" autoComplete="country-name" value={nationality} onChange={(e) => setNationality(e.target.value)} />
                                        </div>

                                        {/* Bio */}
                                        <div className="grid gap-2">
                                            <Label htmlFor="bio">
                                                <span className="flex items-center gap-1.5">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Bio / About Me
                                                    <span className="text-xs text-gray-400 font-normal">(visible to colleagues)</span>
                                                </span>
                                            </Label>
                                            <Textarea
                                                id="bio"
                                                placeholder="Share a little about yourself, your role, and what you enjoy at work..."
                                                value={bio}
                                                onChange={(e) => setBio(e.target.value)}
                                                rows={3}
                                                maxLength={500}
                                            />
                                            <p className="text-xs text-gray-400 text-right">{bio.length}/500</p>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Organizational Info (read-only) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Briefcase className="w-4 h-4 text-indigo-500" />
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-500">{t('org_info')}</h3>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>{t('job_title')}</Label>
                                                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-medium text-gray-700 border border-gray-100">{authProfile?.job_title || t('not_specified', 'Not specified')}</div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('staff_id', 'Staff ID')}</Label>
                                                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-medium text-gray-700 border border-gray-100">{authProfile?.staff_id || t('not_assigned', 'Not assigned')}</div>
                                            </div>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>{t('hire_date', 'Hire Date')}</Label>
                                                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-medium text-gray-700 border border-gray-100">
                                                    {authProfile?.hire_date ? format(new Date(authProfile.hire_date), 'MMMM d, yyyy') : t('not_specified', 'Not specified')}
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('reports_to')}</Label>
                                                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-medium text-gray-700 border border-gray-100">{getReportingLineDisplay(authProfile) || t('not_specified', 'Not specified')}</div>
                                            </div>
                                        </div>
                                        <div className="grid gap-2 pt-4">
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">{isRTL ? 'روابط التعلم السريعة' : 'Learning Quick Links'}</Label>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <Button type="button" variant="outline" size="sm" onClick={() => navigate('/learning/my')} className="hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30">
                                                    <BookOpen className="w-3.5 h-3.5 me-2 text-amber-500" />{isRTL ? 'مساري التعليمي' : 'My Learning'}
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => navigate('/courses')} className="hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30">
                                                    <Compass className="w-3.5 h-3.5 me-2 text-amber-500" />{isRTL ? 'دليل الدورات' : 'Course Catalog'}
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => navigate('/training/certificates')} className="hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30">
                                                    <Award className="w-3.5 h-3.5 me-2 text-amber-500" />{isRTL ? 'الشهادات والاعتمادات' : 'My Certificates'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-gray-100">
                                        <Button type="submit" disabled={loading} className="bg-hotel-navy hover:bg-hotel-navy-light text-white">
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                                            {t('save_changes')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-gray-100 shadow-sm">
                            <CardHeader>
                                <CardTitle>{t('security')}</CardTitle>
                                <CardDescription>{t('security_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <Label>{t('password')}</Label>
                                        <p className="text-sm text-gray-500">{t('password_desc')}</p>
                                    </div>
                                    <Button variant="outline" onClick={() => navigate('/change-password')}>
                                        <Key className="w-4 h-4 me-2" />{t('change_password')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="skills">
                        <UserSkillsDisplay />
                    </TabsContent>

                    <TabsContent value="documents">
                        <EmployeeDocuments />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
