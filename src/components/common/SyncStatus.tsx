/**
 * Sync Status Component
 * 
 * Displays the current sync status for offline/online operations:
 * - Shows pending offline actions count
 * - Shows sync status (online/offline/syncing)
 * - Allows manual sync trigger
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Wifi,
  WifiOff,
  X,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface PendingAction {
  id: string;
  type: string;
  entity: string;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  retryCount: number;
  createdAt: number;
}

type SyncState = 'online' | 'offline' | 'syncing' | 'error';

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncStatus({ className, showDetails = false }: SyncStatusProps) {
  const { t } = useTranslation('common');
  const {
    isOnline,
    pendingCount,
    pendingSubmissions,
    isSyncing,
    lastSyncError,
    syncNow,
  } = useOfflineSync();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const syncState = useMemo<SyncState>(() => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    if (lastSyncError) return 'error';
    return 'online';
  }, [isOnline, isSyncing, lastSyncError]);

  const pendingActions = useMemo<PendingAction[]>(
    () =>
      pendingSubmissions.map((submission) => ({
        id: submission.id,
        type: submission.method,
        entity: submission.url,
        status: 'pending',
        retryCount: submission.retryCount,
        createdAt: new Date(submission.timestamp).getTime(),
      })),
    [pendingSubmissions],
  );

  const triggerSync = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    try {
      await syncNow();
      setLastSyncTime(new Date());
    } catch {
      // Error state comes from the hook.
    }
  }, [isOnline, isSyncing, syncNow]);

  const getStatusIcon = () => {
    switch (syncState) {
      case 'online':
        return <Cloud className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <CloudOff className="h-4 w-4 text-gray-400" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (syncState) {
      case 'online':
        return pendingCount > 0 
          ? t('sync.pending_items', { count: pendingCount, defaultValue: `${pendingCount} pending` })
          : t('sync.synced', { defaultValue: 'Synced' });
      case 'offline':
        return t('sync.offline', { defaultValue: 'Offline' });
      case 'syncing':
        return t('sync.syncing', { defaultValue: 'Syncing...' });
      case 'error':
        return t('sync.error', { defaultValue: 'Sync failed' });
      default:
        return '';
    }
  };

  const getConnectionIcon = () => {
    return isOnline 
      ? <Wifi className="h-3 w-3" />
      : <WifiOff className="h-3 w-3 text-red-500" />;
  };

  return (
    <TooltipProvider>
      <div className={cn('relative', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 gap-2 px-2',
                syncState === 'offline' && 'text-amber-600',
                syncState === 'error' && 'text-red-600',
                syncState === 'syncing' && 'text-blue-600'
              )}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {getConnectionIcon()}
              {getStatusIcon()}
              {pendingCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-[20px] px-1 text-xs">
                  {pendingCount}
                </Badge>
              )}
              <span className="hidden sm:inline text-xs">{getStatusText()}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="space-y-1">
              <p className="font-medium">
                {syncState === 'online' ? t('sync.online_tooltip', { defaultValue: 'You are online' }) :
                 syncState === 'offline' ? t('sync.offline_tooltip', { defaultValue: 'You are offline' }) :
                 syncState === 'syncing' ? t('sync.syncing_tooltip', { defaultValue: 'Syncing changes...' }) :
                 t('sync.error_tooltip', { defaultValue: 'Sync error occurred' })}
              </p>
              {lastSyncTime && (
                <p className="text-xs text-muted-foreground">
                  {t('sync.last_sync', { defaultValue: 'Last sync' })}: {lastSyncTime.toLocaleTimeString()}
                </p>
              )}
              {pendingCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('sync.pending_count', { count: pendingCount, defaultValue: `${pendingCount} items pending` })}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Expanded Details Panel */}
        <AnimatePresence>
          {showDetails && isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute end-0 top-full mt-2 w-80 z-50"
            >
              <div className="bg-popover border rounded-lg shadow-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    {t('sync.title', { defaultValue: 'Sync Status' })}
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => setIsExpanded(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {/* Status Row */}
                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <span className="text-sm">{t('sync.status', { defaultValue: 'Status' })}</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon()}
                      <span className={cn(
                        'text-sm font-medium',
                        syncState === 'online' && 'text-green-600',
                        syncState === 'offline' && 'text-amber-600',
                        syncState === 'error' && 'text-red-600'
                      )}>
                        {syncState.charAt(0).toUpperCase() + syncState.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Pending Count */}
                  {pendingCount > 0 && (
                    <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                      <span className="text-sm">{t('sync.pending', { defaultValue: 'Pending' })}</span>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                        {pendingCount}
                      </Badge>
                    </div>
                  )}

                  {/* Last Sync */}
                  {lastSyncTime && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span className="text-sm">{t('sync.last_sync', { defaultValue: 'Last Sync' })}</span>
                      <span className="text-sm text-muted-foreground">
                        {lastSyncTime.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Pending Actions List */}
                  {pendingActions.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <h5 className="text-sm font-medium mb-2">
                        {t('sync.pending_actions', { defaultValue: 'Pending Actions' })}
                      </h5>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {pendingActions.slice(0, 5).map((action) => (
                          <div 
                            key={action.id}
                            className="flex items-center justify-between text-xs p-1.5 bg-muted rounded"
                          >
                            <span className="truncate flex-1">{action.type} {action.entity}</span>
                            {action.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                            {action.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-500" />}
                            {action.status === 'syncing' && <RefreshCw className="h-3 w-3 animate-spin" />}
                            {action.status === 'pending' && <Clock className="h-3 w-3 text-amber-500" />}
                          </div>
                        ))}
                        {pendingActions.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center">
                            {t('sync.and_more', { count: pendingActions.length - 5, defaultValue: `and ${pendingActions.length - 5} more` })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sync Button */}
                  <Button 
                    onClick={triggerSync} 
                    disabled={syncState === 'syncing' || !isOnline || pendingCount === 0}
                    className="w-full"
                    size="sm"
                  >
                    {syncState === 'syncing' ? (
                      <>
                        <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                        {t('sync.syncing', { defaultValue: 'Syncing...' })}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 me-2" />
                        {pendingCount > 0 
                          ? t('sync.sync_now', { defaultValue: 'Sync Now' })
                          : t('sync.all_synced', { defaultValue: 'All Synced' })}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}



export default SyncStatus;
