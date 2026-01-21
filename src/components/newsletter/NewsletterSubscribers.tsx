import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Download, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/apiHelpers';
import { ConfirmModal } from '@/components/ConfirmModal';

interface Subscriber {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  subscribed_at: string;
  unsubscribed_at?: string;
  source: string;
}

export function NewsletterSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [unsubscribeConfirm, setUnsubscribeConfirm] = useState<{ show: boolean; id: string | null; email: string }>({ 
    show: false, 
    id: null, 
    email: '' 
  });

  useEffect(() => {
    loadSubscribers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredSubscribers(
        subscribers.filter((sub) =>
          sub.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredSubscribers(subscribers);
    }
  }, [searchQuery, subscribers]);

  const loadSubscribers = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/subscribers`, { headers });
      if (!response.ok) throw new Error('Failed to load subscribers');
      
      const data = await response.json();
      setSubscribers(data);
      setFilteredSubscribers(data);
    } catch (error) {
      toast.error('Failed to load subscribers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async (id: string, email: string) => {
    setUnsubscribeConfirm({ show: true, id, email });
  };

  const confirmUnsubscribe = async () => {
    const { id, email } = unsubscribeConfirm;
    setUnsubscribeConfirm({ show: false, id: null, email: '' });
    
    if (!id) return;

    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/subscribers/${id}/unsubscribe`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) throw new Error('Failed to unsubscribe');

      toast.success(`${email} has been unsubscribed`);

      loadSubscribers();
    } catch (error) {
      toast.error('Failed to unsubscribe user');
    }
  };

  const handleExport = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/subscribers/export`, { headers });
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Subscribers list has been exported');
    } catch (error) {
      toast.error('Failed to export subscribers');
    }
  };

  const activeCount = subscribers.filter((s) => s.status === 'active').length;
  const unsubscribedCount = subscribers.filter((s) => s.status === 'unsubscribed').length;

  if (isLoading) {
    return <div className="text-center py-8">Loading subscribers...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Total Subscribers</p>
          <p className="text-2xl font-bold">{subscribers.length}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Unsubscribed</p>
          <p className="text-2xl font-bold text-red-600">{unsubscribedCount}</p>
        </div>
      </div>

      {/* Search and Export */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Subscribers Table */}
      {filteredSubscribers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? 'No subscribers found' : 'No subscribers yet'}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Subscribed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscribers.map((subscriber) => (
              <TableRow key={subscriber.id}>
                <TableCell className="font-medium">{subscriber.email}</TableCell>
                <TableCell>
                  <Badge variant={subscriber.status === 'active' ? 'default' : 'secondary'}>
                    {subscriber.status}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{subscriber.source.replace('_', ' ')}</TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(subscriber.subscribed_at), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  {subscriber.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnsubscribe(subscriber.id, subscriber.email)}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmModal
        isOpen={unsubscribeConfirm.show}
        onClose={() => setUnsubscribeConfirm({ show: false, id: null, email: '' })}
        onConfirm={confirmUnsubscribe}
        title="Unsubscribe User?"
        message={`Are you sure you want to unsubscribe ${unsubscribeConfirm.email}? They will no longer receive newsletters.`}
        confirmText="Unsubscribe"
        variant="warning"
      />
    </div>
  );
}
