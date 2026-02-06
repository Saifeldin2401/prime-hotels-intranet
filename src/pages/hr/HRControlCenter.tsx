import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const TOOL_CARDS = [
  {
    key: 'performance',
    icon: Icons.Award,
    path: '/hr/performance-management'
  },
  {
    key: 'goals',
    icon: Icons.Target,
    path: '/hr/goals-management'
  },
  {
    key: 'payslips',
    icon: Icons.Wallet,
    path: '/hr/payslips-management'
  },
  {
    key: 'scheduling',
    icon: Icons.Clock,
    path: '/hr/scheduling'
  },
  {
    key: 'approvals',
    icon: Icons.CheckSquare,
    path: '/approvals'
  },
  {
    key: 'directory',
    icon: Icons.Users,
    path: '/directory'
  },
  {
    key: 'operations',
    icon: Icons.Building,
    path: '/hr/operations'
  }
]

export default function HRControlCenter() {
  const navigate = useNavigate()
  const { t } = useTranslation('hr')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('hr_admin.title', 'HR Control Center')}
        </h1>
        <p className="text-muted-foreground">
          {t('hr_admin.description', 'Manage HR workflows, approvals, and employee data from one place.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {TOOL_CARDS.map((tool) => {
          const title = t(`hr_admin.tools.${tool.key}.title`, tool.key)
          const description = t(`hr_admin.tools.${tool.key}.description`, 'Open tool')
          const Icon = tool.icon

          return (
            <Card key={tool.key} className="border-primary/10">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(tool.path)}>
                    {t('hr_admin.actions.open', 'Open')}
                  </Button>
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate(tool.path)}>
                  {t('hr_admin.actions.manage', 'Manage')}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
