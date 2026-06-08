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
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Plus,
  RefreshCw,
  X,
  Check,
  Clock,
  AlertCircle,
  Search,
  UserPlus,
  Building,
  Briefcase,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvitations } from '@/hooks/useInvitations';
import { useProperties } from '@/hooks/useProperties';
import { useDepartments } from '@/hooks/useDepartments';
import { ROLE_HIERARCHY } from '@/lib/constants';
import type { AppRole } from '@/lib/types';

export default function UserInvitations() {
  const { t } = useTranslation(['admin', 'common']);
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
  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { departments = [], isLoading: departmentsLoading } = useDepartments();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    role: '' as AppRole | '',
    propertyId: '',
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

    if (!validateForm()) return;

    const success = await createInvitation({
      email: formData.email,
      role: formData.role,
      propertyId: formData.propertyId || undefined,
      departmentId: formData.departmentId || undefined,
    });

    if (success) {
      setFormData({ email: '', role: '', propertyId: '', departmentId: '' });
      setIsCreateDialogOpen(false);
    }
  };

  const handleCancel = async () => {
    if (!invitationToCancel) return;

    await cancelInvitation(invitationToCancel);
    setInvitationToCancel(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            {t('status.pending', { defaultValue: 'Pending' })}
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="w-3 h-3 mr-1" />
            {t('status.accepted', { defaultValue: 'Accepted' })}
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            {t('status.expired', { defaultValue: 'Expired' })}
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <X className="w-3 h-3 mr-1" />
            {t('status.cancelled', { defaultValue: 'Cancelled' })}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('invitations.title', { defaultValue: 'User Invitations' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('invitations.subtitle', { defaultValue: 'Invite new users and manage pending invitations' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refreshInvitations()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh', { defaultValue: 'Refresh' })}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            {t('invitations.invite_user', { defaultValue: 'Invite User' })}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('invitations.total', { defaultValue: 'Total Invitations' })}
                </p>
                <p className="text-2xl font-bold mt-1">{invitations.length}</p>
              </div>
              <Mail className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('invitations.pending', { defaultValue: 'Pending' })}
                </p>
                <p className="text-2xl font-bold mt-1 text-amber-600">
                  {invitations.filter((i) => i.status === 'pending' && !isExpired(i.expires_at)).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('invitations.accepted', { defaultValue: 'Accepted' })}
                </p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {invitations.filter((i) => i.status === 'accepted').length}
                </p>
              </div>
              <Check className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('invitations.expired', { defaultValue: 'Expired' })}
                </p>
                <p className="text-2xl font-bold mt-1 text-gray-600">
                  {invitations.filter((i) => i.status === 'expired' || (i.status === 'pending' && isExpired(i.expires_at))).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-gray-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('invitations.search_placeholder', { defaultValue: 'Search by email or role...' })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('invitations.list_title', { defaultValue: 'Pending Invitations' })}</CardTitle>
          <CardDescription>
            {t('invitations.list_description', { defaultValue: 'Manage invitations that are pending acceptance' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : filteredInvitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium">
                {t('invitations.empty_title', { defaultValue: 'No invitations found' })}
              </h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery
                  ? t('invitations.empty_search', { defaultValue: 'Try adjusting your search' })
                  : t('invitations.empty_description', { defaultValue: 'Get started by inviting a new user' })}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('invitations.invite_user', { defaultValue: 'Invite User' })}
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredInvitations.map((invitation) => (
                    <motion.div
                      key={invitation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <Badge variant="secondary" className="text-xs">
                              {invitation.role}
                            </Badge>
                            {invitation.property_id && (
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {properties.find((p) => p.id === invitation.property_id)?.name ||
                                  invitation.property_id}
                              </span>
                            )}
                            {invitation.department_id && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {departments.find((d) => d.id === invitation.department_id)?.name ||
                                  invitation.department_id}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('invitations.sent_on', { defaultValue: 'Sent on' })} {formatDate(invitation.invited_at)}
                            {' · '}
                            {isExpired(invitation.expires_at)
                              ? t('invitations.expired_on', { defaultValue: 'Expired on' })
                              : t('invitations.expires_on', { defaultValue: 'Expires on' })}{' '}
                            {formatDate(invitation.expires_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getStatusBadge(
                          isExpired(invitation.expires_at) && invitation.status === 'pending'
                            ? 'expired'
                            : invitation.status
                        )}

                        {invitation.status === 'pending' && !isExpired(invitation.expires_at) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendInvitation(invitation.id)}
                              disabled={isResending}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setInvitationToCancel(invitation.id)}
                              disabled={isCancelling}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

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
              <Label htmlFor="property">{t('fields.property', { defaultValue: 'Property (Optional)' })}</Label>
              <Select
                value={formData.propertyId}
                onValueChange={(value) => setFormData({ ...formData, propertyId: value })}
                disabled={propertiesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('fields.select_property', { defaultValue: 'Select a property' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('fields.none', { defaultValue: 'None' })}</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {isCreating && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                <Send className="w-4 h-4 mr-2" />
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
