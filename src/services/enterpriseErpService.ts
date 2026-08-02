import { supabase } from '@/lib/supabase'

export interface JournalEntry {
    id: string
    entry_number: string
    property_id?: string
    posting_date: string
    description: string
    posting_status: 'draft' | 'posted' | 'reversed'
    total_debit: number
    total_credit: number
    created_at: string
}

export interface TaxReturn {
    id: string
    property_id?: string
    period_name: string
    period_start: string
    period_end: string
    taxable_sales_sar: number
    vat_collected_sar: number
    taxable_purchases_sar: number
    vat_paid_sar: number
    net_vat_due_sar: number
    zatca_submission_status: 'draft' | 'submitted' | 'accepted' | 'query'
    created_at: string
}

export interface VipGuestPreference {
    id: string
    guest_name: string
    vip_tier: 'v1' | 'v2' | 'v3' | 'royal' | 'diplomatic'
    preferred_room_features: string[]
    dietary_requirements?: string
    pillow_preference?: string
    lifetime_spend_sar: number
    special_notes?: string
}

export interface EosbCalculation {
    employee_name: string
    hire_date: string
    termination_date: string
    termination_reason: 'resignation' | 'contract_expiry' | 'employer_termination' | 'force_majeure'
    years_of_service: number
    basic_salary_sar: number
    housing_allowance_sar: number
    transport_allowance_sar: number
    total_eosb_sar: number
}

export interface GoodsReceivedNote {
    id: string
    grn_number: string
    po_number: string
    supplier_name: string
    received_date: string
    inspection_status: 'pending' | 'passed' | 'partially_rejected' | 'rejected'
    matching_status: 'unmatched' | 'matched' | 'variance_flagged'
    notes?: string
}

export const enterpriseErpService = {
    async fetchJournalEntries(): Promise<JournalEntry[]> {
        const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('Error fetching journal entries:', error)
            return []
        }
        return data || []
    },

    async fetchTaxReturns(): Promise<TaxReturn[]> {
        const { data, error } = await supabase
            .from('tax_returns')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching tax returns:', error)
            return []
        }
        return data || []
    },

    async fetchVipPreferences(): Promise<VipGuestPreference[]> {
        const { data, error } = await supabase
            .from('vip_guest_preferences')
            .select('*')
            .order('lifetime_spend_sar', { ascending: false })

        if (error) {
            console.error('Error fetching VIP preferences:', error)
            return []
        }
        return data || []
    },

    async createVipPreference(pref: Omit<VipGuestPreference, 'id'>): Promise<VipGuestPreference | null> {
        const { data, error } = await supabase
            .from('vip_guest_preferences')
            .insert(pref)
            .select()
            .single()

        if (error) {
            console.error('Error creating VIP preference:', error)
            return null
        }
        return data
    },

    calculateEosb(
        hireDateStr: string,
        termDateStr: string,
        reason: EosbCalculation['termination_reason'],
        basicSalary: number,
        housing: number = 0,
        transport: number = 0
    ): EosbCalculation {
        const hire = new Date(hireDateStr)
        const term = new Date(termDateStr)
        const diffYears = Math.max(0, (term.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 365.25))

        const monthlyWage = basicSalary + housing + transport

        let baseBenefit = 0
        if (diffYears <= 5) {
            baseBenefit = diffYears * (monthlyWage * 0.5)
        } else {
            baseBenefit = (5 * monthlyWage * 0.5) + ((diffYears - 5) * monthlyWage)
        }

        let multiplier = 1.0
        if (reason === 'resignation') {
            if (diffYears < 2) multiplier = 0
            else if (diffYears < 5) multiplier = 1 / 3
            else if (diffYears < 10) multiplier = 2 / 3
            else multiplier = 1.0
        }

        const totalEosb = Math.round(baseBenefit * multiplier * 100) / 100

        return {
            employee_name: 'Employee',
            hire_date: hireDateStr,
            termination_date: termDateStr,
            termination_reason: reason,
            years_of_service: Math.round(diffYears * 100) / 100,
            basic_salary_sar: basicSalary,
            housing_allowance_sar: housing,
            transport_allowance_sar: transport,
            total_eosb_sar: totalEosb
        }
    }
}
