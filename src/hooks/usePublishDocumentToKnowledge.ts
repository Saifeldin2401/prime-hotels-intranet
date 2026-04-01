/**
 * usePublishDocumentToKnowledge - Hook for publishing documents to Knowledge Base
 * 
 * This hook allows converting document library files into knowledge base articles.
 * Documents can be published with metadata like title, description, visibility, etc.
 */

import { useAuth } from '@/hooks/useAuth';
import { useProperty } from '@/contexts/PropertyContext';
import { supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auditLog';
import { crudToasts } from '@/lib/toastHelpers';
import type { Document } from '@/lib/types';
import type { KnowledgeArticle, KnowledgeVisibility } from '@/types/knowledge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export interface PublishToKnowledgeInput {
  documentId: string;
  title: string;
  description?: string;
  content?: string;
  visibility: KnowledgeVisibility;
  propertyId?: string | null;
  departmentId?: string | null;
  categoryId?: string | null;
  requiresAcknowledgment?: boolean;
  tags?: string[];
  /** If true, auto-publish immediately. If false, save as DRAFT for review. */
  autoPublish?: boolean;
}

export interface PublishToKnowledgeResult {
  article: KnowledgeArticle | null;
  success: boolean;
  error?: string;
}

/**
 * Hook to publish a document from the document library to the knowledge base
 */
export function usePublishDocumentToKnowledge() {
  const queryClient = useQueryClient();
  const { user, primaryRole } = useAuth();
  const { currentProperty } = useProperty();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: PublishToKnowledgeInput): Promise<PublishToKnowledgeResult> => {
      if (!user) {
        throw new Error('User must be authenticated to publish documents');
      }

      try {
        // 1. Fetch the original document
        const { data: document, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', input.documentId)
          .single();

        if (docError || !document) {
          throw new Error('Document not found');
        }

        // 2. Check if document is already published as knowledge base
        if (document.content_type !== 'document') {
          throw new Error('Document is already published to knowledge base');
        }

        // 3. Determine if user can auto-publish based on role
        const canAutoPublish = ['regional_admin', 'regional_hr', 'corporate_admin'].includes(primaryRole || '');
        const finalStatus = input.autoPublish && canAutoPublish ? 'PUBLISHED' : 'DRAFT';

        // 4. Create knowledge base article from document
        const articleData = {
          title: input.title || document.title,
          description: input.description || document.description,
          content: input.content || `<p>Document reference: <a href="${document.file_url}" target="_blank">${document.title}</a></p>`,
          content_type: 'document',
          file_url: document.file_url,
          storage_bucket: document.storage_bucket,
          storage_path: document.storage_path,
          visibility: input.visibility,
          property_id: input.propertyId || currentProperty?.id,
          department_id: input.departmentId,
          category_id: input.categoryId,
          requires_acknowledgment: input.requiresAcknowledgment || false,
          status: finalStatus,
          created_by: user.id,
          current_version: 1,
          published_version_number: finalStatus === 'PUBLISHED' ? 1 : null,
          last_published_at: finalStatus === 'PUBLISHED' ? new Date().toISOString() : null,
          last_published_by: finalStatus === 'PUBLISHED' ? user.id : null,
          // Link back to original document
          source_document_id: document.id,
        };

        // 5. Insert the knowledge base article
        const { data: article, error: insertError } = await supabase
          .from('documents')
          .insert(articleData)
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create knowledge base article: ${insertError.message}`);
        }

        // 6. Create initial version record
        const { error: versionError } = await supabase
          .from('document_versions')
          .insert({
            document_id: article.id,
            version_number: 1,
            title: articleData.title,
            description: articleData.description,
            content: articleData.content,
            file_url: articleData.file_url,
            storage_bucket: articleData.storage_bucket,
            storage_path: articleData.storage_path,
            change_summary: `Published from document library (source: ${document.id})`,
            created_by: user.id,
            status: finalStatus,
          });

        if (versionError) {
          console.warn('Failed to create version record:', versionError);
          // Don't fail the whole operation for version creation
        }

        // 7. Handle tags if provided
        if (input.tags && input.tags.length > 0) {
          // Create tag assignments
          const tagAssignments = input.tags.map(tagName => ({
            document_id: article.id,
            tag: tagName,
          }));

          await supabase
            .from('document_tags')
            .insert(tagAssignments)
            .then(() => {}, (err) => console.warn('Failed to add tags:', err));
        }

        // 8. Log audit event
        await logAuditEvent({
          event_type: 'document.published_to_knowledge',
          entity_type: 'document',
          entity_id: document.id,
          description: `Document "${document.title}" published to knowledge base as "${articleData.title}"`,
          metadata: {
            source_document_id: document.id,
            knowledge_article_id: article.id,
            status: finalStatus,
            auto_publish: input.autoPublish,
            has_role_privilege: canAutoPublish,
          },
        });

        return {
          article: article as KnowledgeArticle,
          success: true,
        };
      } catch (error) {
        console.error('Error publishing document to knowledge base:', error);
        return {
          article: null,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
    onSuccess: (result, input) => {
      if (result.success) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
        queryClient.invalidateQueries({ queryKey: ['knowledge-featured'] });
        queryClient.invalidateQueries({ queryKey: ['knowledge-recent'] });
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        queryClient.invalidateQueries({ queryKey: ['document', input.documentId] });

        // Show success toast
        const statusLabel = input.autoPublish ? 'published' : 'submitted as draft';
        crudToasts.create.success(`Document ${statusLabel} to knowledge base`);
      } else {
        crudToasts.create.error('Failed to publish document to knowledge base');
      }
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      crudToasts.create.error('Failed to publish document to knowledge base');
    },
  });
}

/**
 * Hook to check if a document can be published to knowledge base
 */
export function useCanPublishToKnowledge(document?: Document | null): {
  canPublish: boolean;
  reason?: string;
} {
  const { user, primaryRole } = useAuth();

  if (!document) {
    return { canPublish: false, reason: 'No document provided' };
  }

  if (!user) {
    return { canPublish: false, reason: 'Not authenticated' };
  }

  // Only documents with content_type='document' can be published
  if (document.content_type !== 'document') {
    return { canPublish: false, reason: 'Document is already in knowledge base' };
  }

  // Check if user has permission to publish
  const allowedRoles = ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'corporate_admin', 'dept_head'];
  if (!allowedRoles.includes(primaryRole || '')) {
    return { canPublish: false, reason: 'Insufficient permissions' };
  }

  return { canPublish: true };
}

/**
 * Hook to update an existing knowledge base article from its source document
 */
export function useSyncKnowledgeArticle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      articleId,
      documentId,
    }: {
      articleId: string;
      documentId: string;
    }): Promise<boolean> => {
      if (!user) throw new Error('Not authenticated');

      // Fetch both documents
      const [{ data: article }, { data: sourceDoc }] = await Promise.all([
        supabase.from('documents').select('*').eq('id', articleId).single(),
        supabase.from('documents').select('*').eq('id', documentId).single(),
      ]);

      if (!article || !sourceDoc) {
        throw new Error('Article or source document not found');
      }

      // Update article with latest source document info
      const { error } = await supabase
        .from('documents')
        .update({
          file_url: sourceDoc.file_url,
          storage_bucket: sourceDoc.storage_bucket,
          storage_path: sourceDoc.storage_path,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', articleId);

      if (error) throw error;

      // Create new version record
      await supabase.from('document_versions').insert({
        document_id: articleId,
        version_number: (article.current_version || 0) + 1,
        title: article.title,
        description: article.description,
        content: article.content,
        file_url: sourceDoc.file_url,
        storage_bucket: sourceDoc.storage_bucket,
        storage_path: sourceDoc.storage_path,
        change_summary: `Synced from source document (${documentId})`,
        created_by: user.id,
        status: article.status,
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-article'] });
      crudToasts.update.success('Knowledge base article synced');
    },
    onError: () => {
      crudToasts.update.error('Failed to sync knowledge base article');
    },
  });
}
