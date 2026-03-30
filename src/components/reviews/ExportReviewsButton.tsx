import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'

interface GuestReview {
  id: string
  reviewer_name?: string
  review_title?: string
  review_text?: string
  rating?: number
  rating_normalized_5?: number
  rating_normalized_10?: number
  platform?: string
  property_id?: string
  sentiment?: string
  severity?: string
  status?: string
  collected_at?: string
  summary_en?: string
  summary_ar?: string
  manager_brief_en?: string
  vip_flag?: boolean
  critical_flag?: boolean
}

interface ExportReviewsButtonProps {
  reviews: GuestReview[]
  propertyNameById?: Map<string, string>
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  label?: string
}

export function ExportReviewsButton({ 
  reviews, 
  propertyNameById,
  variant = 'outline',
  size = 'sm',
  className,
  label = 'Export'
}: ExportReviewsButtonProps) {
  const { toast } = useToast()

  const exportToCSV = () => {
    if (reviews.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no reviews matching your current filters.',
        variant: 'destructive',
      })
      return
    }

    const headers = [
      'ID',
      'Property',
      'Platform',
      'Reviewer Name',
      'Review Title',
      'Review Text',
      'Rating (Raw)',
      'Rating (5-scale)',
      'Rating (10-scale)',
      'Sentiment',
      'Severity',
      'Status',
      'VIP',
      'Critical',
      'Collected Date',
      'Summary (EN)',
      'Summary (AR)',
      'Manager Brief',
    ]

    const rows = reviews.map((review) => [
      review.id,
      propertyNameById?.get(review.property_id || '') || review.property_id || 'Unknown',
      review.platform || '',
      review.reviewer_name || 'Anonymous',
      review.review_title || '',
      review.review_text || '',
      review.rating || '',
      review.rating_normalized_5 || '',
      review.rating_normalized_10 || '',
      review.sentiment || '',
      review.severity || '',
      review.status || '',
      review.vip_flag ? 'Yes' : 'No',
      review.critical_flag ? 'Yes' : 'No',
      review.collected_at || '',
      review.summary_en || '',
      review.summary_ar || '',
      review.manager_brief_en || '',
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => 
        row.map((cell) => {
          // Escape cells that contain commas, quotes, or newlines
          const cellStr = String(cell || '').replace(/"/g, '""')
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
            return `"${cellStr}"`
          }
          return cellStr
        }).join(',')
      ),
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `guest-reviews-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: 'Export successful',
      description: `${reviews.length} reviews exported to CSV.`,
    })
  }

  const exportToJSON = () => {
    if (reviews.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no reviews matching your current filters.',
        variant: 'destructive',
      })
      return
    }

    // Enrich with property names
    const enrichedData = reviews.map((review) => ({
      ...review,
      property_name: propertyNameById?.get(review.property_id || '') || review.property_id,
    }))

    const jsonContent = JSON.stringify(enrichedData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `guest-reviews-${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: 'Export successful',
      description: `${reviews.length} reviews exported to JSON.`,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Download className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Helper function to export reviews programmatically
export function exportReviews(
  reviews: GuestReview[],
  format: 'csv' | 'json',
  propertyNameById?: Map<string, string>
): string {
  if (format === 'csv') {
    const headers = [
      'ID',
      'Property',
      'Platform',
      'Reviewer',
      'Rating',
      'Sentiment',
      'Status',
      'Date',
    ]

    const rows = reviews.map((r) => [
      r.id,
      propertyNameById?.get(r.property_id || '') || r.property_id,
      r.platform,
      r.reviewer_name || 'Anonymous',
      r.rating || '',
      r.sentiment || '',
      r.status || '',
      r.collected_at || '',
    ])

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  }

  return JSON.stringify(reviews, null, 2)
}
