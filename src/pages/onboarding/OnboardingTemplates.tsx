import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboardingTemplates, useDeleteOnboardingTemplate } from '@/hooks/useOnboarding'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit, FileText, Settings, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useTranslation } from 'react-i18next'

export default function OnboardingTemplates() {
    const { t } = useTranslation('onboarding')
    const navigate = useNavigate()
    const { data: templates, isLoading } = useOnboardingTemplates()
    const { mutate: deleteTemplate } = useDeleteOnboardingTemplate()
    const { toast } = useToast()

    const handleDelete = (id: string) => {
        deleteTemplate(id, {
            onSuccess: () => {
                toast({ title: "Template deleted" })
            },
            onError: () => {
                toast({ title: "Error deleting template", variant: "destructive" })
            }
        })
    }

    if (isLoading) {
        return <div>Loading templates...</div>
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('templates.title')}</h2>
                    <p className="text-muted-foreground">{t('templates.subtitle')}</p>
                </div>
                <Button onClick={() => navigate('/admin/onboarding/templates/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('actions.create_template')}
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {templates?.map((template) => (
                    <Card key={template.id} className="flex flex-col">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="leading-snug">{template.title}</CardTitle>
                                    <CardDescription>
                                        {template.tasks.length} {t('templates.tasks_defined')}
                                    </CardDescription>
                                </div>
                                {template.is_active ? (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">{t('status.active')}</Badge>
                                ) : (
                                    <Badge variant="secondary">{t('status.draft')}</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Users className="h-4 w-4" />
                                    <span>{t('templates.target')}: {template.job_title ? `${t('templates.job')}: ${template.job_title}` : template.role ? `${t('templates.role')}: ${template.role}` : template.department_id ? t('templates.specific_dept') : t('templates.general')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                    <span>{t('templates.created')} {format(new Date(template.created_at), 'MMM d, yyyy')}</span>
                                </div>
                            </div>
                        </CardContent>
                        <div className="flex items-center justify-end gap-2 p-4 pt-0">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/onboarding/templates/${template.id}`)}>
                                <Edit className="mr-2 h-4 w-4" /> {t('actions.edit')}
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('dialogs.delete_title')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('dialogs.delete_desc')}
                                            "{template.title}" {t('common.template')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDelete(template.id)}>
                                            {t('actions.delete')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </Card>
                ))}
            </div>
        </div >
    )
}
