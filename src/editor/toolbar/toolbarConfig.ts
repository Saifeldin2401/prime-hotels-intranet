import type { RichEditorToolbarConfig } from '@/editor/types'

export const DEFAULT_TOOLBAR_CONFIG: RichEditorToolbarConfig = {
  features: {
    history: true,
    headings: true,
    formatting: true,
    lists: true,
    alignment: true,
    links: true,
    media: true,
    tables: true,
    codeBlock: true,
    clearFormatting: true,
    copyActions: true,
    fullscreen: true,
    aiAssist: true,
  },
}

export function mergeToolbarConfig(
  input?: Partial<RichEditorToolbarConfig>,
): RichEditorToolbarConfig {
  if (!input) {
    return DEFAULT_TOOLBAR_CONFIG
  }

  return {
    ...DEFAULT_TOOLBAR_CONFIG,
    ...input,
    features: {
      ...DEFAULT_TOOLBAR_CONFIG.features,
      ...(input.features || {}),
    },
  }
}
