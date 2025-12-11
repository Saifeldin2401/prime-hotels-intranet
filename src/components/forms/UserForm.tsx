import { useForm } from '@/hooks/useForm'
import { userSchema } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormField, FormLabel, FormControl, FormMessage, FormSubmitButton, FormActions, FormSummary } from '@/components/ui/form'

interface UserFormData {
  full_name: string
  email: string
  phone?: string
  role: 'regional_admin' | 'regional_hr' | 'property_manager' | 'property_hr' | 'department_head' | 'staff'
  property_id?: string
  department_id?: string
  employee_id: string
  is_active: boolean
}

interface UserFormProps {
  initialData?: Partial<UserFormData>
  onSubmit: (data: UserFormData) => Promise<void>
  onCancel: () => void
}

export function UserForm({ initialData = {}, onSubmit, onCancel }: UserFormProps) {
  const form = useForm<UserFormData>({
    initialValues: {
      full_name: '',
      email: '',
      phone: '',
      role: 'staff',
      property_id: '',
      department_id: '',
      employee_id: '',
      is_active: true,
      ...initialData
    },
    schema: userSchema,
    onSubmit: async (data) => {
      await onSubmit(data)
    },
    resetOnSubmit: false
  })

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData.full_name ? 'Edit User' : 'Create New User'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form onSubmit={form.handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField name="full_name">
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter full name"
                  {...form.getFieldProps('full_name')}
                />
              </FormControl>
              <FormMessage />
            </FormField>

            <FormField name="email">
              <FormLabel>Email Address *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  {...form.getFieldProps('email')}
                />
              </FormControl>
              <FormMessage />
            </FormField>

            <FormField name="phone">
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="Enter phone number"
                  {...form.getFieldProps('phone')}
                />
              </FormControl>
              <FormMessage />
            </FormField>

            <FormField name="employee_id">
              <FormLabel>Employee ID *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., AB1234"
                  {...form.getFieldProps('employee_id')}
                />
              </FormControl>
              <FormMessage />
            </FormField>
          </div>

          {/* Role Assignment */}
          <div className="space-y-4">
            <FormField name="role">
              <FormLabel>Role *</FormLabel>
              <FormControl>
                <Select {...form.getFieldProps('role')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="department_head">Department Head</SelectItem>
                    <SelectItem value="property_hr">Property HR</SelectItem>
                    <SelectItem value="regional_hr">Regional HR</SelectItem>
                    <SelectItem value="property_manager">Property Manager</SelectItem>
                    <SelectItem value="regional_admin">Regional Admin</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormField>
          </div>

          {/* Property/Department Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField name="property_id">
              <FormLabel>Property</FormLabel>
              <FormControl>
                <Select {...form.getFieldProps('property_id')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Property</SelectItem>
                    <SelectItem value="123e4567-e89b-12d3-a456-426614174000">Prime Hotel Downtown</SelectItem>
                    <SelectItem value="123e4567-e89b-12d3-a456-426614174001">Prime Hotel Airport</SelectItem>
                    <SelectItem value="123e4567-e89b-12d3-a456-426614174002">Prime Resort</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormField>

            <FormField name="department_id">
              <FormLabel>Department</FormLabel>
              <FormControl>
                <Select {...form.getFieldProps('department_id')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Department</SelectItem>
                    <SelectItem value="123e4567-e89b-12d3-a456-426614174101">Housekeeping</SelectItem>
                    <SelectItem value="123e4567-e89b-12d3-a456-426614174102">Front Desk</SelectItem>
                    <SelectItem value="123e4567-e89b-12d3-a456-426614174103">Food & Beverage</SelectItem>
                    <SelectItem value="123e4567-e89b-12d3-a456-426614174104">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormField>
          </div>

          {/* Active Status */}
          <div className="space-y-2">
            <FormField name="is_active">
              <div className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox
                    id="is_active"
                    checked={form.values.is_active}
                    onCheckedChange={(checked) => form.setField('is_active', checked as boolean)}
                  />
                </FormControl>
                <FormLabel htmlFor="is_active">Active User</FormLabel>
              </div>
              <FormMessage />
            </FormField>
          </div>

          {/* Form Actions */}
          <FormActions>
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={form.isSubmitting}
              >
                Cancel
              </Button>
              
              <FormSubmitButton
                isSubmitting={form.isSubmitting}
                submittingText="Creating User..."
              >
                {initialData.full_name ? 'Update User' : 'Create User'}
              </FormSubmitButton>
            </div>
          </FormActions>

          {/* Form Summary */}
          <FormSummary
            errors={form.errors}
            isSubmitted={form.isSubmitted}
          />
        </Form>
      </CardContent>
    </Card>
  )
}
