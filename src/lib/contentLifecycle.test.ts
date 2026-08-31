import { describe, expect, it } from 'vitest'
import {
  applyTransition,
  availableTransitions,
  canTransition,
  isContentManagerRole,
  resolveActor,
  TRANSITIONS,
  type ContentStatus,
  type LifecycleActor,
  type LifecycleTransition,
} from './contentLifecycle'

describe('contentLifecycle state machine', () => {
  describe('the happy path draft -> published', () => {
    it('owner submits a draft for review', () => {
      expect(applyTransition('submitForReview', 'draft', 'owner')).toBe('in_review')
    })
    it('manager approves an in_review item', () => {
      expect(applyTransition('approve', 'in_review', 'manager')).toBe('approved')
    })
    it('manager publishes an approved item', () => {
      expect(applyTransition('publish', 'approved', 'manager')).toBe('published')
    })
  })

  describe('requestChanges sends it back to draft', () => {
    it('manager can request changes from in_review', () => {
      expect(applyTransition('requestChanges', 'in_review', 'manager')).toBe('draft')
    })
  })

  describe('archive / restore', () => {
    it.each(['draft', 'in_review', 'approved', 'published'] as ContentStatus[])(
      'a manager can archive from %s',
      (from) => {
        expect(applyTransition('archive', from, 'manager')).toBe('archived')
      },
    )
    it('an owner can archive their own published content', () => {
      expect(applyTransition('archive', 'published', 'owner')).toBe('archived')
    })
    it('only a manager can restore an archived item', () => {
      expect(applyTransition('restore', 'archived', 'manager')).toBe('draft')
      expect(canTransition('restore', 'archived', 'owner').allowed).toBe(false)
    })
  })

  describe('illegal transitions are rejected', () => {
    it('cannot approve a draft (must be in_review first)', () => {
      const check = canTransition('approve', 'draft', 'manager')
      expect(check.allowed).toBe(false)
      expect(check.reason).toContain('in_review')
    })
    it('cannot publish something still in review', () => {
      expect(canTransition('publish', 'in_review', 'manager').allowed).toBe(false)
    })
    it('an owner cannot approve their own content', () => {
      const check = canTransition('approve', 'in_review', 'owner')
      expect(check.allowed).toBe(false)
      expect(check.reason).toContain('owner')
    })
    it('a viewer cannot do anything', () => {
      const transitions = Object.keys(TRANSITIONS) as LifecycleTransition[]
      const statuses: ContentStatus[] = [
        'draft',
        'in_review',
        'approved',
        'published',
        'archived',
      ]
      for (const t of transitions) {
        for (const s of statuses) {
          expect(canTransition(t, s, 'viewer').allowed).toBe(false)
        }
      }
    })
    it('applyTransition throws on an illegal move', () => {
      expect(() => applyTransition('publish', 'draft', 'manager')).toThrow()
    })
    it('archived is terminal except for restore', () => {
      const fromArchived = availableTransitions('archived', 'manager')
      expect(fromArchived).toEqual(['restore'])
    })
  })

  describe('availableTransitions', () => {
    it('lists what an owner can do from draft', () => {
      expect(availableTransitions('draft', 'owner').sort()).toEqual(
        ['archive', 'submitForReview'].sort(),
      )
    })
    it('lists what a manager can do from in_review', () => {
      expect(availableTransitions('in_review', 'manager').sort()).toEqual(
        ['approve', 'archive', 'requestChanges'].sort(),
      )
    })
    it('an owner waiting on review can only archive', () => {
      expect(availableTransitions('in_review', 'owner')).toEqual(['archive'])
    })
  })

  describe('every transition spec is internally consistent', () => {
    it.each(Object.entries(TRANSITIONS))('%s has non-empty from/actors and a valid to', (_name, spec) => {
      expect(spec.from.length).toBeGreaterThan(0)
      expect(spec.actors.length).toBeGreaterThan(0)
      expect(spec.from).not.toContain(spec.to)
    })
  })

  describe('resolveActor', () => {
    const cases: [{ isOwner: boolean; isManager: boolean }, LifecycleActor][] = [
      [{ isOwner: false, isManager: true }, 'manager'],
      [{ isOwner: true, isManager: true }, 'manager'],
      [{ isOwner: true, isManager: false }, 'owner'],
      [{ isOwner: false, isManager: false }, 'viewer'],
    ]
    it.each(cases)('%o -> %s', (input, expected) => {
      expect(resolveActor(input)).toBe(expected)
    })
  })

  describe('isContentManagerRole', () => {
    it('accepts admin/manager roles', () => {
      expect(isContentManagerRole('super_admin')).toBe(true)
      expect(isContentManagerRole('property_hr')).toBe(true)
    })
    it('rejects staff and nullish', () => {
      expect(isContentManagerRole('staff')).toBe(false)
      expect(isContentManagerRole(null)).toBe(false)
      expect(isContentManagerRole(undefined)).toBe(false)
    })
  })
})
