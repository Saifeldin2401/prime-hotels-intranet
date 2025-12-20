
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProperty } from '@/contexts/PropertyContext'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export const moduleFormSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    estimated_duration: z.string().min(1, 'Duration is required'),
    difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']),
    category: z.string().min(1, 'Category is required'),
    status: z.enum(['draft', 'published', 'archived']),
    department_id: z.string().optional().nullable(),
})

export type ModuleFormValues = z.infer<typeof moduleFormSchema>

interface ModuleFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: ModuleFormValues | null
    onSubmit: (data: ModuleFormValues) => Promise<void>
    isSubmitting?: boolean
    existingCategories?: string[]
    existingDurations?: string[]
}

export function ModuleFormDialog({
    open,
    onOpenChange,
    initialData,
    onSubmit,
    isSubmitting = false,
    existingCategories = [],
    existingDurations = [],
}: ModuleFormDialogProps) {
    const { t, i18n } = useTranslation(['training', 'common'])
    const isRTL = i18n.dir() === 'rtl'
    const { currentProperty } = useProperty()
    const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false)
    const [openDurationCombobox, setOpenDurationCombobox] = useState(false)
    const [searchCategoryValue, setSearchCategoryValue] = useState("")
    const [searchDurationValue, setSearchDurationValue] = useState("")

    // Fetch departments for current property
    const { data: departments = [] } = useQuery({
        queryKey: ['departments', currentProperty?.id],
        queryFn: async () => {
            if (!currentProperty?.id) return []
            const { data, error } = await supabase
                .from('departments')
                .select('id, name')
                .eq('property_id', currentProperty.id)
                .order('name')
            if (error) throw error
            return data
        },
        enabled: !!currentProperty?.id
    })

    const form = useForm<ModuleFormValues>({
        resolver: zodResolver(moduleFormSchema),
        defaultValues: {
            title: '',
            description: '',
            estimated_duration: '',
            difficulty_level: 'beginner',
            category: '',
            status: 'draft',
            department_id: null,
        },
    })

    useEffect(() => {
        if (open) {
            setSearchCategoryValue("")
            setSearchDurationValue("")
            if (initialData) {
                form.reset({
                    title: initialData.title || '',
                    description: initialData.description || '',
                    estimated_duration: initialData.estimated_duration || '',
                    difficulty_level: initialData.difficulty_level || 'beginner',
                    category: initialData.category || '',
                    status: initialData.status || 'draft',
                    department_id: (initialData as any).department_id || null,
                })
            } else {
                form.reset({
                    title: '',
                    description: '',
                    estimated_duration: '',
                    difficulty_level: 'beginner',
                    category: '',
                    status: 'draft',
                    department_id: null,
                })
            }
        }
    }, [open, initialData, form])

    const handleSubmit = async (values: ModuleFormValues) => {
        await onSubmit(values)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 border-hotel-gold/20 shadow-2xl">
                <DialogHeader className={`border-b border-gray-100 pb-4 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <DialogTitle className="text-2xl font-serif text-hotel-navy">
                        {initialData ? t('training:editModule') : t('training:createModule')}
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                        {initialData ? t('training:editModuleDescription') : t('training:createModuleDescription')}
                    </DialogDescription>
                </DialogHeader>

                <Form onSubmit={form.handleSubmit(handleSubmit)} className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-hotel-navy font-medium">{t('title')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('enterTitle')}
                                            {...field}
                                            className="border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-hotel-navy font-medium">{t('description')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('enterDescription')}
                                            rows={3}
                                            {...field}
                                            className="border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50 resize-none"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-hotel-navy font-medium">{t('category')}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50">
                                                <SelectValue placeholder={t('selectCategory')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {existingCategories.map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    {category}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="estimated_duration"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-hotel-navy font-medium">{t('duration')}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50">
                                                <SelectValue placeholder={t('selectDuration')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {existingDurations.map((duration) => (
                                                <SelectItem key={duration} value={duration}>
                                                    {duration}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="difficulty_level"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-hotel-navy font-medium">{t('difficulty')}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className={`border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                <SelectValue placeholder={t('training:selectDifficulty')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="beginner">{t('beginner')}</SelectItem>
                                            <SelectItem value="intermediate">
                                                {t('intermediate')}
                                            </SelectItem>
                                            <SelectItem value="advanced">{t('advanced')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-hotel-navy font-medium">{t('status')}</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className={`border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <SelectValue placeholder={t('training:selectStatus')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="draft">{t('draft')}</SelectItem>
                                        <SelectItem value="published">{t('published')}</SelectItem>
                                        <SelectItem value="archived">{t('archived')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            type="submit"
                            className="bg-hotel-navy text-white hover:bg-hotel-navy-light shadow-md min-w-[120px]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">{t('common:action.saving')}</span>
                            ) : (
                                initialData ? t('training:update') : t('training:create')
                            )}
                        </Button>
                    </div>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
