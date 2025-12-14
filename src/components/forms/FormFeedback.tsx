import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

interface FormFeedbackProps {
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    className?: string
}

/**
 * Inline form feedback for displaying validation messages
 */
export function FormFeedback({ type, message, className }: FormFeedbackProps) {
    const styles = {
        success: 'text-green-600 bg-green-50 border-green-200',
        error: 'text-red-600 bg-red-50 border-red-200',
        warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        info: 'text-blue-600 bg-blue-50 border-blue-200'
    }

    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        warning: AlertTriangle,
        info: Info
    }

    const Icon = icons[type]

    return (
        <div className={cn(
            "flex items-center gap-2 p-3 text-sm rounded-md border",
            styles[type],
            className
        )}>
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{message}</span>
        </div>
    )
}

interface FieldErrorProps {
    message?: string
    className?: string
}

/**
 * Field-level error message
 */
export function FieldError({ message, className }: FieldErrorProps) {
    if (!message) return null

    return (
        <p className={cn("text-xs text-red-500 mt-1 flex items-center gap-1", className)}>
            <AlertCircle className="h-3 w-3" />
            {message}
        </p>
    )
}

interface FieldHintProps {
    children: React.ReactNode
    className?: string
}

/**
 * Field-level hint text
 */
export function FieldHint({ children, className }: FieldHintProps) {
    return (
        <p className={cn("text-xs text-gray-500 mt-1", className)}>
            {children}
        </p>
    )
}

interface RequiredIndicatorProps {
    className?: string
}

/**
 * Required field indicator
 */
export function RequiredIndicator({ className }: RequiredIndicatorProps) {
    return (
        <span className={cn("text-red-500 ml-1", className)} aria-label="required">
            *
        </span>
    )
}

interface FormSectionProps {
    title?: string
    description?: string
    children: React.ReactNode
    className?: string
}

/**
 * Form section with title and description
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {(title || description) && (
                <div className="space-y-1">
                    {title && <h3 className="text-lg font-semibold">{title}</h3>}
                    {description && <p className="text-sm text-gray-500">{description}</p>}
                </div>
            )}
            {children}
        </div>
    )
}

interface FormActionsProps {
    children: React.ReactNode
    className?: string
    align?: 'left' | 'right' | 'center' | 'between'
}

/**
 * Form action buttons container
 */
export function FormActions({ children, className, align = 'right' }: FormActionsProps) {
    const alignmentClasses = {
        left: 'justify-start',
        right: 'justify-end',
        center: 'justify-center',
        between: 'justify-between'
    }

    return (
        <div className={cn(
            "flex items-center gap-3 pt-4",
            alignmentClasses[align],
            className
        )}>
            {children}
        </div>
    )
}

interface CharacterCountProps {
    current: number
    max: number
    className?: string
}

/**
 * Character count indicator for text inputs
 */
export function CharacterCount({ current, max, className }: CharacterCountProps) {
    const isOverLimit = current > max
    const isNearLimit = current > max * 0.9

    return (
        <span className={cn(
            "text-xs",
            isOverLimit ? "text-red-500 font-medium" : isNearLimit ? "text-yellow-600" : "text-gray-400",
            className
        )}>
            {current}/{max}
        </span>
    )
}
