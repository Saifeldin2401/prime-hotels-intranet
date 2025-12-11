import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/icons'

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) => {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500'
  }

  const trendIcons = {
    up: Icons.TrendingUp,
    down: Icons.TrendingDown,
    neutral: Icons.Minus
  }

  const TrendIcon = trend ? trendIcons[trend] : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && trendValue && (
          <div className={`flex items-center text-xs ${trendColors[trend]}`}>
            {TrendIcon && <TrendIcon className="h-3 w-3 mr-1" />}
            {trendValue}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SOPStats() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Documents"
        value="0"
        icon={Icons.FileText}
        trend="up"
        trendValue="0% from last month"
      />
      <StatCard
        title="Draft"
        value="0"
        icon={Icons.Edit}
      />
      <StatCard
        title="Under Review"
        value="0"
        icon={Icons.Clock}
      />
      <StatCard
        title="Approved"
        value="0"
        icon={Icons.CheckCircle}
      />
    </div>
  )
}
