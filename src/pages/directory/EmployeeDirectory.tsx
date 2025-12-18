import React, { useState, useEffect } from 'react'
import { useOrgHierarchy } from '@/hooks/useOrgHierarchy'
import { EmployeeCard } from '@/components/directory/EmployeeCard'
import { OrgPyramid } from '@/components/directory/OrgPyramid'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Search,
    Loader2,
    User,
    LayoutGrid,
    Network,
    Building2,
    Hotel,
    Crown,
    Briefcase,
    ChevronDown,
    ChevronRight
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { OrgEmployee, OrgDepartment, OrgProperty } from '@/hooks/useOrgHierarchy'

type ViewMode = 'grid' | 'org'

// Convert OrgEmployee to profile-like object for EmployeeCard
function toProfile(emp: OrgEmployee) {
    return {
        id: emp.id,
        full_name: emp.full_name,
        job_title: emp.job_title,
        email: emp.email,
        phone: emp.phone,
        avatar_url: emp.avatar_url,
        roles: emp.roles,
        user_roles: emp.roles.map(r => ({ role: r }))
    }
}

export default function EmployeeDirectory() {
    const { t, i18n } = useTranslation('directory')
    const [search, setSearch] = useState('')
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const isRTL = i18n.dir() === 'rtl'

    // Use the same hierarchy for both views
    const { hierarchy, isLoading, totalEmployees } = useOrgHierarchy(search)

    // Expand/collapse state for grid sections
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['corporate', 'hotels']))

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev)
            if (next.has(sectionId)) next.delete(sectionId)
            else next.add(sectionId)
            return next
        })
    }

    return (
        <div className="container mx-auto py-6 space-y-6 h-[calc(100vh-80px)] flex flex-col">
            {/* Header with View Toggle */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                        <TabsList className="grid grid-cols-2 w-[200px]">
                            <TabsTrigger value="grid" className="gap-1.5">
                                <LayoutGrid className="h-4 w-4" />
                                {t('grid_view', 'Grid')}
                            </TabsTrigger>
                            <TabsTrigger value="org" className="gap-1.5">
                                <Network className="h-4 w-4" />
                                {t('org_chart', 'Org Chart')}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Search */}
                    <div className="relative w-full md:w-72">
                        <Search className={`absolute top-2.5 h-4 w-4 text-gray-500 ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
                        <Input
                            type="search"
                            placeholder={t('search_placeholder')}
                            className={isRTL ? 'pr-9' : 'pl-9'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : viewMode === 'org' ? (
                /* Org Chart View */
                <div className="flex-1 overflow-y-auto">
                    <OrgPyramid hierarchy={hierarchy} isRTL={isRTL} />
                </div>
            ) : totalEmployees === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium">{t('no_results')}</h3>
                </div>
            ) : (
                /* Hierarchical Grid View */
                <div className="flex-1 overflow-y-auto space-y-6 pb-6">
                    {/* Employee Count Badge */}
                    <Badge variant="secondary" className="text-sm">
                        {totalEmployees} {t('employees', 'Employees')}
                    </Badge>

                    {/* Corporate Section */}
                    {(hierarchy.corporate.executives.length > 0 || hierarchy.corporate.sharedServices.length > 0) && (
                        <GridSection
                            title={t('corporate_level', 'Corporate Level')}
                            icon={<Building2 className="h-5 w-5 text-indigo-600" />}
                            isExpanded={expandedSections.has('corporate')}
                            onToggle={() => toggleSection('corporate')}
                            color="indigo"
                        >
                            {/* Executives */}
                            {hierarchy.corporate.executives.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Crown className="h-4 w-4 text-indigo-500" />
                                        <h4 className="font-medium text-indigo-900">
                                            {t('corporate_executives', 'Corporate Executives')}
                                        </h4>
                                        <Badge variant="outline" className="text-xs">
                                            {hierarchy.corporate.executives.length}
                                        </Badge>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {hierarchy.corporate.executives.map(emp => (
                                            <EmployeeCard key={emp.id} profile={toProfile(emp)} isRTL={isRTL} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Shared Services */}
                            {hierarchy.corporate.sharedServices.length > 0 && (
                                <div className="space-y-3 mt-6">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-violet-500" />
                                        <h4 className="font-medium text-violet-900">
                                            {t('shared_services', 'Corporate Shared Services')}
                                        </h4>
                                    </div>
                                    {hierarchy.corporate.sharedServices.map(dept => (
                                        <DepartmentGrid
                                            key={dept.id}
                                            department={dept}
                                            isRTL={isRTL}
                                            color="violet"
                                        />
                                    ))}
                                </div>
                            )}
                        </GridSection>
                    )}

                    {/* Hotels Section */}
                    {hierarchy.properties.length > 0 && (
                        <GridSection
                            title={t('hotel_level', 'Hotel Properties')}
                            icon={<Hotel className="h-5 w-5 text-blue-600" />}
                            isExpanded={expandedSections.has('hotels')}
                            onToggle={() => toggleSection('hotels')}
                            count={hierarchy.properties.length}
                            color="blue"
                        >
                            {hierarchy.properties.map(property => (
                                <PropertyGrid
                                    key={property.id}
                                    property={property}
                                    isRTL={isRTL}
                                />
                            ))}
                        </GridSection>
                    )}

                    {/* Unassigned Section */}
                    {hierarchy.unassigned.length > 0 && (
                        <GridSection
                            title={t('unassigned', 'Unassigned')}
                            icon={<User className="h-5 w-5 text-gray-400" />}
                            isExpanded={expandedSections.has('unassigned')}
                            onToggle={() => toggleSection('unassigned')}
                            count={hierarchy.unassigned.length}
                            color="gray"
                        >
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {hierarchy.unassigned.map(emp => (
                                    <EmployeeCard key={emp.id} profile={toProfile(emp)} isRTL={isRTL} />
                                ))}
                            </div>
                        </GridSection>
                    )}
                </div>
            )}
        </div>
    )
}

// ============================================================================
// GRID SECTION COMPONENT
// ============================================================================

interface GridSectionProps {
    title: string
    icon: React.ReactNode
    isExpanded: boolean
    onToggle: () => void
    count?: number
    color?: 'indigo' | 'blue' | 'gray' | 'violet'
    children: React.ReactNode
}

function GridSection({ title, icon, isExpanded, onToggle, count, color = 'gray', children }: GridSectionProps) {
    const colorClasses = {
        indigo: 'border-indigo-200 bg-indigo-50/50',
        blue: 'border-blue-200 bg-blue-50/50',
        violet: 'border-violet-200 bg-violet-50/50',
        gray: 'border-gray-200 bg-gray-50/50'
    }

    return (
        <div className={cn("rounded-xl border-2 overflow-hidden", colorClasses[color])}>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    {count !== undefined && (
                        <Badge variant="secondary">{count}</Badge>
                    )}
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                </motion.div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 space-y-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ============================================================================
// PROPERTY GRID COMPONENT
// ============================================================================

interface PropertyGridProps {
    property: OrgProperty
    isRTL: boolean
}

function PropertyGrid({ property, isRTL }: PropertyGridProps) {
    const { t } = useTranslation('directory')
    const [isExpanded, setIsExpanded] = useState(true)

    return (
        <div className="rounded-lg border border-blue-200 bg-white overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
            >
                <div className="flex items-center gap-2">
                    <Hotel className="h-5 w-5" />
                    <span className="font-semibold">{property.name}</span>
                    {property.city && (
                        <span className="text-sm text-blue-100">({property.city})</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Badge className="bg-white/20 text-white border-0">
                        {property.totalEmployees} {t('employees', 'employees')}
                    </Badge>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-4 space-y-4"
                    >
                        {/* General Manager */}
                        {property.generalManager && (
                            <div className="space-y-2">
                                <Badge className="bg-blue-600 text-white">
                                    {t('general_manager', 'General Manager')}
                                </Badge>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    <EmployeeCard
                                        profile={toProfile(property.generalManager)}
                                        isRTL={isRTL}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Departments */}
                        {property.departments.map(dept => (
                            <DepartmentGrid
                                key={dept.id}
                                department={dept}
                                isRTL={isRTL}
                                color="emerald"
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ============================================================================
// DEPARTMENT GRID COMPONENT
// ============================================================================

interface DepartmentGridProps {
    department: OrgDepartment
    isRTL: boolean
    color?: 'emerald' | 'violet'
}

function DepartmentGrid({ department, isRTL, color = 'emerald' }: DepartmentGridProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const colorClasses = {
        emerald: 'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
        violet: 'from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600'
    }

    // Get all employees from role groups
    const allEmployees = department.roleGroups.flatMap(rg => rg.employees)

    return (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "w-full flex items-center justify-between p-2.5 text-white",
                    `bg-gradient-to-r ${colorClasses[color]}`
                )}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium">{department.name}</span>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-xs">
                    {department.totalEmployees}
                </Badge>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-3"
                    >
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {allEmployees.map(emp => (
                                <EmployeeCard key={emp.id} profile={toProfile(emp)} isRTL={isRTL} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
