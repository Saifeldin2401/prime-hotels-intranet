import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useMyExpenseClaims, useSubmitExpenseClaim } from '@/hooks/useExpenseClaims'
import { openUrlInNewTab, resolveExpenseReceiptUrl } from '@/lib/secureFileAccess'
import type { ExpenseClaim } from '@/lib/types'
import { format } from 'date-fns'
import { Eye, FileText, Loader2, Plus, Receipt } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const EXPENSE_CATEGORIES: Array<{ value: ExpenseClaim['category']; label: string }> = [
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'transport', label: 'Transport' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'training', label: 'Training' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
]

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  returned_for_correction: 'bg-orange-100 text-orange-800',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-700',
}

export default function MyExpenseClaims() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<ExpenseClaim['category']>('travel')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('SAR')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [vendorName, setVendorName] = useState('')
  const [description, setDescription] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)

  const { data: claims = [], isLoading } = useMyExpenseClaims()
  const submitMutation = useSubmitExpenseClaim()

  const resetForm = () => {
    setCategory('travel')
    setAmount('')
    setCurrency('SAR')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setVendorName('')
    setDescription('')
    setReceipt(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return

    await submitMutation.mutateAsync({
      category,
      amount: parsedAmount,
      currency,
      expense_date: expenseDate,
      vendor_name: vendorName || undefined,
      description: description || undefined,
      receipt,
    })

    setOpen(false)
    resetForm()
  }

  const openReceipt = async (claim: ExpenseClaim) => {
    const secureUrl = await resolveExpenseReceiptUrl(claim.id)
    openUrlInNewTab(secureUrl)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Expense Claims"
        description="Submit reimbursement claims and track approval status."
        actions={(
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Claim
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Submit Expense Claim</DialogTitle>
                <DialogDescription>
                  Claims are routed through supervisor and HR approvals.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t('common:category')}</Label>
                    <Select value={category} onValueChange={(value) => setCategory(value as ExpenseClaim['category'])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Expense Date</Label>
                    <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={8} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Vendor (Optional)</Label>
                  <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>{t('common:description')}</Label>
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add context for approvers"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Receipt (Optional)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.txt"
                    onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitMutation.isPending || !amount}>
                    {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Claim
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle>Claim History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : claims.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-50" />
              No expense claims yet.
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {claim.currency} {Number(claim.amount).toFixed(2)}
                      </span>
                      <Badge className={STATUS_CLASSES[claim.status] || STATUS_CLASSES.pending}>
                        {claim.status.replace(/_/g, ' ')}
                      </Badge>
                      {claim.workflow?.request_no && (
                        <Badge variant="outline" className="font-mono">
                          #{claim.workflow.request_no}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">
                      {claim.category} • {format(new Date(claim.expense_date), 'MMM d, yyyy')}
                    </p>
                    {claim.description && (
                      <p className="text-sm mt-1 line-clamp-2">{claim.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {claim.workflow_request_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/hr/request/${claim.workflow_request_id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Workflow
                      </Button>
                    )}
                    {claim.receipt_path && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReceipt(claim)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Receipt
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
