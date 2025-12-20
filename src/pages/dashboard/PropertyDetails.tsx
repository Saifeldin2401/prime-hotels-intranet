import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Icons } from '@/components/icons'
import { useProperty } from '@/contexts/PropertyContext'
import { useDepartmentKPIs } from '@/hooks/useDepartmentKPIs'
import { useDepartments } from '@/hooks/useDepartments'
import { useTranslation } from 'react-i18next'

export default function PropertyDetails() {
    const { t } = useTranslation('dashboard')
    const { id } = useParams()
    const navigate = useNavigate()
    const { availableProperties } = useProperty()
    const { departments, isLoading } = useDepartments(id) // Fetch departments for this property
    // We can keep using useDepartmentKPIs if it provides specific KPI data, or calculate purely from departments if possible.
    // For now, let's assume kpis might be useful later, or remove if redundant.
    const { data: kpis } = useDepartmentKPIs(id)

    const property = availableProperties.find(p => p.id === id)

    if (!property) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <h2 className="text-xl font-semibold mb-2">{t('cards.property_not_found')}</h2>
                <Button onClick={() => navigate(-1)}>{t('cards.go_back_btn')}</Button>
            </div>
        )
    }

    // Dynamic Stats - Real data only
    const { data: staffCount } = useQuery({
        queryKey: ['property_staff_count', id],
        queryFn: async () => {
            if (!id) return 0
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', id)
            if (error) throw error
            return count || 0
        },
        enabled: !!id
    })

    const stats = {
        departments: departments.length,
        staff: staffCount || 0
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <Icons.ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-hotel-gold text-white flex items-center justify-center">
                            <Icons.Building className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
                            <p className="text-gray-600">{property.address || t('cards.no_address_provided')}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={property.is_active ? 'default' : 'secondary'}>
                        {property.is_active ? t('cards.active_status') : t('cards.inactive_status')}
                    </Badge>
                    <Button onClick={() => navigate(`/dashboard/property-manager`)}>
                        {t('cards.view_dashboard_btn')}
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">{t('cards.total_departments_card')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{isLoading ? '-' : stats.departments}</div>
                        <p className="text-xs text-gray-600 mt-1">{t('cards.operational_departments')}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">{t('cards.total_staff')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{isLoading ? '-' : stats.staff}</div>
                        <p className="text-xs text-gray-600 mt-1">{t('cards.active_employees_subtitle')}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('cards.departments_overview_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('cards.loading_departments')}</div>
                    ) : departments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {departments.map((dept) => (
                                <div key={dept.id} className="p-4 border rounded-lg hover:bg-gray-50 flex items-center justify-between group">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{dept.name}</h3>
                                        {/* <p className="text-sm text-gray-500">{dept.staff_count || 0} Staff Members</p> */}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/departments/${dept.id}`)}>
                                        {t('cards.view_details')} <Icons.ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Icons.Building className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>{t('cards.no_departments_in_property')}</p>
                            <p className="text-sm mt-2">{t('cards.add_departments_hint')}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
