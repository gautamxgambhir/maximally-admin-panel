/**
 * AlertBanner Component
 * 
 * Displays alert banners for anomalies and system issues.
 * Requirements: 8.3 - Highlight unusual patterns with alerts
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  X, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertOctagon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AnalyticsAlert, AlertSeverity, AlertType } from '@/types/analytics';

export interface AlertBannerProps {
  alerts: AnalyticsAlert[];
  onDismiss?: (alertId: string) => void;
  maxVisible?: number;
  className?: string;
}

/**
 * Get icon for alert type
 */
function getAlertIcon(type: AlertType) {
  switch (type) {
    case 'spike':
      return TrendingUp;
    case 'drop':
      return TrendingDown;
    case 'threshold_exceeded':
      return AlertOctagon;
    case 'anomaly':
      return Activity;
    case 'system_error':
      return AlertCircle;
    case 'performance_degradation':
      return AlertTriangle;
    default:
      return Info;
  }
}

/**
 * Get styles for alert severity
 */
function getSeverityStyles(severity: AlertSeverity): {
  container: string;
  icon: string;
  text: string;
} {
  switch (severity) {
    case 'critical':
      return {
        container: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900',
        icon: 'text-red-600 dark:text-red-400',
        text: 'text-red-800 dark:text-red-200',
      };
    case 'warning':
      return {
        container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-900',
        icon: 'text-yellow-600 dark:text-yellow-400',
        text: 'text-yellow-800 dark:text-yellow-200',
      };
    case 'info':
    default:
      return {
        container: 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-900',
        icon: 'text-blue-600 dark:text-blue-400',
        text: 'text-blue-800 dark:text-blue-200',
      };
  }
}

/**
 * Single alert item component
 */
function AlertItem({
  alert,
  onDismiss,
}: {
  alert: AnalyticsAlert;
  onDismiss?: (alertId: string) => void;
}) {
  const Icon = getAlertIcon(alert.type);
  const styles = getSeverityStyles(alert.severity);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        styles.container
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', styles.icon)} />
      <div className="flex-1 min-w-0">
        <h4 className={cn('text-sm font-medium', styles.text)}>
          {alert.title}
        </h4>
        <p className={cn('text-sm mt-1 opacity-90', styles.text)}>
          {alert.message}
        </p>
        {alert.metric && alert.currentValue !== undefined && (
          <p className={cn('text-xs mt-2 opacity-75', styles.text)}>
            {alert.metric}: {alert.currentValue.toLocaleString()}
            {alert.threshold !== undefined && (
              <> (threshold: {alert.threshold.toLocaleString()})</>
            )}
          </p>
        )}
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-6 w-6 p-0 opacity-70 hover:opacity-100', styles.text)}
          onClick={() => onDismiss(alert.id)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      )}
    </div>
  );
}

export function AlertBanner({
  alerts,
  onDismiss,
  maxVisible = 3,
  className,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  // Filter out dismissed alerts and sort by severity
  const visibleAlerts = alerts
    .filter(alert => !dismissed.has(alert.id) && !alert.acknowledged)
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

  if (visibleAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (alertId: string) => {
    setDismissed(prev => new Set(prev).add(alertId));
    onDismiss?.(alertId);
  };

  const displayedAlerts = expanded 
    ? visibleAlerts 
    : visibleAlerts.slice(0, maxVisible);
  const hiddenCount = visibleAlerts.length - maxVisible;

  return (
    <div className={cn('space-y-3', className)}>
      {displayedAlerts.map(alert => (
        <AlertItem
          key={alert.id}
          alert={alert}
          onDismiss={handleDismiss}
        />
      ))}
      
      {hiddenCount > 0 && !expanded && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => setExpanded(true)}
        >
          Show {hiddenCount} more alert{hiddenCount > 1 ? 's' : ''}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
      
      {expanded && visibleAlerts.length > maxVisible && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => setExpanded(false)}
        >
          Show less
        </Button>
      )}
    </div>
  );
}

/**
 * Compact alert banner for navigation/header
 */
export function CompactAlertBanner({
  alerts,
  href = '/activity',
}: {
  alerts: AnalyticsAlert[];
  href?: string;
}) {
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const warningCount = alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length;
  const totalCount = criticalCount + warningCount;

  if (totalCount === 0) {
    return null;
  }

  const severity: AlertSeverity = criticalCount > 0 ? 'critical' : 'warning';
  const styles = getSeverityStyles(severity);

  return (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
        styles.container,
        'hover:opacity-90'
      )}
    >
      <AlertTriangle className={cn('h-4 w-4', styles.icon)} />
      <span className={styles.text}>
        {totalCount} alert{totalCount > 1 ? 's' : ''} detected
      </span>
      <ChevronRight className={cn('h-4 w-4 ml-auto', styles.icon)} />
    </Link>
  );
}

export default AlertBanner;
