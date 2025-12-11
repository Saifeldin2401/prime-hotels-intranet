import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { getTranslations } from 'next-intl/server';
import { SOPService } from '@/lib/api/sop';

const StatCard = async ({ 
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
    neutral: 'text-amber-500',
  };

  const trendIcons = {
    up: <Icons.trendingUp className="h-4 w-4" />,
    down: <Icons.trendingDown className="h-4 w-4" />,
    neutral: <Icons.minus className="h-4 w-4" />,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && trendValue && (
          <p className={`text-xs ${trendColors[trend]} flex items-center mt-1`}>
            {trendIcons[trend]}
            <span className="ml-1">{trendValue}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export async function SOPStats() {
  const t = await getTranslations('sop.dashboard.stats');
  
  // In a real implementation, fetch these stats from the API
  const stats = await SOPService.getStats();
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t('totalDocuments')}
        value={stats?.total_documents || 0}
        icon={Icons.fileText}
        trend="up"
        trendValue="+12% from last month"
      />
      <StatCard
        title={t('pendingApproval')}
        value={stats?.pending_approvals || 0}
        icon={Icons.clock}
        trend="down"
        trendValue="-5% from last month"
      />
      <StatCard
        title={t('pendingAcknowledgment')}
        value={stats?.pending_acknowledgments || 0}
        icon={Icons.checkCircle}
        trend="up"
        trendValue="+3% from last month"
      />
      <StatCard
        title={t('expiringSoon')}
        value={stats?.expiring_soon || 0}
        icon={Icons.alertTriangle}
        trend="neutral"
        trendValue="Due for review"
      />
    </div>
  );
}
