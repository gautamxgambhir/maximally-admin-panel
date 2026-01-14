/**
 * SystemHealthAlertBanner Component
 * 
 * Displays alert banner when errors spike or performance degrades.
 * Requirements: 12.2, 12.4
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  XCircle,
  X,
  ChevronRight,
  Activity,
  Clock,
  Database,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSystemHealthSummary } from '@/hooks/useSystemHealth';
import type { SystemHealthStatus, SystemHealthAlert, SystemAlertType } from '@/types/systemHealth';

export interface SystemHealthAlertBannerProps {
  className?: string;
  dismissible?: boolean;
  compact?: boolean;
}

/**
 * Get icon for alert type
 */
function getAlertIcon(type: SystemAlertType) {
  switch (type) {
    case 'high_error_rate':
      return AlertCircle;
    case 'slow_response_time':
      return Clock;
    case 'database_slow':
      return Database;
    case 'high_memory':
      return Zap;
    case 'connection_limit':
      return Activity;
    case 'service_degradation':
      return AlertTriangle;
    default:
      return AlertTriangle;
  }
}

/**
 * Get styles for health status
 */
function getStatusStyles(status: SystemHealthStatus): {
  container: string;
  icon: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'critical':
      return {
        container: 'bg-red-50 dark:bg-red-950/50',
        icon: 'text-red-600 dark:text-red-400',
        text: 'text-red-800 dark:text-red-200',
        border: 'border-red-200 dark:border-red-900',
      };
    case 'degraded':
      return {
        container: 'bg-yellow-50 dark:bg-yellow-950/50',
        icon: 'text-yellow-600 dark:text-yellow-400',
        text: 'text-yellow-800 dark:text-yellow-200',
        border: 'border-yellow-200 dark:border-yellow-900',
      };
    case 'healthy':
    default:
      return {
        container: 'bg-green-50 dark:bg-green-950/50',
        icon: 'text-green-600 dark:text-green-400',
        text: 'text-green-800 dark:text-green-200',
        border: 'border-green-200 dark:border-green-900',
      };
  }
}

/**
 * Get status message
 */
function getStatusMessage(status: SystemHealthStatus, alertCount: number): string {
  switch (status) {
    case 'critical':
      return `Critical system issues detected${alertCount > 0 ? ` (${alertCount} alert${alertCount > 1 ? 's' : ''})` : ''}`;
    case 'degraded':
      return `System performance degraded${alertCount > 0 ? ` (${alertCount} alert${alertCount > 1 ? 's' : ''})` : ''}`;
    case 'healthy':
    default:
      return 'All systems operational';
  }
}

/**
 * Full alert banner for dashboard
 */
export function SystemHealthAlertBanner({
  className,
  dismissible = true,
  compact = false,
}: SystemHealthAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { data, isLoading, error } = useSystemHealthSummary();

  // Don't show if loading, error, dismissed, or healthy
  if (isLoading || error || dismissed || !data || data.status === 'healthy') {
    return null;
  }

  const styles = getStatusStyles(data.status);
  const Icon = data.status === 'critical' ? XCircle : AlertTriangle;

  if (compact) {
    return (
      <Link
        to="/system-health"
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
          styles.container,
          styles.border,
          'hover:opacity-90',
          className
        )}
      >
        <Icon className={cn('h-4 w-4', styles.icon)} />
        <span className={styles.text}>
          {data.status === 'critical' ? 'System Issues' : 'Performance Degraded'}
        </span>
        <ChevronRight className={cn('h-4 w-4 ml-auto', styles.icon)} />
      </Link>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        styles.container,
        styles.border,
        className
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', styles.icon)} />
      <div className="flex-1 min-w-0">
        <h4 className={cn('text-sm font-medium', styles.text)}>
          {data.status === 'critical' ? 'System Issues Detected' : 'Performance Degraded'}
        </h4>
        <p className={cn('text-sm mt-1 opacity-90', styles.text)}>
          {getStatusMessage(data.status, data.alertCount)}
        </p>
        <div className="flex items-center gap-4 mt-2">
          <span className={cn('text-xs', styles.text)}>
            Avg Response: {data.avgResponseTime.toFixed(0)}ms
          </span>
          <span className={cn('text-xs', styles.text)}>
            Error Rate: {data.errorRate.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className={cn('text-xs', styles.text)}
        >
          <Link to="/system-health">
            View Details
            <ChevronRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-6 w-6 p-0 opacity-70 hover:opacity-100', styles.text)}
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact indicator for navigation/header
 */
export function SystemHealthIndicator({ className }: { className?: string }) {
  const { data, isLoading, error } = useSystemHealthSummary();

  if (isLoading || error || !data) {
    return null;
  }

  const styles = getStatusStyles(data.status);

  return (
    <Link
      to="/system-health"
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-md transition-colors hover:bg-accent',
        className
      )}
      title={getStatusMessage(data.status, data.alertCount)}
    >
      <span className={cn(
        'h-2 w-2 rounded-full',
        data.status === 'healthy' ? 'bg-green-500' :
        data.status === 'degraded' ? 'bg-yellow-500 animate-pulse' :
        'bg-red-500 animate-pulse'
      )} />
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {data.status === 'healthy' ? 'Healthy' :
         data.status === 'degraded' ? 'Degraded' : 'Issues'}
      </span>
    </Link>
  );
}

/**
 * Dashboard widget for system health
 */
export function SystemHealthWidget({ className }: { className?: string }) {
  const { data, isLoading, error } = useSystemHealthSummary();

  if (isLoading) {
    return (
      <div className={cn('p-4 bg-muted/50 rounded-lg animate-pulse', className)}>
        <div className="h-4 w-24 bg-muted rounded mb-2" />
        <div className="h-6 w-32 bg-muted rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={cn('p-4 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900', className)}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Health check failed</span>
        </div>
      </div>
    );
  }

  const styles = getStatusStyles(data.status);

  return (
    <Link
      to="/system-health"
      className={cn(
        'block p-4 rounded-lg border transition-colors hover:shadow-md',
        styles.container,
        styles.border,
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">System Health</span>
        <span className={cn(
          'h-2 w-2 rounded-full',
          data.status === 'healthy' ? 'bg-green-500' :
          data.status === 'degraded' ? 'bg-yellow-500 animate-pulse' :
          'bg-red-500 animate-pulse'
        )} />
      </div>
      <div className={cn('text-lg font-semibold capitalize', styles.text)}>
        {data.status}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span>{data.avgResponseTime.toFixed(0)}ms avg</span>
        <span>{data.errorRate.toFixed(1)}% errors</span>
      </div>
    </Link>
  );
}

export default SystemHealthAlertBanner;
