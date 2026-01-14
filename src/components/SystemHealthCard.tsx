/**
 * SystemHealthCard Component
 * 
 * Displays system health status, metrics, and error logs.
 * Requirements: 12.1, 12.3
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Wifi,
  ChevronRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSystemHealthSummary } from '@/hooks/useSystemHealth';
import type { SystemHealthStatus } from '@/types/systemHealth';
import {
  formatResponseTime,
  formatErrorRate,
  getStatusColorClass,
  getStatusBgClass,
} from '@/lib/systemHealthCore';

export interface SystemHealthCardProps {
  className?: string;
  showDetails?: boolean;
}

/**
 * Get status icon based on health status
 */
function getStatusIcon(status: SystemHealthStatus) {
  switch (status) {
    case 'healthy':
      return CheckCircle;
    case 'degraded':
      return AlertTriangle;
    case 'critical':
      return XCircle;
    default:
      return Activity;
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: SystemHealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'All Systems Operational';
    case 'degraded':
      return 'Performance Degraded';
    case 'critical':
      return 'System Issues Detected';
    default:
      return 'Unknown Status';
  }
}

export function SystemHealthCard({ className, showDetails = true }: SystemHealthCardProps) {
  const { data, isLoading, error, refetch, isRefetching } = useSystemHealthSummary();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={cn('border-red-200 dark:border-red-800', className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <XCircle className="h-5 w-5" />
            <span className="text-sm">Failed to load system health</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = getStatusIcon(data.status);
  const statusColorClass = getStatusColorClass(data.status);
  const statusBgClass = getStatusBgClass(data.status);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Health
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className={cn('flex items-center gap-3 p-3 rounded-lg', statusBgClass)}>
          <StatusIcon className={cn('h-5 w-5', statusColorClass)} />
          <div className="flex-1">
            <p className={cn('text-sm font-medium', statusColorClass)}>
              {getStatusLabel(data.status)}
            </p>
          </div>
          {data.alertCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {data.alertCount} alert{data.alertCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Metrics */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Response</p>
                <p className="text-sm font-medium">
                  {formatResponseTime(data.avgResponseTime)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Error Rate</p>
                <p className="text-sm font-medium">
                  {formatErrorRate(data.errorRate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Link to full page */}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/system-health">
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default SystemHealthCard;
