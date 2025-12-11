import { Database } from '@/lib/database.types';

export type Language = 'en' | 'ar';

export type SOPDocumentStatus = 'draft' | 'under_review' | 'approved' | 'obsolete';
export type SOPApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

export interface SOPCategory {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  department_id?: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  children?: SOPCategory[];
}

export interface SOPDocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  content: any; // JSON content from editor
  change_summary?: string;
  status: SOPDocumentStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  published_by?: string;
  creator?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface SOPDocument {
  id: string;
  code: string;
  title: string;
  title_ar: string;
  description?: string;
  description_ar?: string;
  department_id: string;
  category_id?: string;
  subcategory_id?: string;
  status: SOPDocumentStatus;
  version: number;
  current_version_id?: string;
  review_frequency_months: number;
  next_review_date?: string;
  is_template: boolean;
  template_id?: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  published_by?: string;
  archived_at?: string;
  archived_by?: string;
  
  // Relations
  current_version?: SOPDocumentVersion;
  category?: SOPCategory;
  subcategory?: SOPCategory;
  department?: {
    id: string;
    name: string;
    name_ar: string;
  };
  creator?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  approvers?: {
    id: string;
    full_name: string;
    role: string;
    status: SOPApprovalStatus;
    approved_at?: string;
  }[];
  tags?: SOPTag[];
  attachments?: SOPAttachment[];
  related_documents?: {
    id: string;
    title: string;
    relation_type: string;
  }[];
}

export interface SOPApprovalWorkflow {
  id: string;
  document_id: string;
  version_id: string;
  status: SOPApprovalStatus;
  current_step: number;
  total_steps: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  completed_by?: string;
  rejection_reason?: string;
  steps: SOPApprovalStep[];
  document?: SOPDocument;
  version?: SOPDocumentVersion;
}

export interface SOPApprovalStep {
  id: string;
  workflow_id: string;
  step_number: number;
  approver_role: string;
  approver_id?: string;
  status: SOPApprovalStatus;
  comments?: string;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  approver?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
  };
}

export interface SOPAttachment {
  id: string;
  document_id: string;
  version_id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  is_primary: boolean;
  uploaded_by: string;
  created_at: string;
  url?: string;
  uploader?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface SOPAcknowledgment {
  id: string;
  document_id: string;
  version_id: string;
  user_id: string;
  acknowledged_at: string;
  signature_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  document?: {
    id: string;
    title: string;
    code: string;
  };
  version?: {
    id: string;
    version_number: number;
  };
}

export interface SOPSearchResult {
  id: string;
  code: string;
  title: string;
  title_ar: string;
  description?: string;
  description_ar?: string;
  status: SOPDocumentStatus;
  version: number;
  department_id: string;
  category_id?: string;
  subcategory_id?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  next_review_date?: string;
  department?: {
    id: string;
    name: string;
    name_ar: string;
  };
  category?: {
    id: string;
    name: string;
    name_ar: string;
  };
  subcategory?: {
    id: string;
    name: string;
    name_ar: string;
  };
  tags?: SOPTag[];
  _search_rank?: number;
}

export interface SOPTag {
  id: string;
  name: string;
  name_ar: string;
  color: string;
  created_by?: string;
  created_at: string;
  count?: number;
}

export interface SOPDocumentRelation {
  source_document_id: string;
  target_document_id: string;
  relation_type: 'related_to' | 'replaces' | 'replaced_by' | 'supersedes' | 'superseded_by';
  created_by?: string;
  created_at: string;
  target_document?: {
    id: string;
    code: string;
    title: string;
    status: SOPDocumentStatus;
    version: number;
  };
}

export interface SOPReviewReminder {
  id: string;
  document_id: string;
  reminder_date: string;
  status: 'pending' | 'sent' | 'completed';
  sent_at?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
  document?: {
    id: string;
    code: string;
    title: string;
    status: SOPDocumentStatus;
  };
  completed_by_user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface SOPSearchParams {
  query?: string;
  status?: SOPDocumentStatus | 'all';
  department_id?: string | 'all';
  category_id?: string | 'all';
  subcategory_id?: string | 'all';
  tag_id?: string | 'all';
  sort_by?: 'title' | 'created_at' | 'updated_at' | 'published_at' | 'next_review_date';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
  include_archived?: boolean;
  only_templates?: boolean;
}

export interface SOPSearchResponse {
  data: SOPSearchResult[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type SOPDocumentWithDetails = Database['public']['Tables']['sop_documents']['Row'] & {
  current_version?: SOPDocumentVersion;
  category?: SOPCategory;
  subcategory?: SOPCategory;
  department?: Database['public']['Tables']['departments']['Row'];
  creator?: Database['public']['Tables']['profiles']['Row'];
  approvers?: Array<{
    id: string;
    full_name: string;
    role: string;
    status: SOPApprovalStatus;
    approved_at?: string;
  }>;
  tags?: SOPTag[];
  attachments?: SOPAttachment[];
  related_documents?: Array<{
    id: string;
    title: string;
    relation_type: string;
  }>;
};

// Editor types
export type SOPEditorContent = {
  type: 'doc';
  content: SOPEditorNode[];
};

export type SOPEditorNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: SOPEditorNode[];
  marks?: Array<{
    type: string;
    attrs?: Record<string, any>;
  }>;
  text?: string;
};

// Template types
export interface SOPSectionTemplate {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  content: any; // JSON content
  category_id?: string;
  department_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Workflow templates
export interface SOPWorkflowTemplate {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  department_id?: string;
  category_id?: string;
  steps: Array<{
    step_number: number;
    approver_role: string;
    approver_id?: string;
    is_required: boolean;
  }>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Audit log types
export interface SOPAuditLog {
  id: string;
  document_id: string;
  version_id?: string;
  user_id: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  document?: {
    id: string;
    code: string;
    title: string;
  };
  version?: {
    id: string;
    version_number: number;
  };
}

// Dashboard statistics
export interface SOPSummaryStats {
  total_documents: number;
  published_documents: number;
  draft_documents: number;
  under_review: number;
  pending_approvals: number;
  pending_acknowledgments: number;
  expiring_soon: number;
  expired: number;
  by_department: Array<{
    department_id: string;
    department_name: string;
    department_name_ar: string;
    count: number;
  }>;
  by_status: Array<{
    status: string;
    count: number;
  }>;
  recent_activities: Array<{
    id: string;
    action: string;
    document_id: string;
    document_title: string;
    user_id: string;
    user_name: string;
    created_at: string;
  }>;
}

// Export types for API responses
export type APIResponse<T> = {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  success: boolean;
};

// Types for document creation/update
export interface CreateSOPDocumentInput {
  title: string;
  title_ar: string;
  description?: string;
  description_ar?: string;
  department_id: string;
  category_id?: string;
  subcategory_id?: string;
  content: any; // JSON content from editor
  status?: SOPDocumentStatus;
  is_template?: boolean;
  template_id?: string;
  tags?: string[];
  attachments?: Array<{
    file_name: string;
    file_type: string;
    file_size: number;
    storage_path: string;
    is_primary?: boolean;
  }>;
  related_documents?: Array<{
    target_document_id: string;
    relation_type: string;
  }>;
}

export interface UpdateSOPDocumentInput extends Partial<CreateSOPDocumentInput> {
  id: string;
  change_summary?: string;
  version_comment?: string;
}
