import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useUsers'
import { createCertificate } from '@/lib/certificateService'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Loader2, User as UserIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

type CertificateType = 'training' | 'sop_quiz' | 'compliance' | 'achievement'

export default function ManualCertificateGenerator() {
    const { t } = useTranslation('admin')
    const { profile } = useAuth()
    const { data: users, isLoading: usersLoading } = useProfiles()
    const { data: trainingModules = [], isLoading: modulesLoading } = useQuery({
        queryKey: ['manual-certificate-training-modules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('training_modules')
                .select('id, title, passing_score_percentage')
                .eq('is_deleted', false)
                .eq('status', 'published')
                .order('title', { ascending: true })

            if (error) throw error
            return data || []
        }
    })
    const queryClient = useQueryClient()

    const [isGenerating, setIsGenerating] = useState(false)

    // Form State
    const [selectedUserId, setSelectedUserId] = useState<string>('')
    const [certificateType, setCertificateType] = useState<CertificateType>('training')
    const [selectedTrainingModuleId, setSelectedTrainingModuleId] = useState<string>('')
    const [title, setTitle] = useState('')
    const [completionDate, setCompletionDate] = useState<string>(new Date().toISOString().split('T')[0])

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedUserId || !title) {
            toast.error(t('manual_certificates.errors.missing_fields'))
            return
        }
        if (certificateType === 'training' && !selectedTrainingModuleId) {
            toast.error('Please select a training module for training certificates.')
            return
        }

        const selectedUser = users?.find(u => u.id === selectedUserId)
        if (!selectedUser) return
        const selectedModule = certificateType === 'training'
            ? trainingModules.find(module => module.id === selectedTrainingModuleId)
            : null

        setIsGenerating(true)
        try {
            await createCertificate({
                userId: selectedUserId,
                recipientName: selectedUser.full_name || 'Unknown User',
                recipientEmail: selectedUser.email,
                title,
                certificateType,
                completionDate: new Date(completionDate),
                passingScore: selectedModule?.passing_score_percentage ?? undefined,
                trainingModuleId: selectedModule?.id ?? undefined,
                propertyId: selectedUser.properties?.[0]?.id || undefined,
                departmentId: selectedUser.departments?.[0]?.id || undefined,
                issuedBy: profile?.id
            })

            // Invalidate the cache so it appears in the list immediately!
            queryClient.invalidateQueries({ queryKey: ['certificates'] })

            toast.success(t('manual_certificates.success.generated'))

            // Reset form
            setSelectedUserId('')
            setSelectedTrainingModuleId('')
            setTitle('')
        } catch (error) {
            console.error('Error generating manual certificate:', error)
            toast.error(t('manual_certificates.errors.generation_failed'))
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-serif text-hotel-navy flex items-center gap-3">
                    <Award className="h-8 w-8 text-hotel-gold" />
                    {t('manual_certificates.title')}
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    {t('manual_certificates.description')}
                </p>
            </div>

            <Card className="border-t-4 border-t-hotel-gold shadow-md">
                <CardHeader className="bg-hotel-navy/5 border-b pb-6">
                    <CardTitle className="text-xl text-hotel-navy flex items-center gap-2">
                        <UserIcon className="h-5 w-5" />
                        {t('manual_certificates.form.title')}
                    </CardTitle>
                    <CardDescription>
                        {t('manual_certificates.form.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleGenerate} className="space-y-6">

                        <div className="space-y-2">
                            <Label className="text-hotel-navy font-semibold">{t('manual_certificates.form.user')}</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={usersLoading}>
                                <SelectTrigger className="w-full bg-white">
                                    <SelectValue placeholder={t('manual_certificates.form.select_user')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {users?.map(user => (
                                        <SelectItem key={user.id} value={user.id || 'undefined'}>
                                            {user.full_name} {user.job_title ? `(${user.job_title})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-hotel-navy font-semibold">{t('manual_certificates.form.cert_type')}</Label>
                                <Select value={certificateType} onValueChange={(v) => setCertificateType(v as CertificateType)}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder={t('manual_certificates.form.select_type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="training">{t('manual_certificates.types.training')}</SelectItem>
                                        <SelectItem value="sop_quiz">{t('manual_certificates.types.sop')}</SelectItem>
                                        <SelectItem value="compliance">{t('manual_certificates.types.course')}</SelectItem>
                                        <SelectItem value="achievement">{t('manual_certificates.types.achievement')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-hotel-navy font-semibold">{t('manual_certificates.form.completion_date')}</Label>
                                <Input
                                    type="date"
                                    value={completionDate}
                                    onChange={(e) => setCompletionDate(e.target.value)}
                                    required
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-hotel-navy font-semibold">{t('manual_certificates.form.course_title')}</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('manual_certificates.form.course_title_placeholder')}
                                required
                                className="bg-white"
                            />
                        </div>

                        {certificateType === 'training' && (
                            <div className="space-y-2">
                                <Label className="text-hotel-navy font-semibold">Training Module</Label>
                                <Select
                                    value={selectedTrainingModuleId}
                                    onValueChange={setSelectedTrainingModuleId}
                                    disabled={modulesLoading}
                                >
                                    <SelectTrigger className="w-full bg-white">
                                        <SelectValue placeholder="Select training module" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {trainingModules.map(module => (
                                            <SelectItem key={module.id} value={module.id}>
                                                {module.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <Button
                                type="submit"
                                disabled={isGenerating || !selectedUserId || !title || (certificateType === 'training' && !selectedTrainingModuleId)}
                                className="bg-hotel-navy hover:bg-hotel-navy-light text-white px-8"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('manual_certificates.actions.generating')}
                                    </>
                                ) : (
                                    <>
                                        <Award className="mr-2 h-4 w-4 text-hotel-gold" />
                                        {t('manual_certificates.actions.generate')}
                                    </>
                                )}
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
