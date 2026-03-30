import { useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuestReview {
  id: string
  reviewer_name?: string
  review_title?: string
  review_text?: string
  summary_en?: string
  rating_normalized_10?: number
  rating_normalized_5?: number
  sentiment?: string
  severity?: string
  platform?: string
  status?: string
  critical_flag?: boolean
  vip_flag?: boolean
  property_id?: string
}

interface ReviewPreviewTooltipProps {
  review: GuestReview
  propertyName?: string
  children: React.ReactNode
  delay?: number
}

export function ReviewPreviewTooltip({ 
  review, 
  propertyName,
  children,
  delay = 500 
}: ReviewPreviewTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  let timeout: NodeJS.Timeout

  const handleMouseEnter = () => {
    timeout = setTimeout(() => setIsOpen(true), delay)
  }

  const handleMouseLeave = () => {
    clearTimeout(timeout)
    setIsOpen(false)
  }

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'negative':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return <Minus className="h-3 w-3 text-gray-500" />
    }
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'negative':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getSeverityEmoji = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '🔴'
      case 'high': return '🟠'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  const rating = review.rating_normalized_10 || review.rating_normalized_5 || 0

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <div 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          align="start"
          className="w-[350px] p-0 overflow-hidden"
          sideOffset={10}
        >
          <div className="bg-white dark:bg-slate-950 rounded-lg shadow-lg">
            {/* Header */}
            <div className="p-3 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {review.reviewer_name || 'Anonymous'}
                  </span>
                  {review.vip_flag && (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px] border-0">
                      VIP
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-bold">{rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{propertyName || review.property_id}</span>
                <span>•</span>
                <span>{review.platform}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-3">
              {review.review_title && (
                <h4 className="font-semibold text-sm mb-2 line-clamp-1">
                  {review.review_title}
                </h4>
              )}
              <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">
                {review.summary_en || review.review_text?.substring(0, 200)}...
              </p>
            </div>

            {/* Footer */}
            <div className="p-3 pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] h-5", getSentimentColor(review.sentiment))}
                >
                  {getSentimentIcon(review.sentiment)}
                  <span className="ml-1">{review.sentiment || 'Neutral'}</span>
                </Badge>
                
                {review.severity && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    {getSeverityEmoji(review.severity)} {review.severity}
                  </Badge>
                )}
                
                {review.critical_flag && (
                  <Badge className="bg-red-100 text-red-700 text-[10px] h-5 border-0">
                    Critical
                  </Badge>
                )}

                <Badge 
                  variant={review.status === 'responded' ? 'default' : 'secondary'}
                  className="text-[10px] h-5 ml-auto"
                >
                  {review.status === 'responded' ? '✓ Responded' : review.status}
                </Badge>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
