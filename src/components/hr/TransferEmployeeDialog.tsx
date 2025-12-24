import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
    employeeId: z.string().min(1, "Employee is required"),
    targetPropertyId: z.string().min(1, "Target Property is required"),
    targetDepartmentId: z.string().optional(),
    effectiveDate: z.date(),
    notes: z.string().optional(),
});

interface Profile {
    id: string;
    full_name: string;
    job_title: string;
    user_properties?: {
        property_id: string;
        properties: {
            name: string;
        } | {
            name: string;
        }[];
    }[];
}

interface Property {
    id: string;
    name: string;
}

interface Department {
    id: string;
    name: string;
}

interface TransferEmployeeDialogProps {
    children?: React.ReactNode;
    onSuccess?: () => void;
}

export function TransferEmployeeDialog({
    children,
    onSuccess,
}: TransferEmployeeDialogProps) {
    const [open, setOpen] = useState(false);
    const [employees, setEmployees] = useState<Profile[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const { user } = useAuth()
    const { t } = useTranslation('hr');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            notes: "",
            effectiveDate: new Date(),
        },
    });

    const loadData = useCallback(async () => {
        setLoadingData(true);
        try {
            // Fetch Employees
            // Fetch Employees - Filtered by user's property
            let query = supabase
                .from("profiles")
                .select("id, full_name, job_title, user_properties!inner(property_id, properties(name))")
                .eq("is_active", true)
                .order("full_name");

            if (user?.id) {
                const { data: userProps } = await supabase
                    .from('user_properties')
                    .select('property_id')
                    .eq('user_id', user.id);

                const propIds = userProps?.map(p => p.property_id) || [];

                if (propIds.length > 0) {
                    query = supabase
                        .from("profiles")
                        .select("id, full_name, job_title, user_properties!inner(property_id, properties(name))")
                        .eq("is_active", true)
                        .in("user_properties.property_id", propIds)
                        .order("full_name");
                }
            }

            const { data: profiles, error: profilesError } = await query;

            if (profilesError) throw profilesError;
            setEmployees((profiles as unknown as Profile[]) || []);

            // Fetch Properties (exclude current if possible, but basic list is fine for now)
            const { data: props, error: propsError } = await supabase
                .from("properties")
                .select("id, name")
                .order("name");

            if (propsError) throw propsError;
            setProperties(props || []);

            // Fetch Departments
            const { data: depts, error: deptsError } = await supabase
                .from("departments")
                .select("id, name")
                .order("name");

            if (deptsError) throw deptsError;
            setDepartments(depts || []);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoadingData(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open, loadData]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;

        try {
            const { error } = await supabase.rpc("submit_transfer_request", {
                p_employee_id: values.employeeId,
                p_to_property_id: values.targetPropertyId,
                p_to_department_id: values.targetDepartmentId || null,
                p_effective_date: format(values.effectiveDate, "yyyy-MM-dd"),
                p_notes: values.notes || null,
            });

            if (error) throw error;

            toast.success("Transfer request has been submitted for approval");
            setOpen(false);
            form.reset();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error("Transfer error:", error);
            toast.error(typeof error === 'object' && error !== null && 'message' in error
                ? String(error.message)
                : "Failed to submit transfer request");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button>{t('transfer.title')}</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Transfer Employee</DialogTitle>
                    <DialogDescription>
                        Submit a transfer request. The employee will be moved to the new property/department on the effective date after approval.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="employeeId"
                            render={({ field }) => {
                                const selectedEmp = employees.find(e => e.id === field.value);
                                const currentProp = selectedEmp?.user_properties?.[0]?.properties;
                                const currentPropName = Array.isArray(currentProp) ? currentProp[0]?.name : currentProp?.name;

                                return (
                                    <FormItem>
                                        <FormLabel>Employee *</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger disabled={loadingData}>
                                                    <SelectValue placeholder="Select employee" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {employees.map((emp) => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.full_name} ({emp.job_title || "No Title"})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {currentPropName && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Current Property: <span className="font-medium text-foreground">{currentPropName}</span>
                                            </p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                );
                            }}
                        />

                        <FormField
                            control={form.control}
                            name="targetPropertyId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Property *</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger disabled={loadingData}>
                                                <SelectValue placeholder="Select new property" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {properties.map((prop) => (
                                                <SelectItem key={prop.id} value={prop.id}>
                                                    {prop.name}
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
                            name="targetDepartmentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Department (Optional)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select department" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {departments.map((dept) => (
                                                <SelectItem key={dept.id} value={dept.id}>
                                                    {dept.name}
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
                            name="effectiveDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Effective Date *</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Reason for transfer..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Submit Request
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
