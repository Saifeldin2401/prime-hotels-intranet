import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import * as React from "react";
import { useTranslation } from "react-i18next";

interface ActionSheetProps {
    trigger?: React.ReactNode
    title?: string
    description?: string
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    footer?: React.ReactNode
}

/**
 * ActionSheet Component
 * 
 * A mobile-first bottom drawer for menus, forms, and quick actions.
 * Wraps the Shadcn/Vaul Drawer component.
 */
export function ActionSheet({
    trigger,
    title,
    description,
    children,
    open,
    onOpenChange,
    footer
}: ActionSheetProps) {
    const { t } = useTranslation('common');

    return (
        <Drawer 
            open={open} 
            onOpenChange={onOpenChange}
            // Prevent focus trapping issues by disabling modal behavior
            modal={false}
        >
            {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm bg-white border-0 shadow-2xl">
                    {(title || description) && (
                        <DrawerHeader>
                            {title && <DrawerTitle>{title}</DrawerTitle>}
                            {description && <DrawerDescription>{description}</DrawerDescription>}
                        </DrawerHeader>
                    )}

                    <div className="p-4 pb-0">
                        {children}
                    </div>

                    <DrawerFooter>
                        {footer}
                        <DrawerClose asChild>
                            <Button variant="outline">{t('actions.close', 'Close')}</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
}
