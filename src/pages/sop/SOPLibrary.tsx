import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SOPDashboardAdvanced } from './SOPDashboardAdvanced'
import { SOPDocumentManager } from './SOPDocumentManager'
import SOPEditorAdvanced from './SOPEditorAdvanced'

export default function SOPLibrary() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isCreating, setIsCreating] = useState(false)

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

  if (isCreating) {
    return (
      <div className="h-full">
        <SOPEditorAdvanced
          onSave={(content, metadata) => {
            console.log('Saving SOP:', { content, metadata })
            setIsCreating(false)
          }}
          onCancel={() => setIsCreating(false)}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SOP Management System</h1>
          <p className="text-muted-foreground">
            Comprehensive Standard Operating Procedures management with advanced features
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Icons.Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline">
            <Icons.Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Icons.Plus className="h-4 w-4 mr-2" />
            Create Advanced SOP
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <SOPDashboardAdvanced />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <SOPDocumentManager />
        </TabsContent>

        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SOP Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Icons.FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Advanced SOP Editor</h3>
                <p className="text-muted-foreground mb-4">
                  Create and edit comprehensive SOP documents with rich text editing, 
                  version control, and approval workflows.
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Icons.Plus className="h-4 w-4 mr-2" />
                  Create New SOP
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
