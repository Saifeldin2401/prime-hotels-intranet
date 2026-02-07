import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Save, Upload, User as UserIcon, Key, Clock, Star, Target, Wallet, Shield, Briefcase } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import EmployeeDocuments from './EmployeeDocuments'
import { Separator } from '@/components/ui/separator'
import { UserSkillsDisplay } from '@/components/profile/UserSkillsDisplay'
import { getReportingLineDisplay } from '@/lib/displayHelpers'
import { toast } from 'sonner'
import { format } from 'date-fns'

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

            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('documents')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                throw uploadError
            }

            // Get public URL for the uploaded avatar
            const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath)

            // Update profile with the public URL
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

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">{t('my_profile')}</h1>

            <Tabs defaultValue="personal" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="personal">{t('personal_info')}</TabsTrigger>
                    <TabsTrigger value="skills">Skills</TabsTrigger>
                    <TabsTrigger value="documents">{t('documents')}</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('personal_info')}</CardTitle>
                            <CardDescription>
                                {t('personal_info_desc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    {/* Avatar Section */}
                                    <div className="flex flex-col items-center gap-4">
                                        <Avatar className="w-32 h-32 text-4xl">
                                            <AvatarImage src={avatarUrl || undefined} />
                                            <AvatarFallback>
                                                {fullName ? fullName.charAt(0).toUpperCase() : <UserIcon className="w-12 h-12" />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={uploading}
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                {uploading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                                                ) : (
                                                    <Upload className="w-4 h-4 me-2" />
                                                )}
                                                {t('change_avatar')}
                                            </Button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                                disabled={uploading}
                                            />
                                        </div>
                                    </div>

                                    {/* Fields Section */}
                                    <div className="flex-1 space-y-8 w-full">
                                        {/* General Info */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <UserIcon className="w-4 h-4 text-hotel-gold" />
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-hotel-gold">{t('general_info')}</h3>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="fullName">{t('full_name')}</Label>
                                                    <Input
                                                        id="fullName"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        placeholder="John Doe"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="email">{t('email')}</Label>
                                                    <Input id="email" value={user?.email || ''} disabled className="bg-muted/50" />
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="phone">{t('phone_number')}</Label>
                                                    <Input
                                                        id="phone"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        placeholder="+1 (555) 001-0012"
                                                        style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="nationality">{t('nationality')}</Label>
                                                    <Input
                                                        id="nationality"
                                                        value={nationality}
                                                        onChange={(e) => setNationality(e.target.value)}
                                                        placeholder="Saudi"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="bloodGroup">{t('blood_group')}</Label>
                                                    <Select value={bloodGroup} onValueChange={setBloodGroup}>
                                                        <SelectTrigger id="bloodGroup">
                                                            <SelectValue placeholder="Select Blood Group" />
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
                                                <Shield className="w-4 h-4 text-hotel-gold" />
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-hotel-gold">{t('emergency_info')}</h3>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="emergencyName">{t('emergency_contact_name')}</Label>
                                                    <Input
                                                        id="emergencyName"
                                                        value={emergencyName}
                                                        onChange={(e) => setEmergencyName(e.target.value)}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="emergencyPhone">{t('emergency_contact_phone')}</Label>
                                                    <Input
                                                        id="emergencyPhone"
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
                                                <Briefcase className="w-4 h-4 text-hotel-gold" />
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-hotel-gold">{t('org_info')}</h3>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label>{t('job_title')}</Label>
                                                    <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                                                        {authProfile?.job_title || 'Not specified'}
                                                    </div>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Staff ID</Label>
                                                    <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                                                        {authProfile?.staff_id || 'PH-0000'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label>Hire Date</Label>
                                                    <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                                                        {authProfile?.hire_date ? format(new Date(authProfile.hire_date), 'MMMM d, yyyy') : 'Not specified'}
                                                    </div>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>{t('reports_to')}</Label>
                                                    <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                                                        {getReportingLineDisplay(authProfile) || 'Not specified'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>{t('status')}</Label>
                                                <div className="flex">
                                                    <Badge variant={authProfile?.is_active ? "default" : "secondary"} className="capitalize">
                                                        {authProfile?.is_active ? t('active') : t('inactive')}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="grid gap-2 pt-4">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('hr_quick_links')}</Label>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => navigate('/hr/attendance')}
                                                        className="hover:bg-hotel-gold hover:text-white transition-colors"
                                                    >
                                                        <Clock className="w-3.5 h-3.5 me-2" />
                                                        {t('attendance')}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => navigate('/hr/performance')}
                                                        className="hover:bg-hotel-gold hover:text-white transition-colors"
                                                    >
                                                        <Star className="w-3.5 h-3.5 me-2" />
                                                        {t('performance')}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => navigate('/hr/goals')}
                                                        className="hover:bg-hotel-gold hover:text-white transition-colors"
                                                    >
                                                        <Target className="w-3.5 h-3.5 me-2" />
                                                        {t('career_goals')}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => navigate('/hr/payslips')}
                                                        className="hover:bg-hotel-gold hover:text-white transition-colors"
                                                    >
                                                        <Wallet className="w-3.5 h-3.5 me-2" />
                                                        {t('payroll')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t">
                                    <Button type="submit" disabled={loading}>
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

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('security')}</CardTitle>
                            <CardDescription>{t('security_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <Label>{t('password')}</Label>
                                        <p className="text-sm text-gray-600">{t('password_desc')}</p>
                                    </div>
                                    <Button
                                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
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
        </div >
    )
}

