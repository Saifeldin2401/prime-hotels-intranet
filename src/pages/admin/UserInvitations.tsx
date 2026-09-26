/**
 * User Invitations Page
 * 
 * Admin interface for managing user invitations.
 * - Send invitations to new users
 * - View pending invitations
 * - Resend or cancel invitations
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WorkspaceHeader, headerActionClass } from '@/ui';
import {
  Plus,
  RefreshCw,
  X,
  AlertCircle,
  Search,
  UserPlus,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTenant } from '@/contexts/TenantContext';
import { useAccountContext } from '@/contexts/auth/AccountContext';
import { platformService } from '@/services/platformService';
import { useQuery } from '@tanstack/react-query';
import { useInvitations } from '@/hooks/useInvitations';
import { useDepartments } from '@/hooks/useDepartments';
import { ROLE_HIERARCHY } from '@/lib/constants';
import type { AppRole } from '@/lib/types';

export default function UserInvitations() {
  const { t } = useTranslation(['admin', 'common']);
  const { currentOrganization } = useTenant();
  const { isPlatformOperator } = useAccountContext();
  const {
    invitations,
    isLoading,
    isCreating,
    isResending,
    isCancelling,
    createInvitation,
    resendInvitation,
    cancelInvitation,
    refreshInvitations,
  } = useInvitations();
  const { departments = [], isLoading: departmentsLoading } = useDepartments();

  const { data: entitlements, refetch: refetchEntitlements } = useQuery({
    queryKey: ['org-effective-entitlements', currentOrganization?.id],
    queryFn: () => currentOrganization?.id ? platformService.getEffectiveEntitlements(currentOrganization.id) : null,
    enabled: !!currentOrganization?.id,
  });

  const isSeatLimitReached = !isPlatformOperator && !!entitlements && !!entitlements.max_learners && (entitlements.usage?.learners ?? 0) >= entitlements.max_learners;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    role: '' as AppRole | '',
    departmentId: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredInvitations = invitations.filter(
    (inv) =>
      inv.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = t('validation.required', { defaultValue: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('validation.invalid_email', { defaultValue: 'Invalid email address' });
    }

    if (!formData.role) {
      errors.role = t('validation.required', { defaultValue: 'Role is required' });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSeatLimitReached) {
      return;
    }

    if (!validateForm()) return;

    const success = await createInvitation({
      email: formData.email,
      role: formData.role,
      departmentId: formData.departmentId || undefined,
    });

    if (success) {
      setFormData({ email: '', role: '', departmentId: '' });
      setIsCreateDialogOpen(false);
      refetchEntitlements();
    }
  };

  const handleCancel = async () => {
    if (!invitationToCancel) return;

    await cancelInvitation(invitationToCancel);
    setInvitationToCancel(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const effectiveStatus = (inv: { status: string; expires_at: string }) =>
    inv.status === 'pending' && isExpired(inv.expires_at) ? 'expired' : inv.status;
  const STATUS_ORDER = ['pending', 'expired', 'accepted', 'cancelled'] as const;
  const statusLabel: Record<string, string> = {
    pending: t('admin:invites.waiting', 'Waiting to be accepted'),
    expired: t('admin:invites.expired', 'Expired'),
    accepted: t('admin:invites.accepted', 'Joined'),
    cancelled: t('admin:invites.cancelled', 'Cancelled'),
  };
  const groups = STATUS_ORDER
    .map((st) => ({ st, items: filteredInvitations.filter((inv) => effectiveStatus(inv) === st) }))
    .filter((g) => g.items.length > 0);
  const waiting = invitations.filter((i) => effectiveStatus(i) === 'pending').length;
  const placeOf = (inv: { department_id?: string | null }) =>
    inv.department_id ? departments.find((d) => d.id === inv.department_id)?.name ?? '' : '';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <WorkspaceHeader
        eyebrow={t('admin:invites.eyebrow', 'People')}
        title={t('admin:invites.title', 'Invitations')}
        context={waiting > 0
          ? t('admin:invites.context', '{{count}} waiting to be accepted.', { count: waiting })
          : t('admin:invites.contextNone', 'No invitations are waiting.')}
        actions={
          <>
            <button type="button" onClick={() => refreshInvitations()} disabled={isLoading} className={headerActionClass.secondary} aria-label={t('common:refresh', 'Refresh')}>
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => setIsCreateDialogOpen(true)} disabled={isSeatLimitReached} className={`${headerActionClass.primary} disabled:opacity-50`}>
              <UserPlus aria-hidden="true" className="h-4 w-4" />{t('admin:invites.invite', 'Invite someone')}
            </button>
          </>
        }
      />

      {isSeatLimitReached && (
        <div role="status" className="flex items-start gap-3 rounded-[6px] border border-ds-warning/30 bg-ds-warning-soft px-4 py-3 text-sm text-ds-ink">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ds-warning" />
          <span>
            {t('admin:invites.seatLimit', 'All {{max}} seats are in use ({{current}} people). Ask your platform administrator for more seats before inviting anyone else.', {
              current: entitlements?.usage?.learners ?? 0,
              max: entitlements?.max_learners ?? 0,
            })}
          </span>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="relative">
          <label htmlFor="invite-search" className="sr-only">{t('admin:invites.search', 'Search by email or role')}</label>
          <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-muted" />
          <Input
            id="invite-search"
            placeholder={t('admin:invites.search', 'Search by email or role')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-h-[44px] ps-10"
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-ds-border px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-ds-ink">
            {searchQuery ? t('admin:invites.noMatch', 'No invitations match') : t('admin:invites.emptyTitle', 'No invitations yet')}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ds-muted">
            {searchQuery
              ? t('admin:invites.noMatchBody', 'Try a different email or role.')
              : t('admin:invites.emptyBody', 'Invite colleagues by email. They choose their own password when they accept.')}
          </p>
          {!searchQuery && !isSeatLimitReached && (
            <button type="button" onClick={() => setIsCreateDialogOpen(true)} className={`${headerActionClass.primary} mt-5`}>
              <Plus aria-hidden="true" className="h-4 w-4" />{t('admin:invites.invite', 'Invite someone')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ st, items }) => (
            <section key={st} aria-labelledby={`invites-${st}`} className="space-y-2">
              <h2 id={`invites-${st}`} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">
                {statusLabel[st] ?? st} <span className="font-mono tabular-nums">{items.length}</span>
              </h2>
              <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
                {items.map((invitation) => {
                  const place = placeOf(invitation);
                  return (
                    <li key={invitation.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ds-ink" dir="ltr">{invitation.email}</p>
                        <p className="mt-0.5 text-sm text-ds-muted">
                          {[invitation.role.replaceAll('_', ' '), place].filter(Boolean).join(' · ')}
                        </p>
                        <p className="mt-0.5 text-xs text-ds-muted">
                          {t('invitations.sent_on', { defaultValue: 'Sent on' })} {formatDate(invitation.invited_at)}
                          {st === 'pending' && <> · {t('invitations.expires_on', { defaultValue: 'Expires on' })} {formatDate(invitation.expires_at)}</>}
                          {st === 'expired' && <> · {t('invitations.expired_on', { defaultValue: 'Expired on' })} {formatDate(invitation.expires_at)}</>}
                        </p>
                      </div>
                      {st === 'pending' && (
                        <div className="flex shrink-0 items-center gap-2">
                          <Button variant="outline" size="sm" className="min-h-[40px]" onClick={() => resendInvitation(invitation.id)} disabled={isResending}>
                            <Send aria-hidden="true" className="me-1.5 h-4 w-4" />{t('admin:invites.resend', 'Resend')}
                          </Button>
                          <Button variant="ghost" size="sm" className="min-h-[40px] text-ds-danger hover:bg-ds-danger-soft" onClick={() => setInvitationToCancel(invitation.id)} disabled={isCancelling}>
                            <X aria-hidden="true" className="me-1.5 h-4 w-4" />{t('admin:invites.cancel', 'Cancel')}
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Create Invitation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('invitations.create_title', { defaultValue: 'Invite New User' })}</DialogTitle>
            <DialogDescription>
              {t('invitations.create_description', { defaultValue: 'Send an invitation email to a new user' })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                {t('fields.email', { defaultValue: 'Email Address' })}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={formErrors.email ? 'border-destructive' : ''}
              />
              {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">
                {t('fields.role', { defaultValue: 'Role' })}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as AppRole })}
              >
                <SelectTrigger className={formErrors.role ? 'border-destructive' : ''}>
                  <SelectValue placeholder={t('fields.select_role', { defaultValue: 'Select a role' })} />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_HIERARCHY.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.role && <p className="text-sm text-destructive">{formErrors.role}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">{t('fields.department', { defaultValue: 'Department (Optional)' })}</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                disabled={departmentsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('fields.select_department', { defaultValue: 'Select a department' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('fields.none', { defaultValue: 'None' })}</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <RefreshCw className="w-4 h-4 me-2 animate-spin" />}
                <Send className="w-4 h-4 me-2" />
                {t('invitations.send_invitation', { defaultValue: 'Send Invitation' })}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!invitationToCancel} onOpenChange={() => setInvitationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('invitations.cancel_title', { defaultValue: 'Cancel Invitation?' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('invitations.cancel_description', {
                defaultValue: 'This will cancel the invitation. The recipient will no longer be able to use the invitation link.',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.keep', { defaultValue: 'Keep' })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
              {t('common.cancel_invitation', { defaultValue: 'Cancel Invitation' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
