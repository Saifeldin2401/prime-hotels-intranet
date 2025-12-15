import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useDepartmentKnowledgeCompliance, useUserKnowledgeCompliance } from '@/hooks/useKnowledgeCompliance'
import { FileCheck, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnowledgeComplianceWidgetProps {
    propertyId?: string
    variant?: 'user' | 'department'
    className?: string
}

export function KnowledgeComplianceWidget({ propertyId, variant = 'user', className }: KnowledgeComplianceWidgetProps) {
    const { data: userCompliance, isLoading: userLoading } = useUserKnowledgeCompliance()
    const { data: deptCompliance, isLoading: deptLoading } = useDepartmentKnowledgeCompliance(propertyId)

    if (variant === 'user') {
        if (userLoading || !userCompliance) {
            return (
                <Card className={cn('animate-pulse', className)}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Knowledge Compliance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-20 bg-gray-200 rounded"></div>
                    </CardContent>
                </Card>
            )
        }

        const { compliance_rate, pending_count, acknowledged_count } = userCompliance
        // overdue_count not fully implemented yet, omitted from UI for now

        return (
            <Card className={cn(className)}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-hotel-gold" />
                        Knowledge Compliance
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-hotel-navy">{compliance_rate}%</span>
                        <Badge
                            className={cn(
                                compliance_rate >= 90 ? 'bg-green-100 text-green-800' :
                                    compliance_rate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                            )}
                        >
                            {compliance_rate >= 90 ? 'Compliant' : compliance_rate >= 70 ? 'Needs Attention' : 'At Risk'}
                        </Badge>
                    </div>

                    <Progress value={compliance_rate} className="h-2" />

                    <div className="grid grid-cols-2 gap-2 text-center text-sm">
                        <div>
                            <p className="font-semibold text-green-600">{acknowledged_count}</p>
                            <p className="text-gray-500 text-xs">Read</p>
                        </div>
                        <div>
                            <p className="font-semibold text-yellow-600">{pending_count}</p>
                            <p className="text-gray-500 text-xs">Pending</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Department variant
    if (deptLoading || !deptCompliance) {
        return (
            <Card className={cn('animate-pulse', className)}>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Department Knowledge Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-40 bg-gray-200 rounded"></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-hotel-gold" />
                    Department Knowledge Compliance
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {deptCompliance.length === 0 ? (
                    <p className="text-gray-500 text-sm">No departments found</p>
                ) : (
                    deptCompliance.map(dept => (
                        <div key={dept.department_id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{dept.department_name}</span>
                                <span className={cn(
                                    'font-semibold',
                                    dept.compliance_rate >= 90 ? 'text-green-600' :
                                        dept.compliance_rate >= 70 ? 'text-yellow-600' :
                                            'text-red-600'
                                )}>
                                    {dept.compliance_rate}%
                                </span>
                            </div>
                            <Progress
                                value={dept.compliance_rate}
                                className={cn(
                                    'h-2',
                                    dept.compliance_rate >= 90 ? '[&>div]:bg-green-500' :
                                        dept.compliance_rate >= 70 ? '[&>div]:bg-yellow-500' :
                                            '[&>div]:bg-red-500'
                                )}
                            />
                            <p className="text-xs text-gray-500">
                                {dept.acknowledged} / {dept.total_required} acknowledged
                            </p>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}

interface KnowledgeComplianceIndicatorProps {
    complianceRate: number
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function KnowledgeComplianceIndicator({ complianceRate, size = 'md', className }: KnowledgeComplianceIndicatorProps) {
    const Icon = complianceRate >= 90 ? CheckCircle : complianceRate >= 70 ? AlertTriangle : AlertTriangle

    const sizeClasses = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    }

    return (
        <div className={cn('flex items-center gap-1', className)}>
            <Icon className={cn(
                sizeClasses[size],
                complianceRate >= 90 ? 'text-green-500' :
                    complianceRate >= 70 ? 'text-yellow-500' :
                        'text-red-500'
            )} />
            <span className={cn(
                'font-medium',
                size === 'sm' && 'text-xs',
                size === 'md' && 'text-sm',
                size === 'lg' && 'text-base'
            )}>
                {complianceRate}%
            </span>
        </div>
    )
}
