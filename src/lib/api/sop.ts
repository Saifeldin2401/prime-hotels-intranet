import { supabase } from '@/lib/supabase';
import type {
  SOPDocument,
  SOPDocumentVersion,
  SOPCategory,
  SOPApprovalWorkflow,
  SOPAcknowledgment,
  SOPSearchParams,
  SOPSearchResponse,
  SOPSummaryStats,
  CreateSOPDocumentInput,
  UpdateSOPDocumentInput,
  SOPTag,
  SOPAuditLog,
  APIResponse
} from '@/lib/types/sop';

const SOP_TABLE = 'sop_documents';
const VERSION_TABLE = 'sop_document_versions';
const CATEGORY_TABLE = 'sop_categories';
const ACKNOWLEDGMENT_TABLE = 'sop_acknowledgments';
const TAG_TABLE = 'sop_tags';
const AUDIT_LOG_TABLE = 'sop_access_logs';

export class SOPService {
  // Document Operations
  static async getDocuments(params: SOPSearchParams = {}): Promise<APIResponse<SOPSearchResponse>> {
    try {
      const {
        query,
        status = 'all',
        department_id = 'all',
        category_id = 'all',
        subcategory_id = 'all',
        tag_id = 'all',
        sort_by = 'updated_at',
        sort_order = 'desc',
        page = 1,
        page_size = 10,
        include_archived = false,
        only_templates = false,
      } = params;

      let queryBuilder = supabase
        .from('sop_document_search')
        .select('*', { count: 'exact' });

      // Apply filters
      if (status !== 'all') {
        queryBuilder = queryBuilder.eq('status', status);
      }

      if (department_id !== 'all') {
        queryBuilder = queryBuilder.eq('department_id', department_id);
      }

      if (category_id !== 'all') {
        queryBuilder = queryBuilder.eq('category_id', category_id);
      }

      if (subcategory_id !== 'all') {
        queryBuilder = queryBuilder.eq('subcategory_id', subcategory_id);
      }

      if (tag_id !== 'all') {
        queryBuilder = queryBuilder.contains('tag_ids', [tag_id]);
      }

      if (query) {
        queryBuilder = queryBuilder.textSearch('search_vector', query, {
          type: 'websearch',
          config: 'english'
        });
      }

      if (!include_archived) {
        queryBuilder = queryBuilder.is('archived_at', null);
      }

      if (only_templates) {
        queryBuilder = queryBuilder.eq('is_template', true);
      } else {
        queryBuilder = queryBuilder.eq('is_template', false);
      }

      // Apply sorting
      if (sort_by) {
        queryBuilder = queryBuilder.order(sort_by, { ascending: sort_order === 'asc' });
      }

      // Apply pagination
      const from = (page - 1) * page_size;
      const to = from + page_size - 1;
      queryBuilder = queryBuilder.range(from, to);

      const { data, error, count } = await queryBuilder;

      if (error) throw error;

      return {
        data: {
          data: data as any[],
          total: count || 0,
          page,
          page_size,
          total_pages: Math.ceil((count || 0) / page_size)
        },
        success: true
      };
    } catch (error) {
      console.error('Error fetching documents:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch documents',
          details: error
        },
        success: false
      };
    }
  }

  static async getDocumentById(id: string): Promise<APIResponse<SOPDocument>> {
    try {
      const { data, error } = await supabase
        .from(SOP_TABLE)
        .select(`
          *,
          current_version:current_version_id(*),
          category:category_id(*),
          subcategory:subcategory_id(*),
          department:department_id(id, name, name_ar, short_code),
          creator:profiles!sop_documents_created_by_fkey(id, full_name, avatar_url, email),
          approvers:sop_approval_steps(
            id,
            approver_id,
            status,
            approved_at,
            approver:profiles(id, full_name, avatar_url, email)
          ),
          tags:sop_document_tags(
            tag_id,
            tag:sop_tags(*)
          ),
          attachments:sop_attachments(*),
          related_documents:sop_document_relations!sop_document_relations_source_document_id_fkey(
            relation_type,
            target_document_id,
            target_document:sop_documents!sop_document_relations_target_document_id_fkey(
              id,
              code,
              title,
              status,
              version
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform the data to match our types
      const document = {
        ...data,
        approvers: data.approvers?.map((a: any) => ({
          id: a.approver_id,
          full_name: a.approver?.full_name,
          avatar_url: a.approver?.avatar_url,
          role: a.role,
          status: a.status,
          approved_at: a.approved_at
        })),
        tags: data.tags?.map((t: any) => t.tag),
        related_documents: data.related_documents?.map((r: any) => ({
          id: r.target_document_id,
          title: r.target_document?.title,
          relation_type: r.relation_type
        }))
      };

      return { data: document, success: true };
    } catch (error) {
      console.error(`Error fetching document ${id}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch document',
          details: error
        },
        success: false
      };
    }
  }

  static async createDocument(input: CreateSOPDocumentInput): Promise<APIResponse<SOPDocument>> {
    const { content, tags, attachments, related_documents, ...documentData } = input;

    try {
      // Start a transaction
      const { data: document, error: docError } = await supabase.rpc('create_sop_document', {
        document_data: documentData,
        content: content,
        change_summary: 'Initial version',
        tags: tags || [],
        attachments: attachments?.map(a => ({
          file_name: a.file_name,
          file_type: a.file_type,
          file_size: a.file_size,
          storage_path: a.storage_path,
          is_primary: a.is_primary || false
        })) || [],
        related_documents: related_documents || []
      });

      if (docError) throw docError;

      return { data: document as SOPDocument, success: true };
    } catch (error) {
      console.error('Error creating document:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to create document',
          details: error
        },
        success: false
      };
    }
  }

  static async updateDocument(
    id: string,
    input: UpdateSOPDocumentInput
  ): Promise<APIResponse<SOPDocument>> {
    const { content, tags, attachments, related_documents, change_summary, ...documentData } = input;

    try {
      // Start a transaction
      const { data: document, error: docError } = await supabase.rpc('update_sop_document', {
        document_id: id,
        document_data: documentData,
        content: content,
        change_summary: change_summary || 'Document updated',
        tags: tags,
        attachments: attachments?.map(a => ({
          file_name: a.file_name,
          file_type: a.file_type,
          file_size: a.file_size,
          storage_path: a.storage_path,
          is_primary: a.is_primary || false
        })) || [],
        related_documents: related_documents || []
      });

      if (docError) throw docError;

      return { data: document as SOPDocument, success: true };
    } catch (error) {
      console.error(`Error updating document ${id}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to update document',
          details: error
        },
        success: false
      };
    }
  }

  static async deleteDocument(id: string): Promise<APIResponse<boolean>> {
    try {
      const { error } = await supabase
        .from(SOP_TABLE)
        .update({ status: 'obsolete', archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return { data: true, success: true };
    } catch (error) {
      console.error(`Error deleting document ${id}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to delete document',
          details: error
        },
        success: false
      };
    }
  }

  // Version Operations
  static async getDocumentVersions(documentId: string): Promise<APIResponse<SOPDocumentVersion[]>> {
    try {
      const { data, error } = await supabase
        .from(VERSION_TABLE)
        .select('*, created_by:profiles(id, full_name, avatar_url)')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return { data: data as SOPDocumentVersion[], success: true };
    } catch (error) {
      console.error(`Error fetching versions for document ${documentId}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch document versions',
          details: error
        },
        success: false
      };
    }
  }

  static async getVersionById(versionId: string): Promise<APIResponse<SOPDocumentVersion>> {
    try {
      const { data, error } = await supabase
        .from(VERSION_TABLE)
        .select('*, created_by:profiles(id, full_name, avatar_url)')
        .eq('id', versionId)
        .single();

      if (error) throw error;

      return { data: data as SOPDocumentVersion, success: true };
    } catch (error) {
      console.error(`Error fetching version ${versionId}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch version',
          details: error
        },
        success: false
      };
    }
  }

  static async restoreVersion(
    documentId: string,
    versionId: string
  ): Promise<APIResponse<SOPDocument>> {
    try {
      const { data, error } = await supabase.rpc('restore_sop_version', {
        document_id: documentId,
        version_id: versionId
      });

      if (error) throw error;

      return { data: data as SOPDocument, success: true };
    } catch (error) {
      console.error(`Error restoring version ${versionId} for document ${documentId}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to restore version',
          details: error
        },
        success: false
      };
    }
  }

  // Category Operations
  static async getCategories(parentId?: string): Promise<APIResponse<SOPCategory[]>> {
    try {
      let query = supabase
        .from(CATEGORY_TABLE)
        .select('*')
        .order('name');

      if (parentId) {
        query = query.eq('parent_id', parentId);
      } else {
        query = query.is('parent_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // For top-level categories, fetch their children
      if (!parentId) {
        const categoriesWithChildren = await Promise.all(
          (data || []).map(async (category) => {
            const { data: children } = await this.getCategories(category.id);
            return { ...category, children: children || [] };
          })
        );
        return { data: categoriesWithChildren, success: true };
      }

      return { data: data || [], success: true };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch categories',
          details: error
        },
        success: false
      };
    }
  }

  static async createCategory(category: Partial<SOPCategory>): Promise<APIResponse<SOPCategory>> {
    try {
      const { data, error } = await supabase
        .from(CATEGORY_TABLE)
        .insert(category)
        .select()
        .single();

      if (error) throw error;

      return { data: data as SOPCategory, success: true };
    } catch (error) {
      console.error('Error creating category:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to create category',
          details: error
        },
        success: false
      };
    }
  }

  // Approval Workflow Operations
  static async startApprovalWorkflow(
    documentId: string,
    versionId: string,
    approvers: Array<{ role: string; userId?: string }>,
    comments?: string
  ): Promise<APIResponse<SOPApprovalWorkflow>> {
    try {
      const { data, error } = await supabase.rpc('start_sop_approval_workflow', {
        p_document_id: documentId,
        p_version_id: versionId,
        p_approvers: approvers,
        p_comments: comments
      });

      if (error) throw error;

      return { data: data as SOPApprovalWorkflow, success: true };
    } catch (error) {
      console.error(`Error starting approval workflow for document ${documentId}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to start approval workflow',
          details: error
        },
        success: false
      };
    }
  }

  static async approveStep(
    workflowId: string,
    stepId: string,
    approved: boolean,
    comments?: string
  ): Promise<APIResponse<SOPApprovalWorkflow>> {
    try {
      const { data, error } = await supabase.rpc('process_sop_approval_step', {
        p_workflow_id: workflowId,
        p_step_id: stepId,
        p_approved: approved,
        p_comments: comments
      });

      if (error) throw error;

      return { data: data as SOPApprovalWorkflow, success: true };
    } catch (error) {
      console.error(`Error processing approval step ${stepId}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to process approval step',
          details: error
        },
        success: false
      };
    }
  }

  // Acknowledgment Operations
  static async acknowledgeDocument(
    documentId: string,
    versionId: string,
    signatureData?: any
  ): Promise<APIResponse<SOPAcknowledgment>> {
    try {
      const { data, error } = await supabase.rpc('acknowledge_sop_document', {
        p_document_id: documentId,
        p_version_id: versionId,
        p_signature_data: signatureData
      });

      if (error) throw error;

      return { data: data as SOPAcknowledgment, success: true };
    } catch (error) {
      console.error(`Error acknowledging document ${documentId}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to acknowledge document',
          details: error
        },
        success: false
      };
    }
  }

  static async getDocumentAcknowledgmentStatus(
    documentId: string,
    versionId: string
  ): Promise<APIResponse<{ acknowledged: boolean; acknowledgment?: SOPAcknowledgment }>> {
    try {
      const { data, error } = await supabase
        .from(ACKNOWLEDGMENT_TABLE)
        .select('*')
        .eq('document_id', documentId)
        .eq('version_id', versionId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (error) throw error;

      return {
        data: {
          acknowledged: !!data,
          acknowledgment: data as SOPAcknowledgment
        },
        success: true
      };
    } catch (error) {
      console.error(`Error fetching acknowledgment status for document ${documentId}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch acknowledgment status',
          details: error
        },
        success: false
      };
    }
  }

  // Dashboard & Reporting
  static async getSummaryStats(): Promise<APIResponse<SOPSummaryStats>> {
    try {
      const { data, error } = await supabase.rpc('get_sop_summary_stats');

      if (error) throw error;

      return { data: data as SOPSummaryStats, success: true };
    } catch (error) {
      console.error('Error fetching SOP summary stats:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch summary stats',
          details: error
        },
        success: false
      };
    }
  }

  // Dashboard & Reporting
  static async getStats(): Promise<APIResponse<SOPSummaryStats>> {
    try {
      const { data, error } = await supabase.rpc('get_sop_summary_stats');

      if (error) throw error;

      return { data: data as SOPSummaryStats, success: true };
    } catch (error) {
      console.error('Error fetching SOP summary stats:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch summary stats',
          details: error
        },
        success: false
      };
    }
  }

  // Tag Operations
  static async getTags(): Promise<APIResponse<SOPTag[]>> {
    try {
      const { data, error } = await supabase
        .from(TAG_TABLE)
        .select('*')
        .order('name');

      if (error) throw error;

      return { data: data as SOPTag[], success: true };
    } catch (error) {
      console.error('Error fetching tags:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch tags',
          details: error
        },
        success: false
      };
    }
  }

  // Audit Logs
  static async getAuditLogs(
    documentId?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<APIResponse<{ logs: SOPAuditLog[]; total: number }>> {
    try {
      let query = supabase
        .from(AUDIT_LOG_TABLE)
        .select('*, user:profiles(id, full_name, avatar_url, email)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (documentId) {
        query = query.eq('document_id', documentId);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: {
          logs: data as SOPAuditLog[],
          total: count || 0
        },
        success: true
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch audit logs',
          details: error
        },
        success: false
      };
    }
  }
}

export default SOPService;
