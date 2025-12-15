
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
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
    const { t } = useTranslation('training')
    const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false)
    const [openDurationCombobox, setOpenDurationCombobox] = useState(false)
    // We keep track of the search value
    const [searchCategoryValue, setSearchCategoryValue] = useState("")
    const [searchDurationValue, setSearchDurationValue] = useState("")

    const form = useForm<ModuleFormValues>({
        resolver: zodResolver(moduleFormSchema),
        defaultValues: {
            title: '',
            description: '',
            estimated_duration: '',
            difficulty_level: 'beginner',
            category: '',
            status: 'draft',
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
                })
            } else {
                form.reset({
                    title: '',
                    description: '',
                    estimated_duration: '',
                    difficulty_level: 'beginner',
                    category: '',
                    status: 'draft',
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
                <DialogHeader className="border-b border-gray-100 pb-4 mb-4">
                    <DialogTitle className="text-2xl font-serif text-hotel-navy">
                        {initialData ? t('editModule') : t('createModule')}
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                        {initialData ? t('editModuleDescription', 'Update the details of your training module') : t('createModuleDescription', 'Fill in the details to create a new training module')}
                    </DialogDescription>
                </DialogHeader>

                <Form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-hotel-navy font-medium">{t('category')}</FormLabel>
                                    <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openCategoryCombobox}
                                                    className={cn(
                                                        "w-full justify-between border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? field.value
                                                        : t('selectCategory', 'Select...')}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0">
                                            <Command>
                                                <CommandInput
                                                    placeholder={t('searchCategory', 'Search...')}
                                                    onValueChange={setSearchCategoryValue}
                                                />
                                                <CommandEmpty>
                                                    <div className="p-2">
                                                        <p className="text-sm text-muted-foreground mb-2">{t('noCategoryFound', 'No category found.')}</p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full justify-start text-hotel-navy border-hotel-navy/20 hover:bg-hotel-navy/5"
                                                            onClick={() => {
                                                                field.onChange(searchCategoryValue)
                                                                setOpenCategoryCombobox(false)
                                                            }}
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Create "{searchCategoryValue}"
                                                        </Button>
                                                    </div>
                                                </CommandEmpty>
                                                <CommandGroup className="max-h-[200px] overflow-auto">
                                                    {existingCategories.map((category) => (
                                                        <CommandItem
                                                            value={category}
                                                            key={category}
                                                            onSelect={() => {
                                                                field.onChange(category)
                                                                setOpenCategoryCombobox(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    category === field.value
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {category}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="estimated_duration"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-hotel-navy font-medium">{t('duration')}</FormLabel>
                                    <Popover open={openDurationCombobox} onOpenChange={setOpenDurationCombobox}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openDurationCombobox}
                                                    className={cn(
                                                        "w-full justify-between border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? field.value
                                                        : t('selectDuration', 'Select...')}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0">
                                            <Command>
                                                <CommandInput
                                                    placeholder={t('searchDuration', 'Search...')}
                                                    onValueChange={setSearchDurationValue}
                                                />
                                                <CommandEmpty>
                                                    <div className="p-2">
                                                        <p className="text-sm text-muted-foreground mb-2">{t('noDurationFound', 'No duration found.')}</p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full justify-start text-hotel-navy border-hotel-navy/20 hover:bg-hotel-navy/5"
                                                            onClick={() => {
                                                                field.onChange(searchDurationValue)
                                                                setOpenDurationCombobox(false)
                                                            }}
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Create "{searchDurationValue}"
                                                        </Button>
                                                    </div>
                                                </CommandEmpty>
                                                <CommandGroup className="max-h-[200px] overflow-auto">
                                                    {existingDurations.map((duration) => (
                                                        <CommandItem
                                                            value={duration}
                                                            key={duration}
                                                            onSelect={() => {
                                                                field.onChange(duration)
                                                                setOpenDurationCombobox(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    duration === field.value
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {duration}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
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
                                            <SelectTrigger className="border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50">
                                                <SelectValue placeholder="Select difficulty" />
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
                                        <SelectTrigger className="border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50">
                                            <SelectValue placeholder="Select status" />
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
                                <span className="flex items-center gap-2">Processing...</span>
                            ) : (
                                initialData ? t('update') : t('create')
                            )}
                        </Button>
                    </div>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
