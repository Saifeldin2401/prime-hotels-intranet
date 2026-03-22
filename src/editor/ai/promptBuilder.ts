import type { AIRequestPayload } from '@/editor/types';
import { AI_HTML_OUTPUT_REQUIREMENTS, AI_HTML_SYSTEM_PROMPT } from '@/lib/aiHtml';

export function buildAIPrompt(payload: AIRequestPayload): { system: string; user: string } {
  const translationSuffix =
    payload.command.id === 'translate' && payload.targetLanguage
      ? ` Translate to ${payload.targetLanguage}.`
      : ''

  const system = [
    AI_HTML_SYSTEM_PROMPT,
    AI_HTML_OUTPUT_REQUIREMENTS,
    'Always use predefined classes where relevant: ai-title, ai-section, ai-highlight-box, ai-warning-box, ai-info-box, ai-tip-box, ai-table, ai-quote, ai-divider.',
    'Preserve existing structure and approved classes when already present.',
    'Only transform the selected fragment unless task explicitly asks to create new content.',
  ].join(' ')

  const user = [
    `Task: ${payload.command.instruction}${translationSuffix}`,
    'Rules:',
    '- Keep semantic structure intact and editable.',
    '- Maintain compliance/safety meaning.',
    '- Return clean semantic HTML only.',
    '- Use <article>/<section> structure when creating new article-like content.',
    '- No markdown, no JSON, no wrapper commentary.',
    'Selected HTML fragment:',
    payload.selectedHtml,
  ].join('\n')

  return { system, user }
}
