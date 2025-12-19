import { useState } from 'react'
import { ChevronRight, ChevronDown, User, Users, Building2, Briefcase, MoreVertical, Edit, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { OrgTreeNode } from '@/hooks/useOrganization'
import { useTranslation } from 'react-i18next'

interface OrgChartTreeProps {
    nodes: OrgTreeNode[]
    onNodeClick?: (node: OrgTreeNode) => void
    onEditNode?: (node: OrgTreeNode) => void
    selectedNodeId?: string
    expandedByDefault?: boolean
}

export function OrgChartTree({
    nodes,
    onNodeClick,
    onEditNode,
    selectedNodeId,
    expandedByDefault = true
}: OrgChartTreeProps) {
    return (
        <div className="space-y-1">
            {nodes.map((node) => (
                <OrgTreeNodeItem
                    key={node.id}
                    node={node}
                    onNodeClick={onNodeClick}
                    onEditNode={onEditNode}
                    selectedNodeId={selectedNodeId}
                    defaultExpanded={expandedByDefault}
                    level={0}
                />
            ))}
        </div>
    )
}

interface OrgTreeNodeItemProps {
    node: OrgTreeNode
    onNodeClick?: (node: OrgTreeNode) => void
    onEditNode?: (node: OrgTreeNode) => void
    selectedNodeId?: string
    defaultExpanded: boolean
    level: number
}

function OrgTreeNodeItem({
    node,
    onNodeClick,
    onEditNode,
    selectedNodeId,
    defaultExpanded,
    level
}: OrgTreeNodeItemProps) {
    const { t } = useTranslation('admin')
    const [isExpanded, setIsExpanded] = useState(defaultExpanded && level < 3)
    const hasChildren = node.children && node.children.length > 0
    const isSelected = selectedNodeId === node.id

    const getDepthColor = (depth: number) => {
        const colors = [
            'border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/10',
            'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
            'border-l-green-500 bg-green-50/50 dark:bg-green-900/10',
            'border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10',
            'border-l-pink-500 bg-pink-50/50 dark:bg-pink-900/10',
        ]
        return colors[depth % colors.length]
    }

    return (
        <div className="select-none">
            <div
                className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border-l-4 transition-all cursor-pointer hover:shadow-sm",
                    getDepthColor(node.depth),
                    isSelected && "ring-2 ring-primary ring-offset-1"
                )}
                style={{ marginLeft: `${level * 24}px` }}
                onClick={() => onNodeClick?.(node)}
            >
                {/* Expand/Collapse Toggle */}
                <button
                    className={cn(
                        "p-1 rounded hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors",
                        !hasChildren && "invisible"
                    )}
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsExpanded(!isExpanded)
                    }}
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                </button>

                {/* Avatar/Icon */}
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                    node.depth === 0 ? "bg-purple-600" :
                        node.depth === 1 ? "bg-blue-600" :
                            node.depth === 2 ? "bg-green-600" : "bg-gray-500"
                )}>
                    {node.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                </div>

                {/* Name and Title */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                            {node.full_name}
                        </span>
                        {hasChildren && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                                <Users className="h-3 w-3 mr-1" />
                                {node.children.length}
                            </Badge>
                        )}
                    </div>
                    {node.job_title && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {node.job_title}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100 hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onNodeClick?.(node)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('organization.view_details', 'View Details')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditNode?.(node)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('organization.edit_reporting', 'Edit Reporting Line')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
                <div className="mt-1">
                    {node.children.map((child) => (
                        <OrgTreeNodeItem
                            key={child.id}
                            node={child}
                            onNodeClick={onNodeClick}
                            onEditNode={onEditNode}
                            selectedNodeId={selectedNodeId}
                            defaultExpanded={defaultExpanded}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// Stats component for hierarchy overview
interface OrgChartStatsProps {
    nodes: OrgTreeNode[]
}

export function OrgChartStats({ nodes }: OrgChartStatsProps) {
    const { t } = useTranslation('admin')

    // Calculate stats from flat list
    const flatNodes = flattenTree(nodes)
    const totalEmployees = flatNodes.length
    const topLevel = flatNodes.filter(n => n.depth === 0).length
    const maxDepth = Math.max(...flatNodes.map(n => n.depth), 0)
    const avgReports = totalEmployees > topLevel
        ? Math.round((totalEmployees - topLevel) / Math.max(flatNodes.filter(n => n.children?.length > 0).length, 1))
        : 0

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{t('organization.total_employees', 'Total Employees')}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalEmployees}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">{t('organization.top_level', 'Top Level')}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{topLevel}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-sm">{t('organization.hierarchy_depth', 'Hierarchy Depth')}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{maxDepth + 1}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{t('organization.avg_direct_reports', 'Avg. Direct Reports')}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgReports}</p>
            </div>
        </div>
    )
}

// Helper to flatten tree for stats
function flattenTree(nodes: OrgTreeNode[]): OrgTreeNode[] {
    const result: OrgTreeNode[] = []
    const traverse = (node: OrgTreeNode) => {
        result.push(node)
        node.children?.forEach(traverse)
    }
    nodes.forEach(traverse)
    return result
}
