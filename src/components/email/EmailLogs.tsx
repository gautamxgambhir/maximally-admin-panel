import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Trash2, CheckCircle, XCircle, Mail } from 'lucide-react'
import { useEmailLogs, useDeleteEmailLog } from '@/hooks/useEmailTemplates'
import type { EmailStatus } from '@/types/email'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function EmailLogs() {
  const { data: logs = [], isLoading } = useEmailLogs()
  const deleteLog = useDeleteEmailLog()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [logToDelete, setLogToDelete] = useState<string | null>(null)

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.recipients.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDelete = (id: string) => {
    setLogToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (logToDelete) {
      deleteLog.mutate(logToDelete)
      setDeleteDialogOpen(false)
      setLogToDelete(null)
    }
  }

  const getStatusIcon = (status: EmailStatus) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Mail className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: EmailStatus) => {
    const variants: Record<EmailStatus, any> = {
      sent: 'default',
      failed: 'destructive',
      pending: 'secondary',
    }
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading logs...</div>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No email logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="border rounded-lg p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    <h3 className="font-semibold">{log.subject}</h3>
                    {getStatusBadge(log.status)}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <span className="font-medium">Template:</span> {log.template_name}
                    </p>
                    <p>
                      <span className="font-medium">Recipients:</span>{' '}
                      {log.recipients.length} recipient{log.recipients.length !== 1 ? 's' : ''}
                    </p>
                    <p>
                      <span className="font-medium">Sent:</span>{' '}
                      {format(new Date(log.sent_at), 'PPpp')}
                    </p>
                    {log.error_message && (
                      <p className="text-red-500">
                        <span className="font-medium">Error:</span> {log.error_message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {log.recipients.slice(0, 5).map((recipient, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {recipient}
                      </Badge>
                    ))}
                    {log.recipients.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{log.recipients.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(log.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Log</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this log entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
