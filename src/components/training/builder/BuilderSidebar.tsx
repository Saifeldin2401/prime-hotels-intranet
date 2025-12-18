import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Sparkles, BookOpen, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BuilderSidebarProps {
    className?: string
    children?: React.ReactNode
}

export const BuilderSidebar = ({ className, children }: BuilderSidebarProps) => {
    return (
        <div className={cn("w-80 border-l bg-slate-50/50 flex flex-col h-[calc(100vh-4rem)] sticky top-16", className)}>
            <ScrollArea className="flex-1">
                {children}
            </ScrollArea>
        </div>
    )
}
