import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { 
  BookOpen, 
  FileText, 
  Clock, 
  ArrowRight, 
  ExternalLink,
  Shield,
  ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DocumentItem {
  id: string
  title: string
  title_ar?: string
  content_type?: string
  document_number?: string
  sop_code?: string
  updated_at: string
  status?: string
}

export const RecentKnowledgeWidget: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  const navigate = useNavigate()
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

  const { data: documents = [], isLoading } = useQuery<DocumentItem[]>({
    queryKey: ['dashboard_recent_knowledge'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, title_ar, content_type, document_number, sop_code, updated_at, status')
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .limit(4)

      if (error) {
        return []
      }
      return data || []
    },
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl transition-all">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isRTL ? 'أحدث الأدلة والسياسات' : 'Knowledge & SOP Library'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'معايير التشغيل المعتمدة والتحديثات الفندقية' : 'Standard operational directives & procedures'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/knowledge')}
            className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <span>{isRTL ? 'عرض الكل' : 'View all'}</span>
            <ArrowRight className={`ms-1 h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* List */}
        <div className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/40" />
            ))
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground">
                {isRTL ? 'لا توجد وثائق منشورة حالياً' : 'No documents published yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {isRTL ? 'سيتم إدراج معايير التشغيل وسياسات الضيافة هنا فور اعتمادها' : 'Hotel operational directives will appear here once approved'}
              </p>
            </div>
          ) : (
            documents.map((doc) => {
              const displayTitle = isRTL && doc.title_ar ? doc.title_ar : doc.title
              const timeAgo = new Date(doc.updated_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                month: 'short',
                day: 'numeric',
              })

              return (
                <div
                  key={doc.id}
                  onClick={() => navigate(`/knowledge/${doc.id}`)}
                  className="group flex cursor-pointer items-center justify-between rounded-2xl border border-border/40 bg-card/40 p-3.5 transition-all duration-150 hover:border-blue-500/30 hover:bg-card/80 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors line-clamp-1">
                        {displayTitle}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {doc.sop_code && (
                          <span className="font-mono text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {doc.sop_code}
                          </span>
                        )}
                        <span>{doc.content_type?.toUpperCase() || (isRTL ? 'دليل' : 'SOP')}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {timeAgo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500 ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
