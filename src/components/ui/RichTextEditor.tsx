/**
 * RichTextEditor - CKEditor 5 Wrapper Component
 * 
 * A reusable rich text editor component with:
 * - Full formatting toolbar (bold, italic, lists, headings, links, tables)
 * - Image upload support (Supabase Storage - public URL)
 * - RTL support for Arabic
 * - Controlled input with onChange callback
 */

import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    minHeight?: number
    disabled?: boolean
    direction?: 'ltr' | 'rtl'
}

// Supabase Storage Upload Adapter Factory
function SupabaseUploadAdapterPlugin(editor: any) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
        return new SupabaseUploadAdapter(loader)
    }
}

// Supabase Storage Upload Adapter
// Uploads images to the 'documents' bucket under knowledge-images/{userId}/
// and returns a permanent public URL — much more efficient than Base64.
class SupabaseUploadAdapter {
    loader: any
    abortController: AbortController

    constructor(loader: any) {
        this.loader = loader
        this.abortController = new AbortController()
    }

    async upload(): Promise<{ default: string }> {
        const file: File = await this.loader.file

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`Unsupported image type: ${file.type}. Please use JPEG, PNG, GIF, WebP, or SVG.`)
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
            throw new Error(`Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`)
        }

        // Get current user ID for the storage path (required by RLS)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('You must be logged in to upload images.')

        // Build a unique path: {userId}/knowledge-images/{timestamp}-{sanitized-name}
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const path = `${user.id}/knowledge-images/${Date.now()}-${safeName}`

        const { error } = await supabase.storage
            .from('documents')
            .upload(path, file, {
                contentType: file.type,
                upsert: false,
            })

        if (error) throw new Error(`Upload failed: ${error.message}`)

        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(path)

        return { default: publicUrl }
    }

    abort() {
        this.abortController.abort()
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

        // Smart Formatting & Autoformat Plugin Loaded
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

                /* AI-Generated Alert Boxes */
                .alert-important {
                    background: linear-gradient(135deg, #fef3c7, #fde68a);
                    border-left: 4px solid #f59e0b;
                    padding: 1rem 1.5rem;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                    color: #92400e;
                    font-weight: 500;
                    box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);
                }

                .alert-warning {
                    background: linear-gradient(135deg, #fef2f2, #fee2e2);
                    border-left: 4px solid #ef4444;
                    padding: 1rem 1.5rem;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                    color: #991b1b;
                    font-weight: 500;
                    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
                }

                .alert-note {
                    background: linear-gradient(135deg, #eff6ff, #dbeafe);
                    border-left: 4px solid #3b82f6;
                    padding: 1rem 1.5rem;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                    color: #1e40af;
                    font-weight: 500;
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
                }

                .alert-tip {
                    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
                    border-left: 4px solid #22c55e;
                    padding: 1rem 1.5rem;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                    color: #166534;
                    font-weight: 500;
                    box-shadow: 0 2px 4px rgba(34, 197, 94, 0.1);
                }

                /* Styled Tables */
                .styled-table {
                    border-collapse: separate;
                    border-spacing: 0;
                    margin: 1.5rem 0;
                    width: 100%;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border: 1px solid #e5e7eb;
                }

                .styled-table th {
                    background: linear-gradient(135deg, #1e40af, #3730a3);
                    color: white;
                    padding: 1rem;
                    font-weight: 600;
                    text-align: left;
                }

                .styled-table td {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid #e5e7eb;
                    background: white;
                }

                .styled-table tr:nth-child(even) td {
                    background-color: #f8fafc;
                }

                .styled-table tr:hover td {
                    background-color: #f1f5f9;
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
                /* Enhanced Styled Elements */
                .main-title {
                    color: #111827;
                    font-size: 2.5rem;
                    font-weight: 800;
                    border-bottom: 3px solid #e5e7eb;
                    padding-bottom: 0.5rem;
                    margin-top: 2rem;
                    margin-bottom: 1.5rem;
                }

                .section-title {
                    color: #1f2937;
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .subsection-title {
                    color: #374151;
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                }

                .minor-title {
                    color: #4b5563;
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-top: 1.25rem;
                    margin-bottom: 0.5rem;
                }

                .procedure-list {
                    counter-reset: procedure-counter;
                    list-style: none;
                    padding-left: 0;
                }

                .procedure-list li {
                    counter-increment: procedure-counter;
                    margin-bottom: 1rem;
                    position: relative;
                    padding-left: 2.5rem;
                }

                .procedure-list li::before {
                    content: counter(procedure-counter);
                    position: absolute;
                    left: 0;
                    font-weight: 600;
                    color: #1f2937;
                }

                .bullet-list {
                    list-style: none;
                    padding-left: 0;
                }

                .bullet-list li {
                    margin-bottom: 0.75rem;
                    position: relative;
                    padding-left: 1.5rem;
                }

                .bullet-list li::before {
                    content: "•";
                    position: absolute;
                    left: 0;
                    color: #1f2937;
                    font-weight: 600;
                }

                .hotel-quote {
                    border-left: 4px solid #d1d5db;
                    padding: 1rem 1.5rem;
                    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                    font-style: italic;
                    margin: 1.5rem 0;
                    border-radius: 0 0.5rem 0.5rem 0;
                    color: #475569;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    position: relative;
                }

                .hotel-quote::before {
                    content: """;
                    position: absolute;
                    left: -8px;
                    top: 0;
                    width: 20px;
                    height: 20px;
                    background: #d1d5db;
                    border-radius: 50%;
                }

                .section-divider {
                    border: none;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #d1d5db, transparent);
                    margin: 2rem 0;
                    border-radius: 1px;
                }

                .table-of-contents {
                    background: #f8fafc;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin: 1.5rem 0;
                }

                .table-of-contents h3 {
                    margin: 0 0 1rem 0;
                    font-size: 1.1rem;
                    color: #374151;
                }

                .table-of-contents ul {
                    list-style: none;
                    padding: 0;
                }

                .table-of-contents li {
                    margin-bottom: 0.5rem;
                }

                .table-of-contents a {
                    color: #1f2937;
                    text-decoration: none;
                    font-weight: 500;
                }

                .table-of-contents a:hover {
                    text-decoration: underline;
                }

                .emphasis-bold {
                    color: #1f2937;
                    font-weight: 700;
                }

                .emphasis-italic {
                    color: #6b7280;
                    font-style: italic;
                }

                .responsive-table {
                    border-collapse: separate;
                    border-spacing: 0;
                    margin: 1.5rem 0;
                    width: 100%;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border: 1px solid #e5e7eb;
                }

                .responsive-table th {
                    background: linear-gradient(135deg, #1e40af, #3730a3);
                    color: white;
                    padding: 1rem;
                    font-weight: 600;
                    text-align: left;
                }

                .responsive-table td {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid #e5e7eb;
                    background: white;
                }

                .responsive-table tr:nth-child(even) td {
                    background-color: #f8fafc;
                }

                .responsive-table tr:hover td {
                    background-color: #f1f5f9;
                }

                .alert-remember {
                    background: linear-gradient(135deg, #fef3c7, #fde68a);
                    border-left: 4px solid #f59e0b;
                    padding: 1rem 1.5rem;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                    color: #92400e;
                    font-weight: 500;
                    box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);
                }

                .ck.ck-content hr {
                    border: none;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #d1d5db, transparent);
                    margin: 2rem 0;
                    border-radius: 1px;
                }

                .ck.ck-content strong {
                    color: #1f2937;
                    font-weight: 600;
                }

                .ck.ck-content em {
                    color: #6b7280;
                    font-style: italic;
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
                    licenseKey: 'GPL',
                    placeholder,
                    language: direction === 'rtl' ? 'ar' : 'en',
                    extraPlugins: [SupabaseUploadAdapterPlugin],
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
