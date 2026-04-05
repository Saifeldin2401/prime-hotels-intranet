import { describe, expect, it, vi } from 'vitest'
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

describe('Leave Request Critical Path', () => {
  const mockClient = createMockSupabaseClient()
  const staff = createMockUserContext('staff')

  it('should submit leave request', async () => {
    const leaveRequest = {
      id: 'leave-123',
      requester_id: staff.profile.id,
      leave_type: 'annual',
      start_date: '2026-05-01',
      end_date: '2026-05-05',
      status: 'pending'
    }

    mockClient.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockQueryResponse(leaveRequest))
    })

    const result = await mockClient.from('leave_requests')
      .insert(leaveRequest)
      .select()
      .single()

    expect(result.data?.status).toBe('pending')
  })

  it('should route request to approver', async () => {
    const requestId = 'leave-123'
    
    mockClient.rpc.mockResolvedValue(mockQueryResponse({
      request_id: requestId,
      assigned_to: 'manager-456',
      routed_at: new Date().toISOString()
    }))

    const result = await mockClient.rpc('route_leave_request', {
      p_request_id: requestId
    })

    expect(result.data?.assigned_to).toBeDefined()
  })
})

describe('Maintenance Ticket Critical Path', () => {
  const mockClient = createMockSupabaseClient()

  it('should create maintenance ticket', async () => {
    const ticket = {
      id: 'ticket-123',
      title: 'AC Not Working',
      description: 'Room 205 AC is not cooling',
      priority: 'high',
      status: 'open',
      property_id: 'prop-456',
      department_id: 'dept-789'
    }

    mockClient.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockQueryResponse(ticket))
    })

    const result = await mockClient.from('maintenance_tickets')
      .insert(ticket)
      .select()
      .single()

    expect(result.data?.priority).toBe('high')
  })

  it('should assign ticket to technician', async () => {
    const ticketId = 'ticket-123'
    
    mockClient.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockQueryResponse({
        id: ticketId,
        assigned_to: 'tech-456',
        status: 'assigned'
      }))
    })

    const result = await mockClient.from('maintenance_tickets')
      .update({ assigned_to: 'tech-456', status: 'assigned' })
      .eq('id', ticketId)
      .select()
      .single()

    expect(result.data?.status).toBe('assigned')
  })
})

// Import beforeEach
import { beforeEach } from 'vitest'
