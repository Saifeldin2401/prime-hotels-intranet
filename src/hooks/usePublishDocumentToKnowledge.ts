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
import { getArticleById } from '@/services/knowledgeService';
import type { Database } from '@/types/database.generated';
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

        // 2. Publish document to Knowledge Base via atomic RPC
        const rpcResult = await supabase.rpc('publish_document_to_kb', {
          p_document_id: document.id,
          p_user_id: user.id,
          p_visibility: input.visibility || null,
          p_category_id: input.categoryId || null,
          p_department_id: input.departmentId || null,
          p_supersedes_id: document.supersedes_document_id || null,
        });

        if (rpcResult.error) {
          throw new Error(`Failed to publish document to knowledge base: ${rpcResult.error.message}`);
        }

        // 3. Update title/description/content if changed during publish dialog
        await supabase
          .from('documents')
          .update({
            title: input.title || document.title,
            description: input.description || document.description,
            requires_acknowledgment: input.requiresAcknowledgment || false,
            content: input.content || document.content,
          })
          .eq('id', document.id);

        // 4. Handle tags if provided
        if (input.tags && input.tags.length > 0) {
          try {
            const { data: existingTags } = await supabase
              .from('document_tags')
              .select('id, name')
              .in('name', input.tags);

            const existingByName = new Map((existingTags || []).map((t) => [t.name, t.id]));
            const missingNames = input.tags.filter((name) => !existingByName.has(name));

            if (missingNames.length > 0) {
              const { data: createdTags, error: createTagsError } = await supabase
                .from('document_tags')
                .insert(missingNames.map((name) => ({ name, created_by: user.id })))
                .select('id, name');
              if (createTagsError) throw createTagsError;
              for (const tag of createdTags || []) existingByName.set(tag.name, tag.id);
            }

            const tagIds = input.tags.map((name) => existingByName.get(name)).filter((id): id is string => !!id);
            if (tagIds.length > 0) {
              await supabase
                .from('document_tag_assignments')
                .insert(tagIds.map((tagId) => ({ document_id: document.id, tag_id: tagId })));
            }
          } catch (err) {
            console.warn('Failed to add tags:', err);
          }
        }

        // 5. Log audit event
        await logAuditEvent({
          event_type: 'document.published_to_kb',
          entity_type: 'document',
          entity_id: document.id,
          description: `Document "${document.title}" explicitly approved and published to AI Knowledge Base`,
          metadata: {
            document_id: document.id,
            knowledge_base_status: 'indexed',
            is_active_kb_version: true,
            published_by: user.id,
          },
        });

        const publishedArticle = await getArticleById(document.id);

        return {
          article: publishedArticle,
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
  const allowedRoles = ['administrator', 'super_admin', 'knowledge_manager', 'training_manager', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'corporate_admin', 'department_head', 'dept_head'];
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
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', articleId);

      if (error) throw error;

      // Create new version record
      await supabase.from('document_versions').insert({
        document_id: articleId,
        version_number: (article.current_version || 0) + 1,
        file_url: sourceDoc.file_url,
        change_summary: `Synced from source document (${documentId})`,
        created_by: user.id,
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
