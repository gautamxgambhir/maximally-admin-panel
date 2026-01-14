/**
 * TrendChart Component
 * 
 * Displays line/area charts for user growth, registrations, etc.
 * Requirements: 8.2 - Show interactive charts for trends over customizable time periods
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TimeSeriesDataPoint } from '@/types/analytics';

export interface TrendChartProps {
  title: string;
  description?: string;
  data: TimeSeriesDataPoint[];
  dataKey?: string;
  color?: string;
  showComparison?: boolean;
  comparisonColor?: string;
  loading?: boolean;
  height?: number;
}

/**
 * Format date for display on X axis
 */
function formatDate(dateStr: string): string {
  // Handle different date formats
  if (dateStr.includes('T')) {
    // Hour format: 2024-01-15T14:00
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  
  // Day/Week format: 2024-01-15
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}/${day}`;
  }
  
  // Month format: 2024-01
  if (parts.length === 2) {
    const date = new Date(dateStr + '-01');
    return date.toLocaleDateString('en-US', { month: 'short' });
  }
  
  return dateStr;
}

/**
 * Custom tooltip component
 */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function TrendChart({
  title,
  description,
  data,
  dataKey = 'value',
  color = '#3b82f6',
  showComparison = false,
  comparisonColor = '#94a3b8',
  loading = false,
  height = 300,
}: TrendChartProps) {
  // Transform data for chart
  const chartData = data.map(point => ({
    date: formatDate(point.date),
    [dataKey]: point.value,
    ...(showComparison && point.previousValue !== undefined
      ? { previous: point.previousValue }
      : {}),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div 
            className="flex items-center justify-center bg-muted/50 rounded animate-pulse"
            style={{ height }}
          >
            <span className="text-muted-foreground">Loading chart...</span>
          </div>
        ) : data.length === 0 ? (
          <div 
            className="flex items-center justify-center bg-muted/50 rounded"
            style={{ height }}
          >
            <span className="text-muted-foreground">No data available</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
                {showComparison && (
                  <linearGradient id="gradient-previous" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={comparisonColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={comparisonColor} stopOpacity={0} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              {showComparison && (
                <>
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="previous"
                    name="Previous Period"
                    stroke={comparisonColor}
                    fill="url(#gradient-previous)"
                    strokeWidth={2}
                    dot={false}
                  />
                </>
              )}
              <Area
                type="monotone"
                dataKey={dataKey}
                name="Current Period"
                stroke={color}
                fill={`url(#gradient-${dataKey})`}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default TrendChart;
