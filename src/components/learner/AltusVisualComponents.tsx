import React from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// ALTUS MASTER DESIGN TOKENS
// ============================================================================
export const ALTUS_COLORS = {
    obsidian950: '#070A0F',
    obsidian900: '#0B0F17',
    slate800: '#1E293B',
    gold500: '#EAB308',
    gold600: '#CA8A04',
    emerald500: '#10B981',
    crimson500: '#EF4444',
    white: '#FFFFFF',
} as const

// ============================================================================
// FAMILY 03 — DYNAMIC LEARNING PROGRESS RING (SVG COMPONENT)
// ============================================================================
interface AltusProgressRingProps {
    percentage: number
    size?: number
    strokeWidth?: number
    className?: string
    showLabel?: boolean
    labelClassName?: string
}

export const AltusProgressRing: React.FC<AltusProgressRingProps> = ({
    percentage,
    size = 120,
    strokeWidth = 10,
    className,
    showLabel = true,
    labelClassName,
}) => {
    const clamped = Math.min(100, Math.max(0, percentage))
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (clamped / 100) * circumference

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <defs>
                    <linearGradient id="altusGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FDE047" />
                        <stop offset="60%" stopColor="#EAB308" />
                        <stop offset="100%" stopColor="#CA8A04" />
                    </linearGradient>
                    <filter id="altusGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#EAB308" floodOpacity="0.4" />
                    </filter>
                </defs>

                {/* Background Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    className="text-slate-200/20 dark:text-slate-800/80"
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {/* Active Progress */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#altusGoldGradient)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                    filter="url(#altusGlow)"
                    className="transition-all duration-700 ease-out"
                />
            </svg>

            {showLabel && (
                <div className={cn("absolute inset-0 flex flex-col items-center justify-center text-center", labelClassName)}>
                    <span className="font-mono text-xl font-black text-foreground tracking-tight">
                        {Math.round(clamped)}%
                    </span>
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                        ALTUS
                    </span>
                </div>
            )}
        </div>
    )
}

// ============================================================================
// FAMILY 03 — FORBES 5-STAR ACCREDITATION SEAL (SVG COMPONENT)
// ============================================================================
interface AltusAccreditationSealProps {
    size?: number
    className?: string
}

export const AltusAccreditationSeal: React.FC<AltusAccreditationSealProps> = ({
    size = 64,
    className,
}) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
            <linearGradient id="altusGoldFoil" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="50%" stopColor="#EAB308" />
                <stop offset="100%" stopColor="#A16207" />
            </linearGradient>
            <radialGradient id="sealInterior" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0B0F17" />
                <stop offset="100%" stopColor="#070A0F" />
            </radialGradient>
        </defs>
        {/* Outer Fluted Rim */}
        <circle cx="32" cy="32" r="30" stroke="url(#altusGoldFoil)" strokeWidth="1.5" strokeDasharray="2 1" fill="none" />
        <circle cx="32" cy="32" r="28" stroke="url(#altusGoldFoil)" strokeWidth="2.5" fill="url(#sealInterior)" />
        <circle cx="32" cy="32" r="22" stroke="#CA8A04" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.6" />
        {/* 5-Pointed Star of Excellence */}
        <path
            d="M32 16L36.2 24.8L45.9 26.2L38.9 33L40.6 42.7L32 38.1L23.4 42.7L25.1 33L18.1 26.2L27.8 24.8L32 16Z"
            fill="url(#altusGoldFoil)"
            stroke="#713F12"
            strokeWidth="0.8"
            strokeLinejoin="round"
        />
    </svg>
)

// ============================================================================
// FAMILY 04 — VERIFIED SOP COMPLIANCE SHIELD (SVG COMPONENT)
// ============================================================================
interface AltusComplianceShieldProps {
    size?: number
    className?: string
    isVerified?: boolean
}

export const AltusComplianceShield: React.FC<AltusComplianceShieldProps> = ({
    size = 48,
    className,
    isVerified = true,
}) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
            <linearGradient id="emeraldShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="goldShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
        </defs>
        <path
            d="M32 8L50 15V29C50 42 42 51 32 56C22 51 14 42 14 29V15L32 8Z"
            fill="#0B0F17"
            stroke={isVerified ? "url(#emeraldShieldGrad)" : "url(#goldShieldGrad)"}
            strokeWidth="2.5"
        />
        {isVerified ? (
            <path
                d="M24 31L29 36L40 25"
                stroke="url(#emeraldShieldGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        ) : (
            <circle cx="32" cy="32" r="5" fill="url(#goldShieldGrad)" />
        )}
    </svg>
)

// ============================================================================
// FAMILY 06 — STRATEGIC LEADERSHIP COMPASS (SVG COMPONENT)
// ============================================================================
interface AltusLeadershipCompassProps {
    size?: number
    className?: string
}

export const AltusLeadershipCompass: React.FC<AltusLeadershipCompassProps> = ({
    size = 48,
    className,
}) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
            <linearGradient id="compassFoil" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="21" stroke="url(#compassFoil)" strokeWidth="1.5" fill="#0B0F17" />
        <circle cx="24" cy="24" r="17" stroke="#CA8A04" strokeWidth="0.75" strokeDasharray="2 2" fill="none" opacity="0.6" />
        {/* Cardinal Points */}
        <line x1="24" y1="5" x2="24" y2="9" stroke="url(#compassFoil)" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="39" x2="24" y2="43" stroke="url(#compassFoil)" strokeWidth="2" strokeLinecap="round" />
        <line x1="5" y1="24" x2="9" y2="24" stroke="url(#compassFoil)" strokeWidth="2" strokeLinecap="round" />
        <line x1="39" y1="24" x2="43" y2="24" stroke="url(#compassFoil)" strokeWidth="2" strokeLinecap="round" />
        {/* Gyro Needle */}
        <polygon points="24,11 27,24 24,22 21,24" fill="#EAB308" />
        <polygon points="24,37 27,24 24,26 21,24" fill="#64748B" />
        <circle cx="24" cy="24" r="2.5" fill="#FFFFFF" stroke="#CA8A04" strokeWidth="1" />
    </svg>
)

// ============================================================================
// FAMILY 08 — ICONOGRAPHY & MICRO-ASSET VECTOR SYSTEM (12 VECTOR ICONS)
// ============================================================================

export interface AltusIconProps {
    size?: number
    className?: string
}

export const AltusCourseIcon: React.FC<AltusIconProps> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M4 19.5V4.5C4 3.67 4.67 3 5.5 3H19C19.55 3 20 3.45 20 4V20C20 20.55 19.55 21 19 21H5.5C4.67 21 4 20.33 4 19.5Z" stroke="#EAB308" strokeWidth="1.8" />
        <path d="M4 18H19" stroke="#CA8A04" strokeWidth="1.5" />
        <path d="M9 7H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 11H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="11" r="1.5" fill="#EAB308" />
    </svg>
)

export const AltusLessonIcon: React.FC<AltusIconProps> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="4" stroke="#EAB308" strokeWidth="1.8" />
        <polygon points="10,8 16,12 10,16" fill="#EAB308" />
    </svg>
)

export const AltusQuizIcon: React.FC<AltusIconProps> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="4" y="3" width="16" height="18" rx="3" stroke="#CA8A04" strokeWidth="1.8" />
        <path d="M9 9C9 7.9 9.9 7 11 7H12.5C13.6 7 14.5 7.9 14.5 9C14.5 10.5 12 11.5 12 13" stroke="#EAB308" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="#EAB308" />
    </svg>
)

export const AltusAssessmentIcon: React.FC<AltusIconProps> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M9 3H15M9 3V5H15V3M9 3H6C4.9 3 4 3.9 4 5V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V5C20 3.9 19.1 3 18 3H15" stroke="#EAB308" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 11L10.5 13.5L16 8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
)

export const AltusCertificateIcon: React.FC<AltusIconProps> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="10" r="6" stroke="#EAB308" strokeWidth="2" fill="#0B0F17" />
        <path d="M12 7L13 9H15L13.5 10.2L14 12L12 11L10 12L10.5 10.2L9 9H11L12 7Z" fill="#EAB308" />
        <path d="M8 15L6 21L12 19L18 21L16 15" stroke="#CA8A04" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="#070A0F" />
    </svg>
)

export const AltusStreakFlameIcon: React.FC<AltusIconProps> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 2C9.5 6 14 9 11 14C10.5 11 8.5 10 7 12C5 14.5 6 18.5 9 21C14 23 20 19 19 13C18 7 13.5 5 12 2Z" fill="#EAB308" />
        <path d="M12 11C11 13 13 15 11.5 17C10 18.5 11.5 20.5 13 20C15 19 16 16.5 15 14.5C14.5 13 13 12 12 11Z" fill="#CA8A04" />
    </svg>
)

export const AltusFrontOfficeIcon: React.FC<AltusIconProps> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="3" y="11" width="18" height="9" rx="2" stroke="#EAB308" strokeWidth="1.8" />
        <path d="M8 11V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V11" stroke="#CA8A04" strokeWidth="1.8" />
        <circle cx="12" cy="15" r="1.5" fill="#EAB308" />
    </svg>
)

export const AltusHousekeepingIcon: React.FC<AltusIconProps> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M3 17V8C3 6.9 3.9 6 5 6H19C20.1 6 21 6.9 21 8V17" stroke="#EAB308" strokeWidth="1.8" />
        <path d="M3 14H21" stroke="#CA8A04" strokeWidth="1.5" />
        <path d="M6 10H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 10H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M2 19H22" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" />
    </svg>
)

export const AltusCulinaryIcon: React.FC<AltusIconProps> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M3 18H21" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" />
        <path d="M5 18C5 12 8 8 12 8C16 8 19 12 19 18" stroke="#CA8A04" strokeWidth="1.8" />
        <circle cx="12" cy="6" r="2" fill="#EAB308" />
        <path d="M9 13C10 13.5 11 13.5 12 13C13 12.5 14 12.5 15 13" stroke="#EAB308" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
)

export const AltusSecurityIcon: React.FC<AltusIconProps> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 3L20 6.5V12C20 17 16.5 20.5 12 22C7.5 20.5 4 17 4 12V6.5L12 3Z" stroke="#EAB308" strokeWidth="1.8" />
        <circle cx="12" cy="11" r="2" fill="#EAB308" />
        <line x1="12" y1="13" x2="12" y2="16" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" />
    </svg>
)

// ============================================================================
// LUXURY SECTION DIVIDER (SVG COMPONENT)
// ============================================================================
export const AltusGoldDivider: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn("flex items-center justify-center my-6 w-full max-w-lg mx-auto", className)}>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-amber-500" />
        <div className="mx-3 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rotate-45 bg-amber-500 shadow-sm shadow-amber-500/50" />
            <div className="h-2 w-2 rotate-45 border border-amber-500 bg-background" />
            <div className="h-1.5 w-1.5 rotate-45 bg-amber-500 shadow-sm shadow-amber-500/50" />
        </div>
        <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-amber-500/40 to-amber-500" />
    </div>
)

// ============================================================================
// REUSABLE ASSET SHOWCASE CARD
// ============================================================================
interface AltusAssetBadgeProps {
    title: string
    subtitle?: string
    assetSrc: string
    size?: 'sm' | 'md' | 'lg'
    className?: string
    onClick?: () => void
}

export const AltusAssetBadge: React.FC<AltusAssetBadgeProps> = ({
    title,
    subtitle,
    assetSrc,
    size = 'md',
    className,
    onClick,
}) => {
    const sizeClasses = {
        sm: 'p-2 gap-2 text-xs',
        md: 'p-3.5 gap-3 text-sm',
        lg: 'p-5 gap-4 text-base',
    }[size]

    const imgSizes = {
        sm: 'h-10 w-10',
        md: 'h-14 w-14',
        lg: 'h-20 w-20',
    }[size]

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative flex items-center rounded-2xl border border-amber-500/20",
                "bg-gradient-to-br from-card via-card/95 to-amber-500/[0.04]",
                "backdrop-blur-xl shadow-sm transition-all duration-300",
                "hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10",
                onClick && "cursor-pointer",
                sizeClasses,
                className
            )}
        >
            <div className={cn("relative overflow-hidden rounded-xl bg-slate-950/80 border border-white/10 shrink-0 shadow-inner", imgSizes)}>
                <img
                    src={assetSrc}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
            </div>
            <div className="min-w-0 flex-1">
                <h4 className="font-display font-bold text-foreground truncate leading-snug">
                    {title}
                </h4>
                {subtitle && (
                    <p className="text-[11px] font-medium text-muted-foreground truncate mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    )
}
