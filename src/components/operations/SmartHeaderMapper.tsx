import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ArrowRight, CheckCircle2, Info, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SmartHeaderMapperProps {
    csvHeaders: string[]
    targetHeaders: string[]
    onMappingChange: (mapping: Record<string, string>) => void
    onConfirm: () => void
    initialMapping?: Record<string, string>
}

export function SmartHeaderMapper({ csvHeaders, targetHeaders, onMappingChange, onConfirm, initialMapping }: SmartHeaderMapperProps) {
    const [mapping, setMapping] = useState<Record<string, string>>({})
    const [isMapping, setIsMapping] = useState(true)

    useEffect(() => {
        if (initialMapping && Object.keys(initialMapping).length > 0) {
            setMapping(initialMapping)
            onMappingChange(initialMapping)
            setIsMapping(false)
            return
        }

        const initial: Record<string, string> = {}
        csvHeaders.forEach(csvHeader => {
            const normalized = csvHeader.toLowerCase().replace(/[\s_%]+/g, '')
            const bestMatch = targetHeaders.find(target => {
                const targetNorm = target.toLowerCase().replace(/[\s_%]+/g, '')
                return targetNorm.includes(normalized) || normalized.includes(targetNorm)
            })
            if (bestMatch) {
                initial[csvHeader] = bestMatch
            }
        })
        setMapping(initial)
        onMappingChange(initial)
        setIsMapping(false)
    }, [csvHeaders, targetHeaders, initialMapping])

    const handleSelectChange = (csvHeader: string, targetHeader: string) => {
        const newMapping = { ...mapping, [csvHeader]: targetHeader }
        setMapping(newMapping)
        onMappingChange(newMapping)
    }

    return (
        <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">AI Smart Mapping</h3>
                </div>
                <Badge variant="outline" className="bg-primary/5">
                    {isMapping ? 'Analyzing Headers...' : 'Mapping Complete'}
                </Badge>
            </div>

            <div className="bg-muted/30 rounded-lg border border-dashed p-4 space-y-3">
                {isMapping ? (
                    <div className="space-y-3 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-10 bg-muted rounded w-full" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {csvHeaders.map((header, index) => {
                            const matched = mapping[header]
                            return (
                                <div key={`${index}-${header}`} className="grid grid-cols-1 sm:grid-cols-7 items-center gap-3 bg-background p-2 rounded-md border text-sm">
                                    <div className="sm:col-span-3 font-medium truncate px-2" title={header}>
                                        {header}
                                    </div>
                                    <div className="sm:col-span-1 flex justify-start sm:justify-center px-2">
                                        <ArrowRight className={cn("h-4 w-4", matched ? "text-primary" : "text-muted-foreground")} />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <Select value={matched || 'skip'} onValueChange={(v) => handleSelectChange(header, v)}>
                                            <SelectTrigger className={cn("h-8", matched ? "border-primary/50 bg-primary/5" : "border-dashed")}>
                                                <SelectValue placeholder="Select target field" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="skip">Ignore field</SelectItem>
                                                {targetHeaders.map(target => (
                                                    <SelectItem key={target} value={target}>{target}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {!isMapping && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50/50 p-2 rounded border border-blue-100">
                    <Info className="h-3 w-3 mt-0.5 text-blue-500" />
                    <p>
                        AI has suggested these mappings based on semantic similarity. You can manually adjust them before continuing.
                    </p>
                </div>
            )}

            <Button className="w-full gap-2" disabled={isMapping} onClick={onConfirm}>
                <CheckCircle2 className="h-4 w-4" />
                Confirm Smart Mappings
            </Button>
        </div>
    )
}
