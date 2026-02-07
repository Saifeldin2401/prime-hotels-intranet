import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Icons } from '@/components/icons'
import { useNavigate } from 'react-router-dom'
import { useProfiles } from '@/hooks/useUsers'
import { useTranslation } from 'react-i18next'

interface DepartmentTeamListProps {
    departmentIds?: string[]
}

export function DepartmentTeamList({ departmentIds }: DepartmentTeamListProps) {
    const { t } = useTranslation('dashboard')
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')

    const { data: staffMembers = [], isLoading } = useProfiles({
        department_ids: departmentIds,
        search: searchTerm
    })

    return (
        <div className="space-y-4 font-sans">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Icons.Search className="absolute start-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder={t('widgets.team_list.search_team_members', 'Search team members...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="ps-9 h-9 font-sans"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                    {t('widgets.team_list.loading_team', 'Loading team...')}
                </div>
            ) : staffMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Icons.Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>{t('widgets.team_list.no_team_found', 'No team members found in your department(s).')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {staffMembers
                        .map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={member.avatar_url || ''} />
                                        <AvatarFallback>{member.full_name?.charAt(0) || '?'}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-start">
                                        <p className="font-medium text-gray-900 text-sm">{member.full_name}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{member.job_title || t('widgets.team_list.no_job_title', 'No Job Title')}</span>
                                            {member.departments && member.departments.length > 0 && (
                                                <>
                                                    <span className="mx-1">•</span>
                                                    <span>{member.departments.map(d => d.name).join(', ')}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-xs font-sans">
                                        {member.status ? t(`common:status.${member.status}`, { defaultValue: member.status }) : t('widgets.team_list.unknown', 'Unknown')}
                                    </Badge>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs font-sans" onClick={() => navigate(`/profile/${member.id}`)}>
                                        {t('widgets.team_list.view', 'View')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    )
}
