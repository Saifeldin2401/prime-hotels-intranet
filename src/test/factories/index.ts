import type { AppRole } from '@/lib/constants'
import type {
  Profile,
  Property,
  Department,
  UserRole,
  UserProperty,
} from '@/lib/types'
// Secure ID generator using Web Crypto API
const generateId = (): string => {
  // Use crypto.randomUUID() if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 13);
  }
  
  // Fallback to crypto.getRandomValues()
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').substring(0, 13);
  }
  
  // Last resort fallback for test environments (not for production)
  return Math.random().toString(36).substring(2, 15);
}

// Simple date generator
const generateDate = (daysAgo: number = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

// Factory for generating test profiles
export const createMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: generateId(),
  email: `user${generateId().slice(0, 6)}@test.com`,
  full_name: 'Test User',
  phone: '+1234567890',
  avatar_url: null,
  hire_date: generateDate(365),
  date_of_birth: generateDate(365 * 30),
  job_title: 'Software Engineer',
  staff_id: `EMP${generateId().substring(0, 4)}`,
  reporting_to: null,
  is_active: true,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  nationality: null,
  blood_group: null,
  created_at: generateDate(365),
  updated_at: generateDate(0),
  ...overrides,
})

// Factory for generating test properties
export const createMockProperty = (overrides: Partial<Property> = {}): Property => ({
  id: generateId(),
  name: 'Test Hotel Property',
  address: '123 Test Street',
  phone: '+1234567890',
  is_active: true,
  latitude: null,
  longitude: null,
  created_at: generateDate(365),
  ...overrides,
})

// Factory for generating test departments
export const createMockDepartment = (overrides: Partial<Department> = {}): Department => ({
  id: generateId(),
  property_id: generateId(),
  name: 'Test Department',
  is_active: true,
  created_at: generateDate(365),
  ...overrides,
})

// Factory for generating test user roles
export const createMockUserRole = (
  userId: string,
  role: AppRole = 'staff',
  overrides: Partial<UserRole> = {}
): UserRole => ({
  id: generateId(),
  user_id: userId,
  role,
  ...overrides,
})

// Factory for generating test user properties
export const createMockUserProperty = (
  userId: string,
  propertyId: string,
  overrides: Partial<UserProperty> = {}
): UserProperty => ({
  id: generateId(),
  user_id: userId,
  property_id: propertyId,
  ...overrides,
})

// Factory for generating complete test user context
export const createMockUserContext = (
  role: AppRole = 'staff',
  propertyCount: number = 1
) => {
  const profile = createMockProfile()
  const properties = Array.from({ length: propertyCount }, () => createMockProperty())
  const userRoles = [createMockUserRole(profile.id, role)]
  const userProperties = properties.map((p) =>
    createMockUserProperty(profile.id, p.id)
  )

  return {
    profile,
    properties,
    userRoles,
    userProperties,
    defaultProperty: properties[0],
    currentRole: role,
  }
}

// Factory for generating test sessions
export const createMockSession = (userId: string) => ({
  access_token: generateId().repeat(2),
  refresh_token: generateId().repeat(2),
  expires_at: Date.now() / 1000 + 3600,
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: userId,
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
  },
})
