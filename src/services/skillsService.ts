import { supabase } from '@/lib/supabase'

export interface Skill {
    id: string
    name: string
    category: string | null
    description: string | null
    created_at: string
}

export interface UserSkill {
    id: string
    user_id: string
    skill_id: string
    proficiency_level: number
    verified: boolean
    verified_by: string | null
    created_at: string
    skill?: Skill
}

export interface ModuleSkill {
    id: string
    module_id: string
    skill_id: string
    points_awarded: number
    skill?: Skill
}

export const skillsService = {
    async getSkills() {
        const { data, error } = await supabase
            .from('skills')
            .select('*')
            .order('name')

        if (error) throw error
        return data as Skill[]
    },

    async createSkill(skill: Partial<Skill>) {
        const { data, error } = await supabase
            .from('skills')
            .insert(skill)
            .select()
            .single()

        if (error) throw error
        return data as Skill
    },

    async getUserSkills(userId: string) {
        const { data, error } = await supabase
            .from('user_skills')
            .select('*, skill:skills(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as UserSkill[]
    },

    async updateUserSkill(userId: string, skillId: string, updates: Partial<UserSkill>) {
        const { data: existing, error: existingError } = await supabase
            .from('user_skills')
            .select('id')
            .eq('user_id', userId)
            .eq('skill_id', skillId)
            .maybeSingle()

        if (existingError) throw existingError

        if (existing) {
            const { data, error } = await supabase
                .from('user_skills')
                .update(updates)
                .eq('id', existing.id)
                .select()
                .single()
            if (error) throw error
            return data
        }

        const { data, error } = await supabase
            .from('user_skills')
            .insert({ ...updates, user_id: userId, skill_id: skillId })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async getModuleSkills(moduleId: string) {
        const { data, error } = await supabase
            .from('module_skills')
            .select('*, skill:skills(*)')
            .eq('module_id', moduleId)

        if (error) throw error
        return data as ModuleSkill[]
    },

    async linkModuleSkill(moduleId: string, skillId: string, points: number = 0) {
        const { data, error } = await supabase
            .from('module_skills')
            .upsert({ module_id: moduleId, skill_id: skillId, points_awarded: points }, { onConflict: 'module_id, skill_id' })
            .select()
            .single()

        if (error) throw error
        return data as ModuleSkill
    },

    async unlinkModuleSkill(moduleId: string, skillId: string) {
        const { error } = await supabase
            .from('module_skills')
            .delete()
            .match({ module_id: moduleId, skill_id: skillId })

        if (error) throw error
    },

    async awardModuleSkills(userId: string, moduleId: string) {
        const { error } = await supabase.rpc('award_module_skills', {
            p_user_id: userId,
            p_module_id: moduleId
        })

        if (error) throw error
    }
}
