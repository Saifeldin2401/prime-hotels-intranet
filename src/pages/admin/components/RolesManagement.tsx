import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Shield, ShieldAlert, ShieldCheck, Users, RefreshCw, KeyRound, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TenantRole } from '@/lib/types/tenant'

interface RoleDefinition {
  role: TenantRole
  label: string
  labelAr: string
  scope: string
  scopeAr: string
  description: string
  descriptionAr: string
  permissions: string[]
  level: number
  badgeColor: string
}

const TENANT_ROLES_CATALOG: RoleDefinition[] = [
  {
    role: 'organization_owner',
    label: 'Organization Owner',
    labelAr: 'مالك المنظمة',
    scope: 'Organization Tier',
    scopeAr: 'نطاق المنظمة الكامل',
    description: 'Ultimate administrative control, subscription management, and complete organization oversight.',
    descriptionAr: 'تحكم إداري شامل، إدارة الاشتراكات، وإشراف كامل على كافة الفنادق والعمليات.',
    permissions: ['Billing & Plan', 'Full CRUD', 'Impersonation', 'Audit Trails', 'User Management', 'Content Authoring'],
    level: 1,
    badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
  },
  {
    role: 'organization_admin',
    label: 'Organization Admin',
    labelAr: 'مدير المنظمة',
    scope: 'Organization Tier',
    scopeAr: 'نطاق المنظمة',
    description: 'Manages all hotels, brands, departments, users, settings, and cross-property learning programs.',
    descriptionAr: 'إدارة جميع الفنادق والعلامات التجارية والأقسام والمستخدمين والبرامج التدريبية.',
    permissions: ['Hotel Management', 'Brand Management', 'User Provisioning', 'Reporting Line Control', 'LMS Admin'],
    level: 2,
    badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
  },
  {
    role: 'training_manager',
    label: 'Training & Learning Manager',
    labelAr: 'مدير التدريب والتطوير',
    scope: 'Enterprise Learning',
    scopeAr: 'إدارة التعليم المؤسسي',
    description: 'Oversees LMS course creation, skills matrices, certifications, AI course authoring, and assignments.',
    descriptionAr: 'الإشراف على إنشاء الدورات التدريبية، مصفوفة المهارات، الشهادات، وتأليف المحتوى بالذكاء الاصطناعي.',
    permissions: ['Course Builder', 'AI Course Engine', 'Skills Matrix', 'Certificates Issue', 'Analytics'],
    level: 3,
    badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
  },
  {
    role: 'knowledge_manager',
    label: 'Knowledge & SOP Curator',
    labelAr: 'مسؤول المعرفة والإجراءات القياسية',
    scope: 'Knowledge Base',
    scopeAr: 'قاعدة المعرفة والأدلة',
    description: 'Curates company SOPs, policy compliance, document reviews, translations, and quality governance.',
    descriptionAr: 'إدارة وتوثيق أدلة التشغيل القياسية، الامتثال للسياسات، مراجعة الوثائق والجودة.',
    permissions: ['Document Approvals', 'SOP Publishing', 'Compliance Center', 'AI Translation', 'Version Control'],
    level: 3,
    badgeColor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
  },
  {
    role: 'brand_admin',
    label: 'Brand Portfolio Director',
    labelAr: 'مدير العلامة التجارية',
    scope: 'Brand Subdivision',
    scopeAr: 'نطاق العلامة التجارية',
    description: 'Manages hotel clusters and content dedicated specifically to a brand portfolio division.',
    descriptionAr: 'إدارة مجموعة الفنادق والمحتوى الخاص بعلامة تجارية معينة داخل المنظمة.',
    permissions: ['Brand Scope LMS', 'Brand Documents', 'Hotel Oversight', 'Brand Standards'],
    level: 4,
    badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
  },
  {
    role: 'hotel_admin',
    label: 'Hotel General Manager / Admin',
    labelAr: 'مدير الفندق / الإدارة المحلية',
    scope: 'Hotel Location',
    scopeAr: 'نطاق الفندق المحلي',
    description: 'Local general manager with authority over hotel staff, departmental assignments, and local operations.',
    descriptionAr: 'مدير الفندق المسؤول عن موظفي الفندق، تعيينات الأقسام، والعمليات التشغيلية المحلية.',
    permissions: ['Hotel Staff Management', 'Department Operations', 'Task Routing', 'Local Reports'],
    level: 5,
    badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
  },
  {
    role: 'department_manager',
    label: 'Department Head / Supervisor',
    labelAr: 'رئيس القسم / مشرف',
    scope: 'Department Tier',
    scopeAr: 'نطاق القسم',
    description: 'Direct supervisor managing department team members, approvals, shifts, and training completions.',
    descriptionAr: 'المشرف المباشر على الفريق، الموافقات، الجداول التشغيلية، ومتابعة إتمام التدريبات.',
    permissions: ['Approval Requests', 'Department Shift Roster', 'Member Tracking', 'SOP Acknowledgment'],
    level: 6,
    badgeColor: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30'
  },
  {
    role: 'instructor',
    label: 'Trainer / Instructor',
    labelAr: 'مدرب / محاضر',
    scope: 'Classroom & Assessment',
    scopeAr: 'الفصول والتقييمات',
    description: 'Conducts webinars, on-site training sessions, grades interactive quizzes, and tracks attendance.',
    descriptionAr: 'تقديم الجلسات التدريبية المباشرة، تصحيح الاختبارات التفاعلية، وتسجيل الحضور.',
    permissions: ['Quiz Grading', 'Attendance Logging', 'Live Sessions', 'Feedback Submissions'],
    level: 7,
    badgeColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30'
  },
  {
    role: 'learner',
    label: 'Hotel Associate / Learner',
    labelAr: 'موظف الفندق / متدرب',
    scope: 'Individual User',
    scopeAr: 'المستخدم الفردي',
    description: 'Frontline staff member accessing microlearning, operational SOPs, personal tasks, and certificates.',
    descriptionAr: 'موظف الخطوط الأمامية للوصول إلى التدريب المصغر، أدلة التشغيل، المهام والشهادات.',
    permissions: ['Take Courses', 'View Knowledge', 'Complete Tasks', 'Earn Certificates', 'Self Service'],
    level: 8,
    badgeColor: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
  }
]

export function RolesManagement() {
  const { currentOrganization } = useTenant()
  const { t, i18n } = useTranslation(['admin', 'common'])
  const isRtl = i18n.dir() === 'rtl'

  // Query member counts per role for this organization
  const { data: roleCounts = {}, isLoading, refetch } = useQuery<Record<string, number>>({
    queryKey: ['tenant-role-counts', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return {}

      const { data, error } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)

      if (error) {
        console.warn('Failed to fetch role counts:', error)
        return {}
      }

      const counts: Record<string, number> = {}
      data?.forEach(m => {
        counts[m.role] = (counts[m.role] || 0) + 1
      })
      return counts
    },
    enabled: !!currentOrganization?.id
  })

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>{t('admin:roles_and_permissions', 'Tenant Roles & Permission Matrix')}</CardTitle>
          </div>
          <CardDescription>
            {t('admin:roles_desc', 'Granular multi-tier role definitions governing system capabilities and scope across the enterprise.')}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('common:refresh', 'Refresh')}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin:role_title', 'Role & Hierarchy')}</TableHead>
                <TableHead>{t('admin:scope_level', 'Scope Level')}</TableHead>
                <TableHead>{t('admin:description', 'Description')}</TableHead>
                <TableHead>{t('admin:entitlements', 'Key Capabilities')}</TableHead>
                <TableHead className="text-end">{t('admin:active_users', 'Active Members')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TENANT_ROLES_CATALOG.map((item) => {
                const count = roleCounts[item.role] || 0
                return (
                  <TableRow key={item.role}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`font-semibold ${item.badgeColor}`}>
                          {isRtl ? item.labelAr : item.label}
                        </Badge>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground block mt-1">
                        {item.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {isRtl ? item.scopeAr : item.scope}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      {isRtl ? item.descriptionAr : item.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {item.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border font-medium"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-end font-semibold">
                      <div className="flex items-center justify-end gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{count}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
