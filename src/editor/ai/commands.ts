import type { AIAssistCommand } from '@/editor/types'

export const DEFAULT_AI_COMMANDS: AIAssistCommand[] = [
  {
    id: 'beautify',
    label: 'Beautify (Default)',
    instruction: 'Polish this content into a premium corporate article using standard ai-article structure.',
  },
  {
    id: 'beautify_modern',
    label: 'Beautify: Modern Newsletter',
    instruction: 'Transform into a modern, bold newsletter style using <article class="ai-article theme-modern">. Use centered titles and Outfit font.',
  },
  {
    id: 'beautify_report',
    label: 'Beautify: Elegant Report',
    instruction: 'Transform into a classic, elegant report style using <article class="ai-article theme-report">. Use Serif fonts and double borders.',
  },
  {
    id: 'clarity',
    label: 'Improve Clarity',
    instruction: 'Improve clarity and readability while preserving the original intent.',
  },
  {
    id: 'grammar',
    label: 'Fix Grammar',
    instruction: 'Fix grammar, punctuation, and spelling while preserving meaning and structure.',
  },
  {
    id: 'professional',
    label: 'Make Professional',
    instruction: 'Rewrite in a professional tone suitable for SOP and corporate documentation.',
  },
  {
    id: 'simplify',
    label: 'Simplify',
    instruction: 'Simplify language to make it easier to understand for all staff levels.',
  },
  {
    id: 'expand',
    label: 'Expand',
    instruction: 'Expand with concise detail and context while keeping the original structure and returning semantic HTML.',
  },
  {
    id: 'create_article',
    label: 'Create Article',
    instruction:
      'Create a complete premium-style article in semantic HTML using sectioned structure and predefined ai-* classes.',
  },
  {
    id: 'blog_post',
    label: 'Rewrite as Blog Post',
    instruction:
      'Rewrite this as a polished corporate blog post in semantic HTML with engaging flow and predefined ai-* classes.',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    instruction: 'Summarize the selected content into a concise version while preserving key points.',
  },
  {
    id: 'translate',
    label: 'Translate',
    instruction: 'Translate the selected content to the target language while preserving formatting and structure.',
    needsTargetLanguage: true,
  },
]

export function resolveCommands(input?: AIAssistCommand[]): AIAssistCommand[] {
  return input?.length ? input : DEFAULT_AI_COMMANDS
}
