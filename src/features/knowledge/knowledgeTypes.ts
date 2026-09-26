import {
  BookOpen,
  ClipboardList,
  FileText,
  HelpCircle,
  ListChecks,
  PlayCircle,
  Scale,
  type LucideIcon,
} from 'lucide-react'

/** One colour and icon per kind of article, so readers can tell them apart at a glance. */
export interface KnowledgeTypeStyle {
  icon: LucideIcon
  /** Text colour for labels and icons. */
  text: string
  /** Soft background for chips and icon tiles. */
  soft: string
  /** Start border accent for rows and cards. */
  border: string
}

const STYLES: Record<string, KnowledgeTypeStyle> = {
  sop:       { icon: ClipboardList, text: 'text-ds-accent',  soft: 'bg-ds-accent-soft',  border: 'border-s-ds-accent' },
  guide:     { icon: BookOpen,      text: 'text-ds-success', soft: 'bg-ds-success-soft', border: 'border-s-ds-success' },
  policy:    { icon: Scale,         text: 'text-ds-warning', soft: 'bg-ds-warning-soft', border: 'border-s-ds-warning' },
  checklist: { icon: ListChecks,    text: 'text-ds-info',    soft: 'bg-ds-info-soft',    border: 'border-s-ds-info' },
  faq:       { icon: HelpCircle,    text: 'text-ds-brass',   soft: 'bg-ds-brass/15',     border: 'border-s-ds-brass' },
  video:     { icon: PlayCircle,    text: 'text-ds-danger',  soft: 'bg-ds-danger-soft',  border: 'border-s-ds-danger' },
}

const FALLBACK: KnowledgeTypeStyle = { icon: FileText, text: 'text-ds-muted', soft: 'bg-ds-surface-subtle', border: 'border-s-ds-border-strong' }

export function knowledgeTypeStyle(contentType?: string | null): KnowledgeTypeStyle {
  return STYLES[(contentType ?? '').toLowerCase()] ?? FALLBACK
}
