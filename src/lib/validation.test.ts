import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { validateForm } from './validation'

describe('validateForm', () => {
  const schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    age: z.number().min(18, 'Must be at least 18'),
    email: z.string().email('Invalid email address'),
    address: z.object({
      street: z.string().min(5, 'Street too short'),
      city: z.string().min(2, 'City too short')
    }).optional()
  })

  it('should return success for valid data', () => {
    const validData = {
      name: 'John Doe',
      age: 25,
      email: 'john@example.com',
      address: {
        street: '123 Main St',
        city: 'New York'
      }
    }

    const result = validateForm(schema, validData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validData)
    }
  })

  it('should return errors for invalid data', () => {
    const invalidData = {
      name: 'J',
      age: 17,
      email: 'invalid-email'
    }

    const result = validateForm(schema, invalidData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toEqual({
        name: 'Name must be at least 2 characters',
        age: 'Must be at least 18',
        email: 'Invalid email address'
      })
    }
  })

  it('should handle nested errors correctly', () => {
    const invalidNestedData = {
      name: 'John Doe',
      age: 25,
      email: 'john@example.com',
      address: {
        street: 'Main',
        city: 'N'
      }
    }

    const result = validateForm(schema, invalidNestedData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toEqual({
        'address.street': 'Street too short',
        'address.city': 'City too short'
      })
    }
  })

  it('should handle non-Zod errors gracefully', () => {
    const throwingSchema = {
      parse: () => {
        throw new Error('Unexpected error')
      }
    } as unknown as z.ZodSchema<unknown>

    const result = validateForm(throwingSchema, 'test')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toEqual({ _form: 'Validation failed' })
    }
  })
})
