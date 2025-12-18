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

// Custom Smart Formatting logic moved to onReady for stability
const setupSmartFormatting = (editor: any) => {
    try {
        const schema = editor.model.schema;

        // 1. Defensively extend schema if items are registered
        const items = ['paragraph', 'heading1', 'heading2', 'heading3', 'listItem'];
        items.forEach(item => {
            if (schema.isRegistered(item)) {
                schema.extend(item, { allowAttributes: ['alertType', 'direction'] });
            }
        });

        // 2. Add Converters
        editor.conversion.attributeToAttribute({
            model: 'alertType',
            view: (val: string) => ({ key: 'class', value: `smart-alert smart-alert-${val}` })
        });

        editor.conversion.attributeToAttribute({
            model: 'direction',
            view: 'dir'
        });

        // 3. Document Change Listener
        editor.model.document.on('change:data', () => {
            editor.model.change((writer: any) => {
                const changes = editor.model.document.differ.getChanges();
                for (const entry of changes) {
                    if (entry.type === 'insert' && entry.name === '$text') {
                        const block = entry.position.parent;
                        if (!block || !block.is('element')) continue;

                        const text = block.getChild(0)?.data || '';
                        if (!text) continue;

                        // RTL Detection
                        const isArabic = /[\u0600-\u06FF]/.test(text);
                        const currentDir = block.getAttribute('direction');

                        if (isArabic && currentDir !== 'rtl') {
                            writer.setAttribute('direction', 'rtl', block);
                        } else if (!isArabic && isArabic === false && currentDir === 'rtl') {
                            // Only remove if we are sure it's not Arabic (simple check)
                            // We prefer to keep RTL if mixed, but strictly LTR requires removal
                            writer.removeAttribute('direction', block);
                        }

                        // Auto-Formatting (Headers & Alerts)
                        if (block.is('element', 'paragraph') || block.is('element', 'listItem')) {
                            // Markdown List Detection (1. or -)
                            // Note: CKEditor Autoformat usually handles this, but custom handling ensures it works for pasted text
                            if (/^\d+\.\s/.test(text)) {
                                // We can't easily change to list here without complex writer ops, 
                                // but we can auto-bold the start if it looks like a list item title
                                // e.g. "1. **Title**" -> "1. Title" (Bold)
                            }

                            if (/^(SOP:|Policy:|Guide:)/i.test(text)) {
                                writer.rename(block, 'heading1');
                            } else if (/^(Purpose|Scope|Responsibilities|Procedure|Steps|Checklist|Important|Warning):/i.test(text)) {
                                writer.rename(block, 'heading2');
                            } else {
                                const alertMatch = text.match(/^(IMPORTANT|WARNING|NOTE|CAUTION):/i);
                                if (alertMatch) {
                                    writer.setAttribute('alertType', alertMatch[1].toLowerCase(), block);
                                }
                            }
                        }
                    }
                }
            });
        });

        console.log('Smart Formatting & Autoformat Plugin Loaded');
    } catch (err) {
        console.error('Smart formatting setup failed:', err);
    }
};

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
                    padding: 1.5rem !important;
                }
                .ck-editor__editable:focus {
                    border-color: hsl(var(--ring)) !important;
                }
                .ck.ck-editor__main>.ck-editor__editable {
                    background: white;
                    color: #1a1a1a;
                    line-height: 1.6;
                }
                .ck.ck-toolbar {
                    background: hsl(var(--muted)) !important;
                    border-color: hsl(var(--border)) !important;
                }
                .ck.ck-editor {
                    border-radius: var(--radius) !important;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .ck.ck-content {
                    font-family: 'Inter', system-ui, sans-serif;
                }
                
                /* RTL Support */
                .ck[dir="rtl"] .ck-content,
                .ck.ck-content [dir="rtl"] {
                    text-align: right;
                    direction: rtl;
                    font-family: 'Noto Sans Arabic', system-ui, sans-serif;
                    line-height: 1.8;
                }

                /* Structured Headings */
                .ck.ck-content h1 {
                    font-size: 2.25rem;
                    font-weight: 800;
                    color: #111827;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 0.5rem;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                }
                .ck.ck-content h2 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .ck.ck-content h3 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #374151;
                    margin-top: 1.25rem;
                    margin-bottom: 0.5rem;
                }

                /* Smart Alerts */
                .smart-alert {
                    padding: 1.25rem;
                    border-radius: 0.5rem;
                    margin: 1.5rem 0;
                    border-left: 4px solid transparent;
                    font-size: 0.95rem;
                }
                .smart-alert-important {
                    background-color: #fefce8;
                    border-color: #eab308;
                    color: #854d0e;
                }
                .smart-alert-warning {
                    background-color: #fef2f2;
                    border-color: #ef4444;
                    color: #b91c1c;
                }
                .smart-alert-note {
                    background-color: #eff6ff;
                    border-color: #3b82f6;
                    color: #1e40af;
                }
                .smart-alert-caution {
                    background-color: #fff7ed;
                    border-color: #f97316;
                    color: #9a3412;
                }

                .ck.ck-content p {
                    margin-bottom: 1rem;
                }
                .ck.ck-content ul,
                .ck.ck-content ol {
                    padding-inline-start: 1.5rem;
                    margin-bottom: 1.25rem;
                }
                .ck.ck-content li {
                    margin-bottom: 0.5rem;
                }
                .ck.ck-content blockquote {
                    border-left: 4px solid #d1d5db;
                    padding: 0.5rem 1rem;
                    background: #f9fafb;
                    font-style: italic;
                    margin: 1.5rem 0;
                    border-radius: 0 0.5rem 0.5rem 0;
                }
                .ck.ck-content a {
                    color: #2563eb;
                    text-decoration: none;
                    font-weight: 500;
                }
                .ck.ck-content a:hover {
                    text-decoration: underline;
                }
                .ck.ck-content table {
                    border-collapse: separate;
                    border-spacing: 0;
                    margin: 1.5rem 0;
                    width: 100%;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    overflow: hidden;
                }
                .ck.ck-content table td,
                .ck.ck-content table th {
                    border: 1px solid #e5e7eb;
                    padding: 0.75rem 1rem;
                }
                .ck.ck-content table th {
                    background: #f8fafc;
                    font-weight: 600;
                    color: #475569;
                    text-align: left;
                }
                .ck.ck-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.5rem;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }
            `}</style>
            <CKEditor
                editor={ClassicEditor as any}
                data={value}
                disabled={disabled}
                onReady={setupSmartFormatting}
                config={{
                    placeholder,
                    language: direction === 'rtl' ? 'ar' : 'en',
                    extraPlugins: [Base64UploadAdapterPlugin],
                    toolbar: {
                        items: [
                            'heading',
                            '|',
                            'bold',
                            'italic',
                            'link',
                            '|',
                            'bulletedList',
                            'numberedList',
                            '|',
                            'outdent',
                            'indent',
                            '|',
                            'blockQuote',
                            'insertTable',
                            '|',
                            'imageUpload',
                            'mediaEmbed',
                            '|',
                            'undo',
                            'redo'
                        ],
                        shouldNotGroupWhenFull: true
                    },
                    heading: {
                        options: [
                            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                            { model: 'heading1', view: 'h1', title: 'Main Title (SOP)', class: 'ck-heading_heading1' },
                            { model: 'heading2', view: 'h2', title: 'Section (Purpose)', class: 'ck-heading_heading2' },
                            { model: 'heading3', view: 'h3', title: 'Subsection', class: 'ck-heading_heading3' }
                        ]
                    },
                    table: {
                        contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties']
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
