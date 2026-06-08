import { describe, expect, it } from 'vitest'
import {
  knowledgeKeys,
  learningKeys,
  userKeys,
  announcementKeys,
  maintenanceKeys,
  hrKeys,
  approvalKeys,
  notificationKeys,
  documentKeys,
  analyticsKeys,
  organizationKeys,
  queryKeys,
} from './queryKeys'

describe('Query Key Factories', () => {
  describe('knowledgeKeys', () => {
    it('should create base all key', () => {
      expect(knowledgeKeys.all).toEqual(['knowledge'])
    })

    it('should create list keys', () => {
      expect(knowledgeKeys.lists()).toEqual(['knowledge', 'list'])
      expect(knowledgeKeys.list({ propertyId: '123' })).toEqual([
        'knowledge',
        'list',
        { propertyId: '123' },
      ])
    })

    it('should create detail keys', () => {
      expect(knowledgeKeys.detail('article-123')).toEqual([
        'knowledge',
        'detail',
        'article-123',
      ])
    })

    it('should create featured keys', () => {
      expect(knowledgeKeys.featured()).toEqual(['knowledge', 'featured', 'all'])
      expect(knowledgeKeys.featured('prop-123')).toEqual([
        'knowledge',
        'featured',
        'prop-123',
      ])
    })

    it('should create recent keys', () => {
      expect(knowledgeKeys.recent()).toEqual(['knowledge', 'recent', 'all'])
      expect(knowledgeKeys.recent('prop-123')).toEqual([
        'knowledge',
        'recent',
        'prop-123',
      ])
    })

    it('should create required reading keys', () => {
      expect(knowledgeKeys.requiredReading('user-123')).toEqual([
        'knowledge',
        'required',
        'user-123',
      ])
    })

    it('should create bookmark keys', () => {
      expect(knowledgeKeys.bookmarks('user-123')).toEqual([
        'knowledge',
        'bookmarks',
        'user-123',
      ])
    })

    it('should create related article keys', () => {
      expect(knowledgeKeys.related('doc-123')).toEqual([
        'knowledge',
        'related',
        'doc-123',
      ])
    })

    it('should create search keys', () => {
      expect(knowledgeKeys.search('late checkout')).toEqual([
        'knowledge',
        'search',
        'late checkout',
      ])
    })

    it('should create category keys', () => {
      expect(knowledgeKeys.categories()).toEqual(['knowledge', 'categories', 'all'])
      expect(knowledgeKeys.categories('dept-123')).toEqual([
        'knowledge',
        'categories',
        'dept-123',
      ])
    })

    it('should create feedback keys', () => {
      expect(knowledgeKeys.feedback.all).toEqual(['knowledge', 'feedback'])
      expect(knowledgeKeys.feedback.stats()).toEqual(['knowledge', 'feedback', 'stats'])
      expect(knowledgeKeys.feedback.recent()).toEqual(['knowledge', 'feedback', 'recent'])
      expect(knowledgeKeys.feedback.trends()).toEqual(['knowledge', 'feedback', 'trends'])
    })

    it('should create contextual help keys', () => {
      expect(knowledgeKeys.contextualHelp('task', 'maintenance')).toEqual([
        'knowledge',
        'contextual',
        'task',
        'maintenance',
      ])
    })
  })

  describe('learningKeys', () => {
    it('should create module keys', () => {
      expect(learningKeys.modules()).toEqual(['learning', 'modules'])
      expect(learningKeys.module('mod-123')).toEqual(['learning', 'modules', 'mod-123'])
      expect(learningKeys.moduleRoster('mod-123')).toEqual([
        'learning',
        'modules',
        'mod-123',
        'roster',
      ])
    })

    it('should create quiz keys', () => {
      expect(learningKeys.quizzes()).toEqual(['learning', 'quizzes'])
      expect(learningKeys.quiz('quiz-123')).toEqual(['learning', 'quizzes', 'quiz-123'])
    })

    it('should create assignment keys', () => {
      expect(learningKeys.assignments('user-123')).toEqual([
        'learning',
        'assignments',
        'user-123',
      ])
    })

    it('should create progress keys', () => {
      expect(learningKeys.progress('user-123', 'module', 'mod-456')).toEqual([
        'learning',
        'progress',
        'user-123',
        'module',
        'mod-456',
      ])
    })

    it('should create skill keys', () => {
      expect(learningKeys.skills.all).toEqual(['learning', 'skills'])
      expect(learningKeys.skills.list()).toEqual(['learning', 'skills', 'list'])
      expect(learningKeys.skills.user('user-123')).toEqual([
        'learning',
        'skills',
        'user',
        'user-123',
      ])
      expect(learningKeys.skills.module('mod-123')).toEqual([
        'learning',
        'skills',
        'module',
        'mod-123',
      ])
    })
  })

  describe('userKeys', () => {
    it('should create current user keys', () => {
      expect(userKeys.current()).toEqual(['users', 'current'])
    })

    it('should create profile keys', () => {
      expect(userKeys.profile('user-123')).toEqual(['users', 'profile', 'user-123'])
    })

    it('should create role keys', () => {
      expect(userKeys.roles('user-123')).toEqual(['users', 'roles', 'user-123'])
    })

    it('should create dashboard keys', () => {
      expect(userKeys.dashboard.all).toEqual(['users', 'dashboard'])
      expect(userKeys.dashboard.preferences('user-123')).toEqual([
        'users',
        'dashboard',
        'preferences',
        'user-123',
      ])
      expect(userKeys.dashboard.stats('user-123')).toEqual([
        'users',
        'dashboard',
        'stats',
        'user-123',
      ])
    })
  })

  describe('announcementKeys', () => {
    it('should create list keys', () => {
      expect(announcementKeys.lists()).toEqual(['announcements', 'list'])
      expect(announcementKeys.list({ propertyId: '123', isActive: true })).toEqual([
        'announcements',
        'list',
        { propertyId: '123', isActive: true },
      ])
    })

    it('should create detail keys', () => {
      expect(announcementKeys.detail('ann-123')).toEqual(['announcements', 'ann-123'])
    })

    it('should create feed keys', () => {
      expect(announcementKeys.feed('user-123')).toEqual([
        'announcements',
        'feed',
        'user-123',
      ])
    })
  })

  describe('maintenanceKeys', () => {
    it('should create ticket keys', () => {
      expect(maintenanceKeys.tickets()).toEqual(['maintenance', 'tickets'])
      expect(maintenanceKeys.ticket('ticket-123')).toEqual([
        'maintenance',
        'tickets',
        'ticket-123',
      ])
    })

    it('should create list keys with filters', () => {
      expect(maintenanceKeys.lists({ propertyId: '123', status: 'open' })).toEqual([
        'maintenance',
        'tickets',
        { propertyId: '123', status: 'open' },
      ])
    })

    it('should create stats keys', () => {
      expect(maintenanceKeys.stats()).toEqual(['maintenance', 'stats', 'all'])
      expect(maintenanceKeys.stats('prop-123')).toEqual([
        'maintenance',
        'stats',
        'prop-123',
      ])
    })
  })

  describe('hrKeys', () => {
    it('should create employee keys', () => {
      expect(hrKeys.employees()).toEqual(['hr', 'employees'])
      expect(hrKeys.employee('emp-123')).toEqual(['hr', 'employees', 'emp-123'])
      expect(hrKeys.directory()).toEqual(['hr', 'employees', 'directory', 'all'])
      expect(hrKeys.directory('prop-123')).toEqual([
        'hr',
        'employees',
        'directory',
        'prop-123',
      ])
    })

    it('should create leave keys', () => {
      expect(hrKeys.leave.all).toEqual(['hr', 'leave'])
      expect(hrKeys.leave.requests('user-123')).toEqual(['hr', 'leave', 'requests', 'user-123'])
      expect(hrKeys.leave.balance('user-123')).toEqual(['hr', 'leave', 'balance', 'user-123'])
    })

    it('should create attendance keys', () => {
      expect(hrKeys.attendance.all).toEqual(['hr', 'attendance'])
      expect(hrKeys.attendance.user('user-123')).toEqual(['hr', 'attendance', 'user', 'user-123'])
      expect(hrKeys.attendance.property('prop-123', '2024-01-01')).toEqual([
        'hr',
        'attendance',
        'property',
        'prop-123',
        '2024-01-01',
      ])
    })

    it('should create shift keys', () => {
      expect(hrKeys.shifts.all).toEqual(['hr', 'shifts'])
      expect(hrKeys.shifts.user('user-123')).toEqual(['hr', 'shifts', 'user', 'user-123'])
      expect(hrKeys.shifts.schedule('prop-123', '2024-01-01', '2024-01-07')).toEqual([
        'hr',
        'shifts',
        'schedule',
        'prop-123',
        '2024-01-01',
        '2024-01-07',
      ])
    })
  })

  describe('approvalKeys', () => {
    it('should create pending keys', () => {
      expect(approvalKeys.pending('user-123')).toEqual(['approvals', 'pending', 'user-123'])
    })

    it('should create submitted keys', () => {
      expect(approvalKeys.submitted('user-123')).toEqual(['approvals', 'submitted', 'user-123'])
    })

    it('should create request detail keys', () => {
      expect(approvalKeys.requests.all).toEqual(['approvals', 'requests'])
      expect(approvalKeys.requests.detail('req-123')).toEqual([
        'approvals',
        'requests',
        'req-123',
      ])
    })
  })

  describe('notificationKeys', () => {
    it('should create list keys', () => {
      expect(notificationKeys.list('user-123')).toEqual(['notifications', 'list', 'user-123'])
    })

    it('should create unread keys', () => {
      expect(notificationKeys.unread('user-123')).toEqual([
        'notifications',
        'unread',
        'user-123',
      ])
    })

    it('should create preference keys', () => {
      expect(notificationKeys.preferences('user-123')).toEqual([
        'notifications',
        'preferences',
        'user-123',
      ])
    })
  })



  describe('documentKeys', () => {
    it('should create list keys', () => {
      expect(documentKeys.lists()).toEqual(['documents', 'list'])
      expect(documentKeys.list({ type: 'pdf' })).toEqual(['documents', 'list', { type: 'pdf' }])
    })

    it('should create detail keys', () => {
      expect(documentKeys.detail('doc-123')).toEqual(['documents', 'doc-123'])
    })

    it('should create library keys', () => {
      expect(documentKeys.library('user-123')).toEqual(['documents', 'library', 'user-123'])
    })
  })

  describe('analyticsKeys', () => {
    it('should create event keys', () => {
      expect(analyticsKeys.events()).toEqual(['analytics', 'events'])
    })

    it('should create stats keys', () => {
      expect(analyticsKeys.stats('monthly')).toEqual(['analytics', 'stats', 'monthly'])
    })

    it('should create dashboard keys', () => {
      expect(analyticsKeys.dashboard.all).toEqual(['analytics', 'dashboard'])
      expect(analyticsKeys.dashboard.kpi()).toEqual(['analytics', 'dashboard', 'kpi', 'all'])
      expect(analyticsKeys.dashboard.kpi('prop-123')).toEqual([
        'analytics',
        'dashboard',
        'kpi',
        'prop-123',
      ])
    })
  })

  describe('organizationKeys', () => {
    it('should create property keys', () => {
      expect(organizationKeys.properties()).toEqual(['organization', 'properties'])
      expect(organizationKeys.property('prop-123')).toEqual([
        'organization',
        'properties',
        'prop-123',
      ])
    })

    it('should create department keys', () => {
      expect(organizationKeys.departments()).toEqual(['organization', 'departments', 'all'])
      expect(organizationKeys.departments('prop-123')).toEqual([
        'organization',
        'departments',
        'prop-123',
      ])
      expect(organizationKeys.department('dept-123')).toEqual([
        'organization',
        'department',
        'dept-123',
      ])
    })
  })

  describe('queryKeys (legacy export)', () => {
    it('should export all key factories', () => {
      expect(queryKeys.knowledge).toBe(knowledgeKeys)
      expect(queryKeys.learning).toBe(learningKeys)
      expect(queryKeys.users).toBe(userKeys)
      expect(queryKeys.announcements).toBe(announcementKeys)
      expect(queryKeys.maintenance).toBe(maintenanceKeys)
      expect(queryKeys.hr).toBe(hrKeys)
      expect(queryKeys.approvals).toBe(approvalKeys)
      expect(queryKeys.notifications).toBe(notificationKeys)
      expect(queryKeys.documents).toBe(documentKeys)
      expect(queryKeys.analytics).toBe(analyticsKeys)
      expect(queryKeys.organization).toBe(organizationKeys)
    })
  })

  describe('Key Structure Best Practices', () => {
    it('should have string prefixes for all keys', () => {
      const keys = knowledgeKeys.list({})
      expect(typeof keys[0]).toBe('string')
      expect(typeof keys[1]).toBe('string')
    })

    it('should be immutable (readonly arrays)', () => {
      // TypeScript ensures this at compile time
      // At runtime, we verify the structure
      const keys = knowledgeKeys.all
      expect(Array.isArray(keys)).toBe(true)
      expect(keys).toEqual(['knowledge'])
    })

    it('should support complex filter objects', () => {
      const complexFilter = {
        propertyId: 'prop-123',
        departmentId: 'dept-456',
        query: 'search term',
        status: 'published',
        page: 1,
        pageSize: 20,
      }
      const keys = knowledgeKeys.list(complexFilter)
      expect(keys[2]).toEqual(complexFilter)
    })

    it('should create unique keys for different parameters', () => {
      const key1 = knowledgeKeys.list({ propertyId: '123' })
      const key2 = knowledgeKeys.list({ propertyId: '456' })
      expect(key1).not.toEqual(key2)
    })

    it('should create hierarchical keys for cache invalidation', () => {
      // Invalidating parent should affect children conceptually
      // (React Query doesn't automatically do this, but the structure supports it)
      const all = knowledgeKeys.all
      const list = knowledgeKeys.lists()
      const detail = knowledgeKeys.detail('123')

      expect(detail[0]).toBe(all[0]) // Same root
      expect(list[0]).toBe(all[0]) // Same root
    })
  })
})
