import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Save, Upload, User as UserIcon, Key, Clock, Star, Target, Wallet, Shield, Briefcase, Building, Calendar, Mail, Phone, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import EmployeeDocuments from './EmployeeDocuments'
import { Separator } from '@/components/ui/separator'
import { UserSkillsDisplay } from '@/components/profile/UserSkillsDisplay'
import { getReportingLineDisplay } from '@/lib/displayHelpers'
import { toast } from 'sonner'
import { format, differenceInYears, differenceInMonths } from 'date-fns'

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
    const [bloodGroup, setBloodGroup] = useState('')
    const [emergencyName, setEmergencyName] = useState('')
    const [emergencyPhone, setEmergencyPhone] = useState('')

    useEffect(() => {
        if (authProfile) {
            setFullName(authProfile.full_name || '')
            setPhone(authProfile.phone || '')
            setAvatarUrl(authProfile.avatar_url)
            setNationality(authProfile.nationality || '')
            setBloodGroup(authProfile.blood_group || '')
            setEmergencyName(authProfile.emergency_contact_name || '')
            setEmergencyPhone(authProfile.emergency_contact_phone || '')
        }
    }, [authProfile])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        try {
            setLoading(true)
            const updates = {
                full_name: fullName,
                phone,
                nationality,
                blood_group: bloodGroup,
                emergency_contact_name: emergencyName,
                emergency_contact_phone: emergencyPhone,
                updated_at: new Date().toISOString(),
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
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

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.')
            }

            if (!user?.id) {
                throw new Error('User not authenticated')
            }

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                throw uploadError
            }

            const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath)

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: urlData.publicUrl })
                .eq('id', user.id)

            if (updateError) {
                console.error('Profile update error:', updateError)
                throw updateError
            }

            setAvatarUrl(urlData.publicUrl)
            await refreshSession()
            toast.success(t('messages.avatar_updated', 'Avatar Updated'), {
                description: t('messages.avatar_updated_desc', 'Your avatar has been updated successfully.')
            })
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : t('common:messages.error_action_failed', 'Failed to upload avatar')
            console.error('Error uploading avatar:', error)
            toast.error(errorMessage)
        } finally {
            setUploading(false)
        }
    }

    // Calculate tenure
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
                {/* Decorative elements */}
                <div className="absolute top-0 end-0 w-1/3 h-full bg-indigo-500/10 -skew-x-12 transform translate-x-1/2" />
                <div className="absolute -bottom-16 -start-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl" />

                <div className="relative z-10 px-8 pt-10 pb-20" >
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                        {/* Avatar */}
                        <div className="relative group">
                            <Avatar className="w-28 h-28 text-4xl ring-4 ring-white/20 shadow-2xl">
                                <AvatarImage src={avatarUrl || undefined} />
                                <AvatarFallback className="bg-indigo-700 text-white text-3xl">
                                    {fullName ? fullName.charAt(0).toUpperCase() : <UserIcon className="w-12 h-12" />}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute bottom-0 end-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                disabled={uploading}
                            />
                        </div>

                        {/* Name / Role Info */}
                        <div className="text-center md:text-start flex-1">
                            <h1 className="text-3xl font-bold text-white mb-1">
                                {authProfile?.full_name || user?.email}
                            </h1>
                            <p className="text-white/70 text-lg mb-3">
                                {authProfile?.job_title || t('not_specified', 'Not specified')}
                            </p>
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
                                <span className="flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5" /> {user.email}
                                </span>
                            )}
                            {authProfile?.staff_id && (
                                <span className="flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5" /> {authProfile.staff_id}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs - pulled up over hero */}
            <div className="-mt-12 px-4 relative z-20">
                <Tabs defaultValue="personal" className="space-y-6">
                    <TabsList className="bg-white shadow-lg rounded-xl border border-gray-100 grid w-full grid-cols-3 lg:w-[500px] p-1 h-auto">
                        <TabsTrigger value="personal" className="py-2.5 text-sm">
                            <UserIcon className="w-4 h-4 me-2" />
                            {t('personal_info')}
                        </TabsTrigger>
                        <TabsTrigger value="skills" className="py-2.5 text-sm">
                            <Star className="w-4 h-4 me-2" />
                            {t('skills', 'Skills')}
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="py-2.5 text-sm">
                            <Briefcase className="w-4 h-4 me-2" />
                            {t('documents')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-6">
                        <Card className="border-gray-100 shadow-sm">
                            <CardHeader>
                                <CardTitle>{t('personal_info')}</CardTitle>
                                <CardDescription>
                                    {t('personal_info_desc')}
                                </CardDescription>
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
                                                <Input
                                                    id="fullName"
                                                    name="name"
                                                    autoComplete="name"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="email">{t('email')}</Label>
                                                <Input id="email" name="email" autoComplete="email" value={user?.email || ''} disabled className="bg-gray-50" />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="phone">{t('phone_number')}</Label>
                                                <Input
                                                    id="phone"
                                                    name="tel"
                                                    autoComplete="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="nationality">{t('nationality')}</Label>
                                                <Input
                                                    id="nationality"
                                                    name="country-name"
                                                    autoComplete="country-name"
                                                    value={nationality}
                                                    onChange={(e) => setNationality(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="bloodGroup">{t('blood_group')}</Label>
                                                <Select value={bloodGroup} onValueChange={setBloodGroup}>
                                                    <SelectTrigger id="bloodGroup">
                                                        <SelectValue placeholder={t('select_blood_group', 'Select Blood Group')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                                                            <SelectItem key={group} value={group}>{group}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Emergency Contact */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Shield className="w-4 h-4 text-red-500" />
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">{t('emergency_info')}</h3>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="emergencyName">{t('emergency_contact_name')}</Label>
                                                <Input
                                                    id="emergencyName"
                                                    name="emergency-contact-name"
                                                    value={emergencyName}
                                                    onChange={(e) => setEmergencyName(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="emergencyPhone">{t('emergency_contact_phone')}</Label>
                                                <Input
                                                    id="emergencyPhone"
                                                    name="emergency-contact-phone"
                                                    value={emergencyPhone}
                                                    onChange={(e) => setEmergencyPhone(e.target.value)}
                                                    style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Organizational Info */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Briefcase className="w-4 h-4 text-indigo-500" />
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-500">{t('org_info')}</h3>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>{t('job_title')}</Label>
                                                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-medium text-gray-700 border border-gray-100">
                                                    {authProfile?.job_title || t('not_specified', 'Not specified')}
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('staff_id', 'Staff ID')}</Label>
                                                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-medium text-gray-700 border border-gray-100">
                                                    {authProfile?.staff_id || t('not_assigned', 'Not assigned')}
                                                </div>
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
                                                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-medium text-gray-700 border border-gray-100">
                                                    {getReportingLineDisplay(authProfile) || t('not_specified', 'Not specified')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-2 pt-4">
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('hr_quick_links')}</Label>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => navigate('/hr/attendance')}
                                                    className="hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                                >
                                                    <Clock className="w-3.5 h-3.5 me-2" />
                                                    {t('attendance')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => navigate('/hr/performance')}
                                                    className="hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                                >
                                                    <Star className="w-3.5 h-3.5 me-2" />
                                                    {t('performance')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => navigate('/hr/goals')}
                                                    className="hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                                >
                                                    <Target className="w-3.5 h-3.5 me-2" />
                                                    {t('career_goals')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => navigate('/hr/payslips')}
                                                    className="hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                                >
                                                    <Wallet className="w-3.5 h-3.5 me-2" />
                                                    {t('payroll')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-gray-100">
                                        <Button type="submit" disabled={loading} className="bg-gray-900 hover:bg-gray-800">
                                            {loading ? (
                                                <Loader2 className="w-4 h-4 animate-spin me-2" />
                                            ) : (
                                                <Save className="w-4 h-4 me-2" />
                                            )}
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
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label>{t('password')}</Label>
                                            <p className="text-sm text-gray-500">{t('password_desc')}</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate('/change-password')}
                                        >
                                            <Key className="w-4 h-4 me-2" />
                                            {t('change_password')}
                                        </Button>
                                    </div>
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
