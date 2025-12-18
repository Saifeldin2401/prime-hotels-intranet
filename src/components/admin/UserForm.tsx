import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
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
        .select('*')
        .order('title', { ascending: true })

      if (error) throw error
      return data as { id: string; title: string; default_role: AppRole; category: string }[]
    },
  })
  const [openJobTitle, setOpenJobTitle] = useState(false)

  useEffect(() => {
    if (user) {
      setEmail(user.email)
      setFullName(user.full_name || '')
      setPhone(user.phone || '')
      setJobTitle(user.job_title || '')
      setIsActive(user.is_active !== false) // Default to true if undefined
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
  }

  // Handle job title selection from DB
  const handleJobTitleSelect = (selectedTitle: string) => {
    setJobTitle(selectedTitle)
    setOpenJobTitle(false)

    // Find the corresponding job title object to get the role
    const titleObj = jobTitlesList?.find(t => t.title === selectedTitle)
    if (titleObj) {
      setRole(titleObj.default_role)
    } else {
      // Fallback to heuristic if somehow manually entered (though Combobox handles this differently)
      // or just keep existing logic if we allow custom
    }
  }

  const createUserMutation = useMutation({
    mutationFn: async () => {
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
        departmentIds: selectedDepartments
      }

      console.log('Creating user with payload:', payload)

      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: payload,
      })

      if (fnError) {
        // If function returns valid JSON error caught by wrapper
        throw new Error(fnError.message || JSON.stringify(fnError))
      }

      // Check for error in response body if wrapper didn't catch 500
      if (data?.error) {
        throw new Error(data.error)
      }

      const response = (data || {}) as { userId?: string, tempPassword?: string, message?: string }
      if (!response.userId) throw new Error('User ID not returned from create-user function')

      console.log('Create user response:', response)
      return response
    },
    onSuccess: (response) => {
      console.log('User creation success, response:', response)

      if (response?.tempPassword) {
        // Automatically copy password to clipboard
        navigator.clipboard.writeText(response.tempPassword).then(() => {
          toast({
            title: "✅ User Created - Password Copied!",
            description: `Password "${response.tempPassword}" copied to clipboard. User must change it on first login.`,
            duration: 10000,
          })
        }).catch(() => {
          // If clipboard fails, just show the password
          toast({
            title: "✅ User Created Successfully",
            description: `Temporary Password: ${response.tempPassword} (User must change on first login)`,
            duration: 30000,
          })
        })

        // Also log to console for backup
        console.log('==== NEW USER TEMPORARY PASSWORD ====')
        console.log(`Password: ${response.tempPassword}`)
        console.log('=====================================')
      } else {
        toast({
          title: "User Created",
          description: "User created successfully",
        })
      }

      onClose()
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!user) return

      // Update profile with job title and active status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          job_title: jobTitle || null,
          is_active: isActive
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

