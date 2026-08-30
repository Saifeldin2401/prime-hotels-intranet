import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Sparkles,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react'
import {
  documentIngestionEngine,
  type IngestionResult,
} from '@/lib/ai/documentIngestionEngine'
import type { CourseBlueprint } from '@/lib/ai/courseEngine'
import { cn } from '@/lib/utils'

interface DocumentCourseIngestionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCourseGenerated: (blueprint: CourseBlueprint) => void
}

export function DocumentCourseIngestionModal({
  open,
  onOpenChange,
  onCourseGenerated,
}: DocumentCourseIngestionModalProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'

  const [documentText, setDocumentText] = useState('')
  const [fileName, setFileName] = useState('')
  const [targetDepartment, setTargetDepartment] = useState('Front Office')
  const [targetLevel, setTargetLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [isProcessing, setIsProcessing] = useState(false)
  const [ingestionResult, setIngestionResult] = useState<IngestionResult | null>(null)

  const [fileExtractError, setFileExtractError] = useState<string | null>(null)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setFileExtractError(null)
    setDocumentText('')
    try {
      const { extractTextFromFile } = await import('@/lib/documentText')
      const { text } = await extractTextFromFile(file, 40000)
      setDocumentText(text)
    } catch (err) {
      setFileExtractError((err as Error).message)
    }
  }

  const handleIngest = async () => {
    if (!documentText.trim()) return
    setIsProcessing(true)

    try {
      const result = await documentIngestionEngine.ingestDocument({
        documentText,
        fileName: fileName || 'Uploaded Hotel Manual',
        targetDepartment,
        targetLevel,
        targetLanguage: isRTL ? 'ar' : 'en',
      })
      setIngestionResult(result)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApplyToStudio = () => {
    if (ingestionResult?.blueprint) {
      onCourseGenerated(ingestionResult.blueprint)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-950">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <span>{t('docIngestion.title', 'Multimodal Document-to-Course Ingestion')}</span>
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
                  AI OCR & Vision
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t('docIngestion.desc', 'Upload brand standard manuals, PDF policies, or SOP sheets. AI extracts structured lesson modules and quizzes.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {!ingestionResult ? (
            <>
              {/* File Upload / Drag Zone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('docIngestion.uploadLabel', 'Upload Document (PDF, DOCX, TXT, Markdown)')}
                </Label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:border-purple-400 transition-colors bg-slate-50/50 dark:bg-slate-900/50">
                  <FileText className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {fileName || t('docIngestion.dragPrompt', 'Click to browse or drag & drop hotel SOP manual')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Reads PDF, Word (.docx), text, markdown &amp; CSV — the actual document text is extracted and fed to the AI
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md,.json,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="doc-ingestion-input"
                  />
                  <label htmlFor="doc-ingestion-input">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 text-xs h-7 pointer-events-none"
                    >
                      {fileName ? t('docIngestion.changeFile', 'Change File') : t('docIngestion.selectFile', 'Select File')}
                    </Button>
                  </label>
                  {fileExtractError && (
                    <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">{fileExtractError}</p>
                  )}
                  {fileName && !fileExtractError && documentText && (
                    <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                      {documentText.split(/\s+/).filter(Boolean).length.toLocaleString()} words extracted
                    </p>
                  )}
                </div>
              </div>

              {/* Direct Paste Fallback */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('docIngestion.pasteLabel', 'Or Paste Document Text Directly')}
                </Label>
                <Textarea
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  placeholder={
                    isRTL
                      ? 'الصق نص السياسة، دليل التشغيل، أو إجراءات العمل القياسية هنا...'
                      : 'Paste hotel brand standard text, SOP guidelines, or onboarding notes here...'
                  }
                  className="text-xs h-28 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Ingestion Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t('docIngestion.department', 'Target Department')}</Label>
                  <Select value={targetDepartment} onValueChange={setTargetDepartment}>
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Front Office">Front Office & Concierge</SelectItem>
                      <SelectItem value="Food and Beverage">Food & Beverage (Culinary/Service)</SelectItem>
                      <SelectItem value="Housekeeping">Housekeeping & Laundry</SelectItem>
                      <SelectItem value="Security and Safety">Security, Safety & Fire Defense</SelectItem>
                      <SelectItem value="Management">Hotel Executive Leadership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t('docIngestion.level', 'Learner Level')}</Label>
                  <Select value={targetLevel} onValueChange={(v: any) => setTargetLevel(v)}>
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Foundational / Onboarding</SelectItem>
                      <SelectItem value="intermediate">Operational Standard</SelectItem>
                      <SelectItem value="advanced">five-star Mastery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            /* Ingestion Success Review Screen */
            <div className="space-y-4">
              <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {ingestionResult.blueprint.title}
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isRTL ? ingestionResult.summaryAr : ingestionResult.summary}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-[10px] bg-white">
                    {ingestionResult.wordCount} words parsed
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    ⏱️ ~{ingestionResult.estimatedReadingMinutes} min course
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    {ingestionResult.blueprint.sections.length} module sections
                  </Badge>
                </div>
              </div>

              {/* Extracted Topics */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('docIngestion.topicsExtracted', 'Synthesized Learning Modules & Topics')}:
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {ingestionResult.extractedTopics.map((topic, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Sections Preview List */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('docIngestion.sectionsPreview', 'Curriculum Outline Preview')}:
                </Label>
                <div className="space-y-2">
                  {ingestionResult.blueprint.sections.map((sec, idx) => (
                    <div
                      key={sec.id || idx}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{sec.title}</p>
                          <p className="text-[10px] text-muted-foreground">{sec.lessons.length} lesson(s) with checkpoint quiz</p>
                        </div>
                      </div>
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel', 'Cancel')}
          </Button>

          {!ingestionResult ? (
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm"
              disabled={isProcessing || !documentText.trim()}
              onClick={handleIngest}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isProcessing ? t('docIngestion.synthesizing', 'Extracting Course...') : t('docIngestion.generate', 'Synthesize Course from Document')}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm"
              onClick={handleApplyToStudio}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('docIngestion.openInStudio', 'Load Blueprint in Course Studio')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
