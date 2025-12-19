import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ROLES, ROLE_HIERARCHY } from '@/lib/constants'

import type { Profile, Property, Department } from '@/lib/types'
import type { AppRole } from '@/lib/constants'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useDepartments } from '@/hooks/useDepartments'
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
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserFormProps {
  user?: Profile
  onClose: () => void
}

export function UserForm({ user, onClose }: UserFormProps) {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [role, setRole] = useState<AppRole | ''>('')
  const [isActive, setIsActive] = useState(true)
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [reportingTo, setReportingTo] = useState<string | null>(null)
  const [openReportingTo, setOpenReportingTo] = useState(false)

  // ... (rest of invalidation)

  const createUserMutation = useMutation({
    mutationFn: async () => {
      // ... (mutation logic same as before)
      if (!email || !fullName || !role) {
        throw new Error('Please fill in all required fields')
      }

      // Prepare payload for atomic creation
      const payload = {
        email,
        fullName,
        phone: phone || undefined,
        jobTitle: jobTitle || undefined,
        role,
        propertyIds: selectedProperties,
        departmentIds: selectedDepartments,
        reportingTo: reportingTo || undefined
      }

      console.log('Creating user with payload:', payload)

      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: payload,
      })

      if (fnError) {
        throw new Error(fnError.message || JSON.stringify(fnError))
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      const response = (data || {}) as { userId?: string, tempPassword?: string, message?: string }
      if (!response.userId) throw new Error('User ID not returned from create-user function')

      return response
    },
    onSuccess: (response) => {
      console.log('User creation success, response:', response)

      const tempPwd = response?.tempPassword || "TempPassword123!"

      // Copy password to clipboard automatically
      navigator.clipboard.writeText(tempPwd).catch(() => console.warn('Clipboard failed'))

      // Show credentials in a persistent toast - NO auto-download needed
      toast({
        title: "✅ User Created Successfully",
        description: (
          <div className="mt-2 space-y-2">
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Password:</strong> <code className="bg-gray-100 px-2 py-0.5 rounded">{tempPwd}</code></p>
            <p className="text-xs text-gray-500">Password copied to clipboard. User must change on first login.</p>
          </div>
        ),
        duration: 30000, // 30 seconds to give time to note it down
      })

      // Also log to console for backup
      console.log('==== NEW USER CREDENTIALS ====')
      console.log(`Email: ${email}`)
      console.log(`Password: ${tempPwd}`)
      console.log('==============================')

      onClose()
    },
    onError: (error) => {
      console.error('User creation error:', error)
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive"
      })
    }
  })


  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data as Property[]
    },
  })

  /* 
    Updated to use useDepartments hook which includes fallback data handling 
    for persistent 400 Bad Request API errors.
  */
  const { departments } = useDepartments()

  // Fetch Job Titles from DB
  const { data: jobTitlesList } = useQuery({
    queryKey: ['job_titles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_titles')
        .select(`
            *,
            department:departments(id, property_id)
        `)
        .order('title', { ascending: true })

      if (error) throw error
      return data as { id: string; title: string; default_role: AppRole; category: string; department?: { id: string; property_id: string } }[]
    },
  })
  const [openJobTitle, setOpenJobTitle] = useState(false)

  // Fetch potential managers based on selected departments/properties
  const { data: potentialManagers } = useQuery({
    queryKey: ['potential-managers', selectedDepartments, selectedProperties],
    queryFn: async () => {
      if (selectedDepartments.length === 0 && selectedProperties.length === 0) return []

      // Fetch profiles with manager-level roles in the selected departments/properties
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          job_title,
          user_roles(role),
          user_departments(department_id),
          user_properties(property_id)
        `)
        .eq('is_active', true)

      const { data, error } = await query
      if (error) throw error

      // Filter to only include people with management roles
      const managerRoles = ['department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']

      return (data || [])
        .filter((p: any) => {
          const roles = p.user_roles?.map((r: any) => r.role) || []
          const hasManagerRole = roles.some((r: string) => managerRoles.includes(r))
          if (!hasManagerRole) return false

          // Check if they're in the same department or property
          const deptIds = p.user_departments?.map((d: any) => d.department_id) || []
          const propIds = p.user_properties?.map((p: any) => p.property_id) || []

          const sameDept = selectedDepartments.some(d => deptIds.includes(d))
          const sameProp = selectedProperties.some(p => propIds.includes(p))

          return sameDept || sameProp
        })
        .map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          job_title: p.job_title,
          roles: p.user_roles?.map((r: any) => r.role) || [],
          isDeptHead: (p.user_roles?.map((r: any) => r.role) || []).includes('department_head')
        }))
        // Sort: department heads first, then by name
        .sort((a: any, b: any) => {
          if (a.isDeptHead && !b.isDeptHead) return -1
          if (!a.isDeptHead && b.isDeptHead) return 1
          return a.full_name.localeCompare(b.full_name)
        })
    },
    enabled: selectedDepartments.length > 0 || selectedProperties.length > 0
  })

  useEffect(() => {
    if (user) {
      setEmail(user.email)
      setFullName(user.full_name || '')
      setPhone(user.phone || '')
      setJobTitle(user.job_title || '')
      setIsActive(user.is_active !== false) // Default to true if undefined
      setReportingTo(user.reporting_to || null)
      // Load user's roles, properties, departments
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    if (!user) return

    // Load roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (rolesData && rolesData.length > 0) {
      setRole(rolesData[0].role)
    }

    // Load properties
    const { data: propertiesData } = await supabase
      .from('user_properties')
      .select('property_id')
      .eq('user_id', user.id)

    if (propertiesData) {
      setSelectedProperties(propertiesData.map((p) => p.property_id))
    }

    // Load departments
    const { data: departmentsData } = await supabase
      .from('user_departments')
      .select('department_id')
      .eq('user_id', user.id)

    if (departmentsData) {
      setSelectedDepartments(departmentsData.map((d) => d.department_id))
    }

    // Load reporting_to
    const { data: profileData } = await supabase
      .from('profiles')
      .select('reporting_to')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setReportingTo(profileData.reporting_to)
    }
  }

  // Auto-suggest manager when department changes (for new users)
  useEffect(() => {
    // Only auto-suggest for new users and if no manager already selected
    if (user || reportingTo) return

    // When potentialManagers loads and has data, suggest the first dept head
    if (potentialManagers && potentialManagers.length > 0) {
      const deptHead = potentialManagers.find((m: any) => m.isDeptHead)
      if (deptHead) {
        setReportingTo(deptHead.id)
        toast({
          title: "Manager Suggested",
          description: `${deptHead.full_name} (${deptHead.job_title || 'Manager'}) has been suggested as the reporting manager.`,
        })
      }
    }
  }, [potentialManagers, user, reportingTo])

  // Handle job title selection from DB
  const handleJobTitleSelect = (selectedTitle: string) => {
    setJobTitle(selectedTitle)
    setOpenJobTitle(false)

    // Find the corresponding job title object to get the role
    const titleObj = jobTitlesList?.find(t => t.title === selectedTitle)

    if (titleObj) {
      // Auto-select Role
      setRole(titleObj.default_role)

      let targetDeptId: string | undefined = titleObj.department?.id
      let targetPropertyId: string | undefined = titleObj.department?.property_id

      // Fallback: If no direct link, try to match by Category Name
      if (!targetDeptId && titleObj.category && departments) {
        // Try to find a department with matching name
        // 1. Prefer department in already selected properties
        let match = departments.find(d =>
          d.name === titleObj.category && selectedProperties.includes(d.property_id)
        )
        // 2. If not found, just pick the first one matching the name
        if (!match) {
          match = departments.find(d => d.name === titleObj.category)
        }

        if (match) {
          targetDeptId = match.id
          targetPropertyId = match.property_id
        }
      }

      // Auto-select Department & Property
      if (targetDeptId && targetPropertyId) {
        // Add property if not already selected
        if (!selectedProperties.includes(targetPropertyId)) {
          setSelectedProperties(prev => [...prev, targetPropertyId!])
        }

        // Add department if not already selected
        if (!selectedDepartments.includes(targetDeptId)) {
          setSelectedDepartments(prev => [...prev, targetDeptId!])
        }

        toast({
          title: "Auto-Assigned",
          description: "Department and Role updated based on Job Title.",
        })
      }
    }
  }



  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!user) return

      // Update profile with job title, active status, and reporting_to
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          job_title: jobTitle || null,
          is_active: isActive,
          reporting_to: reportingTo || null
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update role
      if (role) {
        // Delete existing roles
        await supabase.from('user_roles').delete().eq('user_id', user.id)
        // Insert new role
        await supabase.from('user_roles').insert({ user_id: user.id, role })
      }

      // Update properties
      await supabase.from('user_properties').delete().eq('user_id', user.id)
      if (selectedProperties.length > 0) {
        await supabase
          .from('user_properties')
          .insert(selectedProperties.map((propertyId) => ({ user_id: user.id, property_id: propertyId })))
      }

      // Update departments
      await supabase.from('user_departments').delete().eq('user_id', user.id)
      if (selectedDepartments.length > 0) {
        await supabase
          .from('user_departments')
          .insert(selectedDepartments.map((departmentId) => ({ user_id: user.id, department_id: departmentId })))
      }
    },
    onSuccess: () => {
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (user) {
      updateUserMutation.mutate()
    } else {
      createUserMutation.mutate()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={user ? 'Edit User' : 'Create User'}
        actions={
          <Button variant="ghost" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!!user}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Popover open={openJobTitle} onOpenChange={setOpenJobTitle}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openJobTitle}
                    className="w-full justify-between font-normal text-left"
                  >
                    {jobTitle || "Select job title..."}
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
                            key={item.id}
                            value={item.title}
                            onSelect={() => {
                              handleJobTitleSelect(item.title)
                            }}
                            className="p-0 data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                          >
                            <div
                              className="w-full flex items-center px-2 py-1.5 cursor-pointer"
                              onPointerDown={(e) => {
                                e.preventDefault()
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleJobTitleSelect(item.title)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  jobTitle === item.title ? "opacity-100" : "opacity-0"
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
              <p className="text-xs text-gray-600">
                Start typing to search available job positions
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Permission Level (System Role) *</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as AppRole)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select a role</option>
                {ROLE_HIERARCHY.map((r) => (
                  <option key={r} value={r}>
                    {ROLES[r].label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600">
                System role for permissions - auto-suggested based on job title
              </p>
            </div>

            {/* User Status Toggle - Only show for existing users */}
            {user && (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="space-y-0.5">
                  <Label htmlFor="is-active" className="font-medium">Account Status</Label>
                  <p className="text-sm text-gray-500">
                    {isActive
                      ? 'User can log in and access the system'
                      : 'User is deactivated and cannot log in'}
                  </p>
                </div>
                <Switch
                  id="is-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Properties</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {properties?.map((property) => (
                  <label key={property.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedProperties.includes(property.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProperties([...selectedProperties, property.id])
                        } else {
                          setSelectedProperties(selectedProperties.filter((id) => id !== property.id))
                        }
                      }}
                    />
                    <span className="text-sm">{property.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Departments</Label>
              <div className="max-h-60 overflow-y-auto border rounded-md p-4 space-y-4">
                {selectedProperties.length > 0 ? (
                  properties?.filter(p => selectedProperties.includes(p.id)).map((property) => {
                    const propertyDepts = departments?.filter(d => d.property_id === property.id)

                    if (!propertyDepts || propertyDepts.length === 0) return null

                    return (
                      <div key={property.id} className="space-y-2">
                        <h4 className="text-sm font-semibold font-sans text-gray-900 sticky top-0 bg-white py-1 border-b flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-hotel-gold"></span>
                          {property.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {propertyDepts.map((department) => (
                            <label key={department.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-hotel-gold focus:ring-hotel-gold"
                                checked={selectedDepartments.includes(department.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDepartments([...selectedDepartments, department.id])
                                  } else {
                                    setSelectedDepartments(selectedDepartments.filter((id) => id !== department.id))
                                  }
                                }}
                              />
                              <span className="text-sm text-gray-600">{department.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8 bg-gray-50 rounded-lg flex flex-col items-center justify-center border border-dashed">
                    <span className="mb-1">🏢</span>
                    Select a property above to view departments
                  </p>
                )}
                {selectedProperties.length > 0 && (!departments || departments.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No departments found for selected properties.</p>
                )}
              </div>
            </div>

            {/* Reports To (Manager) */}
            <div className="space-y-2">
              <Label htmlFor="reportingTo">Reports To (Manager)</Label>
              <Popover open={openReportingTo} onOpenChange={setOpenReportingTo}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openReportingTo}
                    className="w-full justify-between font-normal text-left"
                  >
                    {reportingTo
                      ? potentialManagers?.find((m: any) => m.id === reportingTo)?.full_name || 'Selected manager'
                      : "Select a manager..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search managers..." />
                    <CommandList>
                      <CommandEmpty>
                        {selectedDepartments.length === 0 && selectedProperties.length === 0
                          ? "Select a department first to see available managers"
                          : "No managers found in selected departments/properties"
                        }
                      </CommandEmpty>
                      <CommandGroup heading="Available Managers">
                        <CommandItem
                          value="no-manager"
                          onSelect={() => {
                            setReportingTo(null)
                            setOpenReportingTo(false)
                          }}
                          className="p-0 data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                        >
                          <div
                            className="w-full flex items-center px-2 py-1.5 cursor-pointer"
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.stopPropagation()
                              setReportingTo(null)
                              setOpenReportingTo(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !reportingTo ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="text-gray-500">No manager (top-level)</span>
                          </div>
                        </CommandItem>
                        {potentialManagers?.map((manager: any) => (
                          <CommandItem
                            key={manager.id}
                            value={manager.full_name}
                            onSelect={() => {
                              setReportingTo(manager.id)
                              setOpenReportingTo(false)
                            }}
                            className="p-0 data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                          >
                            <div
                              className="w-full flex items-center px-2 py-1.5 cursor-pointer"
                              onPointerDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.stopPropagation()
                                setReportingTo(manager.id)
                                setOpenReportingTo(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  reportingTo === manager.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span>{manager.full_name}</span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {manager.job_title || manager.roles?.join(', ')}
                              </span>
                              {manager.isDeptHead && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                  Dept Head
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-600">
                {selectedDepartments.length === 0 && selectedProperties.length === 0
                  ? "Select a department to see suggested managers"
                  : reportingTo
                    ? "Manager automatically suggested based on department"
                    : "Leave empty for top-level employees (executives)"}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-hotel-gold text-white hover:bg-hotel-gold-dark rounded-md transition-colors" disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                {(createUserMutation.isPending || updateUserMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {user ? 'Update' : 'Create'} User
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

