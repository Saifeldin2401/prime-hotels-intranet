import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SOPDashboardAdvanced } from './SOPDashboardAdvanced'
import { SOPDocumentManager } from './SOPDocumentManager'
import SOPEditorAdvanced from './SOPEditorAdvanced'
import { SOPImportDialog } from '@/components/sop/SOPImportDialog'
import { useTranslation } from 'react-i18next'

export default function SOPLibrary() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isCreating, setIsCreating] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importedData, setImportedData] = useState<any>(null)
  const [editingDoc, setEditingDoc] = useState<any>(null)

  const { t } = useTranslation('sop')

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isCreating || editingDoc) {
    return (
      <div className="h-full">
        <SOPEditorAdvanced
          documentId={editingDoc?.id}
          initialContent={!editingDoc ? importedData?.content : undefined}
          initialMetadata={!editingDoc ? importedData?.metadata : undefined}
          onSave={(content, metadata) => {
            console.log('Saving SOP:', { content, metadata })
            setIsCreating(false)
            setEditingDoc(null)
            setImportedData(null)
          }}
          onCancel={() => {
            setIsCreating(false)
            setEditingDoc(null)
            setImportedData(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <SOPImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={(data) => {
          setImportedData({
            content: data.contentHtml,
            metadata: {
              title: data.title,
              description: data.description,
              department: data.department,
              category: data.category,
              priority: data.priority
            }
          })
          setIsCreating(true)
        }}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('library.title')}</h1>
          <p className="text-gray-600">
            {t('library.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
            onClick={() => setShowImportDialog(true)}
          >
            <Icons.Sparkles className="h-4 w-4 text-purple-500" />
            {t('library.import')}
          </button>
          <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Icons.Download className="h-4 w-4" />
            {t('library.export')}
          </button>
          <button
            className="bg-hotel-gold text-white px-4 py-2 rounded-md text-sm hover:bg-hotel-gold-dark transition-colors flex items-center gap-2"
            onClick={() => setIsCreating(true)}
          >
            <Icons.Plus className="h-4 w-4" />
            {t('library.create_advanced')}
          </button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">{t('library.tabs.dashboard')}</TabsTrigger>
          <TabsTrigger value="documents">{t('library.tabs.documents')}</TabsTrigger>
          <TabsTrigger value="editor">{t('library.tabs.editor')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('library.tabs.analytics')}</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <SOPDashboardAdvanced />
        </TabsContent>

        <TabsContent value="documents" className="m-0">
          <SOPDocumentManager onEdit={(doc) => setEditingDoc(doc)} />
        </TabsContent>

        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('library.editor_card.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Icons.FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('library.editor_card.subtitle')}</h3>
                <p className="text-gray-600 mb-4">
                  {t('library.editor_card.description')}
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Icons.Plus className="h-4 w-4 mr-2" />
                  {t('library.editor_card.create_button')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SOPDashboardAdvanced />
        </TabsContent>
      </Tabs>
    </div>
  )
}
