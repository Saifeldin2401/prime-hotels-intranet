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
import { Spinner } from '@/components/ui/spinner'
import {
    BarChart3,
    Bell,
    Cake,
    Calendar,
    CheckCircle,
    GraduationCap,
    LayoutDashboard,
    Newspaper,
    Users,
    Wrench,
    Book,
    Quote,
    MessageCircle,
    Star as LucideStar
} from 'lucide-react'

interface DashboardCustomizeModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    visibleWidgets: Record<string, boolean>
    onToggleWidget: (key: string, visible: boolean) => void
    onReset: () => void
    isSaving?: boolean
}

export function DashboardCustomizeModal({
    open,
    onOpenChange,
    visibleWidgets,
    onToggleWidget,
    onReset,
    isSaving = false
}: DashboardCustomizeModalProps) {
    const widgetConfig = [
        { key: 'quickInsights', label: 'Quick Insights', icon: LayoutDashboard },
        { key: 'motivation', label: 'Motivation', icon: Quote },
        { key: 'statsGrid', label: 'Statistics Overview', icon: BarChart3 },
        { key: 'quickActions', label: 'Quick Actions', icon: LayoutDashboard },
        { key: 'announcements', label: 'Announcements', icon: Bell },
        { key: 'tasks', label: 'My Tasks', icon: CheckCircle },
        { key: 'calendar', label: 'Calendar', icon: Calendar },
        { key: 'training', label: 'Training Progress', icon: GraduationCap },
        { key: 'knowledgeBase', label: 'Knowledge Base', icon: Book },
        { key: 'todaysBirthdays', label: "Today's Birthdays", icon: Cake },
        { key: 'employeeOfMonth', label: 'Employee of the Month', icon: Star },
        { key: 'teamActivity', label: 'Team Activity', icon: Users },
        { key: 'performanceChart', label: 'Performance Analytics', icon: BarChart3 },
        { key: 'maintenance', label: 'Maintenance Requests', icon: Wrench },
        { key: 'hospitalityNews', label: 'Hospitality News', icon: Newspaper },
        { key: 'shiftHandover', label: 'Shift Handover', icon: MessageCircle },
        { key: 'eliteSpotlight', label: 'Elite Spotlight', icon: Star },
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
                        {isSaving && (
                            <span className="flex items-center gap-2 mt-2 text-muted-foreground">
                                <Spinner className="h-4 w-4" />
                                Saving preferences...
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2">
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
                                        checked={visibleWidgets[widget.key] ?? true}
                                        onCheckedChange={(checked) => onToggleWidget(widget.key, checked)}
                                        disabled={isSaving}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onReset}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <Spinner className="h-4 w-4 mr-2" />
                                Resetting...
                            </>
                        ) : (
                            'Reset to Default'
                        )}
                    </Button>
                    <Button
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function Star(props: React.SVGProps<SVGSVGElement>) {
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
