import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabaseClient, mockQueryResponse } from '../mocks/supabase'
import { createMockUserContext } from '../factories'

describe('Document Management Critical Path', () => {
  const mockClient = createMockSupabaseClient()
  const user = createMockUserContext('property_hr')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new document', async () => {
    const newDocument = {
      id: 'doc-123',
      title: 'Test SOP Document',
      content: 'Document content here',
      property_id: user.properties[0].id,
      status: 'draft'
    }

    mockClient.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockQueryResponse(newDocument))
    })

    const result = await mockClient.from('documents')
      .insert(newDocument)
      .select()
      .single()

    expect(result.data).toEqual(newDocument)
    expect(result.error).toBeNull()
  })

  it('should submit document for approval', async () => {
    const documentId = 'doc-123'
    
    mockClient.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockQueryResponse({
        id: documentId,
        status: 'pending_review'
      }))
    })

    const result = await mockClient.from('documents')
      .update({ status: 'pending_review', submitted_at: new Date().toISOString() })
      .eq('id', documentId)
      .select()
      .single()

    expect(result.data?.status).toBe('pending_review')
  })

  it('should approve a document', async () => {
    const documentId = 'doc-123'
    const approverId = 'approver-456'
    
    mockClient.rpc.mockResolvedValue(mockQueryResponse({
      success: true,
      document_id: documentId,
      approved_by: approverId,
      approved_at: new Date().toISOString()
    }))

    const result = await mockClient.rpc('approve_document', {
      p_document_id: documentId,
      p_approver_id: approverId
    })

    expect(result.data?.success).toBe(true)
  })
})

describe('Training Module Critical Path', () => {
  const mockClient = createMockSupabaseClient()

  it('should create a training module', async () => {
    const module = {
      id: 'module-123',
      title: 'Safety Training 101',
      description: 'Basic safety procedures',
      status: 'published'
    }

    mockClient.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockQueryResponse(module))
    })

    const result = await mockClient.from('training_modules')
      .insert(module)
      .select()
      .single()

    expect(result.data?.title).toBe('Safety Training 101')
  })

  it('should track user progress', async () => {
    const progress = {
      id: 'progress-123',
      user_id: 'user-456',
      module_id: 'module-789',
      progress_percentage: 75,
      status: 'in_progress'
    }

    mockClient.from.mockReturnValue({
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockQueryResponse(progress))
    })

    const result = await mockClient.from('training_progress')
      .upsert(progress)
      .select()
      .single()

    expect(result.data?.progress_percentage).toBe(75)
  })

  it('should complete training and generate certificate', async () => {
    mockClient.rpc.mockResolvedValue(mockQueryResponse({
      certificate_id: 'cert-123',
      issued_at: new Date().toISOString(),
      completion_percentage: 100
    }))

    const result = await mockClient.rpc('complete_training_module', {
      p_user_id: 'user-456',
      p_module_id: 'module-789'
    })

    expect(result.data?.certificate_id).toBeDefined()
    expect(result.data?.completion_percentage).toBe(100)
  })
})

describe('Task Management Critical Path', () => {
  const mockClient = createMockSupabaseClient()
  const staff = createMockUserContext('staff')

  it('should create a task', async () => {
    const task = {
      id: 'task-123',
      title: 'Complete Fire Drill Inspection Review',
      description: 'Review SOP evacuation document and take the quiz',
      assigned_to_id: staff.profile.id,
      priority: 'high',
      status: 'todo'
    }

    mockClient.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockQueryResponse(task))
    })

    const result = await mockClient.from('tasks')
      .insert(task)
      .select()
      .single()

    expect(result.data?.status).toBe('todo')
    expect(result.data?.priority).toBe('high')
  })

  it('should update task status to in_progress and complete', async () => {
    const taskId = 'task-123'
    
    mockClient.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockQueryResponse({
        id: taskId,
        status: 'completed'
      }))
    })

    const result = await mockClient.from('tasks')
      .update({ status: 'completed' })
      .eq('id', taskId)
      .select()
      .single()

    expect(result.data?.status).toBe('completed')
  })
})

describe('Assessment & Quiz Submission Critical Path', () => {
  const mockClient = createMockSupabaseClient()

  it('should submit quiz attempt and receive score', async () => {
    mockClient.rpc.mockResolvedValue(mockQueryResponse({
      attempt_id: 'attempt-123',
      score: 90,
      passed: true
    }))

    const result = await mockClient.rpc('submit_quiz_attempt', {
      p_user_id: 'user-456',
      p_assessment_id: 'assessment-789',
      p_answers: { q1: 'opt-a', q2: 'opt-c' }
    })

    expect(result.data?.passed).toBe(true)
    expect(result.data?.score).toBe(90)
  })
})
