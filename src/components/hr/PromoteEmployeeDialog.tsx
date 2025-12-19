import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

const formSchema = z.object({
    employeeId: z.string().min(1, "Employee is required"),
    newRole: z.enum([
        "regional_admin",
        "property_manager",
        "property_hr",
        "regional_hr",
        "department_head",
        "staff",
    ]),
    newJobTitle: z.string().min(1, "Job title is required"),
    newDepartmentId: z.string().optional(),
    effectiveDate: z.date(),
    notes: z.string().optional(),
});

interface Profile {
    id: string;
    full_name: string;
    job_title: string;
    department?: { name: string };
}

interface Department {
    id: string;
    name: string;
}

interface PromoteEmployeeDialogProps {
    children?: React.ReactNode;
    onSuccess?: () => void;
}

export function PromoteEmployeeDialog({
    children,
    onSuccess,
}: PromoteEmployeeDialogProps) {
    const [open, setOpen] = useState(false);
    const [employees, setEmployees] = useState<Profile[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            newJobTitle: "",
            notes: "",
            effectiveDate: new Date(),
        },
    });

    const [openJobTitle, setOpenJobTitle] = useState(false);

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
        },
        enabled: open // Only fetch when dialog is open
    });

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        setLoadingUsers(true);
        try {
            // Fetch Employees (Profiles)
            // In a real app, you might want to filter this by viewable property if restricted
            // Fetch Employees (Profiles) - Filtered by user's property
            let query = supabase
                .from("profiles")
                .select("id, full_name, job_title")
                .eq("is_active", true)
                .order("full_name");

            // If not regional admin, strict filter by property
            // (Assuming regional admin might want to see everyone, but user asked for "his property")
            if (user?.id) {
                const { data: userProps } = await supabase
                    .from('user_properties')
                    .select('property_id')
                    .eq('user_id', user.id);

                const propIds = userProps?.map(p => p.property_id) || [];

                if (propIds.length > 0) {
                    // Get profiles that belong to these properties
                    // We need a subquery or strict RLS. 
                    // Since we can't easily do a join filter on the top level without !inner, let's use !inner
                    query = supabase
                        .from("profiles")
                        .select("id, full_name, job_title, user_properties!inner(property_id)")
                        .eq("is_active", true)
                        .in("user_properties.property_id", propIds)
                        .order("full_name");
                }
            }

            const { data: profiles, error: profilesError } = await query;

            if (profilesError) throw profilesError;
            setEmployees(profiles || []);

            // Fetch Departments
            const { data: depts, error: deptsError } = await supabase
                .from("departments")
                .select("id, name")
                .order("name");

            if (deptsError) throw deptsError;
            setDepartments(depts || []);
        } catch (error) {
            console.error("Error loading data:", error);
            toast({
                title: "Error",
                description: "Failed to load employees or departments",
                variant: "destructive",
            });
        } finally {
            setLoadingUsers(false);
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;

        try {
            const { error } = await supabase.rpc("submit_promotion_request", {
                p_employee_id: values.employeeId,
                p_new_role: values.newRole,
                p_new_job_title: values.newJobTitle,
                p_new_department_id: values.newDepartmentId || null,
                p_effective_date: format(values.effectiveDate, "yyyy-MM-dd"),
                p_notes: values.notes || null,
            });

            if (error) throw error;

            toast({
                title: "Request Submitted",
                description: "Promotion request has been submitted for approval",
            });
            setOpen(false);
            form.reset();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error("Promotion error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to process promotion",
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button>Promote Employee</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Promote Employee</DialogTitle>
                    <DialogDescription>
                        Submit a promotion request for approval. Changes will be applied on the effective
                        date after approval.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="employeeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Employee *</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger disabled={loadingUsers}>
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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="newRole"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Role *</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select new role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="department_head">
                                                Department Head
                                            </SelectItem>
                                            <SelectItem value="property_hr">Property HR</SelectItem>
                                            <SelectItem value="property_manager">
                                                Property Manager
                                            </SelectItem>
                                            <SelectItem value="regional_hr">Regional HR</SelectItem>
                                            <SelectItem value="regional_admin">
                                                Regional Admin
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="newJobTitle"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>New Job Title *</FormLabel>
                                    <Popover open={openJobTitle} onOpenChange={setOpenJobTitle}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openJobTitle}
                                                    className={cn(
                                                        "w-full justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? jobTitlesList?.find((t) => t.title === field.value)?.title || field.value
                                                        : "Select job title"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
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
                                                                    form.setValue("newJobTitle", item.title)
                                                                    if (item.default_role && !form.getValues("newRole")) {
                                                                        // @ts-ignore
                                                                        form.setValue("newRole", item.default_role)
                                                                    }
                                                                    setOpenJobTitle(false)
                                                                }}
                                                                className="p-0 data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                                            >
                                                                <div
                                                                    className="w-full flex items-center px-2 py-1.5 cursor-pointer"
                                                                    onPointerDown={(e) => e.preventDefault()}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        form.setValue("newJobTitle", item.title)
                                                                        if (item.default_role && !form.getValues("newRole")) {
                                                                            // @ts-ignore
                                                                            form.setValue("newRole", item.default_role)
                                                                        }
                                                                        setOpenJobTitle(false)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            item.title === field.value
                                                                                ? "opacity-100"
                                                                                : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {item.title} <span className="ml-auto text-xs text-muted-foreground">{item.category}</span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="newDepartmentId"
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
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Promotion will be automatically applied on this date
                                    </p>
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
                                            placeholder="Add any additional notes about this promotion..."
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
