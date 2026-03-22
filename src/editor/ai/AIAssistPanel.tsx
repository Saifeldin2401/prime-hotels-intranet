import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { requestAISuggestion } from '@/editor/ai/aiClient'
import { resolveCommands } from '@/editor/ai/commands'
import type { AIAssistCommand, AIConfig, TextDirection } from '@/editor/types'
import { getSelectedContent } from '@/editor/utils/selection'
import { sanitizeHtml } from '@/lib/sanitize'
import type { Editor } from '@tiptap/react'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

interface AIAssistPanelProps {
  editor: Editor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  aiConfig?: AIConfig
  direction?: TextDirection
}

interface PendingReplacement {
  from: number
  to: number
  originalHtml: string
  suggestedHtml: string
  replaceAll?: boolean
}

export function AIAssistPanel({
  editor,
  open,
  onOpenChange,
  aiConfig,
  direction = 'ltr',
}: AIAssistPanelProps) {
  const commands = useMemo(() => resolveCommands(aiConfig?.commands), [aiConfig?.commands])
  const [commandId, setCommandId] = useState<AIAssistCommand['id']>('beautify')
  const [targetLanguage, setTargetLanguage] = useState('Arabic')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replacement, setReplacement] = useState<PendingReplacement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const activeCommand = commands.find((cmd) => cmd.id === commandId) || commands[0]

  const closePanel = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setError(null)
    setReplacement(null)
    setIsLoading(false)
    onOpenChange(false)
  }

  const runAssist = async () => {
    if (!editor || !activeCommand) return

    const selected = getSelectedContent(editor)
    const target =
      selected ||
      {
        from: 0,
        to: 0,
        html: editor.getHTML(),
        text: editor.getText(),
        replaceAll: true,
      }

    setError(null)
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await requestAISuggestion(
        {
          command: activeCommand,
          selectedHtml: target.html,
          selectedText: target.text,
          targetLanguage: activeCommand.needsTargetLanguage ? targetLanguage : undefined,
          model: aiConfig?.model || 'Qwen/Qwen2.5-7B-Instruct',
          temperature: aiConfig?.temperature ?? 0.4,
          maxOutputTokens: aiConfig?.maxOutputTokens ?? 800,
        },
        aiConfig,
        controller.signal,
      )

      setReplacement({
        from: target.from,
        to: target.to,
        originalHtml: target.html,
        suggestedHtml: result.html,
        replaceAll: (target as { replaceAll?: boolean }).replaceAll,
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError((err as Error).message || 'AI assist failed')
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }

  const acceptSuggestion = () => {
    if (!editor || !replacement) return

    if (replacement.replaceAll) {
      editor.chain().focus().setContent(replacement.suggestedHtml).run()
    } else {
      editor
        .chain()
        .focus()
        .insertContentAt({ from: replacement.from, to: replacement.to }, replacement.suggestedHtml)
        .run()
    }

    closePanel()
  }

  if (!open) return null

  return (
    <Card className="border-hotel-gold/30 shadow-lg" dir={direction}>
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-hotel-gold">
          <Sparkles className="h-4 w-4" />
          AI Assist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Command</Label>
            <Select value={commandId} onValueChange={(value) => setCommandId(value as AIAssistCommand['id'])}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select command" />
              </SelectTrigger>
              <SelectContent>
                {commands.map((command) => (
                  <SelectItem key={command.id} value={command.id}>
                    {command.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeCommand?.needsTargetLanguage && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Target Language</Label>
              <Input
                className="h-9"
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
                placeholder="Arabic"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            onClick={runAssist}
            disabled={isLoading || !editor}
            size="sm"
            className="gap-2 bg-hotel-gold text-white hover:bg-hotel-gold/90 h-9"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Generate Preview
          </Button>
          <Button variant="outline" size="sm" onClick={closePanel} className="h-9">
            Close
          </Button>
          <p className="text-[10px] text-muted-foreground flex-grow">
            Replaces selection, or processes entire document if nothing is selected.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {replacement && (
          <div className="grid gap-4 md:grid-cols-2 pt-2">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Current</Label>
              <InlineErrorBoundary>
                <div
                  className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 text-sm prose prose-sm max-w-none shadow-inner"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(replacement.originalHtml) }}
                />
              </InlineErrorBoundary>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-hotel-gold">AI Suggestion</Label>
              <InlineErrorBoundary>
                <div
                  className="max-h-64 overflow-auto rounded-lg border-emerald-500/30 bg-emerald-500/5 p-3 text-sm prose prose-sm max-w-none shadow-inner ring-1 ring-emerald-500/20"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(replacement.suggestedHtml) }}
                />
              </InlineErrorBoundary>
            </div>

            <div className="flex gap-2 md:col-span-2 pt-2 border-t border-hotel-gold/10">
              <Button size="sm" onClick={acceptSuggestion} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Accept Suggestion
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReplacement(null)}>
                Reject & Try Others
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AIAssistPanel
