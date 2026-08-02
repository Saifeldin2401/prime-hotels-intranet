import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { enterpriseErpService, type VipGuestPreference } from '@/services/enterpriseErpService'
import { Crown, Sparkles, Utensils, BedDouble, Shield } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function VipPreferenceMatrixModal({ open, onOpenChange }: Props) {
    const [preferences, setPreferences] = useState<VipGuestPreference[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (open) {
            setLoading(true)
            enterpriseErpService.fetchVipPreferences()
                .then(data => setPreferences(data))
                .catch(error => {
                    console.error('Error fetching VIP preferences:', error)
                    toast.error('Failed to load VIP guest preferences')
                })
                .finally(() => setLoading(false))
        }
    }, [open])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Crown className="h-6 w-6 text-amber-500" />
                        VIP Guest Protocol & Deep Preference Matrix
                    </DialogTitle>
                    <DialogDescription>
                        Multi-property guest profile intelligence & royal guest service requirements
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading VIP Preference Matrix...</div>
                ) : (
                    <div className="space-y-4 py-2">
                        {preferences.map(vip => (
                            <div key={vip.id} className="rounded-xl border p-5 bg-card space-y-3 shadow-sm hover:border-amber-500/50 transition-colors">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold text-lg">
                                            {vip.guest_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base flex items-center gap-2">
                                                {vip.guest_name}
                                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white uppercase text-[10px]">
                                                    {vip.vip_tier}
                                                </Badge>
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                Lifetime Spend: <span className="font-semibold text-emerald-600">SAR {vip.lifetime_spend_sar.toLocaleString()}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-1">
                                        <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                            <Utensils className="h-3.5 w-3.5 text-amber-600" />
                                            Dietary & Dining:
                                        </span>
                                        <p className="font-medium bg-muted/40 p-2 rounded">{vip.dietary_requirements || 'Standard Menu'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                            <BedDouble className="h-3.5 w-3.5 text-blue-600" />
                                            Pillow & Bed Preference:
                                        </span>
                                        <p className="font-medium bg-muted/40 p-2 rounded">{vip.pillow_preference || 'Standard King'}</p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                        Room Requirements:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {vip.preferred_room_features.map((feat, idx) => (
                                            <span key={idx} className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                                {feat}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {vip.special_notes && (
                                    <div className="text-xs p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-2">
                                        <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                        <span><strong>Protocol Note:</strong> {vip.special_notes}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
