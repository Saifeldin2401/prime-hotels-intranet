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
    // training_module_documents doesn't exist anymore; documents are modeled as resources.
    // Since training_module_resources.resource_id is polymorphic, we can't rely on PostgREST joins.
    const { data: requiredResources, error: resourcesError } = await supabase
      .from('training_module_resources')
      .select('resource_id, is_required')
      .eq('training_module_id', moduleId)
      .eq('resource_type', 'document')
      .eq('is_required', true)

    if (resourcesError) throw resourcesError

    const documentIds = (requiredResources || []).map((r) => r.resource_id).filter(Boolean)

    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, title')
      .in('id', documentIds)
      .eq('status', 'PUBLISHED')
      .eq('is_deleted', false)

    if (docsError) throw docsError

    const docTitleById = new Map<string, string>()
    for (const d of docs || []) {
      docTitleById.set(d.id, d.title || 'Untitled Document')
    }

    // Use acknowledgments as the durable completion signal.
    const { data: acks, error: ackError } = await supabase
      .from('document_acknowledgments')
      .select('document_id, acknowledged_at')
      .eq('user_id', userId)
      .in('document_id', documentIds)

    if (ackError) throw ackError

    const completedDocIds = new Set((acks || []).filter((a) => a.acknowledged_at).map((a) => a.document_id))

    // Build prerequisites result
    const documentPrerequisites: TrainingPrerequisite[] = (documentIds || []).map((docId: string) => ({
      type: 'document' as const,
      id: docId,
      name: docTitleById.get(docId) || 'Untitled Document',
      isCompleted: completedDocIds.has(docId)
    }));

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
  documentId: string) {
  try {
    const nowIso = new Date().toISOString()

    const { error } = await supabase
      .from('document_acknowledgments')
      .upsert(
        {
          document_id: documentId,
          user_id: userId,
          acknowledged_at: nowIso
        },
        { onConflict: 'document_id,user_id' }
      )

    if (error) throw error

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
      .from('training_progress')
      .select('completed_at, quiz_score')
      .eq('user_id', userId)
      .eq('training_id', moduleId)
      .single();

    // Get document requirements and completion
    const prerequisites = await checkTrainingPrerequisites(userId, moduleId);

    // Calculate overall progress
    const totalRequirements = prerequisites.missingRequirements.length + prerequisites.completedRequirements.length;
    const completedRequirements = prerequisites.completedRequirements.length;
    const documentProgress = totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0;

    return {
      isTrainingCompleted: !!trainingCompletion?.completed_at,
      trainingScore: trainingCompletion?.quiz_score,
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
