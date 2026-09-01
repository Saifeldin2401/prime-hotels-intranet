import { cn } from '@/lib/utils';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

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
        <nav className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)} aria-label="Breadcrumb">
            <Link to="/knowledge" className="hover:text-foreground transition-colors flex items-center gap-1 opacity-80 hover:opacity-100">
                <Home className="h-3.5 w-3.5" />
                <span className="sr-only">Home</span>
            </Link>

            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3 w-3 opacity-50 rtl:rotate-180" />
                    {item.href && index < items.length - 1 ? (
                        <Link
                            to={item.href}
                            className="hover:text-foreground font-medium transition-colors opacity-80 hover:opacity-100"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className={cn(
                            "font-semibold",
                            index === items.length - 1 ? "text-foreground font-bold" : "opacity-80"
                        )}>
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    )
}
