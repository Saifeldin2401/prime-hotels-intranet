import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    LayoutGrid,
    Search,
    Bookmark,
    Clock,
    BookOpen,
    ClipboardList,
    FileText,
    CheckSquare,
    HelpCircle,
    Video,
    Image,
    Link2,
    ChevronRight,
    Star,
    Library,
    Building2,
    Briefcase
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useDepartmentContentCounts, useContentTypeCounts } from '@/hooks/useKnowledge'
import { type KnowledgeContentType } from '@/types/knowledge'

interface NavItemProps {
    icon: any
    label: string
    href: string
    active?: boolean
    badge?: number | string
    className?: string
}

function NavItem({ icon: Icon, label, href, active, badge, className }: NavItemProps) {
    return (
        <Link to={href} className="block group">
            <div className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200",
                "hover:bg-hotel-navy/5 group-hover:translate-x-1",
                active ? "bg-hotel-navy text-white hover:bg-hotel-navy shadow-sm" : "text-gray-600",
                className
            )}>
                <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", active ? "text-hotel-gold" : "text-gray-400 group-hover:text-hotel-navy")} />
                    <span className="text-sm font-medium">{label}</span>
                </div>
                {badge !== undefined && (
                    <Badge variant={active ? "outline" : "secondary"} className={cn(
                        "text-[10px] px-1.5 h-4 min-w-4 flex items-center justify-center border-none",
                        active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    )}>
                        {badge}
                    </Badge>
                )}
            </div>
        </Link>
    )
}

export function KnowledgeSidebar() {
    const { t } = useTranslation('knowledge')
    const { user, departments, primaryRole } = useAuth()
    const [searchParams] = useSearchParams()

    // Filters from URL
    const activeType = searchParams.get('type')
    const activeDept = searchParams.get('department')
    const isFeatured = searchParams.get('featured') === 'true'
    const isLibrary = !activeType && !activeDept && !isFeatured

    const { data: deptCounts } = useDepartmentContentCounts()
    const { data: typeCounts } = useContentTypeCounts()

    const CONTENT_TYPES: { type: KnowledgeContentType; icon: any }[] = [
        { type: 'sop', icon: ClipboardList },
        { type: 'policy', icon: FileText },
        { type: 'guide', icon: BookOpen },
        { type: 'checklist', icon: CheckSquare },
        { type: 'reference', icon: Link2 },
        { type: 'faq', icon: HelpCircle },
        { type: 'video', icon: Video },
        { type: 'visual', icon: Image }
    ]

    return (
        <div className="w-64 flex flex-col h-full bg-white border-r border-gray-100">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-50">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-hotel-navy flex items-center justify-center shadow-lg">
                        <Library className="h-4 w-4 text-hotel-gold" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-hotel-navy uppercase tracking-wider">{t('library.nav_title', 'Knowledge Library')}</h2>
                        <p className="text-[10px] text-gray-400 font-medium">{t('library.version', 'PRIME CONNECT v2')}</p>
                    </div>
                </div>
                <Link to="/knowledge/search" className="block">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400 group-hover:text-hotel-navy transition-colors" />
                        </div>
                        <div className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-400 group-hover:bg-white group-hover:border-hotel-gold/30 group-hover:shadow-sm transition-all">
                            {t('library.quick_search', 'Quick Search...')}
                        </div>
                    </div>
                </Link>
            </div>

            <ScrollArea className="flex-1 px-3 py-4">
                <div className="space-y-6">
                    {/* General */}
                    <div className="space-y-1">
                        <NavItem
                            icon={LayoutGrid}
                            label={t('library.all_knowledge', 'All Knowledge')}
                            href="/knowledge/search"
                            active={isLibrary}
                        />
                        <NavItem
                            icon={Star}
                            label={t('library.featured', 'Featured')}
                            href="/knowledge/search?featured=true"
                            active={isFeatured}
                        />
                        <NavItem
                            icon={Bookmark}
                            label={t('library.bookmarks', 'My Bookmarks')}
                            href="/knowledge/search?bookmarks=true"
                            active={searchParams.get('bookmarks') === 'true'}
                        />
                    </div>

                    {/* Departments */}
                    <div className="space-y-2">
                        <h3 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                            {t('library.departments', 'Departments')}
                            <Briefcase className="h-3 w-3" />
                        </h3>
                        <div className="space-y-1">
                            {Object.entries(deptCounts || {}).map(([id, dept]: [string, any]) => (
                                <NavItem
                                    key={id}
                                    icon={Building2}
                                    label={dept.name}
                                    href={`/knowledge/search?department=${id}`}
                                    active={activeDept === id}
                                    badge={dept.total}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Content Types */}
                    <div className="space-y-2">
                        <h3 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                            {t('library.types', 'Content Types')}
                            <LayoutGrid className="h-3 w-3" />
                        </h3>
                        <div className="space-y-1">
                            {CONTENT_TYPES.map(({ type, icon }) => {
                                const count = (typeCounts as any)?.[type] || 0
                                return (
                                    <NavItem
                                        key={type}
                                        icon={icon}
                                        label={t(`content_types.${type}`, type)}
                                        href={`/knowledge/search?type=${type}`}
                                        active={activeType === type}
                                        badge={count > 0 ? count : undefined}
                                    />
                                )
                            })}
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {/* User Context Bottom */}
            {user && (
                <div className="p-4 bg-hotel-navy/5 border-t border-hotel-gold/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-hotel-navy flex items-center justify-center text-white text-xs font-bold ring-2 ring-hotel-gold/20">
                            {user.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-hotel-navy truncate">
                                {t('library.my_dept', 'My Dept: {{name}}', { name: departments?.[0]?.name || 'N/A' })}
                            </p>
                            {primaryRole !== 'staff' && (
                                <Link to="/knowledge/create" className="text-[10px] text-hotel-gold font-bold hover:underline">
                                    + {t('library.create_new', 'Create New Article')}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
