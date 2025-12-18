import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { OrgNode } from './OrgNode'
import { EmployeeAssignmentDialog } from './EmployeeAssignmentDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
    Building2,
    Hotel,
    Users,
    ChevronDown,
    ChevronRight,
    Expand,
    Shrink,
    MapPin,
    Phone,
    Crown,
    Briefcase,
    UserCog,
    User,
    Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type {
    OrgHierarchy,
    OrgProperty,
    OrgDepartment,
    OrgEmployee,
    OrgRoleGroup,
    OrgCorporate
} from '@/hooks/useOrgHierarchy'
import { useTranslation } from 'react-i18next'

interface OrgPyramidProps {
    hierarchy: OrgHierarchy
    isRTL?: boolean
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
}

// Role level icons and colors
const roleLevelConfig = {
    head: { icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50' },
    supervisor: { icon: UserCog, color: 'text-blue-600', bg: 'bg-blue-50' },
    staff: { icon: User, color: 'text-gray-600', bg: 'bg-gray-50' }
}

export function OrgPyramid({ hierarchy, isRTL = false }: OrgPyramidProps) {
    const { t } = useTranslation('directory')
    const { primaryRole } = useAuth()
    const navigate = useNavigate()
    const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set())
    const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set())
    const [expandedRoleGroups, setExpandedRoleGroups] = useState<Set<string>>(new Set())
    const [expandAll, setExpandAll] = useState(false)

    // Admin mode state
    const isAdmin = ['regional_admin', 'regional_hr', 'property_manager', 'property_hr'].includes(primaryRole || '')
    const [adminMode, setAdminMode] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<OrgEmployee | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const toggleProperty = (id: string) => {
        setExpandedProperties(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleDepartment = (id: string) => {
        setExpandedDepartments(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleRoleGroup = (key: string) => {
        setExpandedRoleGroups(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const handleExpandAll = () => {
        if (expandAll) {
            setExpandedProperties(new Set())
            setExpandedDepartments(new Set())
            setExpandedRoleGroups(new Set())
        } else {
            setExpandedProperties(new Set(hierarchy.properties.map(p => p.id)))
            const allDepts = hierarchy.properties.flatMap(p => p.departments.map(d => d.id))
            setExpandedDepartments(new Set(allDepts))
            // Expand all role groups
            const allRoleGroups = hierarchy.properties.flatMap(p =>
                p.departments.flatMap(d =>
                    d.roleGroups.map(rg => `${d.id}-${rg.level}`)
                )
            )
            setExpandedRoleGroups(new Set(allRoleGroups))
        }
        setExpandAll(!expandAll)
    }

    // Find employee by ID from hierarchy
    const findEmployee = (employeeId: string): OrgEmployee | null => {
        // Check executives
        const exec = hierarchy.corporate.executives.find(e => e.id === employeeId)
        if (exec) return exec

        // Check shared services
        for (const dept of hierarchy.corporate.sharedServices) {
            for (const group of dept.roleGroups) {
                const found = group.employees.find(e => e.id === employeeId)
                if (found) return found
            }
        }

        // Check properties
        for (const prop of hierarchy.properties) {
            if (prop.generalManager?.id === employeeId) return prop.generalManager
            for (const dept of prop.departments) {
                for (const group of dept.roleGroups) {
                    const found = group.employees.find(e => e.id === employeeId)
                    if (found) return found
                }
            }
        }

        // Check unassigned
        return hierarchy.unassigned.find(e => e.id === employeeId) || null
    }

    const handleEmployeeClick = (employeeId: string) => {
        if (adminMode) {
            const employee = findEmployee(employeeId)
            if (employee) {
                setSelectedEmployee(employee)
                setDialogOpen(true)
            }
        }
    }

    return (
        <div className="space-y-8 pb-8">
            {/* Header Controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                        <Users className="h-4 w-4 mr-1.5" />
                        {hierarchy.totalEmployees} {t('employees', 'Employees')}
                    </Badge>

                    {/* Admin Mode Toggle */}
                    {isAdmin && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                            <Settings className="h-4 w-4 text-amber-600" />
                            <Label htmlFor="admin-mode" className="text-sm font-medium text-amber-800 cursor-pointer">
                                {t('manage_mode', 'Manage')}
                            </Label>
                            <Switch
                                id="admin-mode"
                                checked={adminMode}
                                onCheckedChange={setAdminMode}
                                className="data-[state=checked]:bg-amber-500"
                            />
                        </div>
                    )}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExpandAll}
                    className="gap-1.5"
                >
                    {expandAll ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                    {expandAll ? t('collapse_all', 'Collapse All') : t('expand_all', 'Expand All')}
                </Button>
            </div>

            {/* Admin Mode Indicator */}
            {adminMode && (
                <div className="bg-amber-100 border border-amber-300 rounded-lg px-4 py-2 text-amber-800 text-sm">
                    <strong>{t('admin_mode_active', 'Manage Mode Active')}:</strong> {t('click_employee_to_edit', 'Click any employee to edit their assignment')}
                </div>
            )}

            {/* Employee Assignment Dialog */}
            <EmployeeAssignmentDialog
                employee={selectedEmployee}
                isOpen={dialogOpen}
                onClose={() => {
                    setDialogOpen(false)
                    setSelectedEmployee(null)
                }}
            />

            {/* ================================================================== */}
            {/* CORPORATE LEVEL */}
            {/* ================================================================== */}
            {(hierarchy.corporate.executives.length > 0 || hierarchy.corporate.sharedServices.length > 0) && (
                <motion.section
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                >
                    {/* Corporate Header */}
                    <div className="flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-indigo-600" />
                        <h2 className="text-xl font-bold text-gray-900">
                            {t('corporate_level', 'Corporate Level')}
                        </h2>
                    </div>

                    {/* Corporate Executives */}
                    {hierarchy.corporate.executives.length > 0 && (
                        <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Crown className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-lg font-semibold text-indigo-900">
                                    {t('corporate_executives', 'Corporate Executives')}
                                </h3>
                                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                                    {hierarchy.corporate.executives.length}
                                </Badge>
                            </div>

                            <div className="flex flex-wrap gap-4 justify-center">
                                {hierarchy.corporate.executives.map(emp => (
                                    <motion.div key={emp.id} variants={itemVariants}>
                                        <OrgNode
                                            employee={emp}
                                            variant="corporate"
                                            isRTL={isRTL}
                                            onClick={() => handleEmployeeClick(emp.id)}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Corporate Shared Services */}
                    {hierarchy.corporate.sharedServices.length > 0 && (
                        <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Briefcase className="h-5 w-5 text-violet-600" />
                                <h3 className="text-lg font-semibold text-violet-900">
                                    {t('shared_services', 'Corporate Shared Services')}
                                </h3>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {hierarchy.corporate.sharedServices.map(dept => (
                                    <DepartmentCard
                                        key={dept.id}
                                        department={dept}
                                        isExpanded={expandedDepartments.has(dept.id)}
                                        onToggle={() => toggleDepartment(dept.id)}
                                        expandedRoleGroups={expandedRoleGroups}
                                        toggleRoleGroup={toggleRoleGroup}
                                        onEmployeeClick={handleEmployeeClick}
                                        variant="corporate"
                                        isRTL={isRTL}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Connector line to hotels */}
                    {hierarchy.properties.length > 0 && (
                        <div className="flex justify-center">
                            <div className="w-px h-12 bg-gradient-to-b from-indigo-300 to-blue-300" />
                        </div>
                    )}
                </motion.section>
            )}

            {/* ================================================================== */}
            {/* HOTEL / PROPERTY LEVEL */}
            {/* ================================================================== */}
            <motion.section
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
            >
                {hierarchy.properties.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Hotel className="h-6 w-6 text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-900">
                            {t('hotel_level', 'Hotel Properties')}
                        </h2>
                        <Badge variant="secondary">{hierarchy.properties.length}</Badge>
                    </div>
                )}

                {hierarchy.properties.map((property) => (
                    <PropertyCard
                        key={property.id}
                        property={property}
                        isExpanded={expandedProperties.has(property.id)}
                        onToggle={() => toggleProperty(property.id)}
                        expandedDepartments={expandedDepartments}
                        toggleDepartment={toggleDepartment}
                        expandedRoleGroups={expandedRoleGroups}
                        toggleRoleGroup={toggleRoleGroup}
                        onEmployeeClick={handleEmployeeClick}
                        isRTL={isRTL}
                    />
                ))}
            </motion.section>

            {/* Unassigned Employees */}
            {hierarchy.unassigned.length > 0 && (
                <motion.section
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4 pt-4 border-t border-dashed border-gray-300"
                >
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-gray-400" />
                        <h2 className="text-lg font-semibold text-gray-500">
                            {t('unassigned', 'Unassigned')}
                        </h2>
                        <Badge variant="outline">{hierarchy.unassigned.length}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {hierarchy.unassigned.map(emp => (
                            <motion.div key={emp.id} variants={itemVariants}>
                                <OrgNode
                                    employee={emp}
                                    variant="staff"
                                    isRTL={isRTL}
                                    onClick={() => handleEmployeeClick(emp.id)}
                                />
                            </motion.div>
                        ))}
                    </div>
                </motion.section>
            )}
        </div>
    )
}

// ============================================================================
// PROPERTY CARD COMPONENT
// ============================================================================

interface PropertyCardProps {
    property: OrgProperty
    isExpanded: boolean
    onToggle: () => void
    expandedDepartments: Set<string>
    toggleDepartment: (id: string) => void
    expandedRoleGroups: Set<string>
    toggleRoleGroup: (key: string) => void
    onEmployeeClick: (id: string) => void
    isRTL: boolean
}

function PropertyCard({
    property,
    isExpanded,
    onToggle,
    expandedDepartments,
    toggleDepartment,
    expandedRoleGroups,
    toggleRoleGroup,
    onEmployeeClick,
    isRTL
}: PropertyCardProps) {
    const { t } = useTranslation('directory')

    return (
        <motion.div
            variants={itemVariants}
            className="rounded-xl border-2 border-blue-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
        >
            {/* Property Header */}
            <button
                onClick={onToggle}
                className={cn(
                    "w-full flex items-center justify-between p-4",
                    "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
                    "hover:from-blue-600 hover:to-cyan-600 transition-colors"
                )}
            >
                <div className="flex items-center gap-4">
                    <Hotel className="h-8 w-8" />
                    <div className={cn("text-left", isRTL && "text-right")}>
                        <h3 className="font-bold text-lg">{property.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-blue-100">
                            {(property.city || property.country) && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {[property.city, property.country].filter(Boolean).join(', ')}
                                </span>
                            )}
                            {property.propertyCode && (
                                <span className="font-mono bg-white/20 px-1.5 rounded text-xs">
                                    {property.propertyCode}
                                </span>
                            )}
                            {property.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5" />
                                    {property.phone}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right text-blue-100 text-sm">
                        <div>{property.departments.length} {t('departments', 'Departments')}</div>
                        <div>{property.totalEmployees} {t('employees', 'Employees')}</div>
                    </div>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="h-6 w-6" />
                    </motion.div>
                </div>
            </button>

            {/* Property Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 space-y-4 bg-gradient-to-b from-blue-50 to-white">
                            {/* General Manager */}
                            {property.generalManager && (
                                <div className="flex flex-col items-center py-3 border-b border-blue-100">
                                    <Badge className="mb-2 bg-blue-600 text-white">
                                        {t('general_manager', 'General Manager')}
                                    </Badge>
                                    <OrgNode
                                        employee={property.generalManager}
                                        variant="manager"
                                        isRTL={isRTL}
                                        onClick={() => onEmployeeClick(property.generalManager!.id)}
                                    />
                                </div>
                            )}

                            {/* Departments Grid */}
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {property.departments.map(dept => (
                                    <DepartmentCard
                                        key={dept.id}
                                        department={dept}
                                        isExpanded={expandedDepartments.has(dept.id)}
                                        onToggle={() => toggleDepartment(dept.id)}
                                        expandedRoleGroups={expandedRoleGroups}
                                        toggleRoleGroup={toggleRoleGroup}
                                        onEmployeeClick={onEmployeeClick}
                                        variant="hotel"
                                        isRTL={isRTL}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ============================================================================
// DEPARTMENT CARD COMPONENT
// ============================================================================

interface DepartmentCardProps {
    department: OrgDepartment
    isExpanded: boolean
    onToggle: () => void
    expandedRoleGroups: Set<string>
    toggleRoleGroup: (key: string) => void
    onEmployeeClick: (id: string) => void
    variant: 'corporate' | 'hotel'
    isRTL: boolean
}

function DepartmentCard({
    department,
    isExpanded,
    onToggle,
    expandedRoleGroups,
    toggleRoleGroup,
    onEmployeeClick,
    variant,
    isRTL
}: DepartmentCardProps) {
    const { t } = useTranslation('directory')
    const colors = variant === 'corporate'
        ? { bg: 'from-violet-500 to-purple-500', hover: 'from-violet-600 to-purple-600', light: 'from-violet-50' }
        : { bg: 'from-emerald-500 to-teal-500', hover: 'from-emerald-600 to-teal-600', light: 'from-emerald-50' }

    return (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            {/* Department Header */}
            <button
                onClick={onToggle}
                className={cn(
                    "w-full flex items-center justify-between p-3",
                    `bg-gradient-to-r ${colors.bg} text-white`,
                    `hover:${colors.hover} transition-colors`
                )}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium">{department.name}</span>
                </div>
                <Badge className="bg-white/20 text-white border-0">
                    {department.totalEmployees}
                </Badge>
            </button>

            {/* Department Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className={`p-3 bg-gradient-to-b ${colors.light} to-white space-y-3`}>
                            {department.roleGroups.map(roleGroup => {
                                const key = `${department.id}-${roleGroup.level}`
                                const isGroupExpanded = expandedRoleGroups.has(key)
                                const config = roleLevelConfig[roleGroup.level]
                                const Icon = config.icon

                                return (
                                    <div key={roleGroup.level} className="space-y-2">
                                        <button
                                            onClick={() => toggleRoleGroup(key)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-2 rounded-md",
                                                config.bg, "hover:opacity-80 transition-opacity"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon className={cn("h-4 w-4", config.color)} />
                                                <span className={cn("text-sm font-medium", config.color)}>
                                                    {roleGroup.label}
                                                </span>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                                {roleGroup.employees.length}
                                            </Badge>
                                        </button>

                                        <AnimatePresence>
                                            {isGroupExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="flex flex-wrap gap-2 pl-6"
                                                >
                                                    {roleGroup.employees.map(emp => (
                                                        <OrgNode
                                                            key={emp.id}
                                                            employee={emp}
                                                            variant={roleGroup.level === 'head' ? 'manager' : 'staff'}
                                                            compact
                                                            isRTL={isRTL}
                                                            onClick={() => onEmployeeClick(emp.id)}
                                                        />
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
