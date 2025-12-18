import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link, FileText, Image, Video, FileQuestion, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ContentBlock {
    id: string
    type: string
    title: string
    content: string
    content_url: string
    content_data?: Record<string, unknown>
    is_mandatory: boolean
    duration?: number
    points?: number
}

interface TrainingSection {
    id: string
    title: string
    description?: string
    items: ContentBlock[] // Compatible with TrainingBuilder's ContentBlockForm
}

interface BuilderPreviewProps {
    title: string
    description: string
    sections: TrainingSection[]
}

export const BuilderPreview = ({ title, description, sections }: BuilderPreviewProps) => {
    const { t } = useTranslation('training')

    return (
        <div className="flex-1 p-6 bg-slate-50/30 overflow-y-auto min-h-[calc(100vh-4rem)]">
            <div className="max-w-4xl mx-auto">
                <Card className="animate-fade-in border-t-4 border-t-hotel-navy shadow-md">
                    <CardHeader className="bg-white border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl font-bold text-hotel-navy">{t('preview')}</CardTitle>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Draft Mode</div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="prose max-w-none dark:prose-invert">
                            <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
                            <p className="text-lg text-gray-600 mb-10 leading-relaxed">{description}</p>

                            {sections.map((section) => (
                                <div key={section.id} className="mb-10 p-6 bg-slate-50/50 rounded-xl border border-slate-100">
                                    <h2 className="text-2xl font-bold mb-3 text-hotel-navy flex items-center">
                                        <span className="w-2 h-8 bg-hotel-gold rounded-full mr-3"></span>
                                        {section.title}
                                    </h2>
                                    {section.description && <p className="text-gray-600 mb-6 pl-5">{section.description}</p>}

                                    <div className="space-y-6 mt-6">
                                        {section.items.map((item) => (
                                            <div key={item.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                                <div className="flex items-start gap-4">
                                                    <div className="mt-1 p-2 bg-slate-100 rounded-lg text-slate-500">
                                                        {item.type === 'video' && <Video className="w-5 h-5" />}
                                                        {item.type === 'image' && <Image className="w-5 h-5" />}
                                                        {item.type === 'text' && <FileText className="w-5 h-5" />}
                                                        {item.type === 'document_link' && <Link className="w-5 h-5" />}
                                                        {item.type === 'quiz' && <FileQuestion className="w-5 h-5" />}
                                                        {item.type === 'sop_reference' && <BookOpen className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-semibold mb-2 text-gray-900">{item.title}</h3>
                                                        {item.content && (
                                                            <div
                                                                dangerouslySetInnerHTML={{ __html: item.content }}
                                                                className="mb-4 text-gray-600 prose-sm"
                                                            />
                                                        )}

                                                        {item.type === 'video' && item.content_url && (
                                                            <div className="aspect-video rounded-lg overflow-hidden bg-black shadow-inner mt-4">
                                                                <iframe
                                                                    src={item.content_url}
                                                                    className="w-full h-full"
                                                                    allowFullScreen
                                                                    title={item.title}
                                                                />
                                                            </div>
                                                        )}

                                                        {item.type === 'image' && item.content_url && (
                                                            <img
                                                                src={item.content_url}
                                                                alt={item.title}
                                                                className="max-w-full rounded-lg shadow-md mt-4 border"
                                                            />
                                                        )}

                                                        {item.type === 'document_link' && item.content_url && (
                                                            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3">
                                                                <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm">
                                                                    <Link className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-blue-900">Attached Document</p>
                                                                    <a href={item.content_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline hover:text-blue-800">
                                                                        Open Document
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {section.items.length === 0 && (
                                            <p className="text-center text-gray-400 italic py-4">No content in this section yet.</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {sections.length === 0 && (
                                <p className="text-center text-gray-400 italic py-10 border-2 border-dashed rounded-xl">No sections added yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
