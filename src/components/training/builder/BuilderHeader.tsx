import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Check,
  ChevronLeft,
  Edit3,
  Eye,
  Loader2,
  RotateCcw,
  RotateCw,
  Save,
  Wand2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { BuilderStep } from '@/pages/training/components/builder/trainingBuilderTypes'

interface BuilderHeaderProps {
  title: string
  isSaving: boolean
  hasUnsavedChanges: boolean
  onSave: () => void
  onPreview: () => void
  onMagic: () => void
  onTitleChange?: (title: string) => void

  // Navigation steps
  steps?: readonly { key: BuilderStep; label: string; description?: string }[]
  activeStep?: BuilderStep
  onStepChange?: (step: BuilderStep) => void
  stepStatus?: Record<BuilderStep, boolean>
  canAccessStep?: (step: BuilderStep) => boolean

  // Undo / Redo
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean

  // Autosave
  autosaveStatus?: 'idle' | 'saving' | 'saved'
  lastAutosaveAt?: Date | null
  formatTime?: (date: Date) => string
}

export const BuilderHeader = ({
  title,
  isSaving,
  hasUnsavedChanges,
  onSave,
  onPreview,
  onMagic,
  onTitleChange,
  steps,
  activeStep,
  onStepChange,
  stepStatus,
  canAccessStep,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  autosaveStatus,
  lastAutosaveAt,
  formatTime,
}: BuilderHeaderProps) => {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-xs">
      <div className={cn(
        "px-3 lg:px-5 flex h-14 items-center justify-between gap-2.5",
        isRTL ? "flex-row-reverse" : ""
      )}>
        {/* Left Section: Back, Title & Status */}
        <div className={cn("flex items-center gap-2 min-w-0 max-w-[340px] xl:max-w-[400px]", isRTL ? "flex-row-reverse" : "")}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            onClick={() => navigate('/training/hub')}
            title={t('back', 'Back to Hub')}
          >
            <ChevronLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
          </Button>

          <div className={cn("flex items-center gap-1.5 min-w-0 flex-1", isRTL ? "flex-row-reverse text-right" : "text-left")}>
            <div className={cn(
              "relative flex items-center w-full max-w-[260px] xl:max-w-[300px] rounded-lg border transition-all duration-150",
              !title.trim() || title === 'Untitled Module'
                ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 shadow-xs ring-2 ring-amber-400/30"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 focus-within:border-hotel-gold focus-within:ring-2 focus-within:ring-hotel-gold/20"
            )}>
              <div className="ps-2 pe-1 text-slate-400 flex items-center pointer-events-none">
                <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <Input
                value={title}
                onChange={(e) => onTitleChange?.(e.target.value)}
                placeholder={t('builder.nameYourCourse', 'Enter Course Title...')}
                className={cn(
                  "h-8 border-none bg-transparent shadow-none px-1 text-xs font-bold text-slate-900 dark:text-white placeholder:text-amber-700/70 dark:placeholder:text-amber-400/70 focus-visible:ring-0 truncate",
                  isRTL ? "text-right" : "text-left"
                )}
                title={t('builder.clickToRename', 'Click to edit course name')}
              />
            </div>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="h-5 px-1.5 text-[9px] uppercase font-mono bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 shrink-0">
                {t('builder.unsaved', 'Unsaved')}
              </Badge>
            )}
          </div>
        </div>

        {/* Center Section: Streamlined 3-Step Navigation Pills */}
        {steps && steps.length > 0 && onStepChange && (
          <nav className={cn(
            "hidden md:flex items-center gap-1.5 p-1 rounded-full bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800",
            isRTL ? "flex-row-reverse" : ""
          )}>
            {steps.map((step, index) => {
              const isActive = activeStep === step.key
              const isDone = stepStatus ? stepStatus[step.key] : false
              const locked = canAccessStep ? !canAccessStep(step.key) : false

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => onStepChange(step.key)}
                  disabled={locked}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 select-none",
                    isActive
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold ring-1 ring-hotel-gold/40"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
                    locked && "opacity-40 cursor-not-allowed hover:text-slate-600 dark:hover:text-slate-400"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-colors",
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isActive
                        ? "bg-hotel-gold text-hotel-navy font-black"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {isDone ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : index + 1}
                  </span>
                  <span>{step.label}</span>
                </button>
              )
            })}
          </nav>
        )}

        {/* Right Section: Undo/Redo, Autosave, Tools & Actions */}
        <div className={cn("flex items-center gap-1.5 shrink-0", isRTL ? "flex-row-reverse" : "")}>
          {/* Undo / Redo */}
          {onUndo && onRedo && (
            <div className={cn("hidden lg:flex items-center gap-0.5 pe-1 border-e border-slate-200 dark:border-slate-800", isRTL ? "flex-row-reverse" : "")}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30"
                onClick={onUndo}
                disabled={!canUndo}
                title={`${t('builder.undo', 'Undo')} (Ctrl+Z)`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30"
                onClick={onRedo}
                disabled={!canRedo}
                title={`${t('builder.redo', 'Redo')} (Ctrl+Shift+Z)`}
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Subtle Autosave Indicator */}
          {autosaveStatus && (
            <div className="hidden xl:flex items-center gap-1 text-[11px] text-muted-foreground px-1.5 select-none font-medium">
              {autosaveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                  <span>{t('builder.autosaveSaving', 'Saving...')}</span>
                </>
              )}
              {autosaveStatus === 'saved' && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {t('builder.autosaveSaved', {
                    time: lastAutosaveAt && formatTime ? formatTime(lastAutosaveAt) : '',
                  })}
                </span>
              )}
            </div>
          )}

          <LanguageSwitcher variant="ghost" className="text-xs h-8 px-2 font-medium" />

          <Button
            variant="outline"
            size="sm"
            onClick={onMagic}
            className={cn(
              "hidden sm:flex h-8 px-2.5 text-xs font-semibold border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50",
              isRTL && "flex-row-reverse"
            )}
            title="Smart Course AI Generator (Ctrl+Shift+A)"
          >
            <Wand2 className={cn("h-3.5 w-3.5 text-amber-600 dark:text-amber-400", isRTL ? "ms-1.5" : "me-1.5")} />
            <span>{t('builder.aiAssistant', 'AI Assistant')}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className={cn("h-8 px-2.5 text-xs font-semibold", isRTL ? "flex-row-reverse" : "")}
            title="Preview Learner View (Ctrl+Shift+P)"
          >
            <Eye className={cn("h-3.5 w-3.5", isRTL ? "ms-1.5" : "me-1.5")} />
            <span>{t('preview', 'Preview')}</span>
          </Button>

          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              "h-8 px-3 text-xs font-bold bg-hotel-gold hover:bg-hotel-gold/90 text-hotel-navy shadow-xs",
              isRTL ? "flex-row-reverse" : ""
            )}
            title="Save Draft (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 className={cn("h-3.5 w-3.5 animate-spin", isRTL ? "ms-1.5" : "me-1.5")} />
            ) : (
              <Save className={cn("h-3.5 w-3.5", isRTL ? "ms-1.5" : "me-1.5")} />
            )}
            <span>{t('save', 'Save')}</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
