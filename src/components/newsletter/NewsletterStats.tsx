import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Users, Send, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/apiHelpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  date: string;
  subscribed: number;
  unsubscribed: number;
}

interface Stats {
  total_subscribers: number;
  active_subscribers: number;
  total_newsletters_sent: number;
  total_emails_sent: number;
  average_open_rate: number;
  recent_growth: number;
  chart_data?: ChartDataPoint[];
}

export function NewsletterStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/stats`, { headers });
      if (!response.ok) throw new Error('Failed to load stats');
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8">No statistics available</div>;
  }

  const statCards = [
    {
      title: 'Total Subscribers',
      value: stats.total_subscribers,
      description: `${stats.active_subscribers} active`,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Newsletters Sent',
      value: stats.total_newsletters_sent,
      description: 'All time',
      icon: Mail,
      color: 'text-purple-600',
    },
    {
      title: 'Total Emails Delivered',
      value: stats.total_emails_sent,
      description: 'Successfully sent',
      icon: Send,
      color: 'text-green-600',
    },
    {
      title: 'Recent Growth',
      value: `+${stats.recent_growth}`,
      description: 'Last 30 days',
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.chart_data && stats.chart_data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subscriber Trends</CardTitle>
            <CardDescription>Daily subscriptions and unsubscriptions over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={stats.chart_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString();
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="subscribed" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Subscribed"
                  dot={{ fill: '#10b981' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="unsubscribed" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Unsubscribed"
                  dot={{ fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
