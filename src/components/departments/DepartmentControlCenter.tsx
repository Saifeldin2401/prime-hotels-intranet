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
          <CardTitle className="text-base">Department Control Center</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Department name" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={managerId} onValueChange={setManagerId}>
              <SelectTrigger>
                <SelectValue placeholder="Assign manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.length === 0 && (
                  <SelectItem value="none" disabled>No managers available</SelectItem>
                )}
                {managers.map((profile: any) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} disabled={!name.trim() || !activePropertyId || activePropertyId === 'all'}>
              Create Department
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading && (
          <div className="text-sm text-muted-foreground">Loading departments...</div>
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
                  <Badge variant="secondary">Department</Badge>
                  {dept.manager_id && <Badge variant="outline">Manager Assigned</Badge>}
                </div>
              </div>
              <div className="space-y-2">
                {editingId === dept.id ? (
                  <>
                    <Select value={editingManagerId} onValueChange={setEditingManagerId}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.length === 0 && (
                          <SelectItem value="none" disabled>No managers available</SelectItem>
                        )}
                        {managers.map((profile: any) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name || profile.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>Save</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(dept)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteDepartment.mutate(dept.id)}>Remove</Button>
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
