import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Save, Eye, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface BuilderHeaderProps {
    title: string
    isSaving: boolean
    hasUnsavedChanges: boolean
    onSave: () => void
    onPreview: () => void
    onMagic: () => void
    onTitleChange?: (title: string) => void
}

export const BuilderHeader = ({
    title,
    isSaving,
    hasUnsavedChanges,
    onSave,
    onPreview,
    onMagic,
    onTitleChange
}: BuilderHeaderProps) => {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const navigate = useNavigate()

    return (
        <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className={`container flex h-16 items-center justify-between py-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => navigate('/training/modules')}
                    >
                        <ChevronLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
                    </Button>
                    <div className={`flex flex-col gap-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={title}
                                    onChange={(e) => onTitleChange?.(e.target.value)}
                                    placeholder={t('builder.untitledModule')}
                                    className="h-8 w-[300px] text-lg font-semibold bg-transparent border-transparent hover:border-input focus:border-input transition-colors px-2"
                                />
                            </div>
                            {hasUnsavedChanges && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] uppercase font-mono">
                                    {t('builder.unsaved')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('builder.trainingBuilder')}
                        </p>
                    </div>
                </div>

                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onMagic}
                        className={cn("hidden sm:flex", isRTL && "flex-row-reverse")}
                    >
                        <Wand2 className={cn("h-4 w-4 text-purple-500", isRTL ? "ml-2" : "mr-2")} />
                        {t('builder.aiAssistant')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPreview}
                        className={isRTL ? 'flex-row-reverse' : ''}
                    >
                        <Eye className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                        {t('preview')}
                    </Button>
                    <Button
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving}
                        className={isRTL ? 'flex-row-reverse' : ''}
                    >
                        {isSaving ? (
                            <div className={cn("h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", isRTL ? "ml-2" : "mr-2")} />
                        ) : (
                            <Save className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                        )}
                        {t('save')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
