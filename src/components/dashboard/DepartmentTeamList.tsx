import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Icons } from '@/components/icons'
import { useNavigate } from 'react-router-dom'
import { useProfiles } from '@/hooks/useUsers'

interface DepartmentTeamListProps {
    departmentIds?: string[]
}

export function DepartmentTeamList({ departmentIds }: DepartmentTeamListProps) {
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')

    const { data: staffMembers = [], isLoading } = useProfiles({
        department_ids: departmentIds,
        search: searchTerm
    })

    // Filter out users who shouldn't be here if needed, 
    // but the hook handles the heavy lifting.

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Icons.Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search team members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading team...</div>
            ) : staffMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Icons.Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No team members found in your department(s).</p>
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
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">{member.full_name}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{member.job_title || 'No Job Title'}</span>
                                            {member.departments && member.departments.length > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{member.departments.map(d => d.name).join(', ')}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                        {member.status || 'Unknown'}
                                    </Badge>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(`/profile/${member.id}`)}>
                                        View
                                    </Button>
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    )
}
