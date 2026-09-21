import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Search,
    Sparkles,
    Check,
    Copy,
    ExternalLink,
    Filter,
    Layers,
    Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    ALTUS_ASSET_REGISTRY,
    type AltusAssetMetadata,
    type AltusAssetFamily,
    searchAltusAssets,
} from '@/lib/altusAssetRegistry'

interface AltusAssetPickerModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelectAsset?: (asset: AltusAssetMetadata) => void
    initialFamily?: AltusAssetFamily | 'all'
    className?: string
}

export const AltusAssetPickerModal: React.FC<AltusAssetPickerModalProps> = ({
    open,
    onOpenChange,
    onSelectAsset,
    initialFamily = 'all',
    className,
}) => {
    const { i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedFamily, setSelectedFamily] = useState<string>(initialFamily)
    const [selectedAsset, setSelectedAsset] = useState<AltusAssetMetadata>(
        ALTUS_ASSET_REGISTRY[0]
    )
    const [copied, setCopied] = useState(false)

    // Filter by query and family
    const filteredAssets = useMemo(() => {
        const queryResults = searchQuery.trim()
            ? searchAltusAssets(searchQuery)
            : ALTUS_ASSET_REGISTRY

        if (selectedFamily === 'all') return queryResults
        return queryResults.filter((a) => a.family === selectedFamily)
    }, [searchQuery, selectedFamily])

    const handleCopyPath = (src: string) => {
        navigator.clipboard.writeText(src)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleConfirmSelection = (asset: AltusAssetMetadata) => {
        if (onSelectAsset) {
            onSelectAsset(asset)
        }
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    "max-w-5xl w-full p-0 overflow-hidden rounded-3xl border border-amber-500/20",
                    "bg-gradient-to-br from-card via-card/95 to-slate-950 shadow-2xl",
                    className
                )}
            >
                <div className="flex flex-col h-[85vh] max-h-[820px]">
                    {/* Header */}
                    <div className="p-6 border-b border-border/60 bg-gradient-to-r from-amber-500/10 via-card to-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <DialogHeader className="space-y-1 text-start">
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-500 w-fit">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>{isRTL ? 'مكتبة أصول ألتوس الفاخرة' : 'ALTUS Visual Asset System'}</span>
                            </div>
                            <DialogTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
                                {isRTL ? 'مستكشف الأصول البصرية ومعايير فوربس' : 'Enterprise Visual Asset Browser'}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                {isRTL
                                    ? 'أصول بصرية ثلاثية الأبعاد وعالية الدقة معتمدة لكافة مسارات الضيافة الفاخرة وأدلة التشغيل القياسية.'
                                    : 'Forbes 5-Star luxury hospitality assets, culturally authentic Saudi personas, and operational standards.'}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Search Bar */}
                        <div className="relative w-full sm:w-72 shrink-0">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isRTL ? 'ابحث عن أصل، مسار، أو كلمة دلالية...' : 'Search assets, tags, or roles...'}
                                className="ps-9 h-10 rounded-xl bg-background/60 border-border/80 text-xs focus-visible:ring-amber-500"
                            />
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="px-6 py-3 border-b border-border/40 bg-card/40 flex items-center gap-2 overflow-x-auto scrollbar-none">
                        <Tabs
                            value={selectedFamily}
                            onValueChange={setSelectedFamily}
                            className="w-full"
                        >
                            <TabsList className="bg-background/60 border border-border/60 p-1 rounded-xl h-auto flex flex-wrap gap-1">
                                <TabsTrigger value="all" className="rounded-lg text-xs py-1.5 px-3">
                                    {isRTL ? 'كافة الأصول' : 'All Assets'} ({ALTUS_ASSET_REGISTRY.length})
                                </TabsTrigger>
                                <TabsTrigger value="operations" className="rounded-lg text-xs py-1.5 px-3">
                                    {isRTL ? 'العمليات الفندقية' : 'Hospitality Operations'}
                                </TabsTrigger>
                                <TabsTrigger value="people" className="rounded-lg text-xs py-1.5 px-3">
                                    {isRTL ? 'الكوادر والمتعلمون' : 'Learners & People'}
                                </TabsTrigger>
                                <TabsTrigger value="learning" className="rounded-lg text-xs py-1.5 px-3">
                                    {isRTL ? 'الاعتمادات والشارات' : 'Recognition & Badges'}
                                </TabsTrigger>
                                <TabsTrigger value="standards" className="rounded-lg text-xs py-1.5 px-3">
                                    {isRTL ? 'المعايير والطهي والأمن' : 'Standards & Safety'}
                                </TabsTrigger>
                                <TabsTrigger value="digital" className="rounded-lg text-xs py-1.5 px-3">
                                    {isRTL ? 'التكنولوجيا والتعلم الذكي' : 'Digital & Mobile'}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Content Split: Grid (2/3) + Detail Inspector (1/3) */}
                    <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x lg:rtl:divide-x-reverse divide-border/60">
                        {/* Asset Grid */}
                        <div className="lg:col-span-2 overflow-y-auto p-6 space-y-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{isRTL ? `المعروض: ${filteredAssets.length} أصل` : `Showing ${filteredAssets.length} assets`}</span>
                                <span className="flex items-center gap-1 font-mono">
                                    <Filter className="h-3 w-3" />
                                    {selectedFamily.toUpperCase()}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {filteredAssets.map((asset) => {
                                    const isSelected = selectedAsset?.id === asset.id

                                    return (
                                        <div
                                            key={asset.id}
                                            onClick={() => setSelectedAsset(asset)}
                                            className={cn(
                                                "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer text-start",
                                                isSelected
                                                    ? "border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10 ring-1 ring-amber-500"
                                                    : "border-border/60 bg-card/60 hover:border-amber-500/40 hover:bg-card/90 hover:-translate-y-0.5"
                                            )}
                                        >
                                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                                                <img
                                                    src={asset.src}
                                                    alt={asset.nameEn}
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                                <div className="absolute top-2 start-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] bg-slate-950/80 text-amber-400 border border-amber-500/20 backdrop-blur-md px-1.5 py-0"
                                                    >
                                                        {asset.aspectRatio}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="p-3 space-y-1">
                                                <h4 className="font-display text-xs font-bold text-foreground truncate">
                                                    {isRTL ? asset.nameAr : asset.nameEn}
                                                </h4>
                                                <p className="text-[10px] text-muted-foreground truncate font-mono">
                                                    {asset.category}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Detail Inspector Pane */}
                        <div className="p-6 overflow-y-auto bg-card/30 flex flex-col justify-between space-y-6">
                            {selectedAsset ? (
                                <div className="space-y-5">
                                    {/* Preview Banner */}
                                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/80 bg-slate-950 shadow-md">
                                        <img
                                            src={selectedAsset.src}
                                            alt={selectedAsset.nameEn}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>

                                    {/* Titles */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px]">
                                                {selectedAsset.family.toUpperCase()}
                                            </Badge>
                                            <span className="font-mono text-[11px] text-muted-foreground">
                                                {selectedAsset.aspectRatio}
                                            </span>
                                        </div>
                                        <h3 className="font-display text-lg font-bold text-foreground">
                                            {isRTL ? selectedAsset.nameAr : selectedAsset.nameEn}
                                        </h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {isRTL ? selectedAsset.descriptionAr : selectedAsset.descriptionEn}
                                        </p>
                                    </div>

                                    {/* Metadata Pills */}
                                    <div className="space-y-3 pt-3 border-t border-border/60">
                                        {selectedAsset.materials && (
                                            <div>
                                                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                                                    <Layers className="h-3.5 w-3.5 text-amber-500" />
                                                    <span>{isRTL ? 'المواد والتشطيبات:' : 'Materials & Finish:'}</span>
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {selectedAsset.materials.map((mat, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-background/80 border border-border/60 text-muted-foreground"
                                                        >
                                                            {mat}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                                                <Tag className="h-3.5 w-3.5 text-amber-500" />
                                                <span>{isRTL ? 'الكلمات المفتاحية:' : 'Tags:'}</span>
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedAsset.tags.slice(0, 6).map((tag, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/5 text-amber-500 border border-amber-500/20"
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground text-xs">
                                    {isRTL ? 'حدد أصلاً لمعاينة التفاصيل' : 'Select an asset to view details'}
                                </div>
                            )}

                            {/* Actions */}
                            {selectedAsset && (
                                <div className="space-y-2 pt-4 border-t border-border/60">
                                    <Button
                                        onClick={() => handleConfirmSelection(selectedAsset)}
                                        className="w-full h-11 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20 gap-2"
                                    >
                                        <Check className="h-4 w-4" />
                                        <span>{isRTL ? 'استخدام هذا الأصل للمقرر' : 'Use This Asset'}</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={() => handleCopyPath(selectedAsset.src)}
                                        className="w-full h-9 rounded-xl text-xs border-border/80 text-muted-foreground hover:text-foreground gap-1.5"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>{copied ? (isRTL ? 'تم نسخ المسار!' : 'Path Copied!') : (isRTL ? 'نسخ مسار الملف' : 'Copy File Path')}</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
