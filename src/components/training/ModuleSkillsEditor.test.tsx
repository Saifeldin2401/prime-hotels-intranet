import { ModuleSkillsEditor } from '@/components/training/ModuleSkillsEditor'
import { TooltipProvider } from '@/components/ui/tooltip'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the services
vi.mock('@/services/skillsService', () => ({
    skillsService: {
        getModuleSkills: vi.fn().mockResolvedValue([
            {
                id: '1',
                skill_id: 'skill-1',
                points_awarded: 10,
                skill: { id: 'skill-1', name: 'Communication', category: 'Soft Skills' }
            }
        ]),
        getSkills: vi.fn().mockResolvedValue([]),
        unlinkModuleSkill: vi.fn().mockResolvedValue({})
    }
}))

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { dir: () => 'ltr' }
    })
}))

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn()
    })
}))

describe('ModuleSkillsEditor Accessibility', () => {
    const moduleId = '550e8400-e29b-41d4-a716-446655440000'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('Remove Skill button has correct aria-label and tooltip', async () => {
        render(
            <TooltipProvider>
                <ModuleSkillsEditor moduleId={moduleId} />
            </TooltipProvider>
        )

        // Wait for data to load
        const skillName = await screen.findByText('Communication')
        expect(skillName).toBeDefined()

        // Find the remove button - it's an icon button with X icon
        // We added aria-label={t('skillsManagement.removeSkill')}
        const removeButton = screen.getByLabelText('skillsManagement.removeSkill')
        expect(removeButton).toBeDefined()
        expect(removeButton).toHaveAttribute('aria-label', 'skillsManagement.removeSkill')

        // Test tooltip visibility on hover
        fireEvent.mouseEnter(removeButton)
        const tooltip = await screen.findByText('skillsManagement.removeSkill')
        expect(tooltip).toBeDefined()
    })
})
