import type { LearningProgress } from '@/hooks/useLearningProgress'
import type { TrainingModule } from '@/lib/types'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { EmployeeProgressGroup, EnrichedProgressRecord } from './types'

const progressStatusOrder: Record<LearningProgress['status'], number> = {
  overdue: 0,
  in_progress: 1,
  assigned: 2,
  completed: 3,
  excused: 4
}

interface UseProgressDataParams {
  progressData: LearningProgress[] | undefined
  overviewSearch: string
  overviewFilterStatus: string
  overviewFilterDept: string
  overviewFilterProp: string
  userDepartments: Array<{ user_id: string; department: unknown }> | undefined
  userProperties: Array<{ user_id: string; property: unknown }> | undefined
  users: Array<{ id: string; full_name: string; email?: string }> | undefined
  modules: TrainingModule[] | undefined
  getProgressStatusMeta: (status: LearningProgress['status']) => { badgeClass: string; label: string; progressClass: string }
}

export function useProgressData({
  progressData,
  overviewSearch,
  overviewFilterStatus,
  overviewFilterDept,
  overviewFilterProp,
  userDepartments,
  userProperties,
  users,
  modules,
  getProgressStatusMeta,
}: UseProgressDataParams) {
  const { t } = useTranslation('training')

  const filteredProgress = useMemo(() => {
    if (!progressData) return []
    return progressData.filter(item => {
      if (item.content_type !== 'module') return false
      if (overviewSearch) {
        const searchLower = overviewSearch.toLowerCase()
        const user = users?.find(u => u.id === item.user_id)
        const userName = item.profiles?.full_name || user?.full_name || ''
        const moduleTitle = modules?.find(m => m.id === item.content_id)?.title || ''
        if (!userName.toLowerCase().includes(searchLower) && !moduleTitle.toLowerCase().includes(searchLower)) {
          return false
        }
      }
      if (overviewFilterStatus !== 'all' && item.status !== overviewFilterStatus) return false
      const userDeptId = (userDepartments?.find(ud => ud.user_id === item.user_id)?.department as any)?.id
      const userPropId = (userProperties?.find(up => up.user_id === item.user_id)?.property as any)?.id
      if (overviewFilterDept !== 'all' && userDeptId !== overviewFilterDept) return false
      if (overviewFilterProp !== 'all' && userPropId !== overviewFilterProp) return false
      return true
    })
  }, [progressData, overviewSearch, overviewFilterStatus, overviewFilterDept, overviewFilterProp, userDepartments, userProperties, users, modules])

  const progressMetrics = useMemo(() => ({
    total: filteredProgress.length,
    completed: filteredProgress.filter(p => p.status === 'completed').length,
    in_progress: filteredProgress.filter(p => p.status === 'in_progress').length,
    overdue: filteredProgress.filter(p => p.status === 'overdue').length,
    uniqueModules: new Set(filteredProgress.map(p => p.content_id)).size
  }), [filteredProgress])

  const enrichedProgress = useMemo<EnrichedProgressRecord[]>(() => {
    return filteredProgress.map((item) => {
      const joinedDepartmentName = item.profiles?.user_departments?.[0]?.departments?.name || ''
      const joinedPropertyName = item.profiles?.user_properties?.[0]?.properties?.name || ''
      const departmentData = userDepartments?.find((d) => d.user_id === item.user_id)?.department as
        | { name?: string } | Array<{ name?: string }> | null | undefined
      const propertyData = userProperties?.find((p) => p.user_id === item.user_id)?.property as
        | { name?: string } | Array<{ name?: string }> | null | undefined
      const fallbackDepartmentName = Array.isArray(departmentData) ? departmentData[0]?.name || '' : departmentData?.name || ''
      const fallbackPropertyName = Array.isArray(propertyData) ? propertyData[0]?.name || '' : propertyData?.name || ''
      const user = users?.find((entry) => entry.id === item.user_id)
      const resolvedUserName = item.profiles?.full_name || user?.full_name || t('unknownUser')
      const resolvedModuleTitle = item.training_modules?.title || modules?.find((m) => m.id === item.content_id)?.title || t('unknownModule')
      const resolvedProgress = item.status === 'completed' ? item.progress_percentage : Math.min(item.progress_percentage, 99)
      const parsedScore = item.score_percentage === undefined || item.score_percentage === null ? null : Number(item.score_percentage)
      const statusMeta = getProgressStatusMeta(item.status)
      const lastTouchedAt = item.last_accessed_at || item.completed_at || item.updated_at || item.created_at
      const normalizedName = resolvedUserName.trim()
      const userInitials = normalizedName.split(/\s+/).filter(Boolean).map((name) => name[0]).join('').slice(0, 2).toUpperCase() || 'NA'
      const resolvedDepartmentName = joinedDepartmentName || fallbackDepartmentName
      const resolvedPropertyName = joinedPropertyName || fallbackPropertyName
      return {
        ...item,
        resolvedDepartmentName,
        resolvedModuleTitle,
        resolvedProgress,
        resolvedPropertyName,
        resolvedScore: parsedScore !== null && Number.isFinite(parsedScore) ? parsedScore : null,
        resolvedUserName,
        statusLabel: statusMeta.label,
        userInitials,
        lastTouchedAt,
        locationLabel: resolvedDepartmentName || resolvedPropertyName || t('noDept')
      }
    })
  }, [filteredProgress, getProgressStatusMeta, modules, t, userDepartments, userProperties, users])

  const employeeProgressGroups = useMemo<EmployeeProgressGroup[]>(() => {
    const groupedRecords = new Map<string, EmployeeProgressGroup>()
    enrichedProgress.forEach((record) => {
      if (!groupedRecords.has(record.user_id)) {
        groupedRecords.set(record.user_id, {
          activeModules: 0, assignedModules: 0, attentionCount: 0, averageProgress: 0, averageScore: null,
          avatarUrl: record.profiles?.avatar_url || undefined, completedModules: 0,
          departmentName: record.resolvedDepartmentName, excusedModules: 0, highlightModule: null,
          inProgressModules: 0, lastTouchedAt: record.lastTouchedAt, locationLabel: record.locationLabel,
          overdueModules: 0, propertyName: record.resolvedPropertyName, records: [], totalModules: 0,
          userId: record.user_id, userInitials: record.userInitials, userName: record.resolvedUserName
        })
      }
      const group = groupedRecords.get(record.user_id)!
      group.records.push(record)
      if (!group.lastTouchedAt || new Date(record.lastTouchedAt) > new Date(group.lastTouchedAt)) {
        group.lastTouchedAt = record.lastTouchedAt
      }
    })

    return Array.from(groupedRecords.values())
      .map((group) => {
        const records = [...group.records].sort((a, b) => {
          const diff = progressStatusOrder[a.status] - progressStatusOrder[b.status]
          if (diff !== 0) return diff
          return new Date(b.lastTouchedAt).getTime() - new Date(a.lastTouchedAt).getTime()
        })
        const completedModules = records.filter((r) => r.status === 'completed').length
        const inProgressModules = records.filter((r) => r.status === 'in_progress').length
        const assignedModules = records.filter((r) => r.status === 'assigned').length
        const overdueModules = records.filter((r) => r.status === 'overdue').length
        const excusedModules = records.filter((r) => r.status === 'excused').length
        const activeModules = records.filter((r) => !['completed', 'excused'].includes(r.status)).length
        const averageProgress = records.length > 0
          ? Math.round(records.reduce((sum, r) => sum + r.resolvedProgress, 0) / records.length) : 0
        const scoreValues = records.map((r) => r.resolvedScore).filter((s): s is number => s !== null)
        const averageScore = scoreValues.length > 0
          ? Math.round(scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length) : null
        const highlightModule = records.find((r) => r.status === 'overdue')
          || records.find((r) => r.status === 'in_progress')
          || records.find((r) => r.status === 'assigned')
          || records[0] || null
        const attentionCount = overdueModules > 0
          ? overdueModules + Math.max(0, activeModules - 1)
          : (assignedModules > 1 ? assignedModules - 1 : 0) + (activeModules >= 4 ? 1 : 0)
        return { ...group, activeModules, assignedModules, attentionCount, averageProgress, averageScore, completedModules, excusedModules, highlightModule, inProgressModules, overdueModules, records, totalModules: records.length }
      })
      .sort((a, b) => {
        if (b.attentionCount !== a.attentionCount) return b.attentionCount - a.attentionCount
        if (b.activeModules !== a.activeModules) return b.activeModules - a.activeModules
        if ((b.lastTouchedAt || '') !== (a.lastTouchedAt || '')) {
          return new Date(b.lastTouchedAt || 0).getTime() - new Date(a.lastTouchedAt || 0).getTime()
        }
        return a.userName.localeCompare(b.userName)
      })
  }, [enrichedProgress])

  const employeeTrackingSummary = useMemo(() => {
    const employeeCount = employeeProgressGroups.length
    const averageModulesPerEmployee = employeeCount > 0 ? Number((progressMetrics.total / employeeCount).toFixed(1)) : 0
    const employeesNeedingFollowUp = employeeProgressGroups.filter((g) => g.attentionCount > 0 || g.overdueModules > 0).length
    const heavyLoadEmployees = employeeProgressGroups.filter((g) => g.totalModules >= 4).length
    const averageProgress = employeeCount > 0
      ? Math.round(employeeProgressGroups.reduce((sum, g) => sum + g.averageProgress, 0) / employeeCount) : 0
    const scoreValues = employeeProgressGroups.map((g) => g.averageScore).filter((s): s is number => s !== null)
    const averageScore = scoreValues.length > 0
      ? Math.round(scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length) : null
    const completionRate = progressMetrics.total > 0
      ? Math.round((progressMetrics.completed / progressMetrics.total) * 100) : 0
    return { averageModulesPerEmployee, averageProgress, averageScore, completionRate, employeeCount, employeesNeedingFollowUp, heavyLoadEmployees }
  }, [employeeProgressGroups, progressMetrics.completed, progressMetrics.total])

  const followUpQueue = useMemo(() => (
    employeeProgressGroups.filter((g) => g.attentionCount > 0 || g.overdueModules > 0).slice(0, 5)
  ), [employeeProgressGroups])

  const moduleLoadLeaders = useMemo(() => (
    [...employeeProgressGroups]
      .sort((a, b) => {
        if (b.totalModules !== a.totalModules) return b.totalModules - a.totalModules
        if (b.activeModules !== a.activeModules) return b.activeModules - a.activeModules
        return a.averageProgress - b.averageProgress
      })
      .slice(0, 5)
  ), [employeeProgressGroups])

  const describeFollowUp = useCallback((group: EmployeeProgressGroup) => {
    const reasons: string[] = []
    if (group.overdueModules > 0) reasons.push(`${group.overdueModules} ${t('overdue')}`)
    if (group.assignedModules > 0) reasons.push(`${group.assignedModules} ${t('assigned')}`)
    if (group.activeModules >= 4) reasons.push(t('heavyLoad', 'Heavy load'))
    return reasons.length > 0 ? reasons.join(' • ') : t('onTime')
  }, [t])

  return {
    describeFollowUp,
    employeeProgressGroups,
    employeeTrackingSummary,
    enrichedProgress,
    filteredProgress,
    followUpQueue,
    moduleLoadLeaders,
    progressMetrics,
  }
}
