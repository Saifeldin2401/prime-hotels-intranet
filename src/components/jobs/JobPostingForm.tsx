import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import type { JobPosting, SeniorityLevel, EmploymentType } from '@/lib/types'
import { getRoutingDescription } from '@/lib/cvRouting'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface JobPostingFormProps {
    job?: JobPosting
    onSuccess?: () => void
}

export function JobPostingForm({ job, onSuccess }: JobPostingFormProps) {
    const { t } = useTranslation('jobs')
    const { user, roles } = useAuth()
    const navigate = useNavigate()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [openJobTitle, setOpenJobTitle] = useState(false)

    // Fetch Job Titles from DB
    const { data: jobTitlesList } = useQuery({
        queryKey: ['job_titles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_titles')
                .select('*')
                .order('title', { ascending: true })

            if (error) throw error
            return data as { id: string; title: string; default_role: string; category: string }[]
        }
    })

    const [formData, setFormData] = useState({
        title: job?.title || '',
        property_id: job?.property_id || '',
        department_id: job?.department_id || '',
        seniority_level: job?.seniority_level || 'junior' as SeniorityLevel,
        employment_type: job?.employment_type || 'full_time' as EmploymentType,
        description: job?.description || '',
        requirements: job?.requirements || '',
        responsibilities: job?.responsibilities || '',
        salary_range_min: job?.salary_range_min || '',
        salary_range_max: job?.salary_range_max || '',
        closes_at: job?.closes_at ? new Date(job.closes_at).toISOString().split('T')[0] : ''
    })

    const isRegionalRole = (roles || []).some((userRole) => ['regional_admin', 'regional_hr'].includes(userRole.role))

    // Fetch properties
    const { data: properties } = useQuery({
        queryKey: ['properties'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            return data
        }
    })

    // Fetch departments for selected property
    const { data: departments } = useQuery({
        queryKey: ['departments', formData.property_id],
        queryFn: async () => {
            if (!formData.property_id) return []

            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .eq('property_id', formData.property_id)
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            return data
        },
        enabled: !!formData.property_id
    })

    const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'open' = 'draft') => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const jobData: any = {
                title: formData.title,
                property_id: formData.property_id || null,
                department_id: formData.department_id || null,
                seniority_level: formData.seniority_level,
                employment_type: formData.employment_type,
                description: formData.description || null,
                requirements: formData.requirements || null,
                responsibilities: formData.responsibilities || null,
                salary_range_min: formData.salary_range_min ? parseFloat(formData.salary_range_min as string) : null,
                salary_range_max: formData.salary_range_max ? parseFloat(formData.salary_range_max as string) : null,
                closes_at: formData.closes_at || null,
                status,
                created_by: user?.id
            }

            if (status === 'open') {
                jobData.published_at = new Date().toISOString()
            }

            let error
            if (job) {
                // Update existing job
                const result = await supabase
                    .from('job_postings')
                    .update(jobData)
                    .eq('id', job.id)
                error = result.error
            } else {
                // Create new job
                const result = await supabase
                    .from('job_postings')
                    .insert([jobData])
                error = result.error
            }

            if (error) throw error

            toast({
                title: job ? t('messages.success_update') : t('messages.success_create'),
                description: status === 'open'
                    ? t('messages.success_publish')
                    : t('messages.success_draft'),
            })

            if (onSuccess) {
                onSuccess()
            } else {
                navigate('/jobs')
            }
        } catch (error: any) {
            toast({
                title: t('common:error') || 'Error',
                description: error.message || t('messages.error_save'),
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={(e) => handleSubmit(e, 'draft')} className="space-y-6">
            {/* Basic Information */}
            <div className="prime-card">
                <div className="prime-card-header">
                    <h3 className="text-lg font-semibold">{t('sections.basic_info')}</h3>
                </div>
                <div className="prime-card-body space-y-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="title">{t('form.position_title')} *</Label>
                        <Popover open={openJobTitle} onOpenChange={setOpenJobTitle}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openJobTitle}
                                    className={cn(
                                        "w-full justify-between",
                                        !formData.title && "text-muted-foreground"
                                    )}
                                >
                                    {formData.title
                                        ? jobTitlesList?.find((t) => t.title === formData.title)?.title || formData.title
                                        : t('form.position_placeholder') || "Select job title"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search job title..." />
                                    <CommandList>
                                        <CommandEmpty>No job title found.</CommandEmpty>
                                        <CommandGroup>
                                            {jobTitlesList?.map((item) => (
                                                <CommandItem
                                                    value={item.title}
                                                    key={item.id}
                                                    onSelect={() => {
                                                        setFormData({ ...formData, title: item.title })
                                                        setOpenJobTitle(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            item.title === formData.title
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                        )}
                                                    />
                                                    {item.title} <span className="ml-auto text-xs text-muted-foreground">{item.category}</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="property">{t('form.property')}</Label>
                            <Select
                                value={formData.property_id}
                                onValueChange={(value) => setFormData({ ...formData, property_id: value, department_id: '' })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('form.select_property')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {properties?.map((property) => (
                                        <SelectItem key={property.id} value={property.id}>
                                            {property.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="department">{t('form.department')}</Label>
                            <Select
                                value={formData.department_id}
                                onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                                disabled={!formData.property_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('form.select_department')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments?.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="seniority">{t('form.seniority')} *</Label>
                            <Select
                                value={formData.seniority_level}
                                onValueChange={(value) => setFormData({ ...formData, seniority_level: value as SeniorityLevel })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="junior">{t('seniority.junior')}</SelectItem>
                                    <SelectItem value="mid">{t('seniority.mid')}</SelectItem>
                                    <SelectItem value="senior">{t('seniority.senior')}</SelectItem>
                                    <SelectItem value="manager">{t('seniority.manager')}</SelectItem>
                                    <SelectItem value="director">{t('seniority.director')}</SelectItem>
                                    <SelectItem value="executive">{t('seniority.executive')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                                {getRoutingDescription(formData.seniority_level)}
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="employment_type">{t('form.employment_type')} *</Label>
                            <Select
                                value={formData.employment_type}
                                onValueChange={(value) => setFormData({ ...formData, employment_type: value as EmploymentType })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full_time">{t('employment_type.full_time')}</SelectItem>
                                    <SelectItem value="part_time">{t('employment_type.part_time')}</SelectItem>
                                    <SelectItem value="contract">{t('employment_type.contract')}</SelectItem>
                                    <SelectItem value="temporary">{t('employment_type.temporary')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Job Details */}
            <div className="prime-card">
                <div className="prime-card-header">
                    <h3 className="text-lg font-semibold">{t('sections.job_details')}</h3>
                </div>
                <div className="prime-card-body space-y-4">
                    <div>
                        <Label htmlFor="description">{t('form.description')}</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder={t('form.description_placeholder')}
                            rows={4}
                        />
                    </div>

                    <div>
                        <Label htmlFor="requirements">{t('form.requirements')}</Label>
                        <Textarea
                            id="requirements"
                            value={formData.requirements}
                            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                            placeholder={t('form.requirements_placeholder')}
                            rows={4}
                        />
                    </div>

                    <div>
                        <Label htmlFor="responsibilities">{t('form.responsibilities')}</Label>
                        <Textarea
                            id="responsibilities"
                            value={formData.responsibilities}
                            onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                            placeholder={t('form.responsibilities_placeholder')}
                            rows={4}
                        />
                    </div>
                </div>
            </div>

            {/* Compensation & Closing */}
            <div className="prime-card">
                <div className="prime-card-header">
                    <h3 className="text-lg font-semibold">{t('sections.compensation')}</h3>
                </div>
                <div className="prime-card-body space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="salary_min">{t('form.salary_min')}</Label>
                            <Input
                                id="salary_min"
                                type="number"
                                value={formData.salary_range_min}
                                onChange={(e) => setFormData({ ...formData, salary_range_min: e.target.value })}
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <Label htmlFor="salary_max">{t('form.salary_max')}</Label>
                            <Input
                                id="salary_max"
                                type="number"
                                value={formData.salary_range_max}
                                onChange={(e) => setFormData({ ...formData, salary_range_max: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="closes_at">{t('form.closing_date')}</Label>
                        <Input
                            id="closes_at"
                            type="date"
                            value={formData.closes_at}
                            onChange={(e) => setFormData({ ...formData, closes_at: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/jobs')}
                    disabled={isSubmitting}
                >
                    {t('form.cancel')}
                </Button>
                <Button
                    type="submit"
                    variant="outline"
                    disabled={isSubmitting}
                >
                    {t('form.save_draft')}
                </Button>
                <Button
                    type="button"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={(e) => handleSubmit(e, 'open')}
                    disabled={isSubmitting}
                >
                    {job?.status === 'open' ? t('form.update_open') : t('form.publish')}
                </Button>
            </div>
        </form>
    )
}
