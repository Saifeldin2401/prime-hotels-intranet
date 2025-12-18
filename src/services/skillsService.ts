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
        // Check if exists
        const { data: existing } = await supabase
            .from('user_skills')
            .select('id')
            .eq('user_id', userId)
            .eq('skill_id', skillId)
            .single()

        if (existing) {
            const { data, error } = await supabase
                .from('user_skills')
                .update(updates)
                .eq('id', existing.id)
                .select()
                .single()
            if (error) throw error
            return data
        } else {
            const { data, error } = await supabase
                .from('user_skills')
                .insert({ ...updates, user_id: userId, skill_id: skillId })
                .select()
                .single()
            if (error) throw error
            return data
        }
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
        // 1. Get skills linked to this module
        const moduleSkills = await this.getModuleSkills(moduleId)
        if (!moduleSkills || moduleSkills.length === 0) return

        // 2. Award each skill
        for (const ms of moduleSkills) {
            // Determine level: For now, use points_awarded as the level (1-5)
            // Or increment? Let's use simple logic: Set level to points_awarded (clamped 1-5)
            // If user already has skill, we keep the higher level.

            const levelToAward = Math.min(Math.max(ms.points_awarded || 1, 1), 5)

            // Get existing to compare
            const { data: existing } = await supabase
                .from('user_skills')
                .select('proficiency_level, id')
                .eq('user_id', userId)
                .eq('skill_id', ms.skill_id)
                .single()

            if (existing) {
                if (existing.proficiency_level < levelToAward) {
                    await this.updateUserSkill(userId, ms.skill_id, { proficiency_level: levelToAward })
                }
            } else {
                await this.updateUserSkill(userId, ms.skill_id, {
                    proficiency_level: levelToAward,
                    verified: false // Auto-awarded skills need verification? Or auto-verify if training passed?
                    // Let's say unverified by default unless it's an assessment.
                    // For now, verified = false (self-paced). Manager can verify.
                })
            }
        }
    }
}
