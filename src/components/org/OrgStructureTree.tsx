import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'

import { platformService } from '@/services/platformService'
import { ErrorState, Skeleton } from '@/ui'

interface OrgStructureTreeProps {
  orgId: string
  className?: string
}

/**
 * The organization's structure: the organization and its departments, with
 * how many people sit in each. Departments are organization-wide.
 */
export function OrgStructureTree({ orgId, className = '' }: OrgStructureTreeProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [searchTerm, setSearchTerm] = useState('')

  const { data: structure, isLoading, refetch, error } = useQuery({
    queryKey: ['org-structure-tree', orgId],
    queryFn: () => platformService.getOrgStructure(orgId),
    enabled: !!orgId,
  })

  const departments = useMemo(() => {
    const list = structure?.departments ?? []
    const q = searchTerm.trim().toLowerCase()
    return [...list]
      .filter((d) => !q || d.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [structure, searchTerm])

  const total = (structure?.departments ?? []).reduce((n, d) => n + (d.member_count || 0), 0)

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`} aria-busy="true">
        <Skeleton variant="card" className="h-14" />
        <Skeleton variant="card" className="h-48" />
      </div>
    )
  }

  if (error || !structure) {
    return <ErrorState title={t('admin:structure.loadFailed', 'The structure could not be loaded')} onRetry={() => refetch()} />
  }

  return (
    <section aria-labelledby="org-structure" className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="org-structure" className="text-lg font-semibold text-ds-ink">{structure.organization.name}</h2>
          <p className="text-sm text-ds-muted">
            {t('admin:structure.summary', '{{departments}} departments · {{people}} people placed', {
              departments: structure.departments?.length ?? 0,
              people: total,
            })}
          </p>
        </div>
        {(structure.departments?.length ?? 0) > 6 && (
          <div className="relative sm:w-64">
            <label htmlFor="structure-search" className="sr-only">{t('admin:search_departments', 'Search departments')}</label>
            <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-muted" />
            <input
              id="structure-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('admin:search_departments', 'Search departments')}
              className="min-h-[40px] w-full rounded-md border border-ds-border bg-ds-surface ps-9 pe-3 text-sm text-ds-ink placeholder:text-ds-muted focus:border-ds-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
            />
          </div>
        )}
      </div>

      {departments.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-ds-border px-6 py-10 text-center">
          <p className="text-base font-semibold text-ds-ink">
            {searchTerm ? t('admin:structure.noMatch', 'No departments match') : t('admin:structure.none', 'No departments yet')}
          </p>
          {!searchTerm && (
            <p className="mt-1 text-sm text-ds-muted">
              {t('admin:structure.noneBody', 'Add departments on the Departments tab, then place people in them.')}
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
          {departments.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="truncate text-sm font-medium text-ds-ink">{d.name}</span>
              <span className="shrink-0 text-sm text-ds-muted">
                {t('admin:structure.people', '{{count}} people', { count: d.member_count || 0 })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
