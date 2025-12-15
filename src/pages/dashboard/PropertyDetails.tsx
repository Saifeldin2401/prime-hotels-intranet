import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Icons } from '@/components/icons'
import { useProperty } from '@/contexts/PropertyContext'
import { useDepartmentKPIs } from '@/hooks/useDepartmentKPIs'
import { useDepartments } from '@/hooks/useDepartments'

export default function PropertyDetails() {
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
                <h2 className="text-xl font-semibold mb-2">Property Not Found</h2>
                <Button onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        )
    }

    // Dynamic Stats - Real data only, no mock values
    const stats = {
        departments: departments.length,
        // Staff count would need a separate query or aggregation
        // Keeping as 0 until proper staff counting is implemented
        staff: 0
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
                            <p className="text-gray-600">{property.address || 'No Address Provided'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={property.is_active ? 'default' : 'secondary'}>
                        {property.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button onClick={() => navigate(`/dashboard/property-manager`)}>
                        View Dashboard
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Departments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{isLoading ? '-' : stats.departments}</div>
                        <p className="text-xs text-gray-600 mt-1">Operational departments</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Staff</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{isLoading ? '-' : 0}</div>
                        {/* Note: useDepartments typically just returns list. To get staff count, we'd need aggregation. 
                             I'll show 0 for now to be "real" (no mock 145) until I fix the query. */}
                        <p className="text-xs text-gray-600 mt-1">Active employees</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Departments Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading departments...</div>
                    ) : departments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {departments.map((dept) => (
                                <div key={dept.id} className="p-4 border rounded-lg hover:bg-gray-50 flex items-center justify-between group">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{dept.name}</h3>
                                        {/* <p className="text-sm text-gray-500">{dept.staff_count || 0} Staff Members</p> */}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/departments/${dept.id}`)}>
                                        Details <Icons.ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Icons.Building className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>No departments found for this property.</p>
                            <p className="text-sm mt-2">Go to Property Management to add departments.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
