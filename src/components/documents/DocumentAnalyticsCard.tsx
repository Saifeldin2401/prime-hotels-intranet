import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
    BarChart3,
    Calendar,
    Download,
    Eye,
    MoreHorizontal,
    TrendingDown,
    TrendingUp,
    Users,
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

export interface DocumentAnalytics {
  documentId: string;
  documentTitle: string;
  totalViews: number;
  totalDownloads: number;
  uniqueViewers: number;
  viewsOverTime: Array<{
    date: string;
    views: number;
    downloads: number;
  }>;
  topUsers: Array<{
    userId: string;
    name: string;
    avatar?: string;
    views: number;
    lastViewed: string;
  }>;
  departmentBreakdown?: Array<{
    department: string;
    views: number;
  }>;
}

interface DocumentAnalyticsCardProps {
  analytics: DocumentAnalytics;
  timeRange?: "7d" | "30d" | "90d" | "1y";
  onTimeRangeChange?: (range: "7d" | "30d" | "90d" | "1y") => void;
  onExport?: () => void;
  className?: string;
}

function calculateTrend(
  current: number,
  previous: number
): { direction: "up" | "down" | "neutral"; percentage: number } {
  if (previous === 0) return { direction: current > 0 ? "up" : "neutral", percentage: 100 };
  const diff = current - previous;
  const percentage = Math.round((diff / previous) * 100);
  return {
    direction: percentage > 0 ? "up" : percentage < 0 ? "down" : "neutral",
    percentage: Math.abs(percentage),
  };
}

interface AnalyticsTooltipEntry {
  color?: string
  dataKey?: string | number
  name?: string
  value?: number | string
}

interface AnalyticsTooltipProps {
  active?: boolean
  payload?: AnalyticsTooltipEntry[]
  label?: string | number
}

const CustomTooltip = ({ active, payload, label }: AnalyticsTooltipProps) => {
  if (active && payload && payload.length) {
    let formattedLabel = String(label ?? '');
    if (label) {
      const parsedDate = new Date(label);
      if (!isNaN(parsedDate.getTime())) {
        formattedLabel = format(parsedDate, "MMM d, yyyy");
      }
    }

    return (
      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border shadow-lg">
        <p className="text-sm font-medium mb-2">{formattedLabel}</p>
        {payload.map((entry, index: number) => (
          <div key={`${entry?.name ?? 'series'}-${entry?.dataKey ?? index}`} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground capitalize">{entry.name}:</span>
            <span className="font-medium">
              {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function DocumentAnalyticsCard({
  analytics,
  timeRange = "30d",
  onTimeRangeChange,
  onExport,
  className,
}: DocumentAnalyticsCardProps) {
  const { t } = useTranslation();
  // Calculate trends (comparing first half vs second half of data)
  const midPoint = Math.floor(analytics.viewsOverTime.length / 2);
  const firstHalf = analytics.viewsOverTime.slice(0, midPoint);
  const secondHalf = analytics.viewsOverTime.slice(midPoint);

  const firstHalfViews = firstHalf.reduce((sum, d) => sum + d.views, 0);
  const secondHalfViews = secondHalf.reduce((sum, d) => sum + d.views, 0);
  const viewsTrend = calculateTrend(secondHalfViews, firstHalfViews);

  const firstHalfDownloads = firstHalf.reduce((sum, d) => sum + d.downloads, 0);
  const secondHalfDownloads = secondHalf.reduce((sum, d) => sum + d.downloads, 0);
  const downloadsTrend = calculateTrend(secondHalfDownloads, firstHalfDownloads);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Document Analytics</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  {timeRange === "7d" && "Last 7 days"}
                  {timeRange === "30d" && "Last 30 days"}
                  {timeRange === "90d" && "Last 90 days"}
                  {timeRange === "1y" && "Last year"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTimeRangeChange?.("7d")}>
                  Last 7 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTimeRangeChange?.("30d")}>
                  Last 30 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTimeRangeChange?.("90d")}>
                  Last 90 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTimeRangeChange?.("1y")}>
                  Last year
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  aria-label={t("accessibility.more_options", "More options")}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExport}>Export Report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Total Views */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Total Views</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</span>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  viewsTrend.direction === "up" && "text-green-600",
                  viewsTrend.direction === "down" && "text-red-600",
                  viewsTrend.direction === "neutral" && "text-muted-foreground"
                )}
              >
                {viewsTrend.direction === "up" && <TrendingUp className="w-3.5 h-3.5" />}
                {viewsTrend.direction === "down" && <TrendingDown className="w-3.5 h-3.5" />}
                {viewsTrend.percentage}%
              </div>
            </div>
          </div>

          {/* Total Downloads */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Download className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Downloads</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">
                {analytics.totalDownloads.toLocaleString()}
              </span>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  downloadsTrend.direction === "up" && "text-green-600",
                  downloadsTrend.direction === "down" && "text-red-600",
                  downloadsTrend.direction === "neutral" && "text-muted-foreground"
                )}
              >
                {downloadsTrend.direction === "up" && <TrendingUp className="w-3.5 h-3.5" />}
                {downloadsTrend.direction === "down" && <TrendingDown className="w-3.5 h-3.5" />}
                {downloadsTrend.percentage}%
              </div>
            </div>
          </div>

          {/* Unique Viewers */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Unique Viewers</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">
                {analytics.uniqueViewers.toLocaleString()}
              </span>
              <Badge variant="outline" className="text-xs">
                {analytics.uniqueViewers > 0
                  ? Math.round((analytics.totalViews / analytics.uniqueViewers) * 10) / 10
                  : 0}{" "}
                avg
              </Badge>
            </div>
          </div>
        </div>

        {/* Charts */}
        <Tabs defaultValue="views" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="views">Views Over Time</TabsTrigger>
            <TabsTrigger value="users">Top Users</TabsTrigger>
          </TabsList>

          <TabsContent value="views" className="mt-4">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="99%" height={200} debounce={1}>
                <AreaChart
                  data={analytics.viewsOverTime}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B1C3E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0B1C3E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C39A45" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C39A45" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      if (!value) return '';
                      const d = new Date(value);
                      return !isNaN(d.getTime()) ? format(d, "MMM d") : String(value);
                    }}
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Views"
                    stroke="#0B1C3E"
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="downloads"
                    name="Downloads"
                    stroke="#C39A45"
                    fillOpacity={1}
                    fill="url(#colorDownloads)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <div className="space-y-3">
              {analytics.topUsers.slice(0, 5).map((user, index) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="w-5 text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-xs bg-[#0B1C3E] text-white">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Last viewed {(() => {
                        if (!user.lastViewed) return 'recently';
                        const d = new Date(user.lastViewed);
                        return !isNaN(d.getTime()) ? format(d, "MMM d") : 'recently';
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{user.views}</p>
                      <p className="text-xs text-muted-foreground">views</p>
                    </div>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0B1C3E] rounded-full"
                        style={{
                          width: `${analytics.totalViews > 0
                              ? (user.views / analytics.totalViews) * 100
                              : 0
                            }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {analytics.topUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No viewer data available yet
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Department Breakdown (if available) */}
        {analytics.departmentBreakdown && analytics.departmentBreakdown.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Views by Department</h4>
            <div className="h-[120px]">
              <ResponsiveContainer width="99%" height={120} debounce={1}>
                <BarChart
                  data={analytics.departmentBreakdown}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 80, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis
                    dataKey="department"
                    type="category"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    width={75}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="views" fill="#C39A45" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mini version for document cards
interface DocumentAnalyticsMiniProps {
  views: number;
  downloads: number;
  className?: string;
}

export function DocumentAnalyticsMini({ views, downloads, className }: DocumentAnalyticsMiniProps) {
  return (
    <div className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
      <span className="flex items-center gap-1">
        <Eye className="w-3.5 h-3.5" />
        {views.toLocaleString()}
      </span>
      <span className="flex items-center gap-1">
        <Download className="w-3.5 h-3.5" />
        {downloads.toLocaleString()}
      </span>
    </div>
  );
}
