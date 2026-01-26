import { useState, useEffect, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, Download, UserX, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/apiHelpers';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Subscriber {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  subscribed_at: string;
  unsubscribed_at?: string;
  source: string;
}

interface ImportResult {
  success: boolean;
  total_processed: number;
  added: number;
  duplicates: number;
  invalid: number;
  duplicate_emails?: string[];
  invalid_emails?: string[];
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setCsvFile(file);
      setImportResult(null);
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      // Skip header if it exists (check if first line contains "email")
      const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0;
      
      // Extract emails (handle both single column and multi-column CSV)
      const emails = lines.slice(startIndex).map(line => {
        // Split by comma and take the first column that looks like an email
        const columns = line.split(',').map(col => col.trim().replace(/['"]/g, ''));
        const emailColumn = columns.find(col => col.includes('@')) || columns[0];
        return emailColumn;
      }).filter(email => email && email.includes('@'));

      if (emails.length === 0) {
        toast.error('No valid emails found in CSV file');
        setIsImporting(false);
        return;
      }

      console.log('Importing emails:', emails);

      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      
      console.log('API URL:', `${baseUrl}/api/admin/newsletter/subscribers/import`);
      
      const response = await fetch(`${baseUrl}/api/admin/newsletter/subscribers/import`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to import');
      }

      const result: ImportResult = await response.json();
      console.log('Import result:', result);
      setImportResult(result);

      if (result.added > 0) {
        toast.success(`Successfully added ${result.added} new subscriber(s)`);
        loadSubscribers();
      } else {
        toast.info('No new subscribers were added');
      }
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import subscribers';
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseImportDialog = () => {
    setShowImportDialog(false);
    setCsvFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        <Button onClick={() => setShowImportDialog(true)} variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
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

      {/* CSV Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={handleCloseImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Subscribers from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file containing email addresses to add new subscribers
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* CSV Format Guide */}
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">CSV Format Requirements:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>One email address per line</li>
                    <li>Optional header row (will be automatically detected)</li>
                    <li>Supports single or multiple columns (first email column will be used)</li>
                  </ul>
                  <div className="mt-3 p-2 bg-muted rounded text-sm font-mono">
                    <div>Example format:</div>
                    <div className="mt-1">email</div>
                    <div>user1@example.com</div>
                    <div>user2@example.com</div>
                    <div>user3@example.com</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* File Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select CSV File</label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                {csvFile && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {csvFile.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className="space-y-3">
                <Alert className={importResult.added > 0 ? 'border-green-500' : 'border-yellow-500'}>
                  {importResult.added > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Import Summary:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Total Processed: <span className="font-semibold">{importResult.total_processed}</span></div>
                        <div className="text-green-600">New Added: <span className="font-semibold">{importResult.added}</span></div>
                        <div className="text-yellow-600">Duplicates Skipped: <span className="font-semibold">{importResult.duplicates}</span></div>
                        <div className="text-red-600">Invalid Emails: <span className="font-semibold">{importResult.invalid}</span></div>
                      </div>
                      
                      {importResult.duplicate_emails && importResult.duplicate_emails.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-yellow-600 hover:underline">
                            View duplicate emails ({importResult.duplicate_emails.length})
                          </summary>
                          <div className="mt-2 max-h-32 overflow-y-auto text-xs bg-muted p-2 rounded">
                            {importResult.duplicate_emails.map((email, idx) => (
                              <div key={idx}>{email}</div>
                            ))}
                          </div>
                        </details>
                      )}
                      
                      {importResult.invalid_emails && importResult.invalid_emails.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-red-600 hover:underline">
                            View invalid emails ({importResult.invalid_emails.length})
                          </summary>
                          <div className="mt-2 max-h-32 overflow-y-auto text-xs bg-muted p-2 rounded">
                            {importResult.invalid_emails.map((email, idx) => (
                              <div key={idx}>{email}</div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseImportDialog}>
              Close
            </Button>
            <Button 
              onClick={handleImportCSV} 
              disabled={!csvFile || isImporting}
            >
              {isImporting ? 'Importing...' : 'Import Subscribers'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
