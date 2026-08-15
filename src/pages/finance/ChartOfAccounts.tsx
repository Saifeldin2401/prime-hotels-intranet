import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import {
    useChartOfAccounts,
    useCreateChartOfAccount,
    useDeleteChartOfAccount,
    type ChartOfAccount,
} from '@/hooks/useChartOfAccounts'
import { AlertCircle, BookOpen, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const typeColors: Record<string, string> = {
    asset: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    liability: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    equity: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    revenue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    expense: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
}

export default function ChartOfAccounts() {
    const { t } = useTranslation(['finance', 'common'])
    const { toast } = useToast()
    const { data: accounts, isLoading } = useChartOfAccounts()
    const createMutation = useCreateChartOfAccount()
    const deleteMutation = useDeleteChartOfAccount()

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedType, setSelectedType] = useState<string>('all')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [accountToDelete, setAccountToDelete] = useState<ChartOfAccount | null>(null)

    const [formData, setFormData] = useState<{
        account_code: string
        account_name: string
        account_name_ar: string
        account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
        category: string
    }>({
        account_code: '',
        account_name: '',
        account_name_ar: '',
        account_type: 'expense',
        category: 'Operations',
    })

    const filteredAccounts = useMemo(() => {
        if (!accounts) return []
        return accounts.filter((acc) => {
            const matchesSearch =
                acc.account_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (acc.account_name_ar && acc.account_name_ar.includes(searchQuery)) ||
                acc.category.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesType = selectedType === 'all' || acc.account_type === selectedType
            return matchesSearch && matchesType
        })
    }, [accounts, searchQuery, selectedType])

    const resetForm = () => {
        setFormData({
            account_code: '',
            account_name: '',
            account_name_ar: '',
            account_type: 'expense',
            category: 'Operations',
        })
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.account_code || !formData.account_name || !formData.category) return

        try {
            await createMutation.mutateAsync({
                account_code: formData.account_code.trim().toUpperCase(),
                account_name: formData.account_name.trim(),
                account_name_ar: formData.account_name_ar.trim() || undefined,
                account_type: formData.account_type,
                category: formData.category.trim(),
            })

            toast({
                title: t('common:common.success', { defaultValue: 'Success' }),
                description: 'GL Account successfully created',
            })
            setIsCreateOpen(false)
            resetForm()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create GL account'
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: message,
                variant: 'destructive',
            })
        }
    }

    const handleDelete = async () => {
        if (!accountToDelete) return

        try {
            await deleteMutation.mutateAsync(accountToDelete.id)
            toast({
                title: t('common:common.deleted', { defaultValue: 'Deleted' }),
                description: `GL account ${accountToDelete.account_code} has been deactivated.`,
            })
            setAccountToDelete(null)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete account'
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: message,
                variant: 'destructive',
            })
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('finance:chart_of_accounts.title', { defaultValue: 'Chart of Accounts (GL Codes)' })}
                description={t('finance:chart_of_accounts.description', {
                    defaultValue: 'Database-backed General Ledger account catalog for financial classification, AP invoices, and reporting.'
                })}
                actions={
                    <Button onClick={() => { resetForm(); setIsCreateOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white shadow-sm">
                        <Plus className="w-4 h-4 me-2" />
                        Add GL Account
                    </Button>
                }
            />

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-80">
                    <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('common:search_placeholder', { defaultValue: 'Search GL code, name, category...' })}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ps-9"
                    />
                </div>

                <div className="w-full md:w-48">
                    <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="asset">Assets</SelectItem>
                            <SelectItem value="liability">Liabilities</SelectItem>
                            <SelectItem value="equity">Equity</SelectItem>
                            <SelectItem value="revenue">Revenue</SelectItem>
                            <SelectItem value="expense">Expenses</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="py-12 text-center text-muted-foreground">Loading Chart of Accounts...</div>
                    ) : filteredAccounts.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                    <TableHead className="w-32 font-bold">GL Code</TableHead>
                                    <TableHead className="font-bold">Account Name (EN)</TableHead>
                                    <TableHead className="font-bold">Account Name (AR)</TableHead>
                                    <TableHead className="font-bold">Type</TableHead>
                                    <TableHead className="font-bold">Category</TableHead>
                                    <TableHead className="w-24 text-center font-bold">Status</TableHead>
                                    <TableHead className="w-20 text-right font-bold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAccounts.map((acc: ChartOfAccount) => (
                                    <TableRow key={acc.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <TableCell className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                            {acc.account_code}
                                        </TableCell>
                                        <TableCell className="font-medium">{acc.account_name}</TableCell>
                                        <TableCell className="font-medium text-slate-600 dark:text-slate-400 dir-rtl">
                                            {acc.account_name_ar || '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={typeColors[acc.account_type] || 'bg-slate-100'}>
                                                {acc.account_type.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-400">{acc.category}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={acc.is_active ? 'default' : 'secondary'}>
                                                {acc.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                onClick={() => setAccountToDelete(acc)}
                                                title="Delete Account"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <BookOpen className="h-8 w-8 text-slate-400" />
                            <p>No GL accounts found matching criteria.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Account Modal */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsCreateOpen(open) }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Add New GL Account</DialogTitle>
                        <DialogDescription>
                            Create a General Ledger code for invoice allocation and accounting reporting.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="account_code">GL Code *</Label>
                                <Input
                                    id="account_code"
                                    placeholder="GL-5500"
                                    value={formData.account_code}
                                    onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="account_type">Account Type *</Label>
                                <Select
                                    value={formData.account_type}
                                    onValueChange={(v: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense') =>
                                        setFormData({ ...formData, account_type: v })
                                    }
                                >
                                    <SelectTrigger id="account_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="expense">Expense</SelectItem>
                                        <SelectItem value="revenue">Revenue</SelectItem>
                                        <SelectItem value="asset">Asset</SelectItem>
                                        <SelectItem value="liability">Liability</SelectItem>
                                        <SelectItem value="equity">Equity</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="account_name">Account Name (English) *</Label>
                            <Input
                                id="account_name"
                                placeholder="Software & Cloud Subscriptions"
                                value={formData.account_name}
                                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="account_name_ar">Account Name (Arabic)</Label>
                            <Input
                                id="account_name_ar"
                                placeholder="اشتراكات البرامج والسحابة"
                                value={formData.account_name_ar}
                                onChange={(e) => setFormData({ ...formData, account_name_ar: e.target.value })}
                                dir="rtl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Input
                                id="category"
                                placeholder="IT & Technology"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-hotel-gold hover:bg-hotel-gold-dark text-white"
                                disabled={createMutation.isPending || !formData.account_code || !formData.account_name}
                            >
                                {createMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Plus className="h-4 w-4 me-2" />}
                                Create Account
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <AlertCircle className="h-5 w-5" />
                            Deactivate GL Account
                        </DialogTitle>
                        <DialogDescription className="py-2">
                            Are you sure you want to deactivate <strong>{accountToDelete?.account_code} - {accountToDelete?.account_name}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-2">
                        <Button variant="outline" onClick={() => setAccountToDelete(null)} disabled={deleteMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="bg-rose-600 hover:bg-rose-700"
                        >
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Trash2 className="h-4 w-4 me-2" />}
                            Deactivate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
