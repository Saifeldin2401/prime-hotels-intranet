import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import {
    BarChart3,
    Bell,
    Building2,
    Cake,
    CheckCircle,
    GraduationCap,
    LayoutDashboard,
    Newspaper,
    Quote,
    Star,
    Users,
    Wrench
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
        { key: 'bentoStats', label: 'Bento KPI Summary Cards', icon: BarChart3 },
        { key: 'quickInsights', label: 'Role-Aware Operational Insights', icon: LayoutDashboard },
        { key: 'motivation', label: 'Hospitality Quote & Motivation', icon: Quote },
        { key: 'quickActions', label: 'Quick Action Shortcuts', icon: LayoutDashboard },
        { key: 'announcements', label: 'Property & Chain Announcements', icon: Bell },
        { key: 'tasks', label: 'Active Work Queue & Tasks', icon: CheckCircle },
        { key: 'maintenance', label: 'Property Maintenance Tickets', icon: Wrench },
        { key: 'clusterOverview', label: 'Multi-Property Cluster Portfolio', icon: Building2 },
        { key: 'propertyComparison', label: 'Property Comparison Matrix', icon: BarChart3 },
        { key: 'performanceChart', label: 'Performance Analytics Chart', icon: BarChart3 },
        { key: 'employeeSpotlight', label: 'Elite Spotlight & Recognitions', icon: Star },
        { key: 'todaysBirthdays', label: "Teammates Birthdays", icon: Cake },
        { key: 'teamActivity', label: 'Live Team Online Presence', icon: Users },
        { key: 'training', label: 'Training Compliance Gauge', icon: GraduationCap },
        { key: 'hospitalityNews', label: 'Hospitality Updates & News Feed', icon: Newspaper },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Customize Dashboard Layout</DialogTitle>
                    <DialogDescription>
                        Toggle widgets on or off. Preferences are saved automatically to your workspace profile.
                        {isSaving && (
                            <span className="flex items-center gap-2 mt-2 text-muted-foreground">
                                <Spinner className="h-4 w-4" />
                                Saving preferences...
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-3">
                    <div className="grid grid-cols-1 gap-3 max-h-[420px] overflow-y-auto pe-2">
                        {widgetConfig.map((widget) => {
                            const Icon = widget.icon
                            const isChecked = visibleWidgets[widget.key] !== false

                            return (
                                <div
                                    key={widget.key}
                                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <Label htmlFor={`widget-${widget.key}`} className="font-semibold text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                                            {widget.label}
                                        </Label>
                                    </div>
                                    <Switch
                                        id={`widget-${widget.key}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => onToggleWidget(widget.key, checked)}
                                        disabled={isSaving}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        disabled={isSaving}
                        className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                        Reset Defaults
                    </Button>
                    <Button
                        size="sm"
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
