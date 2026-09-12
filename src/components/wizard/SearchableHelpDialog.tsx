import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, HelpCircle, ArrowUpRight, BookOpen } from 'lucide-react'
import { useWizard } from '@/hooks/useWizard'
import { useTranslation } from 'react-i18next'

interface HelpItem {
  id: string
  titleKey: string
  answerKey: string
  categoryKey: string
  roles: string[]
  actionRoute?: string
  actionKey?: string
}

const FAQ_ITEMS: HelpItem[] = [
  {
    id: 'faq_assign_training',
    titleKey: 'wizard.faqs.assign_training.q',
    answerKey: 'wizard.faqs.assign_training.a',
    categoryKey: 'wizard.faqs.categories.training',
    roles: ['training_manager', 'tenant_admin', 'tenant_owner', 'platform_operator'],
    actionRoute: '/training/builder',
    actionKey: 'wizard.actions.go_to_builder'
  },
  {
    id: 'faq_access_my_training',
    titleKey: 'wizard.faqs.access_my_training.q',
    answerKey: 'wizard.faqs.access_my_training.a',
    categoryKey: 'wizard.faqs.categories.training',
    roles: ['learner', 'department_manager', 'viewer'],
    actionRoute: '/training',
    actionKey: 'wizard.actions.my_courses'
  },
  {
    id: 'faq_submit_request',
    titleKey: 'wizard.faqs.submit_request.q',
    answerKey: 'wizard.faqs.submit_request.a',
    categoryKey: 'wizard.faqs.categories.requests',
    roles: ['learner', 'department_manager', 'training_manager', 'knowledge_manager'],
    actionRoute: '/requests',
    actionKey: 'wizard.actions.new_request'
  },
  {
    id: 'faq_approve_requests',
    titleKey: 'wizard.faqs.approve_requests.q',
    answerKey: 'wizard.faqs.approve_requests.a',
    categoryKey: 'wizard.faqs.categories.requests',
    roles: ['department_manager', 'tenant_admin', 'tenant_owner', 'training_manager', 'platform_operator'],
    actionRoute: '/requests',
    actionKey: 'wizard.actions.pending_approvals'
  },
  {
    id: 'faq_sop_publishing',
    titleKey: 'wizard.faqs.sop_publishing.q',
    answerKey: 'wizard.faqs.sop_publishing.a',
    categoryKey: 'wizard.faqs.categories.sops',
    roles: ['knowledge_manager', 'tenant_admin', 'tenant_owner'],
    actionRoute: '/knowledge/new',
    actionKey: 'wizard.actions.create_sop'
  },
  {
    id: 'faq_user_invitation',
    titleKey: 'wizard.faqs.user_invitation.q',
    answerKey: 'wizard.faqs.user_invitation.a',
    categoryKey: 'wizard.faqs.categories.users',
    roles: ['tenant_admin', 'tenant_owner', 'platform_operator'],
    actionRoute: '/admin/users',
    actionKey: 'wizard.actions.user_directory'
  },
  {
    id: 'faq_profile_language',
    titleKey: 'wizard.faqs.profile_language.q',
    answerKey: 'wizard.faqs.profile_language.a',
    categoryKey: 'wizard.faqs.categories.profile',
    roles: ['learner', 'department_manager', 'training_manager', 'knowledge_manager', 'viewer', 'tenant_admin', 'tenant_owner', 'platform_operator'],
    actionRoute: '/profile',
    actionKey: 'wizard.actions.profile_settings'
  },
  {
    id: 'faq_download_certificates',
    titleKey: 'wizard.faqs.download_certificates.q',
    answerKey: 'wizard.faqs.download_certificates.a',
    categoryKey: 'wizard.faqs.categories.training',
    roles: ['learner', 'department_manager', 'viewer'],
    actionRoute: '/training',
    actionKey: 'wizard.actions.my_certificates'
  }
]

export const SearchableHelpDialog: React.FC = () => {
  const { isSearchHelpOpen, closeSearchHelp, blueprint } = useWizard()
  const { t } = useTranslation('wizard')
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  // Resilient translation helper
  const tKey = (key?: string, fallback?: string, options?: any) => {
    if (!key) return fallback || ''
    const val = t(key, options)
    if (val && val !== key) return val
    if (key.startsWith('wizard.')) {
      const stripped = key.substring(7)
      const strippedVal = t(stripped, options)
      if (strippedVal && strippedVal !== stripped) return strippedVal
    }
    return fallback || key
  }

  const accessibleItems = useMemo(() => {
    const roleId = blueprint.roleId.toLowerCase()
    return FAQ_ITEMS.filter(item => 
      item.roles.some(r => roleId.includes(r) || r === roleId)
    )
  }, [blueprint.roleId])

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return accessibleItems

    const term = searchTerm.toLowerCase()
    return accessibleItems.filter(item => {
      const q = tKey(item.titleKey, '').toLowerCase()
      const a = tKey(item.answerKey, '').toLowerCase()
      const c = tKey(item.categoryKey, '').toLowerCase()
      return q.includes(term) || a.includes(term) || c.includes(term)
    })
  }, [accessibleItems, searchTerm, t])

  const handleAction = (route?: string) => {
    if (route) {
      closeSearchHelp()
      navigate(route)
    }
  }

  return (
    <Dialog open={isSearchHelpOpen} onOpenChange={closeSearchHelp}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <HelpCircle className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {t('help_dialog.title', 'Role-Aware Help & Operations Guide')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('help_dialog.description', 'Tailored answers and workflows for your role:')} <Badge variant="outline" className="ms-1 font-semibold text-[11px]">{blueprint.roleName}</Badge>
          </DialogDescription>

          <div className="relative mt-4">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('help_dialog.search_placeholder', 'Search how to do things (e.g. training, requests, profile)...')}
              className="ps-9 pe-4 py-2 text-sm bg-background"
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10">
              <HelpCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">
                {t('help_dialog.no_results', 'No matching guides found')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('help_dialog.try_different', 'Try searching for training, approvals, SOPs, or requests.')}
              </p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div 
                key={item.id} 
                className="rounded-xl border border-border/80 bg-card p-4 space-y-2 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                    {tKey(item.titleKey)}
                  </h4>
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                    {tKey(item.categoryKey)}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tKey(item.answerKey)}
                </p>

                {item.actionRoute && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(item.actionRoute)}
                      className="h-7 text-xs text-primary p-0 hover:bg-transparent hover:underline gap-1"
                    >
                      {item.actionKey ? tKey(item.actionKey) : t('actions.open_workflow', 'Open Workflow')}
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
