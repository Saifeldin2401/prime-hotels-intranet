/**
 * AIToolsPage - Central hub for AI-powered HR tools
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Sparkles,
    MessageSquareText,
    FileText,
    GraduationCap,
    Brain
} from 'lucide-react'
import { AIFeedbackAnalyzer } from '@/components/feedback/AIFeedbackAnalyzer'
import { AIOnboardingPathGenerator } from '@/components/onboarding/AIOnboardingPathGenerator'
import { AIDocumentSummarizer } from '@/components/documents/AIDocumentSummarizer'

export default function AIToolsPage() {
    const { t } = useTranslation(['ai_tools', 'common'])

    return (
        <div className="space-y-6 p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Brain className="h-7 w-7 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('ai_tools:title')}</h1>
                    <p className="text-muted-foreground">
                        {t('ai_tools:description')}
                    </p>
                </div>
                <Badge className="ml-auto bg-gradient-to-r from-violet-600 to-blue-600 text-white border-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t('ai_tools:powered_by_ai')}
                </Badge>
            </div>

            {/* Tools Tabs */}
            <Tabs defaultValue="feedback" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
                    <TabsTrigger value="feedback" className="gap-2">
                        <MessageSquareText className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('ai_tools:feedback_analyzer')}</span>
                        <span className="sm:hidden">{t('ai_tools:feedback')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="onboarding" className="gap-2">
                        <GraduationCap className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('ai_tools:onboarding_path')}</span>
                        <span className="sm:hidden">{t('ai_tools:onboarding')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('ai_tools:document_summary')}</span>
                        <span className="sm:hidden">{t('ai_tools:documents')}</span>
                    </TabsTrigger>
                </TabsList>

                {/* Feedback Analyzer */}
                <TabsContent value="feedback">
                    <AIFeedbackAnalyzer />
                </TabsContent>

                {/* Onboarding Path Generator */}
                <TabsContent value="onboarding">
                    <AIOnboardingPathGenerator />
                </TabsContent>

                {/* Document Summarizer */}
                <TabsContent value="documents">
                    <AIDocumentSummarizer />
                </TabsContent>
            </Tabs>
        </div>
    )
}
