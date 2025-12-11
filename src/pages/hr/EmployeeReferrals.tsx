import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  UserPlus, 
  DollarSign, 
  CheckCircle, 
  Clock,
  Plus
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { EmployeeReferral } from '@/lib/types'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  interviewing: 'bg-blue-100 text-blue-800',
  hired: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

const bonusStatusColors = {
  pending: 'bg-gray-100 text-gray-800',
  approved: 'bg-green-100 text-green-800',
  paid: 'bg-blue-100 text-blue-800'
}

export default function EmployeeReferrals() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['employee-referrals', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('employee_referrals')
        .select(`
          *,
          referrer:profiles(full_name),
          candidate:profiles(full_name),
          position:positions(title, department),
          property:properties(name)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as EmployeeReferral[]
    }
  })

  const { data: stats } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_referrals')
        .select('status, bonus_amount, bonus_status')
      
      if (error) throw error
      
      const referralData = data || []
      return {
        total: referralData.length,
        pending: referralData.filter(r => r.status === 'pending').length,
        interviewing: referralData.filter(r => r.status === 'interviewing').length,
        hired: referralData.filter(r => r.status === 'hired').length,
        totalBonusPaid: referralData
          .filter(r => r.bonus_status === 'paid')
          .reduce((sum, r) => sum + (r.bonus_amount || 0), 0),
        pendingBonuses: referralData
          .filter(r => r.bonus_status === 'approved')
          .reduce((sum, r) => sum + (r.bonus_amount || 0), 0)
      }
    }
  })

  const updateReferralMutation = useMutation({
    mutationFn: async ({ referralId, status }: { referralId: string, status: string }) => {
      const { error } = await supabase
        .from('employee_referrals')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', referralId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-referrals'] })
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] })
    }
  })

  const filteredReferrals = referrals?.filter(referral =>
    referral.candidate?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.position?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.referrer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleStatusUpdate = (referralId: string, newStatus: string) => {
    updateReferralMutation.mutate({ referralId, status: newStatus })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Referrals"
        description="Manage employee referral program and track referral bonuses"
        actions={null}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hired</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.hired || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bonuses Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${stats?.totalBonusPaid?.toFixed(0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bonuses</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${stats?.pendingBonuses?.toFixed(0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search referrals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="interviewing">Interviewing</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Referrals List */}
      <Card>
        <CardHeader>
          <CardTitle>Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReferrals?.map((referral) => (
              <div key={referral.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{referral.candidate?.full_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Referred by {referral.referrer?.full_name} for {referral.position?.title}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{referral.property?.name}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(referral.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[referral.status as keyof typeof statusColors]}>
                      {referral.status}
                    </Badge>
                    {referral.bonus_amount && (
                      <Badge className={bonusStatusColors[referral.bonus_status as keyof typeof bonusStatusColors]}>
                        ${referral.bonus_amount} - {referral.bonus_status}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {referral.notes && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    <strong>Notes:</strong> {referral.notes}
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  {referral.status === 'pending' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusUpdate(referral.id, 'interviewing')}
                    >
                      Start Interview
                    </Button>
                  )}
                  {referral.status === 'interviewing' && (
                    <>
                      <Button 
                        size="sm"
                        onClick={() => handleStatusUpdate(referral.id, 'hired')}
                      >
                        Mark Hired
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStatusUpdate(referral.id, 'rejected')}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {filteredReferrals?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No referrals found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
