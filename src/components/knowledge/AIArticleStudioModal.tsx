/**
 * AI Article Studio Modal
 * 
 * Interactive Multi-Agent Studio for generating 5-star hotel SOPs, Policies, Checklists, and FAQs.
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen,
  CheckCircle2,
  FileCheck,
  FileCode,
  FileQuestion,
  FileText,
  Globe,
  HelpCircle,
  Layers,
  ListOrdered,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { knowledgeArticleOrchestrator } from '@/lib/ai/agents/knowledgeBase/knowledgeArticleOrchestrator'
import type {
  GeneratedKnowledgeArticle,
  KnowledgeArticleGenerationConfig,
  KnowledgePipelineProgressEvent,
} from '@/lib/ai/agents/knowledgeBase/types'
import type { KnowledgeContentType } from '@/types/knowledge'

interface AIArticleStudioModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyArticle: (article: GeneratedKnowledgeArticle) => void
  defaultContentType?: KnowledgeContentType
  defaultDepartment?: string
}

export function AIArticleStudioModal({
  isOpen,
  onClose,
  onApplyArticle,
  defaultContentType = 'sop',
  defaultDepartment = 'Front Office',
}: AIArticleStudioModalProps) {
  const { t, i18n } = useTranslation('knowledge')
  const isRTL = i18n.dir() === 'rtl'

  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<KnowledgeContentType>(defaultContentType)
  const [department, setDepartment] = useState(defaultDepartment)
  const [targetAudience, setTargetAudience] = useState('Frontline Staff & Shift Supervisors')
  const [sourceNotes, setSourceNotes] = useState('')
  const [preferredModel, setPreferredModel] = useState('gemini-2.5-flash')

  // Execution state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progressEvent, setProgressEvent] = useState<KnowledgePipelineProgressEvent | null>(null)
  const [generatedResult, setGeneratedResult] = useState<GeneratedKnowledgeArticle | null>(null)
  const [previewTab, setPreviewTab] = useState<'english' | 'arabic' | 'checklist' | 'faq'>('english')

  const handleGenerate = async () => {
    if (!title.trim()) return

    setIsGenerating(true)
    setProgressEvent(null)
    setGeneratedResult(null)

    try {
      const config: KnowledgeArticleGenerationConfig = {
        title: title.trim(),
        contentType,
        department,
        targetAudience,
        sourceDocumentText: sourceNotes.trim() || undefined,
        preferredModel,
      }

      const result = await knowledgeArticleOrchestrator.orchestrate(config, (event) => {
        setProgressEvent(event)
      })

      setGeneratedResult(result)
    } catch (err) {
      console.error('Knowledge article generation failed:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = () => {
    if (generatedResult) {
      onApplyArticle(generatedResult)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isGenerating && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-5 border-b bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>AI Knowledge & SOP Studio</span>
                  <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    Multi-Agent Orchestrated
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Synthesize 5-star hotel Standard Operating Procedures (SOPs), Corporate Policies, Checklists, and FAQs with automatic KSA regulatory audit.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!generatedResult && !isGenerating && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Document Title / Operational Subject *</Label>
                  <Input
                    placeholder="e.g. VIP Express Arrival & Suite Orientation Standard"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Content Type</Label>
                  <Select value={contentType} onValueChange={(val: any) => setContentType(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sop">Standard Operating Procedure (SOP)</SelectItem>
                      <SelectItem value="policy">Corporate & Hotel Policy</SelectItem>
                      <SelectItem value="checklist">Operational Checklist</SelectItem>
                      <SelectItem value="faq">FAQ Question Database</SelectItem>
                      <SelectItem value="guide">Operational Guide / Manual</SelectItem>
                      <SelectItem value="reference">Quick Action Reference Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Department Scope</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Front Office">Front Office & Concierge</SelectItem>
                      <SelectItem value="Housekeeping">Housekeeping & Laundry</SelectItem>
                      <SelectItem value="Food & Beverage">Food & Beverage Service</SelectItem>
                      <SelectItem value="Culinary & Kitchen">Culinary & Kitchen (HACCP)</SelectItem>
                      <SelectItem value="Engineering">Engineering & Safety</SelectItem>
                      <SelectItem value="Human Resources">Human Resources & Talent</SelectItem>
                      <SelectItem value="Finance">Finance & Purchasing</SelectItem>
                      <SelectItem value="Security & Safety">Security & Civil Defense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Target Audience / Employee Level</Label>
                  <Input
                    placeholder="e.g. Front Desk Agents, Duty Managers, and Butler Team"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Source Notes / Operational Directives (Optional)</Label>
                  <Textarea
                    placeholder="Paste rough procedures, time benchmarks, or specific hotel brand requirements to incorporate..."
                    value={sourceNotes}
                    onChange={(e) => setSourceNotes(e.target.value)}
                    className="text-xs min-h-[90px]"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-foreground">AI Model Intelligence Router:</span>
                  <span className="text-muted-foreground">Free Google Gemini Flash + Groq Sovereign Arabic first</span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  $0.00 / Free Tier
                </Badge>
              </div>
            </div>
          )}

          {/* Live Progress View */}
          {isGenerating && (
            <div className="py-12 px-6 text-center space-y-6 max-w-lg mx-auto">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-foreground">
                  {progressEvent?.agentName || 'Multi-Agent Knowledge Orchestrator'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {progressEvent?.detail || 'Coordinating research, drafting, translation, and KSA compliance audit...'}
                </p>
              </div>

              <div className="space-y-1">
                <Progress value={progressEvent?.progressPercentage || 25} className="h-2.5" />
                <p className="text-[11px] text-muted-foreground font-mono text-end">
                  {progressEvent?.progressPercentage || 25}%
                </p>
              </div>
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedResult && !isGenerating && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {generatedResult.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {generatedResult.sop_code ? `${generatedResult.sop_code} • ` : ''}
                      Est. Read Time: ~{generatedResult.estimated_read_time_minutes} mins
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 me-1" />
                    KSA Compliance: {generatedResult.compliance_score}/100
                  </Badge>
                </div>
              </div>

              {/* Preview Tabs */}
              <Tabs value={previewTab} onValueChange={(val: any) => setPreviewTab(val)} className="w-full">
                <TabsList className="grid grid-cols-4 w-full h-9">
                  <TabsTrigger value="english" className="text-xs">
                    <FileText className="w-3.5 h-3.5 me-1.5" /> English SOP
                  </TabsTrigger>
                  <TabsTrigger value="arabic" className="text-xs">
                    <Globe className="w-3.5 h-3.5 me-1.5" /> Arabic SOP
                  </TabsTrigger>
                  <TabsTrigger value="checklist" className="text-xs" disabled={!generatedResult.checklist_items?.length}>
                    <FileCheck className="w-3.5 h-3.5 me-1.5" /> Checklist ({generatedResult.checklist_items?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="faq" className="text-xs" disabled={!generatedResult.faq_items?.length}>
                    <FileQuestion className="w-3.5 h-3.5 me-1.5" /> FAQ ({generatedResult.faq_items?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="english" className="mt-3">
                  <div className="p-4 rounded-xl border bg-card max-h-[340px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none text-start"
                    dangerouslySetInnerHTML={{ __html: generatedResult.content_html }}
                  />
                </TabsContent>

                <TabsContent value="arabic" className="mt-3">
                  <div className="p-4 rounded-xl border bg-card max-h-[340px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none text-start" dir="rtl"
                    dangerouslySetInnerHTML={{ __html: generatedResult.content_html_ar }}
                  />
                </TabsContent>

                <TabsContent value="checklist" className="mt-3 space-y-2 max-h-[340px] overflow-y-auto">
                  {generatedResult.checklist_items?.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 rounded-lg border bg-card flex items-center justify-between text-xs text-start">
                      <div>
                        <p className="font-semibold text-foreground">{item.text}</p>
                        <p className="text-muted-foreground text-[11px]" dir="rtl">{item.text_ar}</p>
                      </div>
                      {item.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="faq" className="mt-3 space-y-2 max-h-[340px] overflow-y-auto">
                  {generatedResult.faq_items?.map((faq, idx) => (
                    <div key={faq.id || idx} className="p-3 rounded-lg border bg-card space-y-1.5 text-xs text-start">
                      <p className="font-bold text-foreground">Q: {faq.question}</p>
                      <p className="text-muted-foreground">A: {faq.answer}</p>
                      <p className="font-bold text-purple-700 dark:text-purple-300 pt-1" dir="rtl">س: {faq.question_ar}</p>
                      <p className="text-muted-foreground text-[11px]" dir="rtl">ج: {faq.answer_ar}</p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between gap-2">
          {!generatedResult ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isGenerating}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!title.trim() || isGenerating}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 me-1.5 animate-spin" />
                    Synthesizing Article...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 me-1.5" />
                    Generate with Multi-Agent Studio
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGeneratedResult(null)}
              >
                Regenerate / Edit Settings
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <CheckCircle2 className="w-4 h-4 me-1.5" />
                Apply to Knowledge Article
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
