import { describe, expect, it } from 'vitest'
import { getWorkspaceForPath, workspacesForCapabilities } from './useWorkspaces'

describe('getWorkspaceForPath', () => {
  it.each([
    ['/learn', 'LEARN'],
    ['/learn/courses', 'LEARN'],
    ['/knowledge/42', 'LEARN'],
    ['/studio', 'STUDIO'],
    ['/studio/quizzes/new', 'STUDIO'],
    ['/studio/review', 'STUDIO'],
    ['/manage/assignments', 'MANAGE'],
    ['/manage/compliance', 'MANAGE'],
    ['/admin/organization', 'ORGANIZATION'],
    ['/platform/organizations', 'PLATFORM'],
    ['/profile', null],
  ] as const)('maps %s to %s', (path, expected) => {
    expect(getWorkspaceForPath(path)).toBe(expected)
  })
})

describe('workspacesForCapabilities', () => {
  it('gives a learner only Learn', () => {
    expect(workspacesForCapabilities(['learning.take', 'knowledge.read'], false)).toEqual(['LEARN'])
  })

  it('gives an author Studio but not Manage', () => {
    expect(workspacesForCapabilities(['learning.take', 'content.author'], false)).toEqual(['LEARN', 'STUDIO'])
  })

  it('gives a training manager Studio and Manage but not Organization', () => {
    expect(
      workspacesForCapabilities(
        ['learning.take', 'content.author', 'content.publish', 'assignment.manage', 'certificate.issue', 'reports.view'],
        false,
      ),
    ).toEqual(['LEARN', 'STUDIO', 'MANAGE'])
  })

  it('gives an organization admin every tenant workspace', () => {
    expect(
      workspacesForCapabilities(['content.author', 'assignment.manage', 'org.admin', 'people.manage'], false),
    ).toEqual(['LEARN', 'STUDIO', 'MANAGE', 'ORGANIZATION'])
  })

  it('adds Platform only for platform operators', () => {
    expect(workspacesForCapabilities([], true)).toEqual(['LEARN', 'PLATFORM'])
  })
})
