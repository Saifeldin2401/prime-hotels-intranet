import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { enterpriseErpService, type EosbCalculation } from '@/services/enterpriseErpService'
import { Calculator, Award, Scale, CheckCircle2 } from 'lucide-react'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EosbCalculatorModal({ open, onOpenChange }: Props) {
    const [hireDate, setHireDate] = useState('2021-01-15')
    const [termDate, setTermDate] = useState('2026-08-01')
    const [reason, setReason] = useState<EosbCalculation['termination_reason']>('contract_expiry')
    const [basicSalary, setBasicSalary] = useState(12000)
    const [housing, setHousing] = useState(3000)
    const [transport, setTransport] = useState(1000)

    const [result, setResult] = useState<EosbCalculation | null>(null)

    const handleCalculate = () => {
        const calc = enterpriseErpService.calculateEosb(
            hireDate,
            termDate,
            reason,
            basicSalary,
            housing,
            transport
        )
        setResult(calc)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Scale className="h-6 w-6 text-emerald-600" />
                        KSA Labor Law End-of-Service Benefits (EOSB)
                    </DialogTitle>
                    <DialogDescription>
                        Article 84 & 85 Saudi Labor Regulation Compensation Calculator
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Hire Date</Label>
                            <Input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Termination Date</Label>
                            <Input type="date" value={termDate} onChange={e => setTermDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Termination Reason</Label>
                        <Select value={reason} onValueChange={(val: any) => setReason(val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="contract_expiry">Contract Expiry (100% Full Entitlement)</SelectItem>
                                <SelectItem value="resignation">Resignation (Art. 85 Scaled)</SelectItem>
                                <SelectItem value="employer_termination">Employer Termination (100% Full Entitlement)</SelectItem>
                                <SelectItem value="force_majeure">Force Majeure (100% Full Entitlement)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Basic Salary (SAR)</Label>
                            <Input type="number" value={basicSalary} onChange={e => setBasicSalary(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Housing Allowance</Label>
                            <Input type="number" value={housing} onChange={e => setHousing(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Transport Allowance</Label>
                            <Input type="number" value={transport} onChange={e => setTransport(Number(e.target.value))} />
                        </div>
                    </div>

                    <Button onClick={handleCalculate} className="w-full flex items-center justify-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Calculate Entitlement
                    </Button>

                    {result && (
                        <div className="rounded-xl border p-5 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 space-y-3 mt-4">
                            <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-2">
                                <span className="font-semibold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                    <Award className="h-4 w-4 text-emerald-600" />
                                    Total EOSB Benefit
                                </span>
                                <span className="text-xs text-muted-foreground">Years of Service: {result.years_of_service} yrs</span>
                            </div>

                            <div className="flex items-baseline justify-between">
                                <span className="text-xs text-muted-foreground">Final Lump Sum Disbursement:</span>
                                <span className="text-2xl font-black text-emerald-600">SAR {result.total_eosb_sar.toLocaleString()}</span>
                            </div>

                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 inline me-1" />
                                Calculated per Saudi Ministry of Human Resources & Social Development rules: First 5 years at 50% monthly wage/year, subsequent years at 100% monthly wage/year.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
