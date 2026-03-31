/**
 * MobileProfile Component
 * 
 * Mobile-optimized profile management with:
 * - Editable sections
 * - Document uploads
 * - Contact info management
 * - Quick actions
 */

import { MobileHeader } from '@/components/layout/MobileHeader'
import { ActionSheet } from '@/components/mobile/ActionSheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
    Building,
    Calendar,
    Camera,
    CreditCard,
    Edit3,
    Mail,
    MapPin,
    Phone,
    Save,
    Shield,
    User,
    X
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface ProfileSection {
    id: string
    title: string
    icon: React.ElementType
    editable: boolean
}

/**
 * MobileProfile - Mobile-optimized profile page
 */
export function MobileProfile() {
    const { t } = useTranslation('profile')
    const navigate = useNavigate()
    const { toast } = useToast()
    const { user, profile } = useAuth()
    const [isEditing, setIsEditing] = useState(false)
    const [showEditSheet, setShowEditSheet] = useState(false)
    const [activeSection, setActiveSection] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
        emergency_contact: profile?.emergency_contact || '',
    })

    const sections: ProfileSection[] = [
        { id: 'personal', title: t('personal_info', 'Personal Information'), icon: User, editable: true },
        { id: 'contact', title: t('contact_details', 'Contact Details'), icon: Phone, editable: true },
        { id: 'employment', title: t('employment', 'Employment'), icon: Building, editable: false },
        { id: 'documents', title: t('documents', 'Documents'), icon: CreditCard, editable: false },
    ]

    const handleSave = async () => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500))
            
            toast({
                title: t('profile_updated', 'Profile Updated'),
                description: t('changes_saved', 'Your changes have been saved successfully.'),
            })
            setIsEditing(false)
            setShowEditSheet(false)
        } catch {
            toast({
                title: t('update_failed', 'Update Failed'),
                description: t('try_again', 'Please try again.'),
                variant: 'destructive',
            })
        }
    }

    const handlePhotoUpload = () => {
        // Trigger file input
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
                toast({
                    title: t('photo_uploaded', 'Photo Uploaded'),
                    description: t('photo_updated', 'Your profile photo has been updated.'),
                })
            }
        }
        input.click()
    }

    return (
        <div className="min-h-screen bg-background">
            <MobileHeader
                title={t('my_profile', 'My Profile')}
                showBack
                actions={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="touch-target"
                        onClick={() => setShowEditSheet(true)}
                    >
                        <Edit3 className="h-5 w-5" />
                    </Button>
                }
            />

            <main className="pb-24">
                {/* Profile Header */}
                <div className="bg-gradient-to-b from-primary/10 to-background pt-6 pb-8 px-4">
                    <div className="text-center">
                        {/* Avatar */}
                        <div className="relative inline-block">
                            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                                    {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                onClick={handlePhotoUpload}
                                className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Name & Role */}
                        <h1 className="text-xl font-bold mt-4">
                            {profile?.full_name || user?.email}
                        </h1>
                        <p className="text-muted-foreground">
                            {profile?.job_title || 'Staff Member'}
                        </p>
                        <Badge variant="secondary" className="mt-2">
                            {profile?.department?.name || 'General'}
                        </Badge>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="px-4 -mt-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold">{profile?.years_of_service || '-'}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('years', 'Years')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{profile?.completed_trainings || '-'}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('trainings', 'Trainings')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{profile?.certifications || '-'}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('certs', 'Certs')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Profile Sections */}
                <div className="px-4 mt-6 space-y-4">
                    {/* Personal Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                {t('personal_info', 'Personal Information')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">{t('email', 'Email')}</p>
                                    <p className="font-medium truncate">{user?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">{t('phone', 'Phone')}</p>
                                    <p className="font-medium">{profile?.phone || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">{t('joined', 'Joined')}</p>
                                    <p className="font-medium">
                                        {profile?.created_at 
                                            ? new Date(profile.created_at).toLocaleDateString() 
                                            : '-'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Employment Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Building className="h-4 w-4 text-primary" />
                                {t('employment', 'Employment')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">{t('property', 'Property')}</p>
                                    <p className="font-medium">{profile?.property?.name || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">{t('department', 'Department')}</p>
                                    <p className="font-medium">{profile?.department?.name || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">{t('location', 'Location')}</p>
                                    <p className="font-medium">{profile?.property?.address || '-'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Documents */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-primary" />
                                {t('documents', 'Documents')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {[
                                    { name: t('id_card', 'ID Card'), status: 'verified' },
                                    { name: t('passport', 'Passport'), status: 'pending' },
                                    { name: t('work_permit', 'Work Permit'), status: 'verified' },
                                ].map(doc => (
                                    <div
                                        key={doc.name}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                                    >
                                        <span className="font-medium">{doc.name}</span>
                                        <Badge
                                            variant={doc.status === 'verified' ? 'default' : 'secondary'}
                                            className="text-xs"
                                        >
                                            {doc.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => navigate('/profile/documents')}
                            >
                                {t('view_all_docs', 'View All Documents')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Edit Profile Sheet */}
            <ActionSheet
                open={showEditSheet}
                onOpenChange={setShowEditSheet}
                title={t('edit_profile', 'Edit Profile')}
            >
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="full_name">{t('full_name', 'Full Name')}</Label>
                        <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Enter your full name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('phone', 'Phone Number')}</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+966 50 123 4567"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">{t('address', 'Address')}</Label>
                        <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Enter your address"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="emergency">{t('emergency_contact', 'Emergency Contact')}</Label>
                        <Input
                            id="emergency"
                            value={formData.emergency_contact}
                            onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                            placeholder="Name and phone number"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setShowEditSheet(false)}
                        >
                            <X className="h-4 w-4 mr-2" />
                            {t('cancel', 'Cancel')}
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSave}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {t('save', 'Save')}
                        </Button>
                    </div>
                </div>
            </ActionSheet>
        </div>
    )
}
