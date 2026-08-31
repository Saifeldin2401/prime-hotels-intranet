import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AssignmentFormState } from './AssignmentCreateDialog'

interface DepartmentGroup {
  name: string
  items: Array<{ id: string; name: string }>
}

interface AssignmentTargetSelectorProps {
  formTargetType: AssignmentFormState['formTargetType']
  formTargetIds: string[]
  targetSearch: string
  propertyFilters: string[]
  departmentProperties: string[]
  departmentGroups: DepartmentGroup[]
  currentListItems: Array<{ id: string; name: string; details?: string }>
  isRTL: boolean
  onFormChange: (patch: Partial<AssignmentFormState>) => void
  togglePropertyFilter: (propertyName: string, enabled: boolean) => void
  toggleGroupSelection: (items: Array<{ id: string }>, shouldSelect: boolean) => void
}

export function AssignmentTargetSelector({
  formTargetType,
  formTargetIds,
  targetSearch,
  propertyFilters,
  departmentProperties,
  departmentGroups,
  currentListItems,
  isRTL,
  onFormChange,
  togglePropertyFilter,
  toggleGroupSelection,
}: AssignmentTargetSelectorProps) {
  const { t } = useTranslation('training')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label>
          {formTargetType === 'users' ? t('selectUsers') :
            formTargetType === 'departments' ? t('selectDepartments') :
              t('selectProperties')}
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onFormChange({ formTargetIds: currentListItems.map(item => item.id) })}
            disabled={currentListItems.length === 0}
          >
            {t('selectAll', 'Select all')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onFormChange({ formTargetIds: [] })}>
            {t('clear', 'Clear')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400", isRTL ? "right-3" : "left-3")} />
            <Input
              value={targetSearch}
              onChange={(e) => onFormChange({ targetSearch: e.target.value })}
              placeholder={
                formTargetType === 'users'
                  ? t('searchUsers', 'Search users...')
                  : formTargetType === 'departments'
                    ? t('searchDepartments', 'Search departments or properties...')
                    : t('searchProperties', 'Search properties...')
              }
              className={cn(isRTL ? "pr-9 text-right" : "pl-9", "bg-white")}
            />
          </div>

          {formTargetType === 'departments' && departmentProperties.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10">
                  {t('filterByProperty')}
                  {propertyFilters.length > 0 && (
                    <span className="ms-2 text-xs text-muted-foreground">({propertyFilters.length})</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>{t('filterByProperty')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={propertyFilters.length === 0} onCheckedChange={() => onFormChange({ propertyFilters: [] })}>
                  {t('allProperties')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {departmentProperties.map(propertyName => (
                  <DropdownMenuCheckboxItem
                    key={propertyName}
                    checked={propertyFilters.includes(propertyName)}
                    onCheckedChange={(checked) => togglePropertyFilter(propertyName, Boolean(checked))}
                  >
                    {propertyName}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto border rounded-md p-2 bg-gray-50">
        {formTargetType === 'departments' ? (
          departmentGroups.length > 0 ? (
            <div className="flex flex-col gap-3">
              {departmentGroups.map((group) => {
                const groupIds = group.items.map(item => item.id)
                const selectedCount = groupIds.filter(id => formTargetIds.includes(id)).length
                const allSelected = selectedCount === group.items.length && group.items.length > 0

                return (
                  <div key={group.name} className="rounded-md border bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">{group.name}</span>
                        <span className="text-xs text-gray-500">{selectedCount}/{group.items.length}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleGroupSelection(group.items, !allSelected)}
                      >
                        {allSelected ? t('clear', 'Clear') : t('selectAll', 'Select all')}
                      </Button>
                    </div>
                    <div className="flex flex-col gap-1 p-2">
                      {group.items.map((item) => (
                        <label key={item.id} className="flex items-center gap-2 rounded p-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formTargetIds.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onFormChange({ formTargetIds: [...formTargetIds, item.id] })
                              } else {
                                onFormChange({ formTargetIds: formTargetIds.filter(id => id !== item.id) })
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">{item.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center py-6 text-gray-500 text-sm">{t('noItemsFound')}</p>
          )
        ) : currentListItems.length > 0 ? (
          currentListItems.map((item) => (
            <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
              <input
                type="checkbox"
                checked={formTargetIds.includes(item.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onFormChange({ formTargetIds: [...formTargetIds, item.id] })
                  } else {
                    onFormChange({ formTargetIds: formTargetIds.filter(id => id !== item.id) })
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">{item.name}</span>
            </label>
          ))
        ) : (
          <p className="text-center py-4 text-gray-500 text-sm">{t('noItemsFound')}</p>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {formTargetIds.length} {t('selected')}
      </p>
    </div>
  )
}
