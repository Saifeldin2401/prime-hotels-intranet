import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTenant } from '@/contexts/TenantContext'
import { useProfiles } from '@/hooks/useUsers'
import { CertificateIssueError, issueManualCertificate } from '@/services/certificateService'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

type CertificateType = 'training' | 'sop_quiz' | 'compliance' | 'achievement'

export default function ManualCertificateGenerator() {
    const { t } = useTranslation('admin')
    const { currentOrganization } = useTenant()
    const { data: users, isLoading: usersLoading } = useProfiles()
    const { data: trainingModules = [], isLoading: modulesLoading } = useQuery({
        queryKey: ['manual-certificate-training-modules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('courses')
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
    const [issuedByName, setIssuedByName] = useState('')
    const [issuedByTitle, setIssuedByTitle] = useState('')
    const [secondarySignatoryName, setSecondarySignatoryName] = useState('')
    const [secondarySignatoryTitle, setSecondarySignatoryTitle] = useState('')

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
            if (!currentOrganization) {
                toast.error(t('manual_certificates.errors.generation_failed'))
                return
            }
            await issueManualCertificate({
                organizationId: currentOrganization.id,
                userId: selectedUserId,
                recipientName: selectedUser.full_name || 'Unknown User',
                recipientEmail: selectedUser.email ?? undefined,
                title,
                certificateType,
                completionDate: new Date(completionDate),
                trainingModuleId: selectedModule?.id ?? undefined,
                metadata: {
                    issuedByName: issuedByName || undefined,
                    issuedByTitle: issuedByTitle || undefined,
                    secondarySignatoryName: secondarySignatoryName || undefined,
                    secondarySignatoryTitle: secondarySignatoryTitle || undefined
                }
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
            // The server explains rule violations (self-issue, not a member,
            // future date ...) in plain language; show that instead of a generic error.
            toast.error(error instanceof CertificateIssueError
                ? error.message
                : t('manual_certificates.errors.generation_failed'))
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="mx-auto max-w-3xl">
            <PageHeader
                backTo="/manage/certificates"
                title={t('manual_certificates.title')}
                description={t('manual_certificates.description')}
            />

            <Card className="rounded-[6px] border border-ds-border bg-ds-surface shadow-none">
                <CardHeader className="border-b border-ds-border pb-5">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-ds-ink">
                        {t('manual_certificates.form.title')}
                    </CardTitle>
                    <CardDescription>
                        {t('manual_certificates.form.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleGenerate} className="space-y-6">

                        <div className="space-y-2">
                            <Label className="font-medium text-ds-ink">{t('manual_certificates.form.user')}</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={usersLoading}>
                                <SelectTrigger className="w-full bg-ds-surface">
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
                                <Label className="font-medium text-ds-ink">{t('manual_certificates.form.cert_type')}</Label>
                                <Select value={certificateType} onValueChange={(v) => setCertificateType(v as CertificateType)}>
                                    <SelectTrigger className="bg-ds-surface">
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
                                <Label className="font-medium text-ds-ink">{t('manual_certificates.form.completion_date')}</Label>
                                <Input
                                    type="date"
                                    value={completionDate}
                                    onChange={(e) => setCompletionDate(e.target.value)}
                                    required
                                    className="bg-ds-surface"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-medium text-ds-ink">{t('manual_certificates.form.course_title')}</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('manual_certificates.form.course_title_placeholder')}
                                required
                                className="bg-ds-surface"
                            />
                        </div>

                        {certificateType === 'training' && (
                            <div className="space-y-2">
                                <Label className="font-medium text-ds-ink">Training Module</Label>
                                <Select
                                    value={selectedTrainingModuleId}
                                    onValueChange={setSelectedTrainingModuleId}
                                    disabled={modulesLoading}
                                >
                                    <SelectTrigger className="w-full bg-ds-surface">
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

                        <div className="pt-4 border-t mt-6">
                            <h3 className="mb-4 text-base font-semibold text-ds-ink">Signatory Overrides (Optional)</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Leave these fields blank to use the global template defaults.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="font-medium text-ds-ink">Left Signatory Name</Label>
                                    <Input
                                        value={issuedByName}
                                        onChange={(e) => setIssuedByName(e.target.value)}
                                        placeholder="e.g. Saifeldin M."
                                        className="bg-ds-surface"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-medium text-ds-ink">Left Signatory Title</Label>
                                    <Input
                                        value={issuedByTitle}
                                        onChange={(e) => setIssuedByTitle(e.target.value)}
                                        placeholder="e.g. VP of Learning & Quality"
                                        className="bg-ds-surface"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-medium text-ds-ink">Right Signatory Name</Label>
                                    <Input
                                        value={secondarySignatoryName}
                                        onChange={(e) => setSecondarySignatoryName(e.target.value)}
                                        placeholder="e.g. Dr. Khalid Al-Mansoor"
                                        className="bg-ds-surface"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-medium text-ds-ink">Right Signatory Title</Label>
                                    <Input
                                        value={secondarySignatoryTitle}
                                        onChange={(e) => setSecondarySignatoryTitle(e.target.value)}
                                        placeholder="e.g. Executive Managing Director"
                                        className="bg-ds-surface"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                type="submit"
                                disabled={isGenerating || !selectedUserId || !title || (certificateType === 'training' && !selectedTrainingModuleId)}
                                className="min-h-[44px] bg-ds-ink px-8 text-ds-on-ink hover:bg-ds-ink/90"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                        {t('manual_certificates.actions.generating')}
                                    </>
                                ) : (
                                    <>
                                        <Award aria-hidden="true" className="me-2 h-4 w-4" />
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
