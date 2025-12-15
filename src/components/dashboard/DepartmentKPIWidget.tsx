import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useDepartmentKPIs, useDepartmentComparison } from '@/hooks/useDepartmentKPIs'
import { TrendingUp, TrendingDown, Minus, Award, ClipboardCheck, GraduationCap, FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DepartmentKPIWidgetProps {
    propertyId?: string
    className?: string
    compact?: boolean
}

export function DepartmentKPIWidget({ propertyId, className, compact = false }: DepartmentKPIWidgetProps) {
    const { data: kpis, isLoading } = useDepartmentKPIs(propertyId)
    const { data: comparison } = useDepartmentComparison(propertyId)

    if (isLoading) {
        return (
            <Card className={cn('animate-pulse', className)}>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Department Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-40 bg-gray-200 rounded"></div>
                </CardContent>
            </Card>
        )
    }

    if (!kpis || kpis.length === 0) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Award className="h-4 w-4 text-hotel-gold" />
                        Department Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-500 text-sm">No department data available</p>
                </CardContent>
            </Card>
        )
    }

    const avgScore = comparison?.property_average || { task_completion_rate: 0, training_completion_rate: 0, sop_compliance_rate: 0 }

    if (compact) {
        return (
            <Card className={className}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Award className="h-4 w-4 text-hotel-gold" />
                        Top Departments
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {kpis.slice(0, 3).map((dept, index) => (
                        <div key={dept.department_id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                        index === 1 ? 'bg-gray-100 text-gray-700' :
                                            'bg-orange-100 text-orange-700'
                                )}>
                                    {index + 1}
                                </span>
                                <span className="text-sm font-medium">{dept.department_name}</span>
                            </div>
                            <Badge className={cn(
                                dept.overall_score >= 80 ? 'bg-green-100 text-green-800' :
                                    dept.overall_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                            )}>
                                {dept.overall_score}%
                            </Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-hotel-gold" />
                    Department Performance Rankings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Property Averages */}
                <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                        <ClipboardCheck className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                        <p className="text-lg font-bold text-hotel-navy">{avgScore.task_completion_rate}%</p>
                        <p className="text-xs text-gray-500">Tasks</p>
                    </div>
                    <div className="text-center">
                        <GraduationCap className="h-4 w-4 mx-auto mb-1 text-green-600" />
                        <p className="text-lg font-bold text-hotel-navy">{avgScore.training_completion_rate}%</p>
                        <p className="text-xs text-gray-500">Training</p>
                    </div>
                    <div className="text-center">
                        <FileCheck className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                        <p className="text-lg font-bold text-hotel-navy">{avgScore.sop_compliance_rate}%</p>
                        <p className="text-xs text-gray-500">SOPs</p>
                    </div>
                </div>

                {/* Department Rankings */}
                <div className="space-y-3">
                    {kpis.map((dept, index) => {
                        const trend = dept.overall_score > 75 ? 'up' : dept.overall_score < 50 ? 'down' : 'neutral'
                        const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

                        return (
                            <div key={dept.department_id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                index === 1 ? 'bg-gray-200 text-gray-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-100 text-gray-600'
                                        )}>
                                            {index + 1}
                                        </span>
                                        <span className="font-medium">{dept.department_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <TrendIcon className={cn(
                                            'h-4 w-4',
                                            trend === 'up' ? 'text-green-500' :
                                                trend === 'down' ? 'text-red-500' :
                                                    'text-gray-400'
                                        )} />
                                        <span className="font-bold text-hotel-navy">{dept.overall_score}%</span>
                                    </div>
                                </div>
                                <Progress
                                    value={dept.overall_score}
                                    className={cn(
                                        'h-2',
                                        dept.overall_score >= 80 ? '[&>div]:bg-green-500' :
                                            dept.overall_score >= 60 ? '[&>div]:bg-yellow-500' :
                                                '[&>div]:bg-red-500'
                                    )}
                                />
                                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                                    <span>Tasks: {dept.metrics.task_completion_rate}%</span>
                                    <span>Training: {dept.metrics.training_completion_rate}%</span>
                                    <span>SOPs: {dept.metrics.sop_compliance_rate}%</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
