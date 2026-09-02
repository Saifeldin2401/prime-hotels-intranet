import { z } from 'zod'

// ============================================================================
// SECURITY-FOCUSED VALIDATION PATTERNS
// ============================================================================

// Email validation with stricter rules
export const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Phone validation - international format
export const phonePattern = /^\+?[1-9]\d{1,14}$/

// Password validation - strong requirements
export const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/

// Individual password requirement patterns for live validation
export const passwordPatterns = {
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  number: /\d/,
  special: /[@$!%*?&]/,
} as const

// Minimum password length
export const MIN_PASSWORD_LENGTH = 12

// Password requirement labels for UI
export const passwordRequirementLabels = {
  length: (min: number) => `At least ${min} characters`,
  lowercase: 'One lowercase letter',
  uppercase: 'One uppercase letter',
  number: 'One number',
  special: 'One special character (@$!%*?&)',
} as const

// Name validation - letters, spaces, hyphens, apostrophes only
export const namePattern = /^[a-zA-Z\s'-]{2,50}$/

// Employee ID validation
export const employeeIdPattern = /^[A-Z]{2}\d{4,6}$/

// Department code validation
export const departmentCodePattern = /^[A-Z]{3,4}$/

// UUID validation
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Safe string validation - no HTML/script tags
export const safeStringPattern = /^[^<>]*$/

// URL validation - safe protocols only
export const safeUrlPattern = /^https?:\/\/.+/i

// Username validation - alphanumeric and underscores only
export const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/

// ============================================================================
// SECURITY VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a string doesn't contain HTML/script tags
 * Uses a simple check for angle brackets - DOMPurify is used for actual sanitization when needed
 */
const noHtmlCheck = (value: string): boolean => {
  // Simple pattern to detect potential HTML tags
  // This is intentionally simple - we reject any content that looks like HTML
  const htmlPattern = /<[^>]+>/
  // Check for script tag patterns (case-insensitive, various forms)
  const scriptPattern = /<\s*script\b/i
  return !htmlPattern.test(value) && !scriptPattern.test(value)
}

/**
 * Validate URL uses safe protocol
 */
const safeUrlCheck = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validate no control characters
 */
const noControlCharsCheck = (value: string): boolean => {
  // eslint-disable-next-line no-control-regex
  return !/[\x00-\x1F\x7F-\x9F]/.test(value)
}

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const userSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .regex(emailPattern, 'Invalid email format')
    .max(254, 'Email too long')
    .refine(noHtmlCheck, 'Email contains invalid characters'),
  
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .regex(namePattern, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .refine(noHtmlCheck, 'Name contains invalid characters'),
  
  phone: z.string()
    .regex(phonePattern, 'Invalid phone number format (use international format)')
    .optional()
    .or(z.literal('')),
  
  role: z.enum([
    'administrator',
    'training_manager',
    'knowledge_manager',
    'author',
    'learner',
    'super_admin',
    'corporate_admin',
    'regional_admin', 
    'regional_hr', 
    'property_manager', 
    'property_hr', 
    'department_head', 
    'manager',
    'staff'
  ]),
  
  property_id: z.string()
    .regex(uuidPattern, 'Invalid property ID')
    .optional(),
  
  department_id: z.string()
    .regex(uuidPattern, 'Invalid department ID')
    .optional(),
  
  employee_id: z.string()
    .regex(employeeIdPattern, 'Invalid employee ID format (e.g., AB1234)'),
  
  is_active: z.boolean().default(true)
})

export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(254, 'Email too long')
    .refine(noHtmlCheck, 'Invalid input'),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long')
})

export const passwordChangeSchema = z.object({
  current_password: z.string()
    .min(1, 'Current password is required')
    .max(128, 'Password too long'),
  
  new_password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password too long')
    .regex(
      passwordPattern, 
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  
  confirm_password: z.string()
    .min(1, 'Password confirmation is required')
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
})

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

export const documentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long (max 200 characters)')
    .refine(noHtmlCheck, 'Title cannot contain HTML tags')
    .refine(noControlCharsCheck, 'Title contains invalid characters'),
  
  description: z.string()
    .max(1000, 'Description too long (max 1000 characters)')
    .refine(noHtmlCheck, 'Description cannot contain HTML tags')
    .optional(),
  
  category: z.enum(['sop', 'hr_policy', 'training', 'manual', 'form', 'other']),
  
  file_path: z.string()
    .min(1, 'File is required')
    .max(500, 'File path too long'),
  
  version: z.string()
    .max(20, 'Version too long')
    .default('1.0'),
  
  is_public: z.boolean().default(false),
  
  property_id: z.string()
    .regex(uuidPattern, 'Invalid property ID')
    .optional(),
  
  department_id: z.string()
    .regex(uuidPattern, 'Invalid department ID')
    .optional()
})

// ============================================================================
// KNOWLEDGE BASE SCHEMAS (Enhanced Security)
// ============================================================================

export const knowledgeArticleSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long (max 200 characters)')
    .refine(noHtmlCheck, 'Title cannot contain HTML tags')
    .refine(noControlCharsCheck, 'Title contains invalid characters'),
  
  description: z.string()
    .max(1000, 'Description too long (max 1000 characters)')
    .refine(noHtmlCheck, 'Description cannot contain HTML tags')
    .optional()
    .or(z.literal('')),
  
  summary: z.string()
    .max(2000, 'Summary too long (max 2000 characters)')
    .optional()
    .or(z.literal('')),
  
  content: z.string()
    .max(50000, 'Content too long (max 50000 characters)'),
  // Note: Content allows HTML but will be sanitized on display
  
  content_type: z.enum([
    'document',
    'video',
    'checklist',
    'faq',
    'visual',
    'policy'
  ]).default('document'),
  
  visibility: z.enum([
    'all_properties',
    'property',
    'department',
    'group_department',
    'specific_departments',
    'role'
  ]).default('all_properties'),
  
  department_id: z.string()
    .regex(uuidPattern, 'Invalid department ID')
    .optional()
    .nullable(),
  
  category_id: z.string()
    .regex(uuidPattern, 'Invalid category ID')
    .optional()
    .nullable(),
  
  target_property_id: z.string()
    .regex(uuidPattern, 'Invalid property ID')
    .optional()
    .nullable(),
  
  requires_acknowledgment: z.boolean().default(false),
  
  featured: z.boolean().default(false),
  
  // Content type specific fields
  video_url: z.string()
    .max(500, 'Video URL too long')
    .refine(safeUrlCheck, 'Invalid URL format (must be http/https)')
    .optional()
    .or(z.literal('')),
  
  checklist_items: z.array(z.object({
    id: z.string(),
    text: z.string()
      .min(1, 'Task text is required')
      .max(500, 'Task text too long')
      .refine(noHtmlCheck, 'Task cannot contain HTML'),
    is_required: z.boolean().default(false),
    order: z.number().int().min(0)
  })).max(100, 'Too many checklist items (max 100)').default([]),
  
  faq_items: z.array(z.object({
    id: z.string(),
    question: z.string()
      .min(1, 'Question is required')
      .max(500, 'Question too long')
      .refine(noHtmlCheck, 'Question cannot contain HTML'),
    answer: z.string()
      .min(1, 'Answer is required')
      .max(5000, 'Answer too long'),
    // Note: Answer allows HTML but will be sanitized on display
    order: z.number().int().min(0)
  })).max(50, 'Too many FAQ items (max 50)').default([])
})

// ============================================================================
// TRAINING MODULE SCHEMAS
// ============================================================================

export const trainingModuleSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long (max 200 characters)')
    .refine(noHtmlCheck, 'Title cannot contain HTML tags'),
  
  description: z.string()
    .max(1000, 'Description too long (max 1000 characters)')
    .refine(noHtmlCheck, 'Description cannot contain HTML tags')
    .optional(),
  
  category: z.enum(['mandatory', 'skills', 'safety', 'compliance', 'leadership']),
  
  duration_minutes: z.number()
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration too long (max 8 hours)'),
  
  is_mandatory: z.boolean().default(false),
  
  passing_score_percentage: z.number()
    .min(0, 'Passing score must be at least 0%')
    .max(100, 'Passing score cannot exceed 100%')
    .default(80),
  
  valid_until: z.string()
    .datetime('Invalid date format')
    .optional(),
  
  property_id: z.string()
    .regex(uuidPattern, 'Invalid property ID')
    .optional(),
  
  department_id: z.string()
    .regex(uuidPattern, 'Invalid department ID')
    .optional()
})

// ============================================================================
// ANNOUNCEMENT SCHEMAS
// ============================================================================

export const announcementSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long (max 200 characters)')
    .refine(noHtmlCheck, 'Title cannot contain HTML tags'),
  
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(5000, 'Content too long (max 5000 characters)'),
  // Note: Content allows HTML but will be sanitized on display
  
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  
  target_audience: z.enum(['all', 'staff', 'managers', 'hr', 'admin']),
  
  expires_at: z.string()
    .datetime('Invalid expiry date')
    .optional(),
  
  is_pinned: z.boolean().default(false),
  
  property_id: z.string()
    .regex(uuidPattern, 'Invalid property ID')
    .optional()
})

// ============================================================================
// MAINTENANCE TICKET SCHEMAS
// ============================================================================

export const maintenanceTicketSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long (max 200 characters)')
    .refine(noHtmlCheck, 'Title cannot contain HTML tags'),
  
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description too long (max 2000 characters)')
    .refine(noHtmlCheck, 'Description cannot contain HTML tags'),
  
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']),
  
  category: z.enum([
    'plumbing', 
    'electrical', 
    'hvac', 
    'appliance', 
    'structural', 
    'cosmetic', 
    'safety', 
    'other'
  ]),
  
  location: z.string()
    .max(200, 'Location too long (max 200 characters)')
    .refine(noHtmlCheck, 'Location cannot contain HTML tags')
    .optional(),
  
  property_id: z.string()
    .regex(uuidPattern, 'Invalid property ID')
    .optional(),
  
  assigned_to: z.string()
    .regex(uuidPattern, 'Invalid assignee ID')
    .optional(),
  
  estimated_cost: z.number()
    .min(0, 'Invalid cost')
    .optional()
})

// ============================================================================
// EMPLOYEE REFERRAL SCHEMAS
// ============================================================================

export const employeeReferralSchema = z.object({
  referred_by: z.string()
    .regex(uuidPattern, 'Invalid referrer ID'),
  
  candidate_name: z.string()
    .min(2, 'Candidate name required')
    .max(100, 'Name too long')
    .regex(namePattern, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .refine(noHtmlCheck, 'Name cannot contain HTML tags'),
  
  candidate_email: z.string()
    .email('Invalid email address')
    .regex(emailPattern, 'Invalid email format'),
  
  candidate_phone: z.string()
    .regex(phonePattern, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  
  position: z.string()
    .min(1, 'Position is required')
    .max(100, 'Position too long')
    .refine(noHtmlCheck, 'Position cannot contain HTML tags'),
  
  department: z.string()
    .min(1, 'Department is required')
    .max(50, 'Department too long')
    .refine(noHtmlCheck, 'Department cannot contain HTML tags'),
  
  relationship: z.string()
    .min(1, 'Relationship is required')
    .max(50, 'Relationship too long')
    .refine(noHtmlCheck, 'Relationship cannot contain HTML tags'),
  
  notes: z.string()
    .max(1000, 'Notes too long (max 1000 characters)')
    .refine(noHtmlCheck, 'Notes cannot contain HTML tags')
    .optional()
})

// ============================================================================
// PROPERTY & DEPARTMENT SCHEMAS
// ============================================================================

export const propertySchema = z.object({
  name: z.string()
    .min(1, 'Property name is required')
    .max(100, 'Name too long')
    .refine(noHtmlCheck, 'Name cannot contain HTML tags'),
  
  code: z.string()
    .min(3, 'Property code must be at least 3 characters')
    .max(10, 'Code too long')
    .toUpperCase(),
  
  address: z.string()
    .min(5, 'Address is required')
    .max(500, 'Address too long')
    .refine(noHtmlCheck, 'Address cannot contain HTML tags'),
  
  city: z.string()
    .min(2, 'City is required')
    .max(50, 'City too long')
    .refine(noHtmlCheck, 'City cannot contain HTML tags'),
  
  country: z.string()
    .min(2, 'Country is required')
    .max(50, 'Country too long')
    .refine(noHtmlCheck, 'Country cannot contain HTML tags'),
  
  phone: z.string()
    .regex(phonePattern, 'Invalid phone number format'),
  
  email: z.string()
    .email('Invalid email address'),
  
  manager_id: z.string()
    .regex(uuidPattern, 'Invalid manager ID')
    .optional(),
  
  is_active: z.boolean().default(true)
})

export const departmentSchema = z.object({
  name: z.string()
    .min(1, 'Department name is required')
    .max(50, 'Name too long')
    .refine(noHtmlCheck, 'Name cannot contain HTML tags'),
  
  code: z.string()
    .regex(departmentCodePattern, 'Invalid department code format (e.g., HR, FIN, OPS)'),
  
  description: z.string()
    .max(500, 'Description too long')
    .refine(noHtmlCheck, 'Description cannot contain HTML tags')
    .optional(),
  
  property_id: z.string()
    .regex(uuidPattern, 'Invalid property ID'),
  
  head_id: z.string()
    .regex(uuidPattern, 'Invalid department head ID')
    .optional(),
  
  is_active: z.boolean().default(true)
})

// ============================================================================
// FORM VALIDATION UTILITIES
// ============================================================================

export const validateForm = <T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } => {
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

// ============================================================================
// REAL-TIME VALIDATION UTILITIES
// ============================================================================

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

export const validateEmail = createFieldValidator(
  z.string().email('Invalid email address').regex(emailPattern, 'Invalid email format')
)

export const validatePhone = createFieldValidator(
  z.string().regex(phonePattern, 'Invalid phone number format')
)

export const validatePassword = createFieldValidator(
  z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(passwordPattern, 'Password must contain uppercase, lowercase, number, and special character')
)

export const validateName = createFieldValidator(
  z.string()
    .min(2, 'Name must be at least 2 characters')
    .regex(namePattern, 'Name can only contain letters, spaces, hyphens, and apostrophes')
)

export const validateEmployeeId = createFieldValidator(
  z.string().regex(employeeIdPattern, 'Invalid employee ID format (e.g., AB1234)')
)

export const validateSafeString = createFieldValidator(
  z.string().refine(noHtmlCheck, 'Input cannot contain HTML tags')
)

export const validateUrl = createFieldValidator(
  z.string().refine(safeUrlCheck, 'URL must use http:// or https:// protocol')
)

// ============================================================================
// ASYNC VALIDATION UTILITIES
// ============================================================================

export const validateUniqueEmail = async (): Promise<string | undefined> => {
  // This would typically make an API call to check if email exists
  // For now, return undefined (no error)
  return undefined
}

export const validateUniqueEmployeeId = async (): Promise<string | undefined> => {
  // This would typically make an API call to check if employee ID exists
  // For now, return undefined (no error)
  return undefined
}

// ============================================================================
// FORM TRANSFORMATION UTILITIES
// ============================================================================

export const sanitizeFormData = <T>(data: T): T => {
  const sanitized = { ...data } as Record<string, unknown>
  
  // Trim string fields
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key]
    if (typeof value === 'string') {
      // Trim and remove control characters
      sanitized[key] = value
        .trim()
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    }
  })
  
  return sanitized as T
}

export const prepareFormData = <T>(data: T): Partial<T> => {
  // Remove empty strings and undefined values
  const prepared: Partial<T> = {}
  
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      prepared[key as keyof T] = value as T[keyof T]
    }
  })
  
  return prepared
}

// ============================================================================
// ERROR MESSAGE UTILITIES
// ============================================================================

export const formatErrorMessage = (error: string | undefined): string | undefined => {
  if (!error) return undefined
  
  // Capitalize first letter
  return error.charAt(0).toUpperCase() + error.slice(1)
}

export const getValidationSummary = (errors: Record<string, string>): string => {
  const errorCount = Object.keys(errors).length
  return `${errorCount} ${errorCount === 1 ? 'error' : 'errors'} found. Please correct the highlighted fields.`
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export const isValidationError = (error: unknown): error is z.ZodError => {
  return error instanceof z.ZodError
}

export const isFieldValidationError = (error: unknown): error is { field: string; message: string } => {
  return typeof error === 'object' && error !== null && 'field' in error && 'message' in error
}

// ============================================================================
// CUSTOM VALIDATION RULES
// ============================================================================

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
    let age = now.getFullYear() - birthDate.getFullYear()
    const monthDiff = now.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--
    }

    return age >= 18
  },
  
  businessHours: (value: string): boolean => {
    const parts = value.split(':')
    const hour = parseInt(parts[0])
    const minute = parseInt(parts[1] || '0')

    if (hour < 6 || hour > 22) return false
    if (hour === 22 && minute > 0) return false
    return true
  },
  
  strongPassword: (value: string): boolean => {
    return passwordPattern.test(value)
  },
  
  validEmployeeId: (value: string): boolean => {
    return employeeIdPattern.test(value)
  },
  
  noHtml: noHtmlCheck,
  
  safeUrl: safeUrlCheck,
}

// ============================================================================
// FORM STATE UTILITIES
// ============================================================================

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

export const updateFormState = <T>(
  state: ReturnType<typeof createFormState<T>>, 
  updates: Partial<ReturnType<typeof createFormState<T>>>
) => {
  return { ...state, ...updates }
}

export const markFieldTouched = <T>(
  state: ReturnType<typeof createFormState<T>>, 
  fieldName: string
) => {
  return updateFormState(state, {
    touched: { ...state.touched, [fieldName]: true },
    isDirty: true
  })
}

export const setFieldValue = <T>(
  state: ReturnType<typeof createFormState<T>>, 
  fieldName: string, 
  value: unknown
) => {
  return updateFormState(state, {
    data: { ...state.data, [fieldName]: value },
    isDirty: true
  })
}

export const setFieldError = <T>(
  state: ReturnType<typeof createFormState<T>>, 
  fieldName: string, 
  error: string | undefined
) => {
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
