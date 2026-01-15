/**
 * Enhanced Admin Dashboard Page
 * 
 * Production-grade dashboard with metrics, trends, and alerts.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Trophy,
  ClipboardList,
  Activity,
  Shield,
  TrendingUp,
  AlertTriangle,
  Calendar,
  FileText,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricCard } from '@/components/MetricCard';
import { TrendChart } from '@/components/TrendChart';
import { AlertBanner } from '@/components/AlertBanner';
import { FeaturedEvents } from '@/components/FeaturedEvents';
import { FeaturedBlogs } from '@/components/FeaturedBlogs';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalyticsOverview, usePeriodComparison } from '@/hooks/useAnalytics';
import { usePendingQueueCount } from '@/hooks/useQueue';
import type { AnalyticsTimeRange } from '@/types/analytics';

/**
 * Time range selector options
 */
const TIME_RANGE_OPTIONS: { value: AnalyticsTimeRange; label: string }[] = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

/**
 * System health indicator component
 */
function SystemHealthIndicator({ health }: { health: 'healthy' | 'degraded' | 'critical' }) {
  const config = {
    healthy: {
      color: 'bg-green-500',
      text: 'All Systems Operational',
      textColor: 'text-green-600 dark:text-green-400',
    },
    degraded: {
      color: 'bg-yellow-500',
      text: 'Performance Degraded',
      textColor: 'text-yellow-600 dark:text-yellow-400',
    },
    critical: {
      color: 'bg-red-500',
      text: 'System Issues Detected',
      textColor: 'text-red-600 dark:text-red-400',
    },
  };

  const { color, text, textColor } = config[health];

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color} animate-pulse`} />
      <span className={`text-sm font-medium ${textColor}`}>{text}</span>
    </div>
  );
}

/**
 * Quick actions card component
 */
function QuickActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
        <CardDescription>Common administrative tasks</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button asChild variant="outline" className="justify-start">
          <Link to="/queue">
            <ClipboardList className="mr-2 h-4 w-4" />
            Review Moderation Queue
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/hackathons">
            <Trophy className="mr-2 h-4 w-4" />
            Manage Hackathons
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/user-moderation">
            <Users className="mr-2 h-4 w-4" />
            User Moderation
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/audit">
            <FileText className="mr-2 h-4 w-4" />
            View Audit Logs
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function EnhancedDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('7d');
  
  // Fetch analytics data
  const { 
    data: overview, 
    isLoading: overviewLoading,
    error: overviewError,
  } = useAnalyticsOverview(timeRange);
  
  // Fetch period comparisons for metrics
  const { data: usersComparison } = usePeriodComparison('users', timeRange);
  const { data: hackathonsComparison } = usePeriodComparison('hackathons', timeRange);
  const { data: registrationsComparison } = usePeriodComparison('registrations', timeRange);
  const { data: moderationComparison } = usePeriodComparison('moderation_actions', timeRange);
  
  // Fetch pending queue count
  const { data: pendingQueueCount } = usePendingQueueCount();

  const metrics = overview?.metrics;
  const trends = overview?.trends;
  const alerts = overview?.alerts ?? [];

  // Loading state
  if (overviewLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (overviewError) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load dashboard data. Please try again.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.email}! Here's your platform overview.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {metrics && (
            <SystemHealthIndicator health={metrics.systemHealth} />
          )}
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as AnalyticsTimeRange)}>
            <TabsList>
              {TIME_RANGE_OPTIONS.map(option => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <AlertBanner alerts={alerts} maxVisible={2} />
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={metrics?.totalUsers ?? 0}
          icon={Users}
          href="/user-moderation"
          description="All registered users"
        />
        <MetricCard
          title="New Users"
          value={metrics?.newUsersWeek ?? 0}
          change={usersComparison?.percentageChange}
          changeType={usersComparison?.trend === 'up' ? 'increase' : usersComparison?.trend === 'down' ? 'decrease' : 'neutral'}
          icon={UserPlus}
          description="This week"
        />
        <MetricCard
          title="Active Hackathons"
          value={metrics?.activeHackathons ?? 0}
          change={hackathonsComparison?.percentageChange}
          changeType={hackathonsComparison?.trend === 'up' ? 'increase' : hackathonsComparison?.trend === 'down' ? 'decrease' : 'neutral'}
          icon={Trophy}
          href="/hackathons"
          description="Currently published"
        />
        <MetricCard
          title="Pending Reviews"
          value={pendingQueueCount ?? metrics?.pendingReviews ?? 0}
          icon={ClipboardList}
          href="/queue"
          description="Items in queue"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Registrations"
          value={metrics?.totalRegistrations ?? 0}
          change={registrationsComparison?.percentageChange}
          changeType={registrationsComparison?.trend === 'up' ? 'increase' : registrationsComparison?.trend === 'down' ? 'decrease' : 'neutral'}
          icon={Calendar}
          description="All time"
        />
        <MetricCard
          title="New Users Today"
          value={metrics?.newUsersToday ?? 0}
          icon={UserPlus}
          description="Signed up today"
        />
        <MetricCard
          title="New Users (Month)"
          value={metrics?.newUsersMonth ?? 0}
          icon={TrendingUp}
          description="Last 30 days"
        />
        <MetricCard
          title="Moderation Actions"
          value={metrics?.moderationActionsToday ?? 0}
          change={moderationComparison?.percentageChange}
          changeType={moderationComparison?.trend === 'up' ? 'increase' : moderationComparison?.trend === 'down' ? 'decrease' : 'neutral'}
          icon={Shield}
          href="/audit"
          description="Today"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TrendChart
          title="User Growth"
          description="New user signups over time"
          data={trends?.users ?? []}
          color="#3b82f6"
          loading={overviewLoading}
        />
        <TrendChart
          title="Registrations"
          description="Hackathon registrations over time"
          data={trends?.registrations ?? []}
          color="#10b981"
          loading={overviewLoading}
        />
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hackathon Trend */}
        <div className="lg:col-span-2">
          <TrendChart
            title="Hackathon Creation"
            description="New hackathons created over time"
            data={trends?.hackathons ?? []}
            color="#8b5cf6"
            loading={overviewLoading}
            height={250}
          />
        </div>
        
        {/* Quick Actions */}
        <QuickActionsCard />
      </div>

      {/* Featured Events Management */}
      <FeaturedEvents />

      {/* Featured Blogs Management */}
      <FeaturedBlogs />
    </div>
  );
}

export default EnhancedDashboard;
