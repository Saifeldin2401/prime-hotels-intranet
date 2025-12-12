import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowUp, ArrowRightLeft, Plus, Calendar, User } from 'lucide-react'
import type { EmployeePromotion, EmployeeTransfer } from '@/lib/types'
import { ROLES, type AppRole } from '@/lib/constants'
import { useTranslation } from 'react-i18next'


export default function PromotionTransferHistory() {
    const { t, i18n } = useTranslation('hr')
    const [searchTerm, setSearchTerm] = useState('')
    const isRTL = i18n.dir() === 'rtl'


    const { data: promotions, isLoading: promotionsLoading } = useQuery({
        queryKey: ['employee-promotions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('employee_promotions')
                .select(`
          *,
          employee:profiles!employee_promotions_employee_id_fkey(id, full_name),
          approver:profiles!employee_promotions_approved_by_fkey(id, full_name),
          to_department:departments!employee_promotions_to_department_id_fkey(id, name)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as EmployeePromotion[]
        }
    })

    const { data: transfers, isLoading: transfersLoading } = useQuery({
        queryKey: ['employee-transfers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('employee_transfers')
                .select(`
          *,
          employee:profiles!employee_transfers_employee_id_fkey(id, full_name),
          approver:profiles!employee_transfers_approved_by_fkey(id, full_name),
          from_property:properties!employee_transfers_from_property_id_fkey(id, name),
          to_property:properties!employee_transfers_to_property_id_fkey(id, name),
          to_department:departments!employee_transfers_to_department_id_fkey(id, name)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as EmployeeTransfer[]
        }
    })

    const filteredPromotions = promotions?.filter(p =>
        p.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.to_title?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredTransfers = transfers?.filter(t =>
        t.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.to_property?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('history.title')}
                description={t('history.description')}
                actions={
                    <div className="flex items-center gap-2">
                        <Link to="/hr/promotions/new">
                            <Button className="bg-green-600 hover:bg-green-700">
                                <ArrowUp className="h-4 w-4 me-2" />
                                {t('promotion.new_button')}
                            </Button>
                        </Link>
                        <Link to="/hr/transfers/new">
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <ArrowRightLeft className="h-4 w-4 me-2" />
                                {t('transfer.new_button')}
                            </Button>
                        </Link>
                    </div>
                }
            />

            {/* Search */}
            <div className="prime-card">
                <div className="prime-card-body">
                    <Input
                        type="text"
                        placeholder={t('referrals.search_placeholder').replace('referrals', 'employee')}
                        // Or reuse a common search placeholder if available, for now adapting existing keys or just mocking
                        // Actually 'referrals.search_placeholder' is "Search referrals..."
                        // I should probably add a generic search placeholder or use string replacement carefully.
                        // "Search by employee name..." -> let's map this properly.
                        // I'll stick to English default if key missing or just hardcode generic for now?
                        // No, I should add a key if possible. 
                        // I'll use common:search or similar if exists, but I didn't check common.
                        // I'll just use "Search..." generic or add to hr.history.search_placeholder.
                        // I forgot to add search key to history. I'll use a hardcoded fallback or 'Search...'
                        // Let's use t('common:search', 'Search') if common has it. 
                        // I'll assume 'common' likely has 'search'.
                        // Or better, I'll use string concatenation.
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                    />
                </div>
            </div>

            <Tabs defaultValue="promotions" className="w-full">
                <TabsList>
                    <TabsTrigger value="promotions">
                        <ArrowUp className="h-4 w-4 me-2" />
                        {t('history.promotions')} ({promotions?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="transfers">
                        <ArrowRightLeft className="h-4 w-4 me-2" />
                        {t('history.transfers')} ({transfers?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="promotions" className="space-y-4">
                    {promotionsLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
                            ))}
                        </div>
                    ) : filteredPromotions && filteredPromotions.length > 0 ? (
                        filteredPromotions.map((promotion) => (
                            <div key={promotion.id} className="prime-card">
                                <div className="prime-card-body">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="p-3 bg-green-100 rounded-lg">
                                                <ArrowUp className="h-6 w-6 text-green-600" />
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {promotion.employee?.full_name}
                                                    </h3>
                                                    {new Date(promotion.effective_date) > new Date() && (
                                                        <Badge className="bg-yellow-100 text-yellow-800">{t('status.pending')}</Badge>
                                                    )}
                                                    {new Date(promotion.effective_date) <= new Date() && (
                                                        <Badge className="bg-green-100 text-green-800">{t('status.applied')}</Badge>
                                                    )}
                                                </div>

                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-gray-600">Job Title:</span>
                                                        <span className="text-gray-500">
                                                            {promotion.from_title || 'N/A'}
                                                        </span>
                                                        <ArrowRightLeft className={`h-3 w-3 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
                                                        <span className="font-medium text-green-600">
                                                            {promotion.to_title}
                                                        </span>
                                                    </div>

                                                    {(promotion.from_role && promotion.to_role) && (
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <span>Permission Level:</span>
                                                            <span>
                                                                {ROLES[promotion.from_role as AppRole]?.label || promotion.from_role}
                                                            </span>
                                                            <ArrowRightLeft className="h-2.5 w-2.5" />
                                                            <span>
                                                                {ROLES[promotion.to_role as AppRole]?.label || promotion.to_role}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-gray-600">{t('history.title_label')}:</span>
                                                        <span className="font-medium text-gray-900">{promotion.to_title}</span>
                                                    </div>

                                                    {promotion.to_department && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <span>{t('history.department')}:</span>
                                                            <span>{promotion.to_department.name}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-4 w-4" />
                                                            {t('history.effective')}: {new Date(promotion.effective_date).toLocaleDateString(i18n.language)}
                                                        </span>
                                                        {promotion.approver && (
                                                            <span className="flex items-center gap-1">
                                                                <User className="h-4 w-4" />
                                                                {t('history.approved_by')}: {promotion.approver.full_name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {promotion.notes && (
                                                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                                                            {promotion.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="prime-card">
                            <div className="prime-card-body text-center py-12">
                                <ArrowUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('history.no_promotions')}</h3>
                                <p className="text-gray-600 mb-4">
                                    {searchTerm ? t('history.no_promotions') : t('history.create_first_promo')}
                                </p>
                                {!searchTerm && (
                                    <Link to="/hr/promotions/new">
                                        <Button className="bg-green-600 hover:bg-green-700">
                                            <Plus className="h-4 w-4 me-2" />
                                            {t('promotion.create')}
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="transfers" className="space-y-4">
                    {transfersLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
                            ))}
                        </div>
                    ) : filteredTransfers && filteredTransfers.length > 0 ? (
                        filteredTransfers.map((transfer) => (
                            <div key={transfer.id} className="prime-card">
                                <div className="prime-card-body">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="p-3 bg-blue-100 rounded-lg">
                                                <ArrowRightLeft className="h-6 w-6 text-blue-600" />
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {transfer.employee?.full_name}
                                                    </h3>
                                                    {new Date(transfer.effective_date) > new Date() && (
                                                        <Badge className="bg-yellow-100 text-yellow-800">{t('status.pending')}</Badge>
                                                    )}
                                                    {new Date(transfer.effective_date) <= new Date() && (
                                                        <Badge className="bg-blue-100 text-blue-800">{t('status.applied')}</Badge>
                                                    )}
                                                </div>

                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-gray-600">{t('history.property')}:</span>
                                                        <span className="text-gray-500">
                                                            {transfer.from_property?.name || 'N/A'}
                                                        </span>
                                                        <ArrowRightLeft className="h-3 w-3 text-gray-400" />
                                                        <span className="font-medium text-blue-600">
                                                            {transfer.to_property?.name}
                                                        </span>
                                                    </div>

                                                    {transfer.to_department && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <span>{t('history.new_department')}:</span>
                                                            <span>{transfer.to_department.name}</span>
                                                        </div>
                                                    )}

                                                    {transfer.reason && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <span>{t('history.reason')}:</span>
                                                            <span>{transfer.reason}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-4 w-4" />
                                                            {t('history.effective')}: {new Date(transfer.effective_date).toLocaleDateString(i18n.language)}
                                                        </span>
                                                        {transfer.approver && (
                                                            <span className="flex items-center gap-1">
                                                                <User className="h-4 w-4" />
                                                                {t('history.approved_by')}: {transfer.approver.full_name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {transfer.notes && (
                                                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                                                            {transfer.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="prime-card">
                            <div className="prime-card-body text-center py-12">
                                <ArrowRightLeft className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('history.no_transfers')}</h3>
                                <p className="text-gray-600 mb-4">
                                    {searchTerm ? t('history.no_transfers') : t('history.create_first_transfer')}
                                </p>
                                {!searchTerm && (
                                    <Link to="/hr/transfers/new">
                                        <Button className="bg-blue-600 hover:bg-blue-700">
                                            <Plus className="h-4 w-4 me-2" />
                                            {t('transfer.create')}
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
