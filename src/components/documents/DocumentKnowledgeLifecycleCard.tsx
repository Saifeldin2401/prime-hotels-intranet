/**
 * DocumentKnowledgeLifecycleCard
 * 
 * Provides explicit administrative publication and Knowledge Base lifecycle controls:
 * - Shows Document Status (Draft / Pending / Approved / Archived) vs AI KB Status (Indexed / Internal / Removed / Superseded)
 * - Explicit publication to Knowledge Base with confirmation dialog
 * - Keep Internal Only action
 * - Revocation / Removal from AI Knowledge Base with confirmation
 * - Version superseding status and audit timestamps
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import {
  publishDocumentToKnowledgeBase,
  removeDocumentFromKnowledgeBase,
  setDocumentInternal,
} from '@/services/knowledgeService';
import { logAuditEvent } from '@/lib/auditLog';
import type { Document } from '@/lib/types/documents';
import {
  Sparkles,
  ShieldCheck,
  EyeOff,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Lock,
  RefreshCw,
  History,
  FileCheck,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface DocumentKnowledgeLifecycleCardProps {
  document: Document;
  onStatusChange?: () => void;
}

export function DocumentKnowledgeLifecycleCard({
  document,
  onStatusChange,
}: DocumentKnowledgeLifecycleCardProps) {
  const { t, i18n } = useTranslation('documents');
  const isRTL = i18n.dir() === 'rtl';
  const { user, profile, primaryRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [loading, setLoading] = useState(false);

  const canManage = ['administrator', 'super_admin', 'knowledge_manager', 'training_manager', 'regional_admin', 'regional_hr', 'corporate_admin', 'property_manager', 'department_head'].includes(
    primaryRole || ''
  );

  const isIndexed = document.knowledge_base_status === 'indexed' && document.is_active_kb_version;
  const isSuperseded = document.knowledge_base_status === 'superseded';
  const isRemoved = document.knowledge_base_status === 'removed';
  const isInternal = !isIndexed && !isSuperseded;

  // 1. Action: Publish to Knowledge Base
  const handleConfirmPublish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await publishDocumentToKnowledgeBase({
        documentId: document.id,
        userId: user.id,
        visibility: document.visibility,
        departmentId: document.department_id || undefined,
        supersedesId: document.supersedes_document_id || undefined,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to publish');
      }

      await logAuditEvent({
        event_type: 'document.published_to_kb',
        entity_type: 'document',
        entity_id: document.id,
        description: `Document "${document.title}" explicitly approved and published to AI Knowledge Base`,
        metadata: {
          document_id: document.id,
          version: document.current_version,
          published_by: user.id,
        },
      });

      toast({
        title: t('lifecycle.published_success_title', 'Published to Knowledge Base'),
        description: t(
          'lifecycle.published_success_desc',
          'Document is now indexed and available for AI assistants, RAG retrieval, and course generation.'
        ),
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      setPublishDialogOpen(false);
      onStatusChange?.();
    } catch (err: unknown) {
      toast({
        title: t('common.error', 'Error'),
        description: err instanceof Error ? err.message : 'Action failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Action: Remove from Knowledge Base
  const handleConfirmRemove = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await removeDocumentFromKnowledgeBase(document.id, user.id, removeReason);

      if (!res.success) {
        throw new Error(res.error || 'Failed to remove from KB');
      }

      await logAuditEvent({
        event_type: 'document.removed_from_kb',
        entity_type: 'document',
        entity_id: document.id,
        description: `Document "${document.title}" removed from AI Knowledge Base. Reason: ${removeReason || 'Manual revocation'}`,
        metadata: {
          document_id: document.id,
          reason: removeReason,
          removed_by: user.id,
        },
      });

      toast({
        title: t('lifecycle.removed_success_title', 'Removed from Knowledge Base'),
        description: t(
          'lifecycle.removed_success_desc',
          'Document has been excluded from AI vector retrieval and public knowledge searches.'
        ),
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      setRemoveDialogOpen(false);
      setRemoveReason('');
      onStatusChange?.();
    } catch (err: unknown) {
      toast({
        title: t('common.error', 'Error'),
        description: err instanceof Error ? err.message : 'Action failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. Action: Keep Internal Only
  const handleConfirmInternal = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await setDocumentInternal(document.id, user.id);

      if (!res.success) {
        throw new Error(res.error || 'Failed to mark internal');
      }

      await logAuditEvent({
        event_type: 'document.internal_approved',
        entity_type: 'document',
        entity_id: document.id,
        description: `Document "${document.title}" marked as Approved Internal Only (Excluded from AI)`,
        metadata: {
          document_id: document.id,
          reviewed_by: user.id,
        },
      });

      toast({
        title: t('lifecycle.internal_success_title', 'Marked as Internal Only'),
        description: t(
          'lifecycle.internal_success_desc',
          'Document is approved for internal reference but strictly excluded from AI knowledge retrieval.'
        ),
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });
      setInternalDialogOpen(false);
      onStatusChange?.();
    } catch (err: unknown) {
      toast({
        title: t('common.error', 'Error'),
        description: err instanceof Error ? err.message : 'Action failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-card shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              {t('lifecycle.title', 'AI Knowledge Base & Publication Control')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t(
                'lifecycle.subtitle',
                'Explicit 2-tier governance: Document State vs AI Retrieval Eligibility'
              )}
            </CardDescription>
          </div>

          {/* Current AI Knowledge Base State Badge */}
          <div>
            {isIndexed ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 px-3 py-1 text-xs shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('lifecycle.badge_indexed', 'Indexed in AI Knowledge Base')}
              </Badge>
            ) : isSuperseded ? (
              <Badge variant="secondary" className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 gap-1 px-3 py-1 text-xs">
                <History className="w-3.5 h-3.5" />
                {t('lifecycle.badge_superseded', 'Superseded KB Version')}
              </Badge>
            ) : isRemoved ? (
              <Badge variant="destructive" className="gap-1 px-3 py-1 text-xs">
                <XCircle className="w-3.5 h-3.5" />
                {t('lifecycle.badge_removed', 'Removed from Knowledge Base')}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 gap-1 px-3 py-1 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" />
                {t('lifecycle.badge_internal', 'Internal Document (Excluded from AI)')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Governance Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/20 border text-xs">
          <div>
            <span className="text-muted-foreground block mb-1 font-medium">{t('lifecycle.doc_status', 'Document Status')}</span>
            <Badge variant="outline" className="font-semibold text-xs">
              {document.status}
            </Badge>
          </div>

          <div>
            <span className="text-muted-foreground block mb-1 font-medium">{t('lifecycle.ai_eligibility', 'AI Retrieval Status')}</span>
            <span className={isIndexed ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}>
              {isIndexed ? t('lifecycle.rag_active', 'Active RAG Target') : t('lifecycle.rag_excluded', 'Excluded from AI')}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block mb-1 font-medium">{t('lifecycle.current_version', 'Version')}</span>
            <span className="font-mono font-bold">
              v{document.current_version || 1} {isIndexed ? '(Active KB)' : ''}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block mb-1 font-medium">{t('lifecycle.last_action_date', 'Published Date')}</span>
            <span className="text-muted-foreground">
              {document.published_at ? format(new Date(document.published_at), 'PPP') : t('lifecycle.not_published', 'Not published')}
            </span>
          </div>
        </div>

        {/* Informational Guidance Notice */}
        <div className="text-xs p-3.5 rounded-xl border bg-accent/20 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              {isIndexed
                ? t('lifecycle.info_indexed_title', 'This document is actively ingested into the hotel AI grounding index.')
                : t('lifecycle.info_internal_title', 'This document is safely isolated from AI systems.')}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {isIndexed
                ? t(
                    'lifecycle.info_indexed_desc',
                    'AI Course Generator, Altus Copilot, and Staff RAG search cite this document as verified hotel SOP. Revoking it immediately removes it from AI generation.'
                  )
                : t(
                    'lifecycle.info_internal_desc',
                    'Newly uploaded or internal documents remain strictly accessible to authorized staff only, with zero exposure to vector search or AI tools until explicitly approved.'
                  )}
            </p>
          </div>
        </div>

        {/* Action Controls for Admins */}
        {canManage && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
            {!isIndexed ? (
              <>
                <Button
                  onClick={() => setPublishDialogOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('lifecycle.action_publish', 'Publish to AI Knowledge Base')}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInternalDialogOpen(true)}
                  className="text-xs gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {t('lifecycle.action_keep_internal', 'Keep Internal Only')}
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRemoveDialogOpen(true)}
                className="text-xs gap-2"
              >
                <EyeOff className="w-3.5 h-3.5" />
                {t('lifecycle.action_remove', 'Remove from Knowledge Base')}
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialog: Publish to Knowledge Base */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
              {t('lifecycle.modal_publish_title', 'Approve & Publish to AI Knowledge Base')}
            </DialogTitle>
            <DialogDescription className="text-xs pt-2 leading-relaxed">
              {t(
                'lifecycle.modal_publish_desc',
                'By publishing this document to the Knowledge Base, it will become an active grounding source for the AI Course Generator, staff RAG assistance, and enterprise search. Any previous version will be superseded.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-muted/40 rounded-xl border text-xs space-y-1 my-2">
            <p className="font-semibold text-foreground">{document.title}</p>
            <p className="text-muted-foreground">Version: v{document.current_version || 1} • Size: {document.file_size || 0} bytes</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)} disabled={loading}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleConfirmPublish}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 me-2 animate-spin" />}
              {t('lifecycle.modal_publish_confirm', 'Confirm & Publish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Remove from Knowledge Base */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t('lifecycle.modal_remove_title', 'Remove from AI Knowledge Base?')}
            </DialogTitle>
            <DialogDescription className="text-xs pt-2 leading-relaxed">
              {t(
                'lifecycle.modal_remove_desc',
                'Removing this document will immediately revoke it from active AI embeddings and RAG search. Employees and AI agents will no longer retrieve answers from this document.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-2">
            <Label htmlFor="removeReason" className="text-xs">
              {t('lifecycle.reason_label', 'Reason for Revocation (optional)')}
            </Label>
            <Textarea
              id="removeReason"
              placeholder={t('lifecycle.reason_placeholder', 'e.g. SOP under review, outdated procedure...')}
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              className="text-xs"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)} disabled={loading}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={loading}
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 me-2 animate-spin" />}
              {t('lifecycle.modal_remove_confirm', 'Revoke & Remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Keep Internal Only */}
      <Dialog open={internalDialogOpen} onOpenChange={setInternalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              {t('lifecycle.modal_internal_title', 'Mark as Internal Only')}
            </DialogTitle>
            <DialogDescription className="text-xs pt-2 leading-relaxed">
              {t(
                'lifecycle.modal_internal_desc',
                'This will approve the document for internal department/property reference, but keep it strictly excluded from AI knowledge base indexing and semantic search.'
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setInternalDialogOpen(false)} disabled={loading}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleConfirmInternal}
              disabled={loading}
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 me-2 animate-spin" />}
              {t('lifecycle.modal_internal_confirm', 'Save as Internal Only')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
