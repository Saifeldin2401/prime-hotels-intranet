import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Icons } from '@/components/icons'
import { useDepartmentKPIs } from '@/hooks/useDepartmentKPIs'
import { useProperty } from '@/contexts/PropertyContext'
import { KnowledgeComplianceWidget } from '@/components/knowledge/KnowledgeComplianceWidget'
import { useDepartments } from '@/hooks/useDepartments'
import { useDepartmentStaff } from '@/hooks/useDepartmentStaff'
import { useTranslation } from 'react-i18next'

export default function DepartmentDetails() {
    const { t } = useTranslation('dashboard')
    const { id } = useParams()
    const navigate = useNavigate()
    const { currentProperty } = useProperty()
    const { data: kpis } = useDepartmentKPIs(currentProperty?.id)
    const { departments } = useDepartments()
    const { staff, loading: loadingStaff } = useDepartmentStaff(id, currentProperty?.id)
    const [searchTerm, setSearchTerm] = useState('')

    // Find department info
    const department = departments.find(d => d.id === id)
    const departmentKpi = kpis?.find(k => k.department_id === id)

    const filteredStaff = staff.filter(member =>
        member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (!department) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <h2 className="text-xl font-semibold mb-2">{t('cards.department_not_found')}</h2>
                <Button onClick={() => navigate(-1)}>{t('cards.go_back_btn')}</Button>
            </div>
        )
    }

    const stats = {
        staff: departmentKpi?.staff_count || staff.length || 0,
        compliance: departmentKpi?.metrics?.sop_compliance_rate || 0,
        attendance: departmentKpi?.metrics?.attendance_rate || 0,
        training: departmentKpi?.metrics?.training_completion_rate || 0,
        score: departmentKpi?.overall_score || 0
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <Icons.ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{department.name}</h1>
                        <p className="text-gray-600">{t('cards.department_overview_subtitle')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">
                        {t('cards.department_staff_badge', { count: stats.staff })}
                    </Badge>
                    <Badge variant={stats.score >= 80 ? "navy" : "destructive"}>
                        {t('cards.overall_score_label', { score: stats.score })}
                    </Badge>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">{t('cards.knowledge_compliance_card')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.compliance}%</div>
                        <Progress value={stats.compliance} className="mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">{t('cards.attendance_rate_card')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.attendance}%</div>
                        <Progress value={stats.attendance} className="mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">{t('cards.training_completion_card')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{stats.training}%</div>
                        <Progress value={stats.training} className="mt-2" />
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="training" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="training">{t('cards.training_knowledge_tab')}</TabsTrigger>
                    <TabsTrigger value="staff">{t('cards.staff')}</TabsTrigger>
                </TabsList>

                <TabsContent value="training" className="space-y-6">
                    <KnowledgeComplianceWidget variant="department" propertyId={currentProperty?.id} />
                </TabsContent>

                <TabsContent value="staff">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{t('cards.staff_members_title')}</CardTitle>
                            <div className="w-1/3">
                                <Input
                                    placeholder={t('cards.search_staff_placeholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-8"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingStaff ? (
                                <div className="text-center py-8 text-gray-500">{t('cards.loading_staff')}</div>
                            ) : filteredStaff.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Icons.Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>{t('cards.no_staff_in_dept')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredStaff.map((member) => (
                                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage src={member.avatar_url || ''} />
                                                    <AvatarFallback>{member.full_name?.charAt(0) || '?'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-gray-900">{member.full_name}</p>
                                                    <p className="text-sm text-gray-500">{member.job_title || 'No Job Title'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant={member.status === 'on_shift' ? 'default' : 'secondary'}>
                                                    {member.status === 'on_shift' ? t('cards.on_shift_status') : t('cards.off_duty_status')}
                                                </Badge>
                                                <Button variant="ghost" size="sm" onClick={() => navigate(`/profile/${member.id}`)}>
                                                    {t('cards.view_profile_btn')}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
