/**
 * Zod validation schemas for form validation
 * Provides type-safe validation for all major forms
 */

import { z } from 'zod'

// Email validation
const emailSchema = z.string().email('Please enter a valid email address').min(1, 'Email is required')

// Phone validation (flexible format)
const phoneSchema = z.string().optional().or(z.string().regex(/^[\d\s\-\+\(\)]+$/, 'Please enter a valid phone number'))

// Date validation
const dateSchema = z.date({
  message: 'Please select a valid date'
})

// UUID validation
const uuidSchema = z.string().uuid('Invalid ID format')

/**
 * User Creation/Update Schema
 */
export const userSchema = z.object({
  email: emailSchema,
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long'),
  phone: phoneSchema,
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  hire_date: z.date().optional().or(z.string().optional()),
  job_title: z.string().optional(),
  staff_id: z.string().optional(),
  is_active: z.boolean().default(true),
  property_ids: z.array(uuidSchema).default([]),
  department_ids: z.array(uuidSchema).default([]),
  role: z.enum(['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'manager', 'staff'], {
    message: 'Please select a valid role'
  }),
  reporting_to: uuidSchema.optional()
}).superRefine((data, ctx) => {
  const propertyRequiredRoles = new Set(['property_manager', 'property_hr', 'department_head', 'manager', 'staff'])
  const departmentRequiredRoles = new Set(['department_head', 'manager', 'staff'])

  if (propertyRequiredRoles.has(data.role) && data.property_ids.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select at least one property',
      path: ['property_ids']
    })
  }

  if (departmentRequiredRoles.has(data.role) && data.department_ids.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select at least one department',
      path: ['department_ids']
    })
  }
})

export type UserFormData = z.infer<typeof userSchema>

/**
 * Leave Request Schema
 */
export const leaveRequestSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
  type: z.enum(['annual', 'sick', 'unpaid', 'maternity', 'paternity', 'personal', 'other'], {
    message: 'Please select a leave type'
  }),
  reason: z.string().max(500, 'Reason is too long').optional(),
  property_id: uuidSchema.optional(),
  department_id: uuidSchema.optional()
}).refine((data) => {
  // End date must be after start date
  if (data.start_date && data.end_date) {
    const start = data.start_date instanceof Date ? data.start_date : new Date(data.start_date)
    const end = data.end_date instanceof Date ? data.end_date : new Date(data.end_date)
    return end >= start
  }
  return true
}, {
  message: 'End date must be on or after start date',
  path: ['end_date']
}).refine((data) => {
  // Start date must not be in the past (with 1 day buffer for same-day requests)
  if (data.start_date) {
    const start = data.start_date instanceof Date ? data.start_date : new Date(data.start_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(start)
    startDate.setHours(0, 0, 0, 0)
    return startDate >= today || startDate.getTime() === today.getTime()
  }
  return true
}, {
  message: 'Start date cannot be in the past',
  path: ['start_date']
})

export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>

/**
 * Task Schema
 */
export const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  description: z.string().max(2000, 'Description is too long').optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'completed', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to_id: uuidSchema.optional(),
  property_id: uuidSchema.optional(),
  department_id: uuidSchema.optional(),
  due_date: dateSchema.optional(),
  start_date: dateSchema.optional(),
  tags: z.array(z.string()).optional(),
  estimated_hours: z.number().min(0, 'Estimated hours cannot be negative').max(1000, 'Estimated hours is too high').optional()
}).refine((data) => {
  // If both dates exist, due_date must be after start_date
  if (data.start_date && data.due_date) {
    const start = data.start_date instanceof Date ? data.start_date : new Date(data.start_date)
    const due = data.due_date instanceof Date ? data.due_date : new Date(data.due_date)
    return due >= start
  }
  return true
}, {
  message: 'Due date must be on or after start date',
  path: ['due_date']
})

export type TaskFormData = z.infer<typeof taskSchema>

/**
 * Document Upload Schema
 */
export const documentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  description: z.string().max(2000, 'Description is too long').optional(),
  category: z.string().optional(),
  property_id: uuidSchema.optional(),
  department_id: uuidSchema.optional(),
  requires_acknowledgment: z.boolean().default(false),
  visibility: z.enum(['all_properties', 'property', 'department', 'role']).default('all_properties'),
  file: z.instanceof(File, { message: 'Please select a file' }).refine((file) => {
    // File size limit: 50MB
    const maxSize = 50 * 1024 * 1024
    return file.size <= maxSize
  }, {
    message: 'File size must be less than 50MB'
  }).refine((file) => {
    // Allowed file types - more flexible
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ]
    // Also check by extension for better compatibility
    const extension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'png', 'jpg', 'jpeg']
    return allowedTypes.includes(file.type) || (extension && allowedExtensions.includes(extension))
  }, {
    message: 'File type not supported. Please upload PDF, Word, Excel, or image files.'
  })
}).superRefine((data, ctx) => {
  // Conditional validation based on visibility
  if (data.visibility === 'department' && !data.department_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Department is required when visibility is set to Specific Department',
      path: ['department_id']
    })
  }
  
  if (data.visibility === 'property' && !data.property_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Property is required when visibility is set to Specific Property',
      path: ['property_id']
    })
  }
})

export type DocumentFormData = z.infer<typeof documentSchema>

/**
 * Training Module Schema
 */
export const trainingModuleSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  description: z.string().max(2000, 'Description is too long').optional(),
  property_id: uuidSchema.optional(),
  department_id: uuidSchema.optional(),
  estimated_duration_minutes: z.number().min(1, 'Duration must be at least 1 minute').max(10080, 'Duration is too long').optional(),
  passing_score_percentage: z.number().min(0, 'Passing score cannot be negative').max(100, 'Passing score cannot exceed 100').optional(),
  certificate_enabled: z.boolean().default(false),
  is_mandatory: z.boolean().default(false)
})

export type TrainingModuleFormData = z.infer<typeof trainingModuleSchema>

/**
 * Maintenance Ticket Schema
 */
export const maintenanceTicketSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description is too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).default('medium'),
  property_id: uuidSchema.optional(),
  department_id: uuidSchema.optional(),
  location: z.string().max(200, 'Location is too long').optional(),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'cosmetic', 'safety', 'other'])
})

export type MaintenanceTicketFormData = z.infer<typeof maintenanceTicketSchema>

/**
 * Announcement Schema
 */
export const announcementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content is too long'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  property_id: uuidSchema.optional(),
  department_id: uuidSchema.optional(),
  target_audience: z.enum(['all', 'property', 'department', 'role']).default('all'),
  scheduled_at: z.date().optional(),
  expires_at: z.date().optional()
}).refine((data) => {
  // If both dates exist, expires_at must be after scheduled_at
  if (data.scheduled_at && data.expires_at) {
    const scheduled = data.scheduled_at instanceof Date ? data.scheduled_at : new Date(data.scheduled_at)
    const expires = data.expires_at instanceof Date ? data.expires_at : new Date(data.expires_at)
    return expires >= scheduled
  }
  return true
}, {
  message: 'Expiration date must be on or after scheduled date',
  path: ['expires_at']
})

export type AnnouncementFormData = z.infer<typeof announcementSchema>

/**
 * Job Posting Schema
 */
export const jobPostingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000, 'Description is too long'),
  requirements: z.string().max(2000, 'Requirements is too long').optional(),
  responsibilities: z.string().max(2000, 'Responsibilities is too long').optional(),
  seniority_level: z.enum(['junior', 'mid', 'senior', 'manager', 'director', 'executive']),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'temporary']),
  salary_range_min: z.number().min(0, 'Salary cannot be negative').optional(),
  salary_range_max: z.number().min(0, 'Salary cannot be negative').optional(),
  property_id: uuidSchema.optional(),
  department_id: uuidSchema.optional(),
  closes_at: z.date().optional()
}).refine((data) => {
  // If both salary ranges exist, max must be >= min
  if (data.salary_range_min && data.salary_range_max) {
    return data.salary_range_max >= data.salary_range_min
  }
  return true
}, {
  message: 'Maximum salary must be greater than or equal to minimum salary',
  path: ['salary_range_max']
})

export type JobPostingFormData = z.infer<typeof jobPostingSchema>

/**
 * Password Change Schema
 */
export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirm_password: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
}).refine((data) => data.new_password !== data.current_password, {
  message: 'New password must be different from current password',
  path: ['new_password']
})

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>

/**
 * Profile Update Schema
 */
export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long'),
  phone: phoneSchema,
  avatar_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  job_title: z.string().max(100, 'Job title is too long').optional()
})

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>
