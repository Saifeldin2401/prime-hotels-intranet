import { describe, expect, it } from 'vitest'

import { groupSetupGaps } from './organization/model'
import { groupPlatformExceptions } from './platform/model'
import { editHref, stageOf, toContentItems } from './studio/model'

describe('organization setup gaps', () => {
  it('groups by kind, drops unknown kinds and sorts by name', () => {
    const groups = groupSetupGaps([
      { kind: 'department_without_manager', subject_id: 'd2', subject_name: 'Spa', detail: 'Cairo', since: null },
      { kind: 'department_without_manager', subject_id: 'd1', subject_name: 'Front Office', detail: 'Cairo', since: null },
      { kind: 'unplaced_member', subject_id: 'u1', subject_name: 'Dana', detail: 'hotel', since: null },
      { kind: 'future_kind', subject_id: 'x', subject_name: 'X', detail: null, since: null },
    ])
    expect([...groups.keys()].sort()).toEqual(['department_without_manager', 'unplaced_member'])
    expect(groups.get('department_without_manager')!.map((g) => g.subjectName)).toEqual(['Front Office', 'Spa'])
  })
})

describe('platform exceptions', () => {
  it('groups by kind with the newest first', () => {
    const groups = groupPlatformExceptions([
      { kind: 'failed_job', organization_id: 'o1', organization_name: 'A', subject_id: 'j1', detail: 'timeout', since: '2026-09-20T00:00:00Z' },
      { kind: 'failed_job', organization_id: 'o2', organization_name: 'B', subject_id: 'j2', detail: 'quota', since: '2026-09-24T00:00:00Z' },
      { kind: 'something_else', organization_id: null, organization_name: null, subject_id: 'z', detail: null, since: null },
    ])
    expect(groups.size).toBe(1)
    expect(groups.get('failed_job')!.map((e) => e.subjectId)).toEqual(['j2', 'j1'])
  })
})

describe('studio content stages', () => {
  it('normalises course, quiz and article statuses', () => {
    expect(stageOf('draft')).toBe('draft')
    expect(stageOf('DRAFT')).toBe('draft')
    expect(stageOf('pending_review')).toBe('in_review')
    expect(stageOf('PENDING_REVIEW')).toBe('in_review')
    expect(stageOf('APPROVED')).toBe('in_review')
    expect(stageOf('REJECTED')).toBe('changes_requested')
    expect(stageOf('published')).toBe('published')
    expect(stageOf('archived')).toBe('archived')
  })

  it('orders newest first and links each type to its editor', () => {
    const items = toContentItems([
      { type: 'course', id: 'c1', title: 'Old', status: 'draft', updated_at: '2026-09-01T00:00:00Z' },
      { type: 'article', id: 'a1', title: 'New', status: 'DRAFT', updated_at: '2026-09-20T00:00:00Z' },
    ])
    expect(items.map((i) => i.id)).toEqual(['a1', 'c1'])
    expect(editHref(items[0])).toBe('/studio/articles/a1/edit')
    expect(editHref(items[1])).toBe('/studio/courses/c1')
    expect(editHref({ type: 'quiz', id: 'q1', title: '', status: '', updated_at: '' })).toBe('/studio/quizzes/q1')
  })
})
