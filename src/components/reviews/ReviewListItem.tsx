import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { GuestReview } from "@/lib/types"
import { Star, TrendingDown, TrendingUp, User } from "lucide-react"

interface ReviewListItemProps {
  review: GuestReview
  propertyName: string
  ownerName?: string | null
  onClick: (id: string) => void
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

export function ReviewListItem({ review, propertyName, ownerName, onClick }: ReviewListItemProps) {
  const isAssignedState = ["assigned", "acknowledged", "response_pending", "escalated"].includes(String(review.status))
  const displayOwnerName = ownerName || (isAssignedState ? "Unassigned" : (review.reviewer_name?.split(" ")[0] || "Guest"))
  const displayOwnerType = isAssignedState ? "Owner" : "Guest"

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
      )}
      onClick={() => onClick(review.id)}
    >
      <div
        className="absolute top-0 left-0 w-full h-1 opacity-80"
        style={{
          backgroundColor: review.platform === "booking" ? "#003580"
            : review.platform === "expedia" ? "#00355f"
            : review.platform === "tripadvisor" ? "#34e0a1"
            : review.platform === "google" ? "#4285F4"
            : "#6366f1",
        }}
      />

      {review.critical_flag && (
        <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none overflow-hidden z-10">
          <div className="bg-red-600 text-white text-[9px] font-black py-1 px-8 text-center transform rotate-45 translate-x-5 -translate-y-1 uppercase shadow-2xl">
            Critical
          </div>
        </div>
      )}

      <CardHeader className="pb-3 pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-1 px-2 rounded bg-background border border-muted-foreground/10 shadow-sm flex items-center gap-1.5 min-w-[80px] justify-center">
              <span className="text-[10px] font-black uppercase tracking-tight text-foreground/80">
                {review.platform}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/30">
              {getSentimentIcon(review.sentiment)}
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none">
                {review.sentiment}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/10 px-2 py-0.5 rounded-full border border-yellow-200/50">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-black text-yellow-700 dark:text-yellow-500">
              {review.rating_normalized_10?.toFixed(1) || review.rating_normalized_5?.toFixed(1) || "?"}
            </span>
          </div>
        </div>

        <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors pr-8">
          {getDisplayTitle(review)}
        </CardTitle>

        <div className="flex items-center gap-2 mt-2 min-w-0">
          <Badge className={cn("text-[10px] h-5 px-2 font-bold tracking-tighter border-none", getSeverityColor(review.severity))} variant="outline">
            {review.severity?.toUpperCase() || "NORMAL"}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground min-w-0 opacity-80" title={propertyName}>
            <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="truncate">{propertyName}</span>
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
                {displayOwnerType} - {new Date(review.collected_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {review.vip_flag && (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] font-black h-5 px-2 tracking-widest backdrop-blur-sm">
                VIP
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] font-black h-5 px-2 tracking-widest uppercase border-none",
                review.status === "responded" ? "bg-green-500/10 text-green-600" : "bg-muted/50 text-muted-foreground",
              )}
            >
              {review.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
