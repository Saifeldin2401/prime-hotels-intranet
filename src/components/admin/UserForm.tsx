import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ROLES, ROLE_HIERARCHY } from '@/lib/constants'
import { suggestSystemRole, getCommonJobTitles } from '@/lib/jobTitleMappings'
import type { Profile, Property, Department } from '@/lib/types'
import type { AppRole } from '@/lib/constants'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useDepartments } from '@/hooks/useDepartments'

interface UserFormProps {
  user?: Profile
  onClose: () => void
}

export function UserForm({ user, onClose }: UserFormProps) {
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

  // Handle job title change and auto-suggest role
  const handleJobTitleChange = (newJobTitle: string) => {
    setJobTitle(newJobTitle)

    // Auto-suggest system role if no role is selected yet
    if (!role && newJobTitle.trim()) {
      const suggestedRole = suggestSystemRole(newJobTitle)
      setRole(suggestedRole)
    }
  }

  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!email || !fullName || !role) {
        throw new Error('Please fill in all required fields')
      }

      // Call Edge Function via Supabase client so it sends the current user's JWT
      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: { email, fullName },
      })

      if (fnError) {
        throw new Error(fnError.message || 'Failed to create user')
      }

      const { userId } = (data || {}) as { userId?: string }
      if (!userId) throw new Error('User ID not returned from create-user function')

      // Update profile with job title
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          job_title: jobTitle || null
        })
        .eq('id', userId)

      if (profileError) throw profileError

      // Assign role
      if (role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role })

        if (roleError) throw roleError
      }

      // Assign properties
      if (selectedProperties.length > 0) {
        const { error: propError } = await supabase
          .from('user_properties')
          .insert(selectedProperties.map((propertyId) => ({ user_id: userId, property_id: propertyId })))

        if (propError) throw propError
      }

      // Assign departments
      if (selectedDepartments.length > 0) {
        const { error: deptError } = await supabase
          .from('user_departments')
          .insert(selectedDepartments.map((departmentId) => ({ user_id: userId, department_id: departmentId })))

        if (deptError) throw deptError
      }

      return userId
    },
    onSuccess: () => {
      onClose()
    },
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
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => handleJobTitleChange(e.target.value)}
                placeholder="e.g., Front Office Manager, Room Attendant"
                list="job-titles-datalist"
                required
              />
              <datalist id="job-titles-datalist">
                {getCommonJobTitles().map((title) => (
                  <option key={title} value={title} />
                ))}
              </datalist>
              <p className="text-xs text-gray-600">
                Actual hotel job position (will be displayed throughout the system)
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

            <div className="space-y-2">
              <Label>Departments</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {departments?.map((department) => (
                  <label key={department.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(department.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDepartments([...selectedDepartments, department.id])
                        } else {
                          setSelectedDepartments(selectedDepartments.filter((id) => id !== department.id))
                        }
                      }}
                    />
                    <span className="text-sm">{department.name}</span>
                  </label>
                ))}
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

