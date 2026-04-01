import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { GuestReview } from "@/lib/types"
import { Star, TrendingDown, TrendingUp, User, MessageCircle, AlertCircle, Check, Square, Calendar } from "lucide-react"

interface ReviewListItemProps {
  review: GuestReview
  propertyName: string
  propertyColor?: string
  ownerName?: string | null
  onClick: (id: string) => void
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  viewMode?: "grid" | "list"
}

// Platform icons as SVG components
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function BookingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#003580">
      <path d="M0 6.667C0 5.959.535 5.5 1.176 5.5h21.648c.641 0 1.176.459 1.176 1.167v10.666c0 .708-.535 1.167-1.176 1.167H1.176C.535 18.5 0 18.041 0 17.333V6.667zm7.612 7.72h1.764v-4.31h-.035l-1.41 4.31h-.319zm6.315 0h1.764V9.077h-1.764v5.31zm-3.183 0h1.764v-2.655h.035l1.128 2.655h1.728l-1.41-3.235 1.269-2.075h-1.763l-1.128 2.042h-.035V9.077h-1.764v5.31h.176zm-5.449 0h4.06v-1.372H8.295v-3.938H6.531v5.31h.764zm11.865 0h1.764V9.077h-1.764v5.31z"/>
    </svg>
  )
}

function AgodaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#F05A28">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.36c-.32.4-.8.64-1.36.64-.56 0-1.04-.24-1.36-.64-.32-.4-.48-.96-.48-1.6 0-.64.16-1.2.48-1.6.32-.4.8-.64 1.36-.64.56 0 1.04.24 1.36.64.32.4.48.96.48 1.6 0 .64-.16 1.2-.48 1.6z"/>
    </svg>
  )
}

function getPlatformIcon(platform: string, className?: string) {
  switch (platform?.toLowerCase()) {
    case "google": return <GoogleIcon className={className} />
    case "booking": return <BookingIcon className={className} />
    case "agoda": return <AgodaIcon className={className} />
    default: return <MessageCircle className={className} />
  }
}

function getPlatformColor(platform: string): string {
  switch (platform?.toLowerCase()) {
    case "google": return "#4285F4"
    case "booking": return "#003580"
    case "agoda": return "#F05A28"
    case "tripadvisor": return "#00AF87"
    case "expedia": return "#FEB700"
    default: return "#6366f1"
  }
}

function getPropertyColor(propertyName: string): string {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]
  let hash = 0
  for (let i = 0; i < propertyName.length; i++) {
    hash = propertyName.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getSeverityEmoji(severity: string | null): string {
  switch (severity?.toLowerCase()) {
    case "critical": return "🔴"
    case "high": return "🟠"
    case "medium": return "🟡"
    case "low": return "🟢"
    default: return "⚪"
  }
}

function formatReviewDate(dateString: string | null, createdAt?: string | null): { label: string; fullDate: string; isNew: boolean } {
  if (!dateString) return { label: "Unknown", fullDate: "", isNew: false }
  
  const date = new Date(dateString)
  const now = new Date()
  
  // Check if this is a brand NEW review (created today, not just refreshed)
  const createdDate = createdAt ? new Date(createdAt) : date
  const isBrandNew = createdDate.getFullYear() === now.getFullYear() && 
                     createdDate.getMonth() === now.getMonth() && 
                     createdDate.getDate() === now.getDate()
  
  // For brand new reviews, show "NEW" badge
  if (isBrandNew) {
    return { label: "NEW", fullDate: date.toLocaleString(), isNew: true }
  }
  
  // For older reviews, show the actual date
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.getFullYear() === yesterday.getFullYear() && 
                      date.getMonth() === yesterday.getMonth() && 
                      date.getDate() === yesterday.getDate()
  
  if (isYesterday) return { label: "Yesterday", fullDate: date.toLocaleString(), isNew: false }
  
  return {
    label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    fullDate: date.toLocaleString(),
    isNew: false
  }
}

function getDisplayTitle(review: GuestReview) {
  if (review.review_title?.trim()) return review.review_title.trim()
  const reviewer = review.reviewer_name?.trim()
  if (reviewer) {
    const firstName = reviewer.split(" ")[0]
    return `${firstName} Feedback`
  }
  const platformLabel = review.platform ? review.platform.toUpperCase() : "Guest"
  return `${platformLabel} Feedback`
}

export function ReviewListItem({ 
  review, 
  propertyName, 
  ownerName, 
  onClick,
  isSelected,
  onToggleSelect,
  viewMode = "grid"
}: ReviewListItemProps) {
  const isAssignedState = ["assigned", "acknowledged", "response_pending", "escalated"].includes(String(review.status))
  const displayOwnerName = ownerName || (isAssignedState ? "Unassigned" : (review.reviewer_name?.split(" ")[0] || "Guest"))
  const displayOwnerType = isAssignedState ? "Owner" : "Guest"
  const platformColor = getPlatformColor(review.platform)
  const propertyColor = getPropertyColor(propertyName)
  const dateInfo = formatReviewDate(review.published_at || review.created_at)

  const getSeverityColor = (severity: string | null) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "bg-red-500/10 text-red-600 border-red-200"
      case "high": return "bg-orange-500/10 text-orange-600 border-orange-200"
      case "medium": return "bg-yellow-500/10 text-yellow-600 border-yellow-200"
      case "low": return "bg-green-500/10 text-green-600 border-green-200"
      default: return "bg-muted/50 text-muted-foreground"
    }
  }

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment?.toLowerCase()) {
      case "positive": return <TrendingUp className="h-4 w-4 text-green-500" />
      case "negative": return <TrendingDown className="h-4 w-4 text-red-500" />
      case "mixed": return <TrendingDown className="h-4 w-4 text-yellow-500" />
      default: return null
    }
  }

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-1 relative overflow-hidden border-none bg-gradient-to-br from-card to-muted/10",
        review.critical_flag && "ring-1 ring-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]",
        isSelected && "ring-2 ring-primary shadow-[0_0_30px_rgba(59,130,246,0.4)] bg-gradient-to-br from-primary/5 to-blue-50"
      )}
      onClick={() => onClick(review.id)}
    >
      {/* Platform color accent at top */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: platformColor }}
      />

      {/* Property color accent on left */}
      <div
        className="absolute top-0 bottom-0 left-0 w-1"
        style={{ backgroundColor: propertyColor }}
      />

      {review.critical_flag && (
        <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none overflow-hidden z-10">
          <div className="bg-red-600 text-white text-[9px] font-black py-1 px-8 text-center transform rotate-45 translate-x-5 -translate-y-1 uppercase shadow-2xl">
            Critical
          </div>
        </div>
      )}

      {isSelected && (
        <>
          <div className="absolute top-3 right-3 z-50">
            <div className="bg-blue-600 text-white rounded-full p-2 shadow-lg border-2 border-white">
              <Check className="h-5 w-5" strokeWidth={3} />
            </div>
          </div>
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-50">
            <Badge className="bg-blue-600 text-white border-0 shadow-lg px-3 py-1 text-xs font-bold">
              SELECTED
            </Badge>
          </div>
        </>
      )}

      <CardHeader className="pb-3 pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Selection Checkbox */}
            {onToggleSelect && (
              <div 
                className="flex items-center justify-center h-6 w-6 rounded border-2 border-primary/50 bg-white hover:border-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(review.id)}
                  className="h-4 w-4 border-0 data-[state=checked]:bg-primary data-[state=checked]:text-white"
                />
              </div>
            )}
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-sm border border-border/30"
              style={{ color: platformColor }}
            >
              {getPlatformIcon(review.platform, "w-5 h-5")}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{review.platform}</span>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-bold text-yellow-700">{review.rating_normalized_10?.toFixed(1) || review.rating_normalized_5?.toFixed(1) || "?"}</span>
              </div>
            </div>
          </div>
          
          {/* Date Badge - Prominent */}
          <Badge 
            className={cn(
              "text-[9px] px-2 py-0.5 font-bold tracking-wide border-0 flex items-center gap-1",
              dateInfo.isNew 
                ? "bg-green-100 text-green-700" 
                : "bg-slate-100 text-slate-600"
            )}
            title={dateInfo.fullDate}
          >
            <Calendar className="h-3 w-3" />
            {dateInfo.label}
          </Badge>
        </div>

        <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors pr-8">
          {getDisplayTitle(review)}
        </CardTitle>

        <div className="flex items-center gap-2 mt-2 min-w-0 flex-wrap">
          <Badge className={cn("text-[10px] h-5 px-2 font-bold tracking-tighter border-none", getSeverityColor(review.severity))} variant="outline">
            {getSeverityEmoji(review.severity)} {review.severity?.toUpperCase() || "NORMAL"}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground min-w-0 opacity-80" title={propertyName}>
            <div 
              className="h-2 w-2 rounded-full" 
              style={{ backgroundColor: propertyColor }}
            />
            <span className="truncate">{propertyName}</span>
          </div>
          {/* Sentiment Badge moved here for better organization */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/30">
            {getSentimentIcon(review.sentiment)}
            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none">
              {review.sentiment}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-6 pt-1">
        <div className="relative">
          <p className="text-sm text-foreground/70 line-clamp-3 leading-relaxed font-medium mb-6 min-h-[4.5rem] italic pr-4">
            "{review.summary_en || review.review_text}"
          </p>
          {review.summary_ar && (
            <p className="text-sm text-foreground/60 line-clamp-1 leading-relaxed font-arabic mb-4 opacity-70" dir="rtl">
              {review.summary_ar}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-muted/50">
          <div className="flex items-center gap-3 text-[11px]">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground/90 leading-none mb-0.5 max-w-[150px] truncate" title={displayOwnerName}>
                {displayOwnerName}
              </span>
              <span className="text-muted-foreground font-medium text-[10px]">
                {displayOwnerType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {review.vip_flag && (
              <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px] px-1.5 py-0">
                VIP
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] px-1.5 py-0 border-0",
                review.status === "responded" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600",
              )}
            >
              {review.status === "responded" ? "✓ Responded" : review.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
