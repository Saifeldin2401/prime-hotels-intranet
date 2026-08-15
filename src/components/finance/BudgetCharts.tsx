import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Budget } from '@/lib/types/finance'
import { useTranslation } from 'react-i18next'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'
import { useMemo } from 'react'
import { useDepartments } from '@/hooks/useDepartments'

interface BudgetChartsProps {
    budgets: Budget[]
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6']

export function BudgetCharts({ budgets }: BudgetChartsProps) {
    const { t } = useTranslation('finance')
    const { departments } = useDepartments()

    // Aggregate by Category
    const categoryData = useMemo(() => {
        const aggregated = budgets.reduce((acc, curr) => {
            const cat = curr.category || 'Uncategorized'
            acc[cat] = (acc[cat] || 0) + Number(curr.allocated_amount)
            return acc
        }, {} as Record<string, number>)

        return Object.entries(aggregated)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
    }, [budgets])

    // Aggregate by Department
    const departmentData = useMemo(() => {
        const aggregated = budgets.reduce((acc, curr) => {
            const deptName = curr.department_id
                ? departments?.find(d => d.id === curr.department_id)?.name || 'Unknown Dept'
                : 'General'
            acc[deptName] = (acc[deptName] || 0) + Number(curr.allocated_amount)
            return acc
        }, {} as Record<string, number>)

        return Object.entries(aggregated)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
    }, [budgets, departments])

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'SAR',
            maximumFractionDigits: 0
        }).format(value)

    if (!budgets.length) return null

    return (
        <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">
                        {t('finance:budgets.charts.by_category', { defaultValue: 'Budget Allocation by Category' })}
                    </CardTitle>
                </CardHeader>
                <CardContent className="ps-2">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    tickFormatter={(value) => `SAR ${value.toLocaleString()}`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f3f4f6' }}
                                    formatter={(value: number) => [formatCurrency(value), 'Allocated']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">
                        {t('finance:budgets.charts.by_department', { defaultValue: 'Budget Distribution by Department' })}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={departmentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {departmentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number) => [formatCurrency(value), 'Allocated']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle"
                                    formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
