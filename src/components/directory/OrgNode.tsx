import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
    Mail,
    Phone,
    Crown,
    Building2,
    UserCog,
    User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrgEmployee } from '@/hooks/useOrgHierarchy'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import 'react-lazy-load-image-component/src/effects/blur.css'

interface OrgNodeProps {
    employee: OrgEmployee
    variant?: 'corporate' | 'manager' | 'staff'
    directReports?: number
    isExpanded?: boolean
    onToggle?: () => void
    onClick?: () => void
    isRTL?: boolean
    compact?: boolean
}

const variantStyles = {
    corporate: {
        bg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
        border: 'border-indigo-300 hover:border-indigo-400',
        badge: 'bg-indigo-100 text-indigo-800',
        icon: Crown,
        size: 'w-56'
    },
    manager: {
        bg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
        border: 'border-blue-300 hover:border-blue-400',
        badge: 'bg-blue-100 text-blue-800',
        icon: UserCog,
        size: 'w-52'
    },
    staff: {
        bg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
        border: 'border-emerald-300 hover:border-emerald-400',
        badge: 'bg-emerald-100 text-emerald-800',
        icon: User,
        size: 'w-48'
    }
}

export function OrgNode({
    employee,
    variant = 'staff',
    directReports = 0,
    isExpanded = false,
    onToggle,
    onClick,
    isRTL = false,
    compact = false
}: OrgNodeProps) {
    const [showDetails, setShowDetails] = useState(false)
    const [imageError, setImageError] = useState(false)
    const styles = variantStyles[variant]
    const Icon = styles.icon

    const initials = employee.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || '??'

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onClick) onClick()
        else if (onToggle) onToggle()
    }

    // Compact view - just avatar + name
    if (compact) {
        return (
            <motion.button
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg border",
                    "bg-white hover:bg-gray-50 transition-colors cursor-pointer",
                    styles.border
                )}
                title={employee.job_title || undefined}
            >
                <Avatar className="h-6 w-6">
                    {!imageError && employee.avatar_url ? (
                        <LazyLoadImage
                            alt={employee.full_name}
                            src={employee.avatar_url}
                            effect="blur"
                            className="aspect-square h-full w-full object-cover rounded-full"
                            wrapperClassName="aspect-square h-full w-full"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-[10px] font-medium">
                            {initials}
                        </AvatarFallback>
                    )}
                </Avatar>
                <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                    {employee.full_name}
                </span>
            </motion.button>
        )
    }

    // Full card view
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
                "relative rounded-xl border-2 shadow-lg overflow-hidden cursor-pointer transition-all duration-200",
                styles.size,
                styles.border,
                showDetails ? 'ring-2 ring-offset-2 ring-primary' : 'hover:shadow-xl hover:-translate-y-1'
            )}
            onMouseEnter={() => setShowDetails(true)}
            onMouseLeave={() => setShowDetails(false)}
            onClick={handleClick}
        >
            {/* Header with gradient */}
            <div className={cn("h-12 relative", styles.bg)}>
                {/* Role icon badge */}
                <div className="absolute top-2 right-2">
                    <Icon className="h-4 w-4 text-white/80" />
                </div>

                <Avatar className={cn(
                    "h-16 w-16 absolute -bottom-8 left-1/2 -translate-x-1/2",
                    "border-4 border-white shadow-md"
                )}>
                    {!imageError && employee.avatar_url ? (
                        <LazyLoadImage
                            alt={employee.full_name}
                            src={employee.avatar_url}
                            effect="blur"
                            className="aspect-square h-full w-full object-cover rounded-full"
                            wrapperClassName="aspect-square h-full w-full"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <AvatarFallback className="bg-white text-slate-700 text-sm font-semibold">
                            {initials}
                        </AvatarFallback>
                    )}
                </Avatar>
            </div>

            {/* Content */}
            <div className="pt-10 pb-3 px-3 text-center">
                <h4 className="font-semibold text-sm text-gray-900 truncate" title={employee.full_name}>
                    {employee.full_name}
                </h4>

                {employee.job_title && (
                    <p className="text-xs text-gray-500 truncate mt-0.5" title={employee.job_title}>
                        {employee.job_title}
                    </p>
                )}

                {/* Role badge */}
                {employee.roles?.[0] && (
                    <Badge
                        variant="secondary"
                        className={cn("text-[10px] px-1.5 py-0 mt-1.5 font-medium capitalize", styles.badge)}
                    >
                        {employee.roles[0].replace(/_/g, ' ')}
                    </Badge>
                )}
            </div>

            {/* Expanded details on hover */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-3 pb-3 border-t border-gray-100"
                    >
                        <div className="space-y-1.5 pt-2.5">
                            {employee.email && (
                                <a
                                    href={`mailto:${employee.email}`}
                                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{employee.email}</span>
                                </a>
                            )}
                            {employee.phone && (
                                <a
                                    href={`tel:${employee.phone}`}
                                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary"
                                    onClick={(e) => e.stopPropagation()}
                                    dir="ltr"
                                >
                                    <Phone className="h-3 w-3" />
                                    <span>{employee.phone}</span>
                                </a>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
