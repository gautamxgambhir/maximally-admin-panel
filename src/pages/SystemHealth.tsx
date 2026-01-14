/**
 * System Health Page
 * 
 * Displays system status, metrics, error logs, and performance data.
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Wifi,
  RefreshCw,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Server,
  Zap,
  FileWarning,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { AlertBanner } from '@/components/AlertBanner';
import {
  useSystemHealthOverview,
  useRecentErrors,
  useSlowEndpoints,
  useHighErrorEndpoints,
} from '@/hooks/useSystemHealth';
import type { SystemHealthStatus, SystemHealthQueryParams, EndpointMetrics, ErrorLogEntry } from '@/types/systemHealth';
import type { AnalyticsAlert } from '@/types/analytics';
import {
  formatResponseTime,
  formatErrorRate,
  getStatusColorClass,
  getStatusBgClass,
} from '@/lib/systemHealthCore';

type TimeRange = '1h' | '6h' | '24h' | '7d';

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

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/**
 * Metric Card Component
 */
function MetricCard({
  title,
  value,
  icon: Icon,
  status,
  description,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  status?: 'good' | 'warning' | 'critical';
  description?: string;
}) {
  const statusColors = {
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    critical: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              status === 'critical' ? 'bg-red-100 dark:bg-red-900/30' :
              status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
              'bg-green-100 dark:bg-green-900/30'
            )}>
              <Icon className={cn(
                'h-5 w-5',
                status ? statusColors[status] : 'text-muted-foreground'
              )} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className={cn(
                'text-2xl font-bold',
                status ? statusColors[status] : ''
              )}>
                {value}
              </p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Endpoint Row Component
 */
function EndpointRow({ endpoint }: { endpoint: EndpointMetrics }) {
  const isSlowResponse = endpoint.avg_response_time_ms > 1000;
  const isHighError = endpoint.error_rate > 5;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {endpoint.method}
          </Badge>
          <span className="font-mono text-sm">{endpoint.endpoint}</span>
        </div>
      </TableCell>
      <TableCell className={cn(isSlowResponse && 'text-yellow-600 dark:text-yellow-400')}>
        {formatResponseTime(endpoint.avg_response_time_ms)}
      </TableCell>
      <TableCell>{formatResponseTime(endpoint.p95_response_time_ms)}</TableCell>
      <TableCell>{endpoint.request_count.toLocaleString()}</TableCell>
      <TableCell className={cn(isHighError && 'text-red-600 dark:text-red-400')}>
        {formatErrorRate(endpoint.error_rate)}
      </TableCell>
    </TableRow>
  );
}

/**
 * Error Row Component
 */
function ErrorRow({ error }: { error: ErrorLogEntry }) {
  return (
    <TableRow>
      <TableCell>
        <Badge variant="destructive" className="text-xs">
          {error.error_type}
        </Badge>
      </TableCell>
      <TableCell className="max-w-md">
        <p className="text-sm truncate">{error.message}</p>
        {error.endpoint && (
          <p className="text-xs text-muted-foreground font-mono">{error.endpoint}</p>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{error.frequency}x</Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatRelativeTime(error.last_seen)}
      </TableCell>
    </TableRow>
  );
}

export default function SystemHealth() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  
  const params: SystemHealthQueryParams = {
    time_range: timeRange,
    include_errors: true,
    include_endpoints: true,
  };

  const {
    data: healthData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useSystemHealthOverview(params);

  const { data: slowEndpoints } = useSlowEndpoints(1000);
  const { data: highErrorEndpoints } = useHighErrorEndpoints(5);

  // Convert system health alerts to analytics alerts format for AlertBanner
  const analyticsAlerts: AnalyticsAlert[] = (healthData?.alerts || []).map(alert => ({
    id: alert.id,
    type: alert.type === 'high_error_rate' ? 'spike' :
          alert.type === 'slow_response_time' ? 'performance_degradation' :
          alert.type === 'database_slow' ? 'performance_degradation' : 'anomaly',
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    metric: alert.metric,
    currentValue: alert.current_value,
    threshold: alert.threshold,
    detectedAt: alert.detected_at,
    acknowledged: alert.acknowledged,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !healthData) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load system health data. Please try again.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(healthData.status);
  const statusColorClass = getStatusColorClass(healthData.status);
  const statusBgClass = getStatusBgClass(healthData.status);

  // Determine metric statuses
  const responseTimeStatus = healthData.metrics.avg_response_time_ms > 3000 ? 'critical' :
                             healthData.metrics.avg_response_time_ms > 1000 ? 'warning' : 'good';
  const errorRateStatus = healthData.metrics.error_rate > 10 ? 'critical' :
                          healthData.metrics.error_rate > 5 ? 'warning' : 'good';
  const dbTimeStatus = healthData.metrics.database_query_time_ms > 1500 ? 'critical' :
                       healthData.metrics.database_query_time_ms > 500 ? 'warning' : 'good';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">
            Monitor API performance, error rates, and system status
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert Banner */}
      {analyticsAlerts.length > 0 && (
        <AlertBanner alerts={analyticsAlerts} maxVisible={3} />
      )}

      {/* Status Banner */}
      <Card className={cn('border-2', 
        healthData.status === 'healthy' ? 'border-green-200 dark:border-green-800' :
        healthData.status === 'degraded' ? 'border-yellow-200 dark:border-yellow-800' :
        'border-red-200 dark:border-red-800'
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn('p-3 rounded-full', statusBgClass)}>
                <StatusIcon className={cn('h-8 w-8', statusColorClass)} />
              </div>
              <div>
                <h2 className={cn('text-xl font-bold', statusColorClass)}>
                  {getStatusLabel(healthData.status)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Uptime: {healthData.uptime_percentage.toFixed(2)}% • 
                  Last checked: {formatRelativeTime(healthData.last_check)}
                </p>
              </div>
            </div>
            {healthData.alerts.length > 0 && (
              <Badge variant="destructive" className="text-sm">
                {healthData.alerts.length} Active Alert{healthData.alerts.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Avg Response Time"
          value={formatResponseTime(healthData.metrics.avg_response_time_ms)}
          icon={Clock}
          status={responseTimeStatus}
          description="API response latency"
        />
        <MetricCard
          title="P95 Response Time"
          value={formatResponseTime(healthData.metrics.p95_response_time_ms)}
          icon={Zap}
          status={healthData.metrics.p95_response_time_ms > 2000 ? 'warning' : 'good'}
          description="95th percentile"
        />
        <MetricCard
          title="Error Rate"
          value={formatErrorRate(healthData.metrics.error_rate)}
          icon={AlertCircle}
          status={errorRateStatus}
          description="Request failures"
        />
        <MetricCard
          title="Database Time"
          value={formatResponseTime(healthData.metrics.database_query_time_ms)}
          icon={Database}
          status={dbTimeStatus}
          description="Avg query time"
        />
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <FileWarning className="h-4 w-4" />
            Errors
            {healthData.recent_errors.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {healthData.recent_errors.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="slow" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Slow Endpoints
          </TabsTrigger>
        </TabsList>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Performance</CardTitle>
              <CardDescription>
                API endpoint response times and error rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthData.endpoints.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Avg Time</TableHead>
                      <TableHead>P95 Time</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Error Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {healthData.endpoints.map((endpoint, i) => (
                      <EndpointRow key={`${endpoint.method}-${endpoint.endpoint}-${i}`} endpoint={endpoint} />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No endpoint data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>
                Error logs with frequency and affected endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthData.recent_errors.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {healthData.recent_errors.map((error) => (
                      <ErrorRow key={error.id} error={error} />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-lg font-medium">No recent errors</p>
                  <p className="text-sm">Your system is running smoothly!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slow Endpoints Tab */}
        <TabsContent value="slow">
          <Card>
            <CardHeader>
              <CardTitle>Slow Endpoints</CardTitle>
              <CardDescription>
                Endpoints with response times exceeding 1000ms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {slowEndpoints && slowEndpoints.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Avg Time</TableHead>
                      <TableHead>P95 Time</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Error Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowEndpoints.map((endpoint, i) => (
                      <EndpointRow key={`slow-${endpoint.method}-${endpoint.endpoint}-${i}`} endpoint={endpoint} />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-lg font-medium">No slow endpoints</p>
                  <p className="text-sm">All endpoints are performing well!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
