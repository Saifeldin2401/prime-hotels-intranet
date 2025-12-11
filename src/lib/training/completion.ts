import { supabase } from '@/lib/supabase';

export interface TrainingPrerequisite {
  type: 'document' | 'module';
  id: string;
  name: string;
  isCompleted: boolean;
}

export interface TrainingPrerequisitesResult {
  canStart: boolean;
  missingRequirements: TrainingPrerequisite[];
  completedRequirements: TrainingPrerequisite[];
}

export async function checkTrainingPrerequisites(
  userId: string,
  moduleId: string
): Promise<TrainingPrerequisitesResult> {
  try {
    // Get required documents for this training module
    const { data: requiredDocs, error: docsError } = await supabase
      .from('training_module_documents')
      .select(`
        document_id,
        is_required,
        documents!inner(id, title, status)
      `)
      .eq('training_module_id', moduleId)
      .eq('is_required', true)
      .eq('documents.status', 'PUBLISHED');

    if (docsError) throw docsError;

    // Get completed document views for the user
    const documentIds = requiredDocs?.map(d => d.document_id) || [];
    const { data: completedDocs, error: completedError } = await supabase
      .from('document_access_logs')
      .select('document_id, completed_at')
      .eq('user_id', userId)
      .in('document_id', documentIds)
      .eq('action', 'view')
      .not('completed_at', 'is', null);

    if (completedError) throw completedError;

    const completedDocIds = new Set(completedDocs?.map(d => d.document_id) || []);

    // Build prerequisites result
    const documentPrerequisites: TrainingPrerequisite[] = requiredDocs?.map(doc => ({
      type: 'document' as const,
      id: doc.document_id,
      name: (doc.documents as any)?.title || 'Untitled Document',
      isCompleted: completedDocIds.has(doc.document_id)
    })) || [];

    const missingRequirements = documentPrerequisites.filter(p => !p.isCompleted);
    const completedRequirements = documentPrerequisites.filter(p => p.isCompleted);

    return {
      canStart: missingRequirements.length === 0,
      missingRequirements,
      completedRequirements
    };
  } catch (error) {
    console.error('Error checking training prerequisites:', error);
    return {
      canStart: false,
      missingRequirements: [],
      completedRequirements: []
    };
  }
}

export async function markDocumentAsCompleted(
  userId: string,
  documentId: string,
  timeSpentSeconds?: number
) {
  try {
    const { error } = await supabase
      .from('document_access_logs')
      .update({
        completed_at: new Date().toISOString(),
        time_spent_seconds: timeSpentSeconds
      })
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .eq('action', 'view')
      .is('completed_at', null);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error marking document as completed:', error);
    return { success: false, error };
  }
}

export async function getTrainingProgressWithDocuments(
  userId: string,
  moduleId: string
) {
  try {
    // Get training completion status
    const { data: trainingCompletion } = await supabase
      .from('training_completions')
      .select('completed_at, score, time_spent_seconds')
      .eq('user_id', userId)
      .eq('training_module_id', moduleId)
      .single();

    // Get document requirements and completion
    const prerequisites = await checkTrainingPrerequisites(userId, moduleId);

    // Calculate overall progress
    const totalRequirements = prerequisites.missingRequirements.length + prerequisites.completedRequirements.length;
    const completedRequirements = prerequisites.completedRequirements.length;
    const documentProgress = totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0;

    return {
      isTrainingCompleted: !!trainingCompletion?.completed_at,
      trainingScore: trainingCompletion?.score,
      documentProgress,
      prerequisites,
      canCompleteTraining: prerequisites.canStart
    };
  } catch (error) {
    console.error('Error getting training progress:', error);
    return {
      isTrainingCompleted: false,
      documentProgress: 0,
      prerequisites: { canStart: false, missingRequirements: [], completedRequirements: [] },
      canCompleteTraining: false
    };
  }
}
