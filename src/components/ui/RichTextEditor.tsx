import CustomRichTextEditor from '@/editor/components/CustomRichTextEditor'
import type { RichTextEditorProps } from '@/editor/types'

export function RichTextEditor(props: RichTextEditorProps) {
  return <CustomRichTextEditor {...props} />
}

export default RichTextEditor
