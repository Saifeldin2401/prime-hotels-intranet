import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { BarChart3, Bell, Edit, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AssignmentsTab } from './TrainingAssignments/AssignmentsTab'
import { CreateAssignmentDialog } from './TrainingAssignments/CreateAssignmentDialog'
import { ManageAssigneesDialog } from './TrainingAssignments/ManageAssigneesDialog'
import { OverviewTab } from './TrainingAssignments/OverviewTab'
import { ProgressDetailDialog } from './TrainingAssignments/ProgressDetailDialog'
import { TrainingAssignmentsProvider, useTrainingAssignmentsContext } from './contexts/TrainingAssignmentsContext'

interface TrainingAssignmentsPanelProps {
  embedded?: boolean
  initialTab?: 'overview' | 'assignments'
  defaultModuleId?: string
  autoOpen?: boolean
  hideCreateButton?: boolean
  hideHeaderActions?: boolean
}

function TrainingAssignmentsPanelInner() {
  const {
    isRTL,
    t,
    navigate,
    embedded,
    hideHeaderActions,
    activeTab,
    setActiveTab,
  } = useTrainingAssignmentsContext()

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {!embedded && (
        <PageHeader
          title={t('trainingCenter')}
          description={t('trainingDescription')}
          actions={
            hideHeaderActions ? undefined : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/notifications')}
                  className="hidden md:flex"
                >
                  <Bell className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                  {t('batchStatus')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/training/assignments/rules')}
                  className="hidden md:flex"
                >
                  <Settings className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                  {t('autoAssignRules')}
                </Button>
              </div>
            )
          }
        />
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'overview' | 'assignments')}
        className="space-y-6"
      >
        <TabsList className="w-full sm:w-auto bg-white p-1 border rounded-lg">
          <TabsTrigger
            value="overview"
            className="flex-1 sm:flex-none data-[state=active]:bg-hotel-navy data-[state=active]:text-white"
          >
            <BarChart3 className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
            {t('overview')}
          </TabsTrigger>
          <TabsTrigger
            value="assignments"
            className="flex-1 sm:flex-none data-[state=active]:bg-hotel-navy data-[state=active]:text-white"
          >
            <Edit className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
            {t('manageAssignments')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <AssignmentsTab />
        </TabsContent>
      </Tabs>

      <ProgressDetailDialog />
      <CreateAssignmentDialog />
      <ManageAssigneesDialog />
    </div>
  )
}

export function TrainingAssignmentsPanel({
  embedded = false,
  initialTab = 'overview',
  defaultModuleId,
  autoOpen = false,
  hideCreateButton = false,
  hideHeaderActions = false,
}: TrainingAssignmentsPanelProps) {
  return (
    <TrainingAssignmentsProvider
      embedded={embedded}
      initialTab={initialTab}
      defaultModuleId={defaultModuleId}
      autoOpen={autoOpen}
      hideCreateButton={hideCreateButton}
      hideHeaderActions={hideHeaderActions}
    >
      <TrainingAssignmentsPanelInner />
    </TrainingAssignmentsProvider>
  )
}

export default TrainingAssignmentsPanel
