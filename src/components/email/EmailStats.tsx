import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, FileText, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { useEmailStats } from '@/hooks/useEmailTemplates'
import { Badge } from '@/components/ui/badge'
import type { EmailCategory } from '@/types/email'

const categoryColors: Record<EmailCategory, string> = {
  judges: 'bg-blue-500',
  sponsors: 'bg-purple-500',
  participants: 'bg-green-500',
  general: 'bg-gray-500',
  custom: 'bg-orange-500',
}

export function EmailStats() {
  const { data: stats, isLoading, error } = useEmailStats()

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Loading stats...</div>
        <p className="text-xs text-muted-foreground mt-2">This may take a moment</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Failed to load stats</p>
            <p className="text-sm mt-2">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const successRate = stats.totalSent + stats.totalFailed > 0
    ? ((stats.totalSent / (stats.totalSent + stats.totalFailed)) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            <p className="text-xs text-muted-foreground">
              Active email templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFailed}</div>
            <p className="text-xs text-muted-foreground">
              Delivery failures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Delivery success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Templates by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Templates by Category</CardTitle>
          <CardDescription>Distribution of email templates across categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.templatesByCategory).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={categoryColors[category as EmailCategory]}>
                    {category}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-48 bg-secondary rounded-full h-2">
                    <div
                      className={`${categoryColors[category as EmailCategory]} h-2 rounded-full`}
                      style={{
                        width: `${(count / stats.totalTemplates) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest email sends</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                  <div className="space-y-1">
                    <p className="font-medium">{log.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {log.template_name} • {log.recipients.length} recipient{log.recipients.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                      {log.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
