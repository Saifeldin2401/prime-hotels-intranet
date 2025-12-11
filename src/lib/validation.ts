import { z } from 'zod'

// Common validation patterns
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const phonePattern = /^[\+]?[1-9][\d]{0,15}$/
export const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
export const namePattern = /^[a-zA-Z\s'-]{2,50}$/
export const employeeIdPattern = /^[A-Z]{2}\d{4,6}$/
export const departmentCodePattern = /^[A-Z]{3,4}$/

// Zod schemas for different entities
export const userSchema = z.object({
  email: z.string().email('Invalid email address').regex(emailPattern, 'Invalid email format'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').regex(namePattern, 'Invalid name format'),
  phone: z.string().regex(phonePattern, 'Invalid phone number').optional().or(z.literal('')),
  role: z.enum(['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']),
  property_id: z.string().uuid('Invalid property ID').optional(),
  department_id: z.string().uuid('Invalid department ID').optional(),
  employee_id: z.string().regex(employeeIdPattern, 'Invalid employee ID format (e.g., AB1234)'),
  is_active: z.boolean().default(true)
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordPattern, 'Password must contain uppercase, lowercase, number, and special character'),
  confirm_password: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
})

export const documentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  category: z.enum(['sop', 'hr_policy', 'training', 'manual', 'form', 'other']),
  file_path: z.string().min(1, 'File is required'),
  version: z.string().default('1.0'),
  is_public: z.boolean().default(false),
  property_id: z.string().uuid('Invalid property ID').optional(),
  department_id: z.string().uuid('Invalid department ID').optional()
})

export const trainingModuleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  category: z.enum(['mandatory', 'skills', 'safety', 'compliance', 'leadership']),
  duration_minutes: z.number().min(5, 'Duration must be at least 5 minutes').max(480, 'Duration too long'),
  is_mandatory: z.boolean().default(false),
  valid_until: z.string().datetime('Invalid date format').optional(),
  property_id: z.string().uuid('Invalid property ID').optional(),
  department_id: z.string().uuid('Invalid department ID').optional()
})

export const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  target_audience: z.enum(['all', 'staff', 'managers', 'hr', 'admin']),
  expires_at: z.string().datetime('Invalid expiry date').optional(),
  is_pinned: z.boolean().default(false),
  property_id: z.string().uuid('Invalid property ID').optional()
})

export const maintenanceTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'general', 'internet', 'security']),
  location: z.string().min(1, 'Location is required').max(100, 'Location too long'),
  property_id: z.string().uuid('Invalid property ID'),
  assigned_to: z.string().uuid('Invalid assignee ID').optional(),
  estimated_cost: z.number().min(0, 'Invalid cost').optional()
})

export const employeeReferralSchema = z.object({
  referred_by: z.string().uuid('Invalid referrer ID'),
  candidate_name: z.string().min(2, 'Candidate name required').max(100, 'Name too long').regex(namePattern, 'Invalid name format'),
  candidate_email: z.string().email('Invalid email address'),
  candidate_phone: z.string().regex(phonePattern, 'Invalid phone number').optional().or(z.literal('')),
  position: z.string().min(1, 'Position is required').max(100, 'Position too long'),
  department: z.string().min(1, 'Department is required').max(50, 'Department too long'),
  relationship: z.string().min(1, 'Relationship is required').max(50, 'Relationship too long'),
  notes: z.string().max(1000, 'Notes too long').optional()
})

export const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(100, 'Name too long'),
  code: z.string().min(3, 'Property code must be at least 3 characters').max(10, 'Code too long').toUpperCase(),
  address: z.string().min(5, 'Address is required').max(500, 'Address too long'),
  city: z.string().min(2, 'City is required').max(50, 'City too long'),
  country: z.string().min(2, 'Country is required').max(50, 'Country too long'),
  phone: z.string().regex(phonePattern, 'Invalid phone number'),
  email: z.string().email('Invalid email address'),
  manager_id: z.string().uuid('Invalid manager ID').optional(),
  is_active: z.boolean().default(true)
})

export const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(50, 'Name too long'),
  code: z.string().regex(departmentCodePattern, 'Invalid department code format (e.g., HR, FIN, OPS)'),
  description: z.string().max(500, 'Description too long').optional(),
  property_id: z.string().uuid('Invalid property ID'),
  head_id: z.string().uuid('Invalid department head ID').optional(),
  is_active: z.boolean().default(true)
})

// Form validation utilities
export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string> } => {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.issues.forEach((err) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      return { success: false, errors }
    }
    return { success: false, errors: { _form: 'Validation failed' } }
  }
}

export const getFieldError = (errors: Record<string, string>, fieldName: string): string | undefined => {
  return errors[fieldName]
}

export const hasFieldError = (errors: Record<string, string>, fieldName: string): boolean => {
  return fieldName in errors
}

export const getFirstError = (errors: Record<string, string>): string | undefined => {
  const errorKeys = Object.keys(errors)
  return errorKeys.length > 0 ? errors[errorKeys[0]] : undefined
}

// Real-time validation utilities
export const createFieldValidator = (schema: z.ZodSchema) => {
  return (value: unknown): string | undefined => {
    try {
      schema.parse(value)
      return undefined
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.issues[0]?.message
      }
      return 'Invalid input'
    }
  }
}

export const validateEmail = createFieldValidator(z.string().email('Invalid email address'))
export const validatePhone = createFieldValidator(z.string().regex(phonePattern, 'Invalid phone number'))
export const validatePassword = createFieldValidator(z.string().regex(passwordPattern, 'Password must contain uppercase, lowercase, number, and special character'))
export const validateName = createFieldValidator(z.string().min(2, 'Name must be at least 2 characters').regex(namePattern, 'Invalid name format'))
export const validateEmployeeId = createFieldValidator(z.string().regex(employeeIdPattern, 'Invalid employee ID format'))

// Async validation utilities
export const validateUniqueEmail = async (email: string, excludeUserId?: string): Promise<string | undefined> => {
  // This would typically make an API call to check if email exists
  // For now, return undefined (no error)
  return undefined
}

export const validateUniqueEmployeeId = async (employeeId: string, excludeUserId?: string): Promise<string | undefined> => {
  // This would typically make an API call to check if employee ID exists
  // For now, return undefined (no error)
  return undefined
}

// Form transformation utilities
export const sanitizeFormData = <T>(data: T): T => {
  const sanitized = { ...data } as any
  
  // Trim string fields
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key]
    if (typeof value === 'string') {
      sanitized[key] = value.trim()
    }
  })
  
  return sanitized as T
}

export const prepareFormData = <T>(data: T): Partial<T> => {
  // Remove empty strings and undefined values
  const prepared: Partial<T> = {}
  
  Object.entries(data as any).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      prepared[key as keyof T] = value
    }
  })
  
  return prepared
}

// Error message utilities
export const formatErrorMessage = (error: string | undefined): string | undefined => {
  if (!error) return undefined
  
  // Capitalize first letter
  return error.charAt(0).toUpperCase() + error.slice(1)
}

export const getValidationSummary = (errors: Record<string, string>): string => {
  const errorCount = Object.keys(errors).length
  return `${errorCount} ${errorCount === 1 ? 'error' : 'errors'} found. Please correct the highlighted fields.`
}

// Type guards
export const isValidationError = (error: unknown): error is z.ZodError => {
  return error instanceof z.ZodError
}

export const isFieldValidationError = (error: unknown): error is { field: string; message: string } => {
  return typeof error === 'object' && error !== null && 'field' in error && 'message' in error
}

// Custom validation rules
export const customValidations = {
  futureDate: (value: string): boolean => {
    const date = new Date(value)
    const now = new Date()
    return date > now
  },
  
  pastDate: (value: string): boolean => {
    const date = new Date(value)
    const now = new Date()
    return date < now
  },
  
  adultAge: (value: string): boolean => {
    const birthDate = new Date(value)
    const now = new Date()
    const age = now.getFullYear() - birthDate.getFullYear()
    return age >= 18
  },
  
  businessHours: (value: string): boolean => {
    const hour = parseInt(value.split(':')[0])
    return hour >= 6 && hour <= 22
  },
  
  strongPassword: (value: string): boolean => {
    return passwordPattern.test(value)
  },
  
  validEmployeeId: (value: string): boolean => {
    return employeeIdPattern.test(value)
  }
}

// Form state utilities
export const createFormState = <T>(initialData: T) => {
  return {
    data: initialData,
    errors: {} as Record<string, string>,
    touched: {} as Record<string, boolean>,
    isSubmitting: false,
    isValid: true,
    isDirty: false
  }
}

export const updateFormState = <T>(state: ReturnType<typeof createFormState<T>>, updates: Partial<ReturnType<typeof createFormState<T>>>) => {
  return { ...state, ...updates }
}

export const markFieldTouched = <T>(state: ReturnType<typeof createFormState<T>>, fieldName: string) => {
  return updateFormState(state, {
    touched: { ...state.touched, [fieldName]: true },
    isDirty: true
  })
}

export const setFieldValue = <T>(state: ReturnType<typeof createFormState<T>>, fieldName: string, value: any) => {
  return updateFormState(state, {
    data: { ...state.data, [fieldName]: value },
    isDirty: true
  })
}

export const setFieldError = <T>(state: ReturnType<typeof createFormState<T>>, fieldName: string, error: string | undefined) => {
  const newErrors = { ...state.errors }
  if (error) {
    newErrors[fieldName] = error
  } else {
    delete newErrors[fieldName]
  }
  
  return updateFormState(state, {
    errors: newErrors,
    isValid: Object.keys(newErrors).length === 0
  })
}
