import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
    BarChart3,
    Bell,
    Calendar,
    CheckCircle,
    GraduationCap,
    LayoutDashboard,
    Newspaper,
    Users,
    Wrench,
    Book,
    Quote
} from 'lucide-react'
import { useTranslation } from "react-i18next";

interface DashboardCustomizeModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    visibleWidgets: Record<string, boolean>
    onToggleWidget: (key: string, visible: boolean) => void
    onReset: () => void
}

export function DashboardCustomizeModal({
    open,
    onOpenChange,
    visibleWidgets,
    onToggleWidget,
    onReset
}: DashboardCustomizeModalProps) {
    const widgetConfig = [
        { key: 'stats', label: 'Statistics Overview', icon: BarChart3 },
        { key: 'quickActions', label: 'Quick Actions', icon: LayoutDashboard },
        { key: 'socialFeed', label: 'Social Feed', icon: Users },
        { key: 'announcements', label: 'Announcements', icon: Bell },
        { key: 'employeeOfMonth', label: 'Employee of the Month', icon: Star },
        { key: 'tasks', label: 'My Tasks', icon: CheckCircle },
        { key: 'calendar', label: 'Calendar', icon: Calendar },
        { key: 'knowledgeBase', label: 'Knowledge Base', icon: Book },
        { key: 'training', label: 'Training Progress', icon: GraduationCap },
        { key: 'maintenance', label: 'Maintenance Requests', icon: Wrench },
        { key: 'hospitalityNews', label: 'Hospitality News', icon: Newspaper },
        { key: 'motivation', label: 'Motivational Quotes', icon: Quote },
    ]

    // Filter out any widgets that might not be relevant for specific roles if needed
    // For now, show all

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Customize Dashboard</DialogTitle>
                    <DialogDescription>
                        Choose which widgets to display on your dashboard.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 gap-4">
                        {widgetConfig.map((widget) => {
                            const Icon = widget.icon
                            return (
                                <div
                                    key={widget.key}
                                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-md">
                                            <Icon className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <Label htmlFor={`widget-${widget.key}`} className="font-medium cursor-pointer">
                                            {widget.label}
                                        </Label>
                                    </div>
                                    <Switch
                                        id={`widget-${widget.key}`}
                                        checked={visibleWidgets[widget.key]}
                                        onCheckedChange={(checked) => onToggleWidget(widget.key, checked)}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onReset}>
                        Reset to Default
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function Star(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    )
}
