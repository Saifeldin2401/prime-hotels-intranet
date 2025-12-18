import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Save, Eye, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface BuilderHeaderProps {
    title: string
    isSaving: boolean
    hasUnsavedChanges: boolean
    onSave: () => void
    onPreview: () => void
    onMagic: () => void
}

export const BuilderHeader = ({
    title,
    isSaving,
    hasUnsavedChanges,
    onSave,
    onPreview,
    onMagic
}: BuilderHeaderProps) => {
    const { t } = useTranslation('training')
    const navigate = useNavigate()

    return (
        <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between py-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => navigate('/training/modules')}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold leading-none tracking-tight">
                                {title || t('untitledModule')}
                            </h1>
                            {hasUnsavedChanges && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] uppercase font-mono">
                                    {t('unsaved')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('trainingBuilder')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onMagic}
                        className="hidden sm:flex"
                    >
                        <Wand2 className="mr-2 h-4 w-4 text-purple-500" />
                        {t('aiAssistant')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPreview}
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        {t('preview')}
                    </Button>
                    <Button
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {t('save')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
