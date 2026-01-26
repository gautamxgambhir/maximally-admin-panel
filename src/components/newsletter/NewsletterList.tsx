import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Trash2, Send, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/apiHelpers';
import { ConfirmModal } from '@/components/ConfirmModal';

interface Newsletter {
  id: string;
  subject: string;
  status: 'draft' | 'ready_to_send' | 'pending' | 'sent';
  created_at: string;
  scheduled_for?: string;
  sent_at?: string;
  total_recipients: number;
  total_sent: number;
}

interface NewsletterListProps {
  onEdit: (id: string) => void;
}

export function NewsletterList({ onEdit }: NewsletterListProps) {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingPending, setIsSendingPending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null });
  const [sendPendingConfirm, setSendPendingConfirm] = useState(false);

  useEffect(() => {
    loadNewsletters();
  }, []);

  const loadNewsletters = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/list`, { headers });
      if (!response.ok) throw new Error('Failed to load newsletters');
      
      const data = await response.json();
      setNewsletters(data);
    } catch (error) {
      toast.error('Failed to load newsletters');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm({ show: true, id });
  };

  const confirmDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ show: false, id: null });
    
    if (!id) return;

    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) throw new Error('Failed to delete newsletter');

      toast.success('Newsletter has been deleted successfully');

      loadNewsletters();
    } catch (error) {
      toast.error('Failed to delete newsletter');
    }
  };

  const handleSendPending = async () => {
    setSendPendingConfirm(true);
  };

  const confirmSendPending = async () => {
    setSendPendingConfirm(false);
    setIsSendingPending(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/send-pending`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) throw new Error('Failed to send pending newsletters');

      const data = await response.json();
      toast.success(data.message || 'Pending newsletters sent');

      loadNewsletters();
    } catch (error) {
      toast.error('Failed to send pending newsletters');
    } finally {
      setIsSendingPending(false);
    }
  };

  const getStatusBadge = (status: Newsletter['status']) => {
    const variants = {
      draft: 'secondary',
      ready_to_send: 'default',
      pending: 'destructive',
      sent: 'success',
    } as const;

    const labels = {
      draft: 'Draft',
      ready_to_send: 'Ready to Send',
      pending: 'Pending',
      sent: 'Sent',
    } as const;

    return (
      <Badge variant={variants[status] as any}>
        {labels[status]}
      </Badge>
    );
  };

  const handleChangeStatus = async (newsletterId: string, newStatus: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/change-status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: newsletterId,
          status: newStatus,
        }),
      });

      if (!response.ok) throw new Error('Failed to change status');

      toast.success(`Newsletter status changed to ${newStatus.replace('_', ' ')}`);
      loadNewsletters();
    } catch (error) {
      toast.error('Failed to change newsletter status');
    }
  };

  const hasPendingNewsletters = newsletters.some(n => n.status === 'pending');
  const hasReadyToSendNewsletters = newsletters.some(n => n.status === 'ready_to_send');

  if (isLoading) {
    return <div className="text-center py-8">Loading newsletters...</div>;
  }

  if (newsletters.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No newsletters yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create your first newsletter to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(hasPendingNewsletters || hasReadyToSendNewsletters) && (
        <div className="space-y-3">
          {hasPendingNewsletters && (
            <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium text-orange-900 dark:text-orange-100">Pending Newsletters</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Newsletters with individual scheduling waiting to be sent
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    try {
                      const baseUrl = getApiBaseUrl();
                      const headers = await getAuthHeaders();
                      const response = await fetch(`${baseUrl}/api/admin/newsletter/send-pending-now`, {
                        method: 'POST',
                        headers,
                      });
                      const result = await response.json();
                      if (response.ok) {
                        toast.success(result.message || 'Pending newsletters sent immediately!');
                        loadNewsletters();
                      } else {
                        toast.error(result.error || 'Failed to send newsletters');
                      }
                    } catch (error) {
                      toast.error('Failed to send newsletters');
                    }
                  }}
                  variant="destructive"
                  size="sm"
                >
                  Send NOW (IST)
                </Button>
                <Button
                  onClick={handleSendPending}
                  disabled={isSendingPending}
                  variant="default"
                  size="sm"
                >
                  {isSendingPending ? 'Sending...' : 'Send Pending'}
                </Button>
              </div>
            </div>
          )}

          {hasReadyToSendNewsletters && (
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Ready to Send</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Newsletters waiting for the next global scheduled time
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  // Navigate to schedule settings
                  toast.info('Configure global schedule in the Schedule tab');
                }}
                variant="outline"
                size="sm"
              >
                View Schedule
              </Button>
            </div>
          )}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Scheduled/Sent</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {newsletters.map((newsletter) => (
            <TableRow key={newsletter.id}>
              <TableCell className="font-medium">{newsletter.subject}</TableCell>
              <TableCell>{getStatusBadge(newsletter.status)}</TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(newsletter.created_at), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell>
                {newsletter.scheduled_for && (
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3" />
                    {new Date(newsletter.scheduled_for).toLocaleString()}
                  </div>
                )}
                {newsletter.sent_at && (
                  <div className="flex items-center gap-1 text-sm">
                    <Send className="h-3 w-3" />
                    {new Date(newsletter.sent_at).toLocaleString()}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {newsletter.status === 'sent'
                  ? `${newsletter.total_sent} / ${newsletter.total_recipients}`
                  : newsletter.total_recipients}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {newsletter.status === 'draft' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(newsletter.id)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChangeStatus(newsletter.id, 'ready_to_send')}
                        title="Mark as Ready to Send"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {newsletter.status === 'ready_to_send' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChangeStatus(newsletter.id, 'draft')}
                      title="Move back to Draft"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {newsletter.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChangeStatus(newsletter.id, 'draft')}
                      title="Move back to Draft"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(newsletter.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Newsletter?"
        message="Are you sure you want to delete this newsletter? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={sendPendingConfirm}
        onClose={() => setSendPendingConfirm(false)}
        onConfirm={confirmSendPending}
        title="Send Pending Newsletters?"
        message="This will send all newsletters that are past their scheduled time. Are you sure you want to continue?"
        confirmText="Send Now"
        variant="warning"
        isLoading={isSendingPending}
      />
    </div>
  );
}
