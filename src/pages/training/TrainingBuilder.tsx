import { SmartModuleWizard } from '@/components/training'
import { BuilderCanvas } from '@/components/training/builder/BuilderCanvas'
import { BuilderHeader } from '@/components/training/builder/BuilderHeader'
import { BuilderPreview } from '@/components/training/builder/BuilderPreview'
import { BuilderSidebar } from '@/components/training/builder/BuilderSidebar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Loader2, Plus, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AIQuizDialog } from './components/builder/AIQuizDialog'
import { ContentBlockDialog } from './components/builder/ContentBlockDialog'
import { KBSidebarPanel } from './components/builder/KBSidebarPanel'
import { RightPanel } from './components/builder/RightPanel'
import { StepPublish } from './components/builder/StepPublish'
import { StepRules } from './components/builder/StepRules'
import { StepSetup } from './components/builder/StepSetup'
import { StepStructure } from './components/builder/StepStructure'
import { TemplateApplyConfirmDialog, TemplatePreviewDialog } from './components/builder/TemplateDialogs'
import type { BuilderStep } from './components/builder/trainingBuilderTypes'
import { TrainingBuilderProvider, useTrainingBuilderContext } from './contexts/TrainingBuilderContext'

// ---------------------------------------------------------------------------
// Inner component – pure layout, all state/logic comes from context
// ---------------------------------------------------------------------------

function TrainingBuilderInner() {
  const { t } = useTranslation('training')
  const ctx = useTrainingBuilderContext()

  if (!ctx.hasMounted && ctx.isNewRoute) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const renderStepContent = () => {
    const { builderStep } = ctx

    if (builderStep === 'setup') return (
      <StepSetup
        title={ctx.title} setTitle={ctx.setTitle}
        description={ctx.description} setDescription={ctx.setDescription}
        audience={ctx.audience} setAudience={ctx.setAudience}
        category={ctx.category} setCategory={ctx.setCategory}
        difficultyLevel={ctx.difficultyLevel} setDifficultyLevel={ctx.setDifficultyLevel}
        contentLanguage={ctx.contentLanguage} setContentLanguage={ctx.setContentLanguage}
        estimatedDuration={ctx.estimatedDuration} setEstimatedDuration={ctx.setEstimatedDuration}
        useEstimatedDuration={ctx.useEstimatedDuration} setUseEstimatedDuration={ctx.setUseEstimatedDuration}
        calculatedDuration={ctx.calculatedDuration}
        validityPeriod={ctx.validityPeriod} setValidityPeriod={ctx.setValidityPeriod}
        templatePreset={ctx.templatePreset} handleTemplateSelection={ctx.handleTemplateSelection}
        selectedTemplate={ctx.selectedTemplate} templateStats={ctx.templateStats}
        isTemplatesLoading={ctx.isTemplatesLoading} isTemplatesError={ctx.isTemplatesError}
        templateOptions={ctx.templateOptions} setShowTemplatePreview={ctx.setShowTemplatePreview}
        validationChecklist={ctx.validationChecklist} isRTL={ctx.isRTL}
      />
    )

    if (builderStep === 'structure') return (
      <StepStructure
        sections={ctx.sections} addSection={ctx.addSection} deleteSection={ctx.deleteSection}
        handleRenameSection={ctx.handleRenameSection} moveSection={ctx.moveSection} isRTL={ctx.isRTL}
      />
    )

    if (builderStep === 'content') return (
      <BuilderCanvas
        sections={ctx.sections} activeSection={ctx.activeSection}
        onSectionClick={(id) => ctx.setActiveSection(id)}
        onAddSection={ctx.addSection} onDeleteSection={ctx.deleteSection}
        onAddContent={(type, sectionId) => ctx.addContent(type, sectionId)}
        onEditContent={(sectionId, contentId) => {
          const block = ctx.contentBlocks.find(c => c.id === contentId)
          if (block) {
            ctx.openContentDialogForBlock({ ...block }, { selected: block })
          } else {
            const item = ctx.sections.find(s => s.id === sectionId)?.items.find(i => i.id === contentId)
            if (item) ctx.openContentDialogForBlock(item, { selected: item, sectionId })
          }
        }}
        onDeleteContent={ctx.deleteContent}
        onReorderSection={ctx.handleReorderSection} onReorderContent={ctx.handleReorderContent}
        onGenerateQuizFromSection={ctx.openAIGeneratorForSection}
      />
    )

    if (builderStep === 'rules') return (
      <StepRules
        certificateEnabled={ctx.certificateEnabled} setCertificateEnabled={ctx.setCertificateEnabled}
        passingScore={ctx.passingScore} setPassingScore={ctx.setPassingScore}
        validityPeriod={ctx.validityPeriod} setValidityPeriod={ctx.setValidityPeriod}
        allowRetake={ctx.allowRetake} setAllowRetake={ctx.setAllowRetake}
        maxAttempts={ctx.maxAttempts} setMaxAttempts={ctx.setMaxAttempts}
        autoAdvance={ctx.autoAdvance} setAutoAdvance={ctx.setAutoAdvance}
        showFeedback={ctx.showFeedback} setShowFeedback={ctx.setShowFeedback}
        randomizeQuestions={ctx.randomizeQuestions} setRandomizeQuestions={ctx.setRandomizeQuestions}
        showAnswers={ctx.showAnswers} setShowAnswers={ctx.setShowAnswers}
        timeLimit={ctx.timeLimit} setTimeLimit={ctx.setTimeLimit} isRTL={ctx.isRTL}
      />
    )

    if (builderStep === 'preview') return (
      <div className="p-6">
        <BuilderPreview title={ctx.title} description={ctx.description} sections={ctx.sections} />
      </div>
    )

    if (builderStep === 'publish') return (
      <StepPublish
        sections={ctx.sections} totalItems={ctx.totalItems}
        displayDuration={ctx.displayDuration} overrideDuration={ctx.overrideDuration}
        calculatedDuration={ctx.calculatedDuration} certificateEnabled={ctx.certificateEnabled}
        passingScore={ctx.passingScore} allowRetake={ctx.allowRetake} maxAttempts={ctx.maxAttempts}
        validationChecklist={ctx.validationChecklist} publishReady={ctx.publishReady}
        builderBusy={ctx.builderBusy} handleSave={ctx.handleSave} publishTraining={ctx.publishTraining}
        isRTL={ctx.isRTL}
      />
    )

    return null
  }

  return (
    <div className={`min-h-screen bg-background flex flex-col ${ctx.isRTL ? 'text-right' : 'text-left'}`}>

      {/* Draft restore banner */}
      {ctx.isNewRoute && ctx.showRestorePrompt && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-800 dark:text-amber-300">
                {t('builder.draftRestoredBanner', 'Draft training module restored from previous session')}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => ctx.setShowRestorePrompt(false)}>{t('builder.keepDraft', 'Keep')}</Button>
              <Button variant="outline" size="sm" onClick={() => {
                ctx.clearDraft(); ctx.setTitle(''); ctx.setDescription(''); ctx.setSections([]); ctx.setShowRestorePrompt(false)
              }}>{t('builder.clearDraftBtn', 'Clear Draft')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <BuilderHeader
        title={ctx.title} isSaving={ctx.builderBusy} hasUnsavedChanges={ctx.builderBusy}
        onSave={ctx.handleSave} onPreview={() => ctx.handleStepChange('preview')}
        onMagic={() => ctx.setShowSmartWizard(true)} onTitleChange={ctx.setTitle}
      />

      {/* Step navigation bar */}
      <div className="border-b bg-white/80 dark:bg-background/80">
        <div className={`container py-4 ${ctx.isRTL ? 'text-right' : 'text-left'}`}>
          <div className="flex flex-col gap-3">
            <div className={cn("flex items-center justify-between gap-4", ctx.isRTL ? "flex-row-reverse" : "")}>
              <div className={cn("flex flex-wrap items-center gap-2", ctx.isRTL ? "flex-row-reverse" : "")}>
                {ctx.steps.map((step, index) => {
                  const isActive = ctx.builderStep === step.key
                  const isDone = ctx.stepStatus[step.key]
                  const locked = !ctx.canAccessStep(step.key as BuilderStep)
                  return (
                    <button key={step.key} type="button" onClick={() => ctx.handleStepChange(step.key as BuilderStep)}
                      disabled={locked}
                      className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        isActive ? "border-hotel-gold bg-hotel-gold/10 text-hotel-navy" : "border-slate-200 text-slate-600",
                        locked && "opacity-50 cursor-not-allowed")}
                    >
                      <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                        isDone ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600")}>
                        {index + 1}
                      </span>
                      {step.label}
                    </button>
                  )
                })}
              </div>
              <div className={cn("flex items-center gap-2", ctx.isRTL ? "flex-row-reverse" : "")}>
                <Button variant="outline" size="sm" onClick={ctx.handleUndo} disabled={ctx.historyIndex <= 0} className={ctx.isRTL ? "flex-row-reverse" : ""}>
                  <RotateCcw className={cn("h-4 w-4", ctx.isRTL ? "ms-2" : "me-2")} />{t('builder.undo')}
                </Button>
                <Button variant="outline" size="sm" onClick={ctx.handleRedo} disabled={ctx.historyIndex >= ctx.historyRef.current.length - 1} className={ctx.isRTL ? "flex-row-reverse" : ""}>
                  <RotateCw className={cn("h-4 w-4", ctx.isRTL ? "ms-2" : "me-2")} />{t('builder.redo')}
                </Button>
                <div className="text-xs text-muted-foreground">
                  {ctx.autosaveStatus === 'saving' && t('builder.autosaveSaving')}
                  {ctx.autosaveStatus === 'saved' && t('builder.autosaveSaved', { time: ctx.lastAutosaveAt ? ctx.formatTime(ctx.lastAutosaveAt) : '' })}
                  {ctx.autosaveStatus === 'idle' && t('builder.autosaveIdle')}
                </div>
              </div>
            </div>
            <div className={cn("flex items-center justify-between gap-4", ctx.isRTL ? "flex-row-reverse" : "")}>
              <div className="text-xs text-muted-foreground">{ctx.steps[ctx.currentStepIndex]?.description}</div>
              <div className={cn("flex items-center gap-2", ctx.isRTL ? "flex-row-reverse" : "")}>
                <Button variant="outline" size="sm" onClick={ctx.goPrevStep} disabled={ctx.currentStepIndex === 0} className={ctx.isRTL ? "flex-row-reverse" : ""}>
                  <ChevronLeft className={cn("h-4 w-4", ctx.isRTL ? "ms-2 rotate-180" : "me-2")} />{t('builder.back')}
                </Button>
                <Button size="sm" onClick={ctx.goNextStep} disabled={ctx.currentStepIndex === ctx.steps.length - 1} className={ctx.isRTL ? "flex-row-reverse" : ""}>
                  {t('builder.next')}<ChevronRight className={cn("h-4 w-4", ctx.isRTL ? "me-2 rotate-180" : "ms-2")} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar – block library (content step only) */}
        {ctx.builderStep === 'content' && (
          <aside className="hidden xl:flex w-64 border-r bg-white">
            <div className="p-4 space-y-4 w-full">
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.blockLibrary')}</div>
                <div className="text-xs text-slate-500">{t('builder.activeSectionLabel')}: {ctx.activeSectionName || t('builder.noSectionSelected')}</div>
              </div>
              <Button variant="outline" size="sm" onClick={ctx.addSection} className={cn("w-full", ctx.isRTL ? "flex-row-reverse" : "")}>
                <Plus className={cn("h-4 w-4", ctx.isRTL ? "ms-2" : "me-2")} />{t('builder.addSection')}
              </Button>
              <div className="space-y-2">
                {ctx.savedBlocks.length > 0 && (
                  <div className="space-y-2 pb-2 border-b border-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-400">{t('builder.savedBlocks', 'Saved blocks')}</div>
                    {ctx.savedBlocks.slice(0, 5).map(block => (
                      <div key={block.id} className={cn("flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2", ctx.isRTL ? "text-right" : "text-left")}>
                        <button type="button" onClick={() => ctx.insertSavedBlock(block)} className="flex-1 text-left">
                          <div className="text-xs font-semibold text-slate-700">{block.title || ctx.contentTypeLabelMap[block.type]}</div>
                          <div className="text-[11px] text-slate-400">{ctx.contentTypeLabelMap[block.type]}</div>
                        </button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500"
                          onClick={() => ctx.handleRemoveSavedBlock(block.id)} aria-label={t('accessibility.removeSavedBlock', 'Remove saved block')}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {ctx.blockLibrary.map(block => (
                  <button key={block.type} type="button" onClick={() => ctx.addContent(block.type)}
                    className={cn("w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-hotel-gold hover:bg-hotel-gold/5", ctx.isRTL ? "text-right" : "text-left")}>
                    <div className="text-sm font-semibold text-slate-700">{block.label}</div>
                    <div className="text-xs text-slate-500">{block.hint}</div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto">{renderStepContent()}</main>

        {/* Right sidebar */}
        <BuilderSidebar className="hidden lg:flex w-[320px] border-l bg-slate-50/50">
          <RightPanel
            builderStep={ctx.builderStep} sections={ctx.sections} totalItems={ctx.totalItems}
            totalPoints={ctx.totalPoints} displayDuration={ctx.displayDuration}
            overrideDuration={ctx.overrideDuration} calculatedDuration={ctx.calculatedDuration}
            certificateEnabled={ctx.certificateEnabled} passingScore={ctx.passingScore}
            allowRetake={ctx.allowRetake} maxAttempts={ctx.maxAttempts}
            validationChecklist={ctx.validationChecklist} moduleId={ctx.moduleId}
            openAIGeneratorForModule={ctx.openAIGeneratorForModule}
            setShowSmartWizard={ctx.setShowSmartWizard} isRTL={ctx.isRTL}
          />
        </BuilderSidebar>
      </div>

      {/* Dialogs */}
      <ContentBlockDialog
        open={ctx.showContentDialog} onOpenChange={ctx.setShowContentDialog}
        currentBlock={ctx.currentBlock} setCurrentBlock={ctx.setCurrentBlock}
        selectedContent={ctx.selectedContent} showTitleField={ctx.showTitleField}
        setShowTitleField={ctx.setShowTitleField} showAdvancedBlockOptions={ctx.showAdvancedBlockOptions}
        setShowAdvancedBlockOptions={ctx.setShowAdvancedBlockOptions} mediaInputMode={ctx.mediaInputMode}
        setMediaInputMode={ctx.setMediaInputMode} blockValidation={ctx.blockValidation}
        recentUploadsForType={ctx.recentUploadsForType} availableQuizzes={ctx.availableQuizzes}
        quizOptions={ctx.quizOptions} availableSOPs={ctx.availableSOPs} sopOptions={ctx.sopOptions}
        uploading={ctx.uploading} handleFileUpload={ctx.handleFileUpload}
        showVideoMediaPicker={ctx.showVideoMediaPicker} setShowVideoMediaPicker={ctx.setShowVideoMediaPicker}
        showDocumentPicker={ctx.showDocumentPicker} setShowDocumentPicker={ctx.setShowDocumentPicker}
        handleSaveBlockToLibrary={ctx.handleSaveBlockToLibrary} saveContent={ctx.saveContent} isRTL={ctx.isRTL}
      />

      <TemplatePreviewDialog
        open={ctx.showTemplatePreview} onOpenChange={ctx.setShowTemplatePreview}
        selectedTemplate={ctx.selectedTemplate} templatePreset={ctx.templatePreset}
        templateStats={ctx.templateStats} requestApplyTemplate={ctx.requestApplyTemplate} isRTL={ctx.isRTL}
      />

      <TemplateApplyConfirmDialog
        open={ctx.showTemplateApplyConfirm} onOpenChange={ctx.setShowTemplateApplyConfirm}
        confirmApplyTemplate={ctx.confirmApplyTemplate} isRTL={ctx.isRTL}
      />

      <AIQuizDialog
        open={ctx.showAIDialog} onOpenChange={ctx.setShowAIDialog}
        aiPrefillTitle={ctx.aiPrefillTitle} aiPrefillContent={ctx.aiPrefillContent}
        aiTargetSectionId={ctx.aiTargetSectionId} setAiTargetSectionId={ctx.setAiTargetSectionId}
        setAiPrefillContent={ctx.setAiPrefillContent} setAiPrefillTitle={ctx.setAiPrefillTitle}
        moduleId={ctx.moduleId} title={ctx.title} passingScore={ctx.passingScore}
        activeSection={ctx.activeSection} sections={ctx.sections}
        setSections={ctx.setSections} setActiveSection={ctx.setActiveSection} isRTL={ctx.isRTL}
      />

      <SmartModuleWizard
        open={ctx.showSmartWizard} onOpenChange={ctx.setShowSmartWizard}
        onModuleCreated={(newId) => ctx.setCreatedModuleId(newId)}
      />

      {ctx.showKBSidebar && (
        <KBSidebarPanel
          moduleId={ctx.moduleId} title={ctx.title} activeSection={ctx.activeSection}
          sections={ctx.sections} setSections={ctx.setSections}
          contentBlocks={ctx.contentBlocks} setContentBlocks={ctx.setContentBlocks}
          availableSOPs={ctx.availableSOPs} availableQuizzes={ctx.availableQuizzes}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public export – wraps inner component with context provider
// ---------------------------------------------------------------------------

export function TrainingBuilder() {
  return (
    <TrainingBuilderProvider>
      <TrainingBuilderInner />
    </TrainingBuilderProvider>
  )
}

export default TrainingBuilder
