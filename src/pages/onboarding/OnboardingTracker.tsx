import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OnboardingProcess } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

export default function OnboardingTracker() {
    const [searchTerm, setSearchTerm] = useState('')

    const { data: processes, isLoading } = useQuery({
        queryKey: ['onboarding', 'all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('onboarding_process')
                .select(`
          *,
          user:profiles(*),
          template:onboarding_templates(title)
        `)
                .order('start_date', { ascending: false })

            if (error) throw error
            return data as OnboardingProcess[]
        }
    })

    // Filter processes based on search
    const filteredProcesses = processes?.filter(p =>
        p.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.template?.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Onboarding Tracker</h2>
                    <p className="text-muted-foreground">Monitor progress of new hires across the organization.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Active Onboarding Processes</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search employee..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Started</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[300px]">Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProcesses?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No active onboarding processes found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProcesses?.map((process) => (
                                    <TableRow key={process.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={process.user?.avatar_url || ''} />
                                                    <AvatarFallback>{process.user?.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span>{process.user?.full_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{process.template?.title}</TableCell>
                                        <TableCell>{format(new Date(process.start_date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>
                                            <Badge variant={process.status === 'completed' ? 'secondary' : 'default'}>
                                                {process.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={process.progress_percent} className="h-2" />
                                                <span className="text-sm text-muted-foreground w-12 text-right">
                                                    {process.progress_percent}%
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
