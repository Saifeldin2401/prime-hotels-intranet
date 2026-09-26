/**
 * Zod validation schemas for form validation
 * Provides type-safe validation for all major forms
 */

import { z } from 'zod'

// Email validation
const emailSchema = z.string().email('Please enter a valid email address').min(1, 'Email is required')

// Phone validation (flexible format)
const phoneSchema = z.string().optional().or(z.string().regex(/^[\d\s\-+()]+$/, 'Please enter a valid phone number'))

// Date validation
// UUID validation
const uuidSchema = z.string().uuid('Invalid ID format')

/**
 * User Creation/Update Schema
 */
export const userSchema = z.object({
  email: emailSchema,
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long'),
  phone: phoneSchema,
  date_of_birth: z.string().optional(),
  hire_date: z.date().optional().or(z.string().optional()),
  job_title: z.string().optional(),
  staff_id: z.string().optional(),
  is_active: z.boolean().default(true),
  department_ids: z.array(uuidSchema).default([]),
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
  ], {
    message: 'Please select a valid role'
  }),
  reporting_to: uuidSchema.optional()
}).superRefine((data, ctx) => {
  const departmentRequiredRoles = new Set(['department_head', 'manager', 'staff'])

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
 * Document Upload Schema
 */
export const documentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  description: z.string().max(2000, 'Description is too long').optional(),
  category: z.string().optional(),
  department_id: uuidSchema.optional(),
  requires_acknowledgment: z.boolean().default(false),
  visibility: z.enum(['all_properties', 'department', 'specific_departments', 'role']).default('all_properties'),
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

})
