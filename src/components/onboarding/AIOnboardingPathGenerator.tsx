/**
 * AIOnboardingPathGenerator - Generate personalized onboarding paths
 * 
 * UI for generating and displaying AI-powered onboarding plans
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Sparkles,
    User,
    Building2,
    Briefcase,
    Clock,
    BookOpen,
    FileText,
    CheckSquare,
    Users,
    Eye,
    ChevronRight,
    RefreshCw,
    Download,
    Loader2,
    Building
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { useAIOnboardingPath } from '@/hooks/useAIOnboardingPath'
import { useDepartments } from '@/hooks/useDepartments'
import { useProperties } from '@/hooks/useProperties'

const stepTypeIcons = {
    training: BookOpen,
    document: FileText,
    task: CheckSquare,
    meeting: Users,
    shadowing: Eye
}

const stepTypeColors = {
    training: 'bg-blue-100 text-blue-700 border-blue-200',
    document: 'bg-amber-100 text-amber-700 border-amber-200',
    task: 'bg-green-100 text-green-700 border-green-200',
    meeting: 'bg-purple-100 text-purple-700 border-purple-200',
    shadowing: 'bg-pink-100 text-pink-700 border-pink-200'
}

const priorityColors = {
    required: 'bg-red-100 text-red-700',
    recommended: 'bg-yellow-100 text-yellow-700',
    optional: 'bg-gray-100 text-gray-600'
}

interface AIOnboardingPathGeneratorProps {
    onPathGenerated?: (path: any) => void
    className?: string
}

export function AIOnboardingPathGenerator({
    onPathGenerated,
    className
}: AIOnboardingPathGeneratorProps) {
    const { path, loading, error, generatePath, clearPath } = useAIOnboardingPath()
    const { departments } = useDepartments()
    const { data: properties = [] } = useProperties()

    // Fetch job titles from the system
    const { data: jobTitles = [] } = useQuery({
        queryKey: ['job_titles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_titles')
                .select('id, title')
                .order('title')
            if (error) throw error
            return data as { id: string; title: string }[]
        }
    })

    const [formData, setFormData] = useState({
        employeeName: '',
        role: '',
        department: '',
        priorExperience: 'none' as const
    })

    // Group departments by property
    const departmentsByProperty = useMemo(() => {
        const grouped: Record<string, { propertyName: string; departments: typeof departments }> = {}

        departments.forEach(dept => {
            const property = properties.find(p => p.id === dept.property_id)
            const propertyId = dept.property_id || 'unknown'
            const propertyName = property?.name || 'Other'

            if (!grouped[propertyId]) {
                grouped[propertyId] = {
                    propertyName,
                    departments: []
                }
            }
            grouped[propertyId].departments.push(dept)
        })

        // Sort by property name
        return Object.entries(grouped).sort((a, b) =>
            a[1].propertyName.localeCompare(b[1].propertyName)
        )
    }, [departments, properties])

    const handleGenerate = async () => {
        const result = await generatePath(formData)
        if (result && onPathGenerated) {
            onPathGenerated(result)
        }
    }

    const canGenerate = formData.employeeName && formData.role && formData.department

    return (
        <div className={cn("space-y-6", className)}>
            {/* Generator Form */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <span className="text-lg">AI Onboarding Path Generator</span>
                            <p className="text-sm font-normal text-muted-foreground">
                                Create personalized learning paths for new employees
                            </p>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Employee Name */}
                        <div className="space-y-2">
                            <Label htmlFor="employeeName" className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                Employee Name
                            </Label>
                            <Input
                                id="employeeName"
                                placeholder="e.g., John Smith"
                                value={formData.employeeName}
                                onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
                            />
                        </div>

                        {/* Role - Dropdown from Job Titles */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5" />
                                Job Role
                            </Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select job role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {jobTitles.length > 0 ? (
                                        jobTitles.map(job => (
                                            <SelectItem key={job.id} value={job.title}>
                                                {job.title}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        // Fallback common hotel roles if no data
                                        <>
                                            <SelectItem value="Front Desk Agent">Front Desk Agent</SelectItem>
                                            <SelectItem value="Housekeeping Attendant">Housekeeping Attendant</SelectItem>
                                            <SelectItem value="Restaurant Server">Restaurant Server</SelectItem>
                                            <SelectItem value="Concierge">Concierge</SelectItem>
                                            <SelectItem value="Maintenance Technician">Maintenance Technician</SelectItem>
                                            <SelectItem value="Night Auditor">Night Auditor</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Department - Grouped by Property */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5" />
                                Property & Department
                            </Label>
                            <Select
                                value={formData.department}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select property and department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departmentsByProperty.length > 0 ? (
                                        departmentsByProperty.map(([propertyId, { propertyName, departments: depts }]) => (
                                            <SelectGroup key={propertyId}>
                                                <SelectLabel className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                    <Building className="h-3 w-3" />
                                                    {propertyName}
                                                </SelectLabel>
                                                {depts.map(dept => (
                                                    <SelectItem key={dept.id} value={dept.name} className="pl-6">
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))
                                    ) : (
                                        // Fallback departments if no data loaded
                                        <>
                                            <SelectItem value="Front Office">Front Office</SelectItem>
                                            <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                                            <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                                            <SelectItem value="Engineering">Engineering</SelectItem>
                                            <SelectItem value="Security">Security</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Prior Experience */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                Prior Experience
                            </Label>
                            <Select
                                value={formData.priorExperience}
                                onValueChange={(value: any) => setFormData(prev => ({ ...prev, priorExperience: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No hospitality experience</SelectItem>
                                    <SelectItem value="some_hospitality">Some hospitality experience</SelectItem>
                                    <SelectItem value="experienced_hospitality">Experienced in hospitality</SelectItem>
                                    <SelectItem value="internal_transfer">Internal transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            onClick={handleGenerate}
                            disabled={!canGenerate || loading}
                            className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Generate Onboarding Path
                                </>
                            )}
                        </Button>
                        {path && (
                            <Button variant="outline" onClick={clearPath}>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}
                </CardContent>
            </Card>

            {/* Generated Path */}
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Card>
                            <CardContent className="py-8">
                                <div className="space-y-4">
                                    <Skeleton className="h-6 w-1/3" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <div className="grid grid-cols-3 gap-4 pt-4">
                                        <Skeleton className="h-20" />
                                        <Skeleton className="h-20" />
                                        <Skeleton className="h-20" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {path && !loading && (
                    <motion.div
                        key="path"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        {/* Path Header */}
                        <Card className="bg-gradient-to-r from-violet-50 to-blue-50 border-violet-100">
                            <CardContent className="py-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">
                                            Onboarding Plan for {path.employeeName}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {path.role} • {path.department}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="bg-white gap-1">
                                        <Clock className="h-3 w-3" />
                                        {path.totalDuration}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Phases */}
                        <ScrollArea className="h-[500px]">
                            <div className="space-y-4 pr-4">
                                {path.phases.map((phase, phaseIndex) => (
                                    <Card key={phaseIndex}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-base">{phase.name}</CardTitle>
                                                    <p className="text-sm text-muted-foreground">{phase.description}</p>
                                                </div>
                                                <Badge variant="outline">{phase.duration}</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="space-y-2">
                                                {phase.steps.map((step, stepIndex) => {
                                                    const StepIcon = stepTypeIcons[step.type] || CheckSquare
                                                    return (
                                                        <div
                                                            key={stepIndex}
                                                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                                        >
                                                            <div className={cn(
                                                                "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                                                stepTypeColors[step.type]
                                                            )}>
                                                                <StepIcon className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p className="font-medium text-sm text-gray-900">
                                                                        {step.title}
                                                                    </p>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={cn("text-[10px] flex-shrink-0", priorityColors[step.priority])}
                                                                    >
                                                                        {step.priority}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                    {step.description}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-1">
                                                                    Duration: {step.duration}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {/* Recommendations */}
                                {path.recommendations && path.recommendations.length > 0 && (
                                    <Card className="bg-amber-50 border-amber-100">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-amber-600" />
                                                AI Recommendations
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-1">
                                                {path.recommendations.map((rec, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                                                        <ChevronRight className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                                        {rec}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
