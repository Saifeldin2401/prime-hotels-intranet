import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { GuestReview } from "@/lib/types"
import { Star, TrendingDown, TrendingUp, Minus, User, MessageCircle, Calendar, Clock, MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"
import React from "react"

interface ReviewListItemProps {
  review: GuestReview
  propertyName: string
  propertyColor?: string
  ownerName?: string | null
  onClick: (id: string) => void
  isSelected?: boolean
  isNew?: boolean
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

function StarRating({ rating, maxStars = 5 }: { rating: number | null; maxStars?: number }) {
  const normalized = rating ?? 0
  const fullStars = Math.floor(normalized)
  const hasHalf = normalized - fullStars >= 0.3
  
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5 transition-colors",
            i < fullStars
              ? "fill-amber-400 text-amber-400"
              : i === fullStars && hasHalf
                ? "fill-amber-400/50 text-amber-400"
                : "fill-transparent text-slate-300 dark:text-slate-600"
          )}
        />
      ))}
      <span className="ms-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">
        {normalized.toFixed(1)}
      </span>
    </div>
  )
}

function ReviewerAvatar({ name, platform }: { name: string | null; platform: string }) {
  const initials = name
    ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
    : "?"
  const platformColor = getPlatformColor(platform)
  
  return (
    <div
      className="relative h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white dark:ring-slate-800"
      style={{ backgroundColor: platformColor }}
    >
      {initials}
      <div
        className="absolute -bottom-0.5 -end-0.5 h-4 w-4 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm"
      >
        {getPlatformIcon(platform, "h-2.5 w-2.5")}
      </div>
    </div>
  )
}

function SentimentIndicator({ sentiment, t }: { sentiment: string | null; t: (key: string) => string }) {
  const config = {
    positive: { icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40", label: t("sentiment.positive") },
    negative: { icon: TrendingDown, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40", label: t("sentiment.negative") },
    mixed: { icon: Minus, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", label: t("sentiment.mixed") },
    neutral: { icon: Minus, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900", label: t("sentiment.neutral") },
  }
  
  const cfg = config[sentiment as keyof typeof config] ?? config.neutral
  const Icon = cfg.icon
  
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", cfg.bg)}>
      <Icon className={cn("h-3 w-3", cfg.color)} />
      <span className={cn("text-[10px] font-semibold capitalize", cfg.color)}>{cfg.label}</span>
    </div>
  )
}

function SeverityDot({ severity, t }: { severity: string | null; t: (key: string) => string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500 shadow-red-500/50 shadow-[0_0_6px]",
    high: "bg-orange-500",
    medium: "bg-amber-400",
    low: "bg-emerald-500",
  }
  const dotColor = colors[severity?.toLowerCase() ?? ""] ?? "bg-slate-300 dark:bg-slate-600"
  const label = severity ? t(`severity.${severity.toLowerCase()}`) : t("status.normal")
  
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-2 w-2 rounded-full", dotColor)} />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  )
}

function formatReviewDate(
  dateString: string | null,
  fallbackDate?: string | null,
  t?: (key: string) => string
): { label: string; fullDate: string; isNew: boolean; hasValidDate: boolean } {
  const effectiveDate = dateString || fallbackDate
  if (!effectiveDate) return { label: t?.("date.unknown") ?? "Unknown", fullDate: "", isNew: false, hasValidDate: false }
  
  const date = new Date(effectiveDate)
  if (Number.isNaN(date.getTime())) {
    return { label: t?.("date.unknown") ?? "Unknown", fullDate: "", isNew: false, hasValidDate: false }
  }
  
  const now = new Date()
  
  const isBrandNew = date.getFullYear() === now.getFullYear() &&
                     date.getMonth() === now.getMonth() &&
                     date.getDate() === now.getDate()
  
  if (isBrandNew) {
    return { label: t?.("date.today") ?? "Today", fullDate: date.toLocaleString(), isNew: true, hasValidDate: true }
  }
  
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.getFullYear() === yesterday.getFullYear() &&
                      date.getMonth() === yesterday.getMonth() &&
                      date.getDate() === yesterday.getDate()
  
  if (isYesterday) return { label: t?.("date.yesterday") ?? "Yesterday", fullDate: date.toLocaleString(), isNew: false, hasValidDate: true }
  
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) {
    return {
      label: t?.("date.daysAgo")?.replace("{{count}}", String(diffDays)) ?? `${diffDays}d ago`,
      fullDate: date.toLocaleString(),
      isNew: false,
      hasValidDate: true,
    }
  }
  
  return {
    label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    fullDate: date.toLocaleString(),
    isNew: false,
    hasValidDate: true,
  }
}

function getDisplayTitle(review: GuestReview, t: (key: string) => string) {
  if (review.review_title?.trim()) return review.review_title.trim()
  const reviewer = review.reviewer_name?.trim()
  if (reviewer) {
    const firstName = reviewer.split(" ")[0]
    return t("card.reviewerFeedback").replace("{{name}}", firstName)
  }
  const platformLabel = review.platform ? review.platform.charAt(0).toUpperCase() + review.platform.slice(1) : t("card.guest")
  return t("card.platformFeedback").replace("{{platform}}", platformLabel)
}

export const ReviewListItem = React.memo(function ReviewListItem({
  review,
  propertyName,
  ownerName,
  onClick,
  isSelected,
  isNew = false,
  onToggleSelect,
}: ReviewListItemProps) {
  const { t } = useTranslation("reviews")
  const propertyColor = getPropertyColor(propertyName)
  const dateInfo = formatReviewDate(review.published_at, review.collected_at, t)

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    collected: { label: t("analytics.collected"), variant: "outline" },
    analyzed: { label: t("analytics.analyzed"), variant: "outline" },
    assigned: { label: t("analytics.assigned"), variant: "secondary" },
    acknowledged: { label: t("analytics.acknowledged"), variant: "secondary" },
    response_pending: { label: t("analytics.pendingResponse"), variant: "destructive" },
    responded: { label: t("analytics.responded"), variant: "default" },
    closed: { label: t("analytics.closed"), variant: "default" },
    escalated: { label: t("analytics.escalated"), variant: "destructive" },
  }

  const statusCfg = statusConfig[review.status] ?? { label: review.status, variant: "outline" as const }

  return (
    <Card
      className={cn(
        "group relative cursor-pointer overflow-hidden border transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5",
        "bg-white dark:bg-slate-900/80",
        "border-slate-200/80 dark:border-slate-700/60",
        review.critical_flag && "border-red-300 dark:border-red-800/60 bg-red-50/30 dark:bg-red-950/20",
        isSelected && "ring-2 ring-primary/60 border-primary/40 shadow-md",
        isNew && !review.critical_flag && "border-emerald-300 dark:border-emerald-800/60"
      )}
      onClick={() => onClick(review.id)}
    >
      {/* Top accent — subtle platform color line */}
      <div
        className="h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, ${getPlatformColor(review.platform)}, transparent)` }}
      />

      {/* Critical ribbon */}
      {review.critical_flag && (
        <div className="absolute top-2.5 end-0 z-10">
          <div className="bg-red-600 text-white text-[9px] font-bold tracking-wider uppercase ps-3 pe-2 py-0.5 rounded-s-full shadow-sm">
            {t("severity.critical")}
          </div>
        </div>
      )}

      {/* New indicator */}
      {isNew && !review.critical_flag && (
        <div className="absolute top-2.5 end-0 z-10">
          <div className="bg-emerald-500 text-white text-[9px] font-bold tracking-wider uppercase ps-3 pe-2 py-0.5 rounded-s-full shadow-sm animate-pulse">
            {t("date.new")}
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Header: Avatar + Info + Selection */}
        <div className="flex items-start gap-3 mb-4">
          {/* Selection checkbox */}
          {onToggleSelect && (
            <div
              className="pt-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(review.id)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
            </div>
          )}

          {/* Reviewer avatar */}
          <ReviewerAvatar name={review.reviewer_name} platform={review.platform} />

          {/* Reviewer info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {review.reviewer_name || t("reviewCard.anonymous")}
              </h4>
              {review.vip_flag && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0 text-[9px] px-1.5 py-0 font-bold">
                  VIP
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span title={dateInfo.fullDate}>{dateInfo.label}</span>
              <span className="opacity-30">·</span>
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate" title={propertyName}>
                <span className="inline-block h-1.5 w-1.5 rounded-full me-1 align-middle" style={{ backgroundColor: propertyColor }} />
                {propertyName}
              </span>
            </div>
          </div>
        </div>

        {/* Review title */}
        <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200 leading-snug mb-2 line-clamp-1 group-hover:text-primary transition-colors pe-6">
          {getDisplayTitle(review, t)}
        </h3>

        {/* Star rating */}
        <div className="mb-3">
          <StarRating rating={review.rating_normalized_5} />
        </div>

        {/* Review text preview */}
        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4">
          {review.summary_en || review.review_text}
        </p>

        {/* Arabic summary if available */}
        {review.summary_ar && (
          <p className="text-[12px] text-slate-500 dark:text-slate-500 line-clamp-1 mb-4 font-arabic" dir="rtl">
            {review.summary_ar}
          </p>
        )}

        {/* Footer: Metadata chips */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <SeverityDot severity={review.severity} t={t} />
            <SentimentIndicator sentiment={review.sentiment} t={t} />
          </div>

          <div className="flex items-center gap-1.5">
            {ownerName && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={ownerName}>
                <User className="h-3 w-3" />
                <span className="max-w-[80px] truncate">{ownerName}</span>
              </div>
            )}
            <Badge
              variant={statusCfg.variant}
              className="text-[9px] font-semibold px-1.5 py-0 h-5"
            >
              {statusCfg.label}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  )
})
