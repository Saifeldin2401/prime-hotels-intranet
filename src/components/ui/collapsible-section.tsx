import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
    title: string
    description?: string
    children: React.ReactNode
    defaultOpen?: boolean
    className?: string
}

export function CollapsibleSection({ title, description, children, defaultOpen = true, className }: CollapsibleSectionProps) {
    return (
        <Accordion type="single" collapsible defaultValue={defaultOpen ? "item-1" : undefined} className={cn("w-full", className)}>
            <AccordionItem value="item-1" className="border-none">
                <AccordionTrigger className="hover:no-underline py-2 text-left">
                    <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        {description && <p className="text-sm text-muted-foreground font-normal">{description}</p>}
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="pt-2">
                        {children}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}
