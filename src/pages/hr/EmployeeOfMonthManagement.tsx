import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Search, Trophy, Calendar, Save, Trash2, UserPlus, Check, ChevronsUpDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { createNotification, NotificationTemplates } from '@/lib/notificationService'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Profile {
    id: string
    full_name: string
    avatar_url: string | null
    job_title: string | null
    user_properties?: { property_id: string }[]
}

interface EOMWinner {
    id: string
    user_id: string
    month: number
    year: number
    reason_en: string
    reason_ar: string
    profile: Profile
}

export default function EmployeeOfMonthManagement() {
    const { t, i18n } = useTranslation('dashboard')
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const { toast } = useToast()

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [openSearch, setOpenSearch] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null)
    const [winners, setWinners] = useState<EOMWinner[]>([])
    const [searchQuery, setSearchQuery] = useState('')

    const [form, setForm] = useState({
        month: (new Date().getMonth() + 1).toString(),
        year: new Date().getFullYear().toString(),
        reason_en: '',
        reason_ar: ''
    })

    const fetchProfiles = async (query: string) => {
        setSearchQuery(query)
        if (query.length < 2) {
            setProfiles([])
            return
        }

        const propertyId = currentProperty?.id
        const isAll = !propertyId || propertyId === 'all'

        try {

            let queryBuilder = supabase
                .from('profiles')
                .select(`
                    id, 
                    full_name, 
                    avatar_url, 
                    job_title,
                    user_properties${isAll ? '' : '!inner'}(property_id)
                `)
                .ilike('full_name', `%${query}%`)
                .eq('is_active', true)

            if (!isAll && propertyId) {
                queryBuilder = queryBuilder.eq('user_properties.property_id', propertyId)
            }

            const { data, error } = await queryBuilder.limit(5)

            if (error) throw error
            setProfiles(data || [])
        } catch (err) {
            console.error('Error fetching profiles:', err)
        }
    }

    const fetchWinners = async () => {
        setLoading(true)
        try {
            let queryBuilder = supabase
                .from('employee_of_the_month')
                .select(`
                    id,
                    user_id,
                    month,
                    year,
                    reason_en,
                    reason_ar,
                    profile:user_id (
                        id,
                        full_name,
                        avatar_url,
                        job_title
                    )
                `)

            if (currentProperty && currentProperty.id !== 'all') {
                queryBuilder = queryBuilder.eq('property_id', currentProperty.id)
            }

            const { data, error } = await queryBuilder
                .order('year', { ascending: false })
                .order('month', { ascending: false })

            if (error) throw error
            setWinners(data as any || [])
        } catch (err) {
            console.error('Error fetching winners:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchWinners()
    }, [currentProperty])

    const handleSave = async () => {
        if (!selectedEmployee) {
            toast({
                title: t('common:errors.validation_failed'),
                description: "Please select an employee",
                variant: "destructive"
            })
            return
        }

        if (!form.reason_en || !form.reason_ar) {
            toast({
                title: t('common:errors.validation_failed'),
                description: "Please provide reasons in both English and Arabic",
                variant: "destructive"
            })
            return
        }

        setSaving(true)
        try {
            const targetPropertyId = currentProperty?.id !== 'all'
                ? currentProperty?.id
                : selectedEmployee.user_properties?.[0]?.property_id;

            if (!targetPropertyId || targetPropertyId === 'all') {
                toast({
                    title: t('common:errors.validation_failed'),
                    description: "Could not determine property for this employee",
                    variant: "destructive"
                })
                return
            }

            const { error } = await supabase
                .from('employee_of_the_month')
                .upsert({
                    property_id: targetPropertyId,
                    user_id: selectedEmployee.id,
                    month: parseInt(form.month),
                    year: parseInt(form.year),
                    reason_en: form.reason_en,
                    reason_ar: form.reason_ar,
                    created_by: user?.id
                })

            if (error) throw error

            // Send notification to the winner
            const monthLabel = months.find(m => m.value === form.month)?.label || form.month
            const notif = NotificationTemplates.employeeOfMonthWinner(monthLabel, form.year)

            await createNotification({
                userId: selectedEmployee.id,
                type: 'employee_of_the_month_winner',
                title: notif.title,
                message: notif.message,
                link: '/dashboard'
            })

            toast({
                title: t('common:actions.save_success'),
                description: "Employee of the Month saved successfully"
            })

            setForm({
                ...form,
                reason_en: '',
                reason_ar: ''
            })
            setSelectedEmployee(null)
            setProfiles([])
            fetchWinners()
        } catch (err: any) {
            toast({
                title: t('common:errors.save_failed'),
                description: err.message,
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString(),
        label: new Date(2000, i).toLocaleString(i18n.language, { month: 'long' })
    }))

    const years = [2025, 2026].map(String)

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-hotel-gold/10 p-3 rounded-2xl">
                    <Trophy className="h-8 w-8 text-hotel-gold" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-hotel-charcoal">{t('widgets.employee_of_the_month.manage')}</h1>
                    <p className="text-hotel-charcoal/60">Recognize and celebrate outstanding team members</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card className="sticky top-24 border-hotel-gold/20 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-hotel-gold" />
                                Add New Winner
                            </CardTitle>
                            <CardDescription>Select employee and period</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Select Period</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {months.map(m => (
                                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={form.year} onValueChange={(v) => setForm({ ...form, year: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map(y => (
                                                <SelectItem key={y} value={y}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2 relative">
                                <Label>Search Employee</Label>
                                <Popover open={openSearch} onOpenChange={setOpenSearch}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openSearch}
                                            className="w-full justify-between border-hotel-gold/20"
                                        >
                                            {selectedEmployee
                                                ? selectedEmployee.full_name
                                                : "Search employees..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command shouldFilter={false}>
                                            <CommandInput
                                                placeholder="Type name..."
                                                onValueChange={(v) => fetchProfiles(v)}
                                            />
                                            <CommandList>
                                                {searchQuery.length > 0 && searchQuery.length < 2 && (
                                                    <div className="py-6 text-center text-sm text-hotel-charcoal/40">
                                                        {t('common:labels.typing_search', 'Type at least 2 characters...')}
                                                    </div>
                                                )}
                                                {searchQuery.length >= 2 && profiles.length === 0 && (
                                                    <CommandEmpty>{t('widgets.employee_of_the_month.no_employee_found', 'No employee found.')}</CommandEmpty>
                                                )}
                                                <CommandGroup>
                                                    {profiles.map((p) => (
                                                        <CommandItem
                                                            key={p.id}
                                                            value={p.id}
                                                            onSelect={() => {
                                                                setSelectedEmployee(p)
                                                                setOpenSearch(false)
                                                                setProfiles([])
                                                            }}
                                                            className="flex items-center gap-3 p-2"
                                                        >
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={p.avatar_url || undefined} />
                                                                <AvatarFallback>{(p.full_name || '?').charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-semibold">{p.full_name}</p>
                                                                <p className="text-xs text-hotel-charcoal/50">{p.job_title}</p>
                                                            </div>
                                                            <Check
                                                                className={cn(
                                                                    "ml-auto h-4 w-4",
                                                                    selectedEmployee?.id === p.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {selectedEmployee && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-hotel-gold/5 rounded-xl p-4 border border-hotel-gold/10 flex items-center gap-4"
                                >
                                    <Avatar className="h-12 w-12 border-2 border-hotel-gold/20">
                                        <AvatarImage src={selectedEmployee.avatar_url || undefined} />
                                        <AvatarFallback>{selectedEmployee.full_name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-hotel-charcoal truncate">{selectedEmployee.full_name}</p>
                                        <p className="text-xs text-hotel-gold font-medium uppercase tracking-wider">{selectedEmployee.job_title}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedEmployee(null)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </motion.div>
                            )}

                            <div className="space-y-2">
                                <Label>Reason (English)</Label>
                                <Textarea
                                    placeholder="Why did they win? (English)"
                                    value={form.reason_en}
                                    onChange={(e) => setForm({ ...form, reason_en: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2 text-end">
                                <Label className="block">السبب (بالعربية)</Label>
                                <Textarea
                                    placeholder="لماذا فازوا؟ (بالعربية)"
                                    dir="rtl"
                                    value={form.reason_ar}
                                    onChange={(e) => setForm({ ...form, reason_ar: e.target.value })}
                                />
                            </div>

                            <Button
                                className="w-full bg-hotel-gold hover:bg-hotel-gold/90 text-white"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : <><Save className="h-4 w-4 me-2" /> Save Winner</>}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-hotel-charcoal">
                        <Calendar className="h-5 w-5 text-hotel-gold" />
                        Announcement History
                    </h2>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <Card key={i} className="h-24"><CardContent className="animate-pulse" /></Card>)}
                        </div>
                    ) : winners.length > 0 ? (
                        <div className="grid gap-4">
                            {winners.map((w) => (
                                <Card key={w.id} className="overflow-hidden hover:shadow-md transition-shadow duration-300">
                                    <CardContent className="p-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-hotel-gold/10 rtl:divide-x-reverse">
                                        <div className="p-4 md:w-48 bg-hotel-gold/5 flex flex-col items-center justify-center text-center shrink-0">
                                            <Avatar className="h-16 w-16 mb-2 border-2 border-hotel-gold/20">
                                                <AvatarImage src={w.profile.avatar_url || undefined} />
                                                <AvatarFallback>{w.profile.full_name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <p className="font-bold text-sm text-hotel-charcoal">{w.profile.full_name}</p>
                                            <p className="text-[10px] text-hotel-gold font-bold uppercase tracking-tighter">
                                                {new Date(w.year, w.month - 1).toLocaleString(i18n.language, { month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="p-6 flex-1 bg-white">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1">
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-hotel-charcoal/40 mb-1">English</Badge>
                                                    <p className="text-sm text-hotel-charcoal/80 italic leading-relaxed">"{w.reason_en}"</p>
                                                </div>
                                                <div className="space-y-1 text-end">
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-hotel-charcoal/40 mb-1">العربية</Badge>
                                                    <p className="text-sm text-hotel-charcoal/80 italic leading-relaxed" dir="rtl">"{w.reason_ar}"</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-hotel-gold/5 rounded-2xl border-2 border-dashed border-hotel-gold/10">
                            <Trophy className="h-12 w-12 mx-auto text-hotel-gold/20 mb-4" />
                            <p className="text-hotel-charcoal/40 font-medium">No previous winners records yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
