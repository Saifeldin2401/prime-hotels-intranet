export type ScopeType = 'organization' | 'brand' | 'hotel' | 'department' | 'role' | 'individual'

export type TenantRole = 
  | 'organization_owner'
  | 'organization_admin'
  | 'training_manager'
  | 'knowledge_manager'
  | 'brand_admin'
  | 'hotel_admin'
  | 'department_manager'
  | 'instructor'
  | 'learner'

export interface OrganizationBrandColors {
  primary: string
  secondary: string
  accent?: string
}

export interface Organization {
  id: string
  name: string
  name_ar: string | null
  slug: string
  logo_url: string | null
  favicon_url: string | null
  brand_colors: OrganizationBrandColors
  industry: string
  is_active: boolean
  is_deleted: boolean
  lifecycle_status?: 'prospect' | 'trial' | 'onboarding' | 'active' | 'renewal' | 'suspended' | 'archived'
  trial_ends_at?: string | null
  max_hotels?: number | null
  max_learners?: number | null
  max_storage_gb?: number | null
  max_ai_credits_monthly?: number | null
  ai_credits_used_this_month?: number | null
  billing_email?: string | null
  suspension_reason?: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  code: 'starter' | 'growth' | 'enterprise' | string
  max_users: number
  max_hotels: number
  max_storage_gb: number
  ai_monthly_quota_usd: number
  features: {
    custom_branding?: boolean
    ai_generation?: boolean
    api_access?: boolean
    advanced_analytics?: boolean
    [key: string]: unknown
  }
  is_active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  organization_id: string
  plan_id: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled'
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
  plan?: SubscriptionPlan
}

export interface Brand {
  id: string
  organization_id: string
  name: string
  name_ar: string | null
  code: string | null
  logo_url?: string | null
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface Hotel {
  id: string
  organization_id: string
  brand_id: string | null
  name: string
  name_ar: string | null
  hotel_code: string | null
  city: string | null
  country: string | null
  address: string | null
  phone: string | null
  is_headquarters: boolean
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  brand?: Brand
}

export interface OrganizationMembership {
  id: string
  organization_id: string
  user_id: string
  role: TenantRole
  brand_id: string | null
  hotel_id: string | null
  department_id: string | null
  is_primary: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  organization?: Organization
  hotel?: Hotel
  brand?: Brand
}
