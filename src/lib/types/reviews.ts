export type GuestReviewPlatform = 
  | 'agoda'
  | 'airbnb'
  | 'booking'
  | 'expedia'
  | 'google'
  | 'hotels_com'
  | 'manual_import'
  | 'tripadvisor'

export type GuestReviewStatus = 
  | 'collected'
  | 'analyzed'
  | 'assigned'
  | 'acknowledged'
  | 'response_pending'
  | 'responded'
  | 'closed'
  | 'escalated'

export type GuestReviewSeverity = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

export type GuestReviewSentiment = 
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'mixed'

export interface GuestReview {
  id: string
  property_id: string
  platform: GuestReviewPlatform
  reviewer_name: string | null
  review_title: string | null
  review_text: string
  review_url: string | null
  rating_normalized_10: number | null
  rating_normalized_5: number | null
  sentiment: GuestReviewSentiment | null
  severity: GuestReviewSeverity | null
  status: GuestReviewStatus
  critical_flag: boolean
  vip_flag: boolean
  summary_en: string | null
  summary_ar: string | null
  manager_brief_en: string | null
  manager_brief_ar: string | null
  response_sla_due_at: string | null
  collected_at: string
  published_at: string | null
  responded_at: string | null
}

export interface GuestReviewSource {
  id: string
  property_id: string
  platform: GuestReviewPlatform
  source_name: string
  source_url: string
  is_active: boolean
  polling_enabled: boolean
  poll_frequency_hours: number
  last_polled_at: string | null
  last_success_at: string | null
  next_poll_at: string | null
  health_status: 'healthy' | 'degraded' | 'disabled'
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface GuestReviewPropertySettings {
  id: string
  property_id: string
  default_tone: 'luxury' | 'business' | 'casual_hospitality'
  response_languages: string[]
  slack_alerts_enabled: boolean
  email_alerts_enabled: boolean
  executive_report_enabled: boolean
  created_at: string
  updated_at: string
}
