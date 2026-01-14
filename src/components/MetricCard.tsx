/**
 * MetricCard Component
 * 
 * Displays a metric value with trend indicators showing change percentage.
 * Requirements: 8.1 - Display key metrics with comparison indicators
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: LucideIcon;
  href?: string;
  format?: 'number' | 'percentage' | 'currency';
  description?: string;
  loading?: boolean;
}

/**
 * Format a number for display based on format type
 */
function formatValue(value: number | string, format: 'number' | 'percentage' | 'currency' = 'number'): string {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'number':
    default:
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
  }
}

/**
 * Get trend icon based on change type
 */
function getTrendIcon(changeType: 'increase' | 'decrease' | 'neutral' | undefined) {
  switch (changeType) {
    case 'increase':
      return TrendingUp;
    case 'decrease':
      return TrendingDown;
    default:
      return Minus;
  }
}

/**
 * Get trend color class based on change type
 */
function getTrendColorClass(changeType: 'increase' | 'decrease' | 'neutral' | undefined): string {
  switch (changeType) {
    case 'increase':
      return 'text-green-600 dark:text-green-400';
    case 'decrease':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-muted-foreground';
  }
}

export function MetricCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  href,
  format = 'number',
  description,
  loading = false,
}: MetricCardProps) {
  const TrendIcon = getTrendIcon(changeType);
  const trendColorClass = getTrendColorClass(changeType);
  
  const cardContent = (
    <Card className={cn(
      "transition-all duration-200",
      href && "hover:shadow-md hover:border-primary/50 cursor-pointer"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {formatValue(value, format)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {change !== undefined && (
                <>
                  <TrendIcon className={cn("h-3 w-3", trendColorClass)} />
                  <span className={cn("text-xs font-medium", trendColorClass)}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                </>
              )}
              {description && (
                <span className="text-xs text-muted-foreground ml-1">
                  {description}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

export default MetricCard;
