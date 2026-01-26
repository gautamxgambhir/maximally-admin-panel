import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Clock, CheckCircle2, XCircle, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/apiHelpers';
import { formatDistanceToNow } from 'date-fns';

interface QueueStats {
  pending: number;
  processing: boolean;
  totalSent: number;
  totalFailed: number;
  lastProcessedAt: number | null;
}

interface BatchProgress {
  batchId: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  startedAt: number;
  completedAt: number | null;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

interface EmailQueueMonitorProps {
  batchId?: string;
  onRefresh?: () => void;
}

export function EmailQueueMonitor({ batchId, onRefresh }: EmailQueueMonitorProps) {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadData, 2000); // Refresh every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [batchId, autoRefresh]);

  const loadData = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();

      // Load queue stats
      const statsResponse = await fetch(`${baseUrl}/api/admin/newsletter/queue/stats`, { headers });
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setQueueStats(stats);
      }

      // Load batch progress if batchId is provided
      if (batchId) {
        const batchResponse = await fetch(`${baseUrl}/api/admin/newsletter/batch/${batchId}`, { headers });
        if (batchResponse.ok) {
          const progress = await batchResponse.json();
          setBatchProgress(progress);
          
          // Stop auto-refresh if batch is completed
          if (progress.status === 'completed' || progress.status === 'failed') {
            setAutoRefresh(false);
            onRefresh?.();
          }
        } else if (batchResponse.status === 404) {
          // Batch not found, might be cleaned up
          setBatchProgress(null);
        }
      }
    } catch (error) {
      console.error('Error loading queue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    loadData();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  if (isLoading && !queueStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Global Queue Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Queue Status
              </CardTitle>
              <CardDescription>
                Global email queue statistics and rate limiting status
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoRefresh}
                className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto' : 'Manual'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {queueStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{queueStats.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{queueStats.totalSent}</div>
                <div className="text-sm text-muted-foreground">Total Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{queueStats.totalFailed}</div>
                <div className="text-sm text-muted-foreground">Total Failed</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {queueStats.processing ? (
                    <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-500" />
                  )}
                  <Badge variant={queueStats.processing ? 'default' : 'secondary'}>
                    {queueStats.processing ? 'Processing' : 'Idle'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">Status</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Unable to load queue statistics
            </div>
          )}
          
          {queueStats?.lastProcessedAt && (
            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground text-center">
              Last processed: {formatDistanceToNow(new Date(queueStats.lastProcessedAt), { addSuffix: true })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Progress */}
      {batchProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(batchProgress.status)}
              Newsletter Batch Progress
            </CardTitle>
            <CardDescription>
              Tracking progress for batch: {batchProgress.batchId}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={getStatusColor(batchProgress.status)}>
                  {batchProgress.status.toUpperCase()}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  {batchProgress.sent + batchProgress.failed} / {batchProgress.total} processed
                </div>
              </div>

              <Progress 
                value={((batchProgress.sent + batchProgress.failed) / batchProgress.total) * 100} 
                className="w-full"
              />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-green-600">{batchProgress.sent}</div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">{batchProgress.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-yellow-600">{batchProgress.pending}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground text-center">
                Started: {formatDistanceToNow(new Date(batchProgress.startedAt), { addSuffix: true })}
                {batchProgress.completedAt && (
                  <> • Completed: {formatDistanceToNow(new Date(batchProgress.completedAt), { addSuffix: true })}</>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rate Limiting Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Rate Limiting Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Email Rate Limit:</span>
              <span className="font-medium">~1.67 emails/second</span>
            </div>
            <div className="flex justify-between">
              <span>Interval Between Emails:</span>
              <span className="font-medium">600ms</span>
            </div>
            <div className="flex justify-between">
              <span>Provider:</span>
              <span className="font-medium">Resend (Free Tier)</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              All newsletter emails are queued and sent with rate limiting to prevent hitting provider limits.
              Large newsletters may take several minutes to complete.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}