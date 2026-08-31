import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/contexts/TenantContext'
import { exportService } from '@/services/exportService'
import { toast } from 'sonner'
import {
  Download,
  Database,
  ShieldCheck,
  FileArchive,
  Lock,
  Clock,
  Users,
  Award,
  BookOpen
} from 'lucide-react'

export default function TenantDataExport() {
  const { i18n } = useTranslation('common')
  const isAr = i18n.language === 'ar'
  const { currentOrganization } = useTenant()
  const activeOrgId = currentOrganization?.id

  const [isExporting, setIsExporting] = useState(false)
  const [lastExportTime, setLastExportTime] = useState<string | null>(null)

  const handleExportFullArchive = async () => {
    if (!activeOrgId) {
      toast.error(isAr ? 'لم يتم تحديد منظمة' : 'No organization selected')
      return
    }

    try {
      setIsExporting(true)
      const data = await exportService.exportOrganizationArchive(activeOrgId)

      const jsonStr = JSON.stringify(data, null, 2)
      const orgSlug = currentOrganization?.slug || 'organization'
      const stamp = new Date().toISOString().slice(0, 10)
      const filename = `${orgSlug}_data_archive_${stamp}.json`

      exportService.downloadFile(jsonStr, filename, 'application/json;charset=utf-8;')
      setLastExportTime(new Date().toLocaleString())
      toast.success(isAr ? 'تم تصدير أرشيف بيانات المنظمة بنجاح' : 'Organization data archive generated and downloaded')
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(error?.message || (isAr ? 'فشل تصدير الأرشيف' : 'Failed to export organization archive'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
          <Database className="h-4 w-4" />
          <span>{isAr ? 'نقل البيانات وحماية الخصوصية' : 'Data Portability & Enterprise Retention'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
          {isAr ? 'تصدير أرشيف بيانات المنظمة' : 'Organization Data Archive & Portability'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr
            ? 'تصدير شامل لسجلات التدريب، الشهادات، معايير التشغيل SOPs، والمستخدمين بما يتوافق مع الأنظمة واللوائح'
            : 'Export complete historical training transcripts, certifications, SOPs, and user records for compliance and audit retention'}
        </p>
      </div>

      {/* Main Export Card */}
      <Card className="border border-border/60 bg-card/90 backdrop-blur-sm shadow-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <FileArchive className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  {currentOrganization?.name || 'Customer Organization'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAr ? 'حزمة بيانات كاملة بصيغة JSON متوافقة مع أنظمة إدارة البيانات' : 'Full machine-readable JSON archive package'}
                </CardDescription>
              </div>
            </div>

            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              {isAr ? 'مطابق للمعايير' : 'Compliant'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-4 w-4 text-blue-500" />
                <span>{isAr ? 'المستخدمون والعضويات' : 'Users & Memberships'}</span>
              </div>
              <div className="text-lg font-bold text-foreground">{isAr ? 'شامل وموثق' : 'Full Roster'}</div>
            </div>

            <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Award className="h-4 w-4 text-amber-500" />
                <span>{isAr ? 'سجلات التدريب والشهادات' : 'Transcripts & Certs'}</span>
              </div>
              <div className="text-lg font-bold text-foreground">{isAr ? 'سجل غير قابل للتعديل' : 'Immutable Records'}</div>
            </div>

            <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="h-4 w-4 text-emerald-500" />
                <span>{isAr ? 'المعايير والوثائق SOPs' : 'SOPs & Documents'}</span>
              </div>
              <div className="text-lg font-bold text-foreground">{isAr ? 'جميع الإصدارات' : 'All Versions'}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-muted-foreground space-y-2">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-amber-500" />
              <span>{isAr ? 'سياسة حماية البيانات والاحتفاظ بها' : 'Data Portability & Retention Policy'}</span>
            </div>
            <p>
              {isAr
                ? 'وفقاً لسياسة المنصة، حتى في حالات إنهاء الاشتراك أو نقل الملكية، تظل سجلات التدريب والشهادات محفوظة في الأرشيف لضمان حق الموظفين والامتثال للوائح العمل.'
                : 'In accordance with compliance standards, employee training transcripts and verified certifications are permanently preserved in the tenant archive even upon organization offboarding or cancellation.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-muted-foreground">
              {lastExportTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {isAr ? `آخر تصدير: ${lastExportTime}` : `Last exported: ${lastExportTime}`}
                </span>
              )}
            </div>

            <Button
              size="default"
              className="w-full sm:w-auto gap-2 font-medium bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleExportFullArchive}
              disabled={isExporting || !activeOrgId}
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? (isAr ? 'جاري إنشاء الأرشيف...' : 'Generating Archive...') : (isAr ? 'تنزيل أرشيف المنظمة (JSON)' : 'Download Organization Archive')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
