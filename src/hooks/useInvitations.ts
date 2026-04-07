/**
 * User Invitations Hook
 * 
 * Manages user invitations for admin users.
 * - Create new invitations
 * - List pending invitations
 * - Resend invitations
 * - Cancel invitations
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export interface UserInvitation {
  id: string;
  auth_user_id?: string | null;
  email: string;
  role: string;
  property_id: string | null;
  department_id: string | null;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token_hash?: string | null;
  invite_url?: string | null;
  accepted_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateInvitationData {
  email: string;
  role: string;
  propertyId?: string;
  departmentId?: string;
  metadata?: Record<string, unknown>;
}

export interface UseInvitationsReturn {
  invitations: UserInvitation[];
  isLoading: boolean;
  isCreating: boolean;
  isResending: boolean;
  isCancelling: boolean;
  error: Error | null;
  createInvitation: (data: CreateInvitationData) => Promise<boolean>;
  resendInvitation: (invitationId: string) => Promise<boolean>;
  cancelInvitation: (invitationId: string) => Promise<boolean>;
  refreshInvitations: () => Promise<void>;
}

export function useInvitations(): UseInvitationsReturn {
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchInvitations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_invitations')
        .select('*')
        .in('status', ['pending', 'expired'])
        .order('invited_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setInvitations(data as UserInvitation[] || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch invitations'));
      toast({
        title: 'Error',
        description: 'Failed to load invitations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load invitations on mount
  useEffect(() => {
    void fetchInvitations();
  }, [fetchInvitations]);

  const createInvitation = useCallback(async (data: CreateInvitationData): Promise<boolean> => {
    try {
      setIsCreating(true);

      // Check if email already has a pending invitation
      const { data: existingInvite } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('email', data.email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite) {
        toast({
          title: 'Invitation Exists',
          description: 'This email already has a pending invitation.',
          variant: 'destructive',
        });
        return false;
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', data.email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        toast({
          title: 'User Exists',
          description: 'A user with this email already exists.',
          variant: 'destructive',
        });
        return false;
      }

      const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
      const { data: inviteResult, error: inviteError } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email.toLowerCase(),
          role: data.role,
          propertyIds: data.propertyId ? [data.propertyId] : [],
          departmentIds: data.departmentId ? [data.departmentId] : [],
          provisioningMethod: 'invite',
          appUrl,
        },
      });

      if (inviteError) {
        throw inviteError;
      }

      if (inviteResult?.error) {
        throw new Error(inviteResult.error as string);
      }

      toast({
        title: 'Invitation Sent',
        description: `An invitation has been sent to ${data.email}`,
      });

      // Refresh list
      await fetchInvitations();
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create invitation',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [fetchInvitations, toast]);

  const resendInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    try {
      setIsResending(true);

      const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
      const { data, error: resendError } = await supabase.functions.invoke('resend-user-invitation', {
        body: {
          invitationId,
          appUrl,
        },
      });

      if (resendError) {
        throw resendError;
      }

      if (data?.error) {
        throw new Error(data.error as string);
      }

      toast({
        title: 'Invitation Resent',
        description: 'The invitation has been resent.',
      });

      await fetchInvitations();
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to resend invitation',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsResending(false);
    }
  }, [fetchInvitations, toast]);

  const cancelInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    try {
      setIsCancelling(true);

      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: 'Invitation Cancelled',
        description: 'The invitation has been cancelled.',
      });

      await fetchInvitations();
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsCancelling(false);
    }
  }, [fetchInvitations, toast]);

  return {
    invitations,
    isLoading,
    isCreating,
    isResending,
    isCancelling,
    error,
    createInvitation,
    resendInvitation,
    cancelInvitation,
    refreshInvitations: fetchInvitations,
  };
}
