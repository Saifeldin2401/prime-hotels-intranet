import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDepartments } from '@/hooks/useDepartments'
import { useProfiles } from '@/hooks/useUsers'
import { useProperty } from '@/contexts/PropertyContext'
import { EnhancedCard } from '@/components/ui/enhanced-card'

export function DepartmentControlCenter({ propertyId }: { propertyId?: string }) {
  const { t } = useTranslation('dashboard')
  const { currentProperty } = useProperty()
  const activePropertyId = propertyId || currentProperty?.id
  const { departments, createDepartment, updateDepartment, deleteDepartment, isLoading } = useDepartments(activePropertyId)
  const { data: profiles = [] } = useProfiles({ property_id: activePropertyId || undefined, limit: 200 })

  const [name, setName] = useState('')
  const [managerId, setManagerId] = useState<string | undefined>()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingManagerId, setEditingManagerId] = useState<string | undefined>()

  const managers = useMemo(() => profiles.filter(p => p.roles?.some((r: string) => r.includes('manager') || r.includes('hr') || r.includes('admin'))), [profiles])

  const resetForm = () => {
    setName('')
    setManagerId(undefined)
  }

  const handleCreate = async () => {
    if (!name.trim() || !activePropertyId || activePropertyId === 'all') return
    await createDepartment.mutateAsync({
      name: name.trim(),
      property_id: activePropertyId,
      manager_id: managerId
    })
    resetForm()
  }

  const startEdit = (dept: { id: string; name: string; manager_id?: string | null }) => {
    setEditingId(dept.id)
    setEditingName(dept.name)
    setEditingManagerId(dept.manager_id || undefined)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setEditingManagerId(undefined)
  }

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return
    await updateDepartment.mutateAsync({
      id: editingId,
      name: editingName.trim(),
      manager_id: editingManagerId
    })
    cancelEdit()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('department_control.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder={t('department_control.department_name_placeholder')} value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={managerId} onValueChange={setManagerId}>
              <SelectTrigger>
                <SelectValue placeholder={t('department_control.assign_manager_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {managers.length === 0 && (
                  <SelectItem value="none" disabled>{t('department_control.no_managers')}</SelectItem>
                )}
                {managers.map((profile: any) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} disabled={!name.trim() || !activePropertyId || activePropertyId === 'all'}>
              {t('department_control.create_department')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading && (
          <div className="text-sm text-muted-foreground">{t('department_control.loading')}</div>
        )}
        {departments.map((dept) => (
          <EnhancedCard key={dept.id} padding="lg">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                {editingId === dept.id ? (
                  <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                ) : (
                  <p className="text-base font-semibold">{dept.name}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{t('department_control.department_badge')}</Badge>
                  {dept.manager_id && <Badge variant="outline">{t('department_control.manager_assigned_badge')}</Badge>}
                </div>
              </div>
              <div className="space-y-2">
                {editingId === dept.id ? (
                  <>
                    <Select value={editingManagerId} onValueChange={setEditingManagerId}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t('department_control.manager_placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.length === 0 && (
                          <SelectItem value="none" disabled>{t('department_control.no_managers')}</SelectItem>
                        )}
                        {managers.map((profile: any) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name || profile.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>{t('department_control.save')}</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>{t('department_control.cancel')}</Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(dept)}>{t('department_control.edit')}</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteDepartment.mutate(dept.id)}>{t('department_control.remove')}</Button>
                  </div>
                )}
              </div>
            </div>
          </EnhancedCard>
        ))}
      </div>
    </div>
  )
}
