import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Save, Upload, User as UserIcon, Key, Clock, Star, Target, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EmployeeDocuments from './EmployeeDocuments'
import { UserSkillsDisplay } from '@/components/profile/UserSkillsDisplay'
import { getReportingLineDisplay } from '@/lib/displayHelpers'
import { toast } from 'sonner'

export default function MyProfile() {
    const { user, profile: authProfile, refreshSession } = useAuth()
    const { t, i18n } = useTranslation('profile')
    const navigate = useNavigate()
    const isRTL = i18n.dir() === 'rtl'
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Form state
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    useEffect(() => {
        if (authProfile) {
            setFullName(authProfile.full_name || '')
            setPhone(authProfile.phone || '')
            setAvatarUrl(authProfile.avatar_url)
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
            console.log('Starting avatar upload...')

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.')
            }

            if (!user?.id) {
                throw new Error('User not authenticated')
            }

            const file = event.target.files[0]
            console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type)

            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`
            console.log('Upload path:', filePath)

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

            console.log('Upload successful:', uploadData)

            // Get public URL for the uploaded avatar
            const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath)

            console.log('Public URL:', urlData.publicUrl)

            // Update profile with the public URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: urlData.publicUrl })
                .eq('id', user.id)

            if (updateError) {
                console.error('Profile update error:', updateError)
                throw updateError
            }

            console.log('Profile updated successfully')
            setAvatarUrl(urlData.publicUrl)
            await refreshSession()
            toast.success(t('messages.avatar_updated', 'Avatar Updated'), {
                description: t('messages.avatar_updated_desc', 'Your avatar has been updated successfully.')
            })
        } catch (error: any) {
            console.error('Error uploading avatar:', error)
            toast.error(error.message || t('common:messages.error_action_failed', 'Failed to upload avatar'))
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
                                                className="relative cursor-pointer bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                                                size="sm"
                                                disabled={uploading}
                                            >
                                                {uploading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                                                ) : (
                                                    <Upload className="w-4 h-4 me-2" />
                                                )}
                                                {t('change_avatar')}
                                                <input
                                                    type="file"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    accept="image/*"
                                                    onChange={handleAvatarUpload}
                                                    disabled={uploading}
                                                />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Fields Section */}
                                    <div className="flex-1 space-y-4 w-full">
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">{t('email')}</Label>
                                            <Input id="email" value={user?.email || ''} disabled />
                                            <p className="text-xs text-gray-600">{t('email_desc')}</p>
                                        </div>

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
                                            <Label htmlFor="phone">{t('phone_number')}</Label>
                                            <Input
                                                id="phone"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+1 (555) 000-0000"
                                                style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Job Title</Label>
                                            <div className="px-3 py-2 bg-muted rounded-md text-sm">
                                                {authProfile?.job_title || 'Not specified'}
                                            </div>
                                        </div>

                                        {authProfile?.reporting_to_profile && (
                                            <div className="grid gap-2">
                                                <Label>Reports To</Label>
                                                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                                                    {getReportingLineDisplay(authProfile) || 'Not specified'}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid gap-2">
                                            <Label>Status</Label>
                                            <div className="flex gap-2 flex-wrap">
                                                <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm capitalize">
                                                    {authProfile?.is_active ? t('active') : t('inactive')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-2 pt-4 border-t">
                                            <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">HR Quick Links</Label>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => navigate('/hr/attendance')}
                                                    className="bg-hotel-navy/5 text-hotel-navy border-hotel-navy/10"
                                                >
                                                    <Clock className="w-3.5 h-3.5 me-2" />
                                                    Attendance
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => navigate('/hr/performance')}
                                                    className="bg-hotel-navy/5 text-hotel-navy border-hotel-navy/10"
                                                >
                                                    <Star className="w-3.5 h-3.5 me-2" />
                                                    Performance
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => navigate('/hr/goals')}
                                                    className="bg-hotel-navy/5 text-hotel-navy border-hotel-navy/10"
                                                >
                                                    <Target className="w-3.5 h-3.5 me-2" />
                                                    Career Goals
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => navigate('/hr/payslips')}
                                                    className="bg-hotel-navy/5 text-hotel-navy border-hotel-navy/10"
                                                >
                                                    <Wallet className="w-3.5 h-3.5 me-2" />
                                                    Payroll
                                                </Button>
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

