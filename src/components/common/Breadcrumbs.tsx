import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
    label: string
    href?: string
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[]
    className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
    return (
        <nav className={cn("flex items-center space-x-2 text-sm text-gray-500", className)} aria-label="Breadcrumb">
            <Link to="/knowledge" className="hover:text-hotel-navy transition-colors flex items-center gap-1">
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
            </Link>

            {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    {item.href && index < items.length - 1 ? (
                        <Link
                            to={item.href}
                            className="hover:text-hotel-navy font-medium transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className={cn(
                            "font-semibold",
                            index === items.length - 1 ? "text-hotel-navy" : "text-gray-500"
                        )}>
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    )
}
