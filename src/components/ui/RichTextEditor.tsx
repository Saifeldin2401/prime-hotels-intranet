/**
 * RichTextEditor - CKEditor 5 Wrapper Component
 * 
 * A reusable rich text editor component with:
 * - Full formatting toolbar (bold, italic, lists, headings, links, tables)
 * - Image upload support (Base64 embedded)
 * - RTL support for Arabic
 * - Controlled input with onChange callback
 */

import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    minHeight?: number
    disabled?: boolean
    direction?: 'ltr' | 'rtl'
}

// Base64 Upload Adapter Factory
function Base64UploadAdapterPlugin(editor: any) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
        return new Base64UploadAdapter(loader)
    }
}

// Base64 Upload Adapter class
class Base64UploadAdapter {
    loader: any

    constructor(loader: any) {
        this.loader = loader
    }

    upload() {
        return this.loader.file.then((file: File) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()

                reader.onload = () => {
                    resolve({ default: reader.result as string })
                }

                reader.onerror = (error) => {
                    reject(error)
                }

                reader.readAsDataURL(file)
            })
        })
    }

    abort() {
        // No abort logic needed for synchronous Base64 conversion
    }
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = 'Start typing your content here...',
    className,
    minHeight = 300,
    disabled = false,
    direction = 'ltr'
}: RichTextEditorProps) {
    return (
        <div className={cn('rich-text-editor', className)} dir={direction}>
            <style>{`
                .ck-editor__editable {
                    min-height: ${minHeight}px !important;
                }
                .ck-editor__editable:focus {
                    border-color: hsl(var(--ring)) !important;
                }
                .ck.ck-editor__main>.ck-editor__editable {
                    background: white;
                }
                .ck.ck-toolbar {
                    background: hsl(var(--muted)) !important;
                    border-color: hsl(var(--border)) !important;
                }
                .ck.ck-editor {
                    border-radius: var(--radius) !important;
                    overflow: hidden;
                }
                .ck.ck-content {
                    font-family: inherit;
                }
                .ck.ck-content h1 {
                    font-size: 2em;
                    font-weight: bold;
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                }
                .ck.ck-content h2 {
                    font-size: 1.5em;
                    font-weight: bold;
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                }
                .ck.ck-content h3 {
                    font-size: 1.25em;
                    font-weight: bold;
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                }
                .ck.ck-content p {
                    margin-bottom: 0.75em;
                }
                .ck.ck-content ul,
                .ck.ck-content ol {
                    padding-left: 1.5em;
                    margin-bottom: 1em;
                }
                .ck.ck-content blockquote {
                    border-left: 4px solid hsl(var(--border));
                    padding-left: 1em;
                    font-style: italic;
                    margin: 1em 0;
                }
                .ck.ck-content a {
                    color: hsl(var(--primary));
                    text-decoration: underline;
                }
                .ck.ck-content table {
                    border-collapse: collapse;
                    margin: 1em 0;
                    width: 100%;
                }
                .ck.ck-content table td,
                .ck.ck-content table th {
                    border: 1px solid hsl(var(--border));
                    padding: 0.5em;
                }
                .ck.ck-content table th {
                    background: hsl(var(--muted));
                    font-weight: bold;
                }
                .ck.ck-content img {
                    max-width: 100%;
                    height: auto;
                }
                .ck.ck-content figure.image {
                    margin: 1em 0;
                }
            `}</style>
            <CKEditor
                editor={ClassicEditor}
                data={value}
                disabled={disabled}
                config={{
                    placeholder,
                    language: direction === 'rtl' ? 'ar' : 'en',
                    extraPlugins: [Base64UploadAdapterPlugin],
                    toolbar: [
                        'heading',
                        '|',
                        'bold',
                        'italic',
                        'link',
                        '|',
                        'bulletedList',
                        'numberedList',
                        '|',
                        'blockQuote',
                        'insertTable',
                        '|',
                        'imageUpload',
                        '|',
                        'undo',
                        'redo'
                    ],
                    heading: {
                        options: [
                            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
                        ]
                    },
                    table: {
                        contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
                    }
                }}
                onChange={(_event, editor) => {
                    const data = editor.getData()
                    onChange(data)
                }}
            />
        </div>
    )
}

export default RichTextEditor
