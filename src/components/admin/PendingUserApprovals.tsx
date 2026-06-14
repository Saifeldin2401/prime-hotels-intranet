import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Mail, ShieldAlert, ShieldCheck, UserX, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PendingUser {
  id: string;
  user_id: string;
  email: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  domain: string;
}

interface PendingUserApprovalProps {
  onCountChange?: (count: number) => void;
}

export function PendingUserApprovals({ onCountChange }: PendingUserApprovalProps) {
  const { t } = useTranslation('users');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: pendingUsers, isLoading } = useQuery({
    queryKey: ['pending-user-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_user_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Extract domain from email
      return (data || []).map((user: any) => ({
        ...user,
        domain: user.email.substring(user.email.indexOf('@') + 1),
      })) as PendingUser[];
    },
    refetchInterval: 120000, // Refresh every 2 minutes
    refetchIntervalInBackground: false, // Do not fetch in background
  });

  // Notify parent component of count
  useEffect(() => {
    if (pendingUsers && onCountChange) {
      onCountChange(pendingUsers.length);
    }
  }, [pendingUsers?.length, onCountChange]);

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('approve_pending_user', {
        p_user_id: userId,
        p_approve: true,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: t('approvals.approve_success', 'User Approved'),
        description: t('approvals.approve_success_desc', 'The user can now access the system.'),
      });
      queryClient.invalidateQueries({ queryKey: ['pending-user-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      setSelectedUser(null);
      setActionType(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('approvals.approve_error', 'Approval Failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('approve_pending_user', {
        p_user_id: userId,
        p_approve: false,
        p_rejection_reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: t('approvals.reject_success', 'User Rejected'),
        description: t('approvals.reject_success_desc', 'The user has been deactivated.'),
      });
      queryClient.invalidateQueries({ queryKey: ['pending-user-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      setSelectedUser(null);
      setActionType(null);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast({
        title: t('approvals.reject_error', 'Rejection Failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAction = (user: PendingUser, action: 'approve' | 'reject') => {
    setSelectedUser(user);
    setActionType(action);
    setDialogOpen(true);
  };

  const confirmAction = () => {
    if (!selectedUser || !actionType) return;

    if (actionType === 'approve') {
      approveMutation.mutate(selectedUser.user_id);
    } else {
      rejectMutation.mutate({
        userId: selectedUser.user_id,
        reason: rejectionReason || 'No reason provided',
      });
    }
  };

  const getDomainBadgeColor = (domain: string) => {
    const trustedDomains = ['primehotelsgroup.com', 'prime.com', 'phg-connect.com'];
    if (trustedDomains.includes(domain.toLowerCase())) {
      return 'bg-green-100 text-green-700';
    }
    return 'bg-yellow-100 text-yellow-700';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t('approvals.pending_title', 'Pending Approvals')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hotel-gold" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingUsers || pendingUsers.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <ShieldCheck className="w-5 h-5" />
            {t('approvals.pending_title', 'Pending User Approvals')}
            <span className="ms-2 bg-green-500 text-white px-2 py-0.5 rounded-full text-sm">
              0
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700">
            {t(
              'approvals.no_pending',
              'No pending user approvals. All recent signups have been from trusted email domains.'
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-yellow-300 bg-yellow-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <ShieldAlert className="w-5 h-5" />
            {t('approvals.pending_title', 'Pending User Approvals')}
            <span className="ms-2 bg-yellow-500 text-white px-2 py-0.5 rounded-full text-sm">
              {pendingUsers.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700 mb-4">
            {t(
              'approvals.pending_description',
              'The following users signed up with non-corporate email domains and require approval before accessing the system.'
            )}
          </p>

          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-yellow-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className={`px-2 py-0.5 rounded text-xs ${getDomainBadgeColor(user.domain)}`}>
                        {user.domain}
                      </span>
                      <span>•</span>
                      <span>
                        {t('approvals.requested_at', 'Requested {{time}}', {
                          time: new Date(user.requested_at).toLocaleString(),
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(user, 'reject')}
                    className="text-red-600 hover:bg-red-50"
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <UserX className="w-4 h-4 me-1" />
                    {t('approvals.reject', 'Reject')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAction(user, 'approve')}
                    className="bg-hotel-gold hover:bg-hotel-gold-dark text-white"
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 me-1" />
                    {t('approvals.approve', 'Approve')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve'
                ? t('approvals.confirm_approve_title', 'Approve User')
                : t('approvals.confirm_reject_title', 'Reject User')}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? t(
                    'approvals.confirm_approve_desc',
                    'Are you sure you want to approve {{email}}? They will gain full access to the system.',
                    { email: selectedUser?.email }
                  )
                : t(
                    'approvals.confirm_reject_desc',
                    'Are you sure you want to reject {{email}}? Their account will be deactivated.',
                    { email: selectedUser?.email }
                  )}
            </DialogDescription>
          </DialogHeader>

          {actionType === 'reject' && (
            <div className="space-y-2 py-4">
              <label className="text-sm font-medium">
                {t('approvals.rejection_reason', 'Rejection Reason (optional)')}
              </label>
              <textarea
                className="w-full p-2 border rounded-md text-sm"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('approvals.rejection_placeholder', 'Enter reason for rejection...')}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={confirmAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className={actionType === 'approve' ? 'bg-hotel-gold hover:bg-hotel-gold-dark' : ''}
            >
              {actionType === 'approve' ? (
                <>
                  <CheckCircle className="w-4 h-4 me-1" />
                  {t('approvals.confirm_approve', 'Approve')}
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 me-1" />
                  {t('approvals.confirm_reject', 'Reject')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
