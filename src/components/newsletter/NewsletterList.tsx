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
  status: 'draft' | 'pending' | 'sent';
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
      pending: 'default',
      sent: 'success',
    } as const;

    return (
      <Badge variant={variants[status] as any}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const hasPendingNewsletters = newsletters.some(n => n.status === 'pending');

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
      {hasPendingNewsletters && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium">Pending Newsletters</p>
              <p className="text-sm text-muted-foreground">
                You have scheduled newsletters waiting to be sent
              </p>
            </div>
          </div>
          <Button
            onClick={handleSendPending}
            disabled={isSendingPending}
            variant="default"
          >
            {isSendingPending ? 'Sending...' : 'Send Pending Now'}
          </Button>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(newsletter.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(newsletter.id)}
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
