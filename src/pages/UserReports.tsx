import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Clock, CheckCircle2, XCircle, AlertTriangle, User, Calendar, Image, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabaseAdmin } from '@/lib/supabase';
import { toast } from 'sonner';

interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  category: string;
  description: string;
  screenshot_urls: string[];
  status: string;
  priority: string;
  admin_notes: string | null;
  resolution: string | null;
  created_at: string;
  reporter?: { id: string; username: string; full_name: string; avatar_url: string } | null;
  reported_user?: { id: string; username: string; full_name: string; avatar_url: string; email: string } | null;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  harassment: { label: 'Harassment', color: 'bg-red-500' },
  spam: { label: 'Spam', color: 'bg-yellow-500' },
  inappropriate_content: { label: 'Inappropriate Content', color: 'bg-orange-500' },
  impersonation: { label: 'Impersonation', color: 'bg-purple-500' },
  cheating: { label: 'Cheating', color: 'bg-pink-500' },
  hate_speech: { label: 'Hate Speech', color: 'bg-red-700' },
  scam: { label: 'Scam', color: 'bg-amber-600' },
  other: { label: 'Other', color: 'bg-gray-500' },
};


export default function UserReports() {
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolution, setResolution] = useState('');
  const [page, setPage] = useState(1);
  const [loadedReports, setLoadedReports] = useState<UserReport[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;
  const queryClient = useQueryClient();

  // Fetch reports directly from Supabase with pagination
  const { data: queryResult, isLoading, isFetching, error } = useQuery({
    queryKey: ['user-reports', page],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // First get the reports with pagination
      const { data: reportsData, error: reportsError, count } = await supabaseAdmin
        .from('user_reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (reportsError) {
        console.error('Error fetching reports:', reportsError);
        throw new Error(reportsError.message);
      }

      // Then get profile info for each report
      const reportsWithProfiles = await Promise.all(
        (reportsData || []).map(async (report: any) => {
          // Get reporter profile
          const { data: reporter } = await supabaseAdmin
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', report.reporter_id)
            .maybeSingle();

          // Get reported user profile
          const { data: reportedUser } = await supabaseAdmin
            .from('profiles')
            .select('id, username, full_name, avatar_url, email')
            .eq('id', report.reported_user_id)
            .maybeSingle();

          return {
            ...report,
            reporter,
            reported_user: reportedUser
          };
        })
      );

      return {
        reports: reportsWithProfiles as UserReport[],
        hasMore: count ? (from + pageSize) < count : false
      };
    }
  });

  const newReports = queryResult?.reports || [];

  // Update loaded reports and hasMore when new data arrives
  React.useEffect(() => {
    if (queryResult) {
      setHasMore(queryResult.hasMore);
      if (page === 1) {
        setLoadedReports(queryResult.reports);
      } else {
        setLoadedReports(prev => [...prev, ...queryResult.reports]);
      }
    }
  }, [queryResult, page]);

  const reports = loadedReports;

  // Update report directly in Supabase
  const updateReport = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabaseAdmin
        .from('user_reports')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-reports'] });
      toast.success('Report updated');
      setSelectedReport(null);
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'secondary', icon: Clock },
      under_review: { variant: 'outline', icon: Eye },
      resolved: { variant: 'default', icon: CheckCircle2 },
      dismissed: { variant: 'destructive', icon: XCircle }
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredReports = (status: string) => status === 'all' ? reports : reports.filter(r => r.status === status);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-500">Error loading reports</h2>
        <p className="text-gray-500 mt-2">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Reports</h1>
          <p className="text-gray-600 mt-2">Review and manage user reports</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {reports.filter(r => r.status === 'pending').length} Pending
        </Badge>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pending">Pending ({filteredReports('pending').length})</TabsTrigger>
          <TabsTrigger value="under_review">Under Review ({filteredReports('under_review').length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({filteredReports('resolved').length})</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed ({filteredReports('dismissed').length})</TabsTrigger>
          <TabsTrigger value="all">All ({reports.length})</TabsTrigger>
        </TabsList>

        {['pending', 'under_review', 'resolved', 'dismissed', 'all'].map(status => (
          <TabsContent key={status} value={status} className="space-y-4">
            {filteredReports(status).length === 0 ? (
              <Card><CardContent className="flex items-center justify-center h-32"><p className="text-gray-500">No {status.replace('_', ' ')} reports</p></CardContent></Card>
            ) : (
              <div className="grid gap-4">
                {filteredReports(status).map(report => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge className={CATEGORY_LABELS[report.category]?.color || 'bg-gray-500'}>
                                {CATEGORY_LABELS[report.category]?.label || report.category}
                              </Badge>
                              {getStatusBadge(report.status)}
                              {report.priority === 'urgent' && <Badge variant="destructive">URGENT</Badge>}
                              {report.priority === 'high' && <Badge variant="outline" className="border-red-500 text-red-500">HIGH</Badge>}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2 flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                Reported: <strong>@{report.reported_user?.username || 'Unknown'}</strong>
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                By: @{report.reporter?.username || 'Unknown'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(report.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-700 line-clamp-2">{report.description}</p>
                            {report.screenshot_urls?.length > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-sm text-blue-600">
                                <Image className="h-4 w-4" />
                                {report.screenshot_urls.length} screenshot(s)
                              </div>
                            )}
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedReport(report); setAdminNotes(report.admin_notes || ''); setResolution(report.resolution || ''); }}>
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Report Details</DialogTitle>
                            </DialogHeader>
                            {selectedReport && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <h4 className="font-semibold mb-2">Reported User</h4>
                                    <p className="font-medium">@{selectedReport.reported_user?.username || 'Unknown'}</p>
                                    <p className="text-sm text-gray-600">{selectedReport.reported_user?.full_name}</p>
                                    <p className="text-sm text-gray-600">{selectedReport.reported_user?.email}</p>
                                  </div>
                                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <h4 className="font-semibold mb-2">Reporter</h4>
                                    <p className="font-medium">@{selectedReport.reporter?.username || 'Unknown'}</p>
                                    <p className="text-sm text-gray-600">{selectedReport.reporter?.full_name}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Category</h4>
                                  <Badge className={CATEGORY_LABELS[selectedReport.category]?.color || 'bg-gray-500'}>
                                    {CATEGORY_LABELS[selectedReport.category]?.label || selectedReport.category}
                                  </Badge>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Description</h4>
                                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedReport.description}</p>
                                </div>
                                {selectedReport.screenshot_urls?.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Screenshots</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                      {selectedReport.screenshot_urls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                          <img src={url} alt={`Screenshot ${i + 1}`} className="rounded border hover:opacity-80 transition-opacity" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="space-y-4 pt-4 border-t">
                                  <div>
                                    <label className="text-sm font-medium">Admin Notes</label>
                                    <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Internal notes..." className="mt-1" />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Resolution</label>
                                    <Textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Resolution details..." className="mt-1" />
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    <Select onValueChange={val => updateReport.mutate({ id: selectedReport.id, updates: { priority: val } })}>
                                      <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button variant="outline" onClick={() => updateReport.mutate({ id: selectedReport.id, updates: { status: 'under_review', admin_notes: adminNotes } })}>Mark Under Review</Button>
                                    <Button variant="outline" className="text-gray-600" onClick={() => updateReport.mutate({ id: selectedReport.id, updates: { status: 'dismissed', admin_notes: adminNotes, resolution } })}>Dismiss</Button>
                                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => updateReport.mutate({ id: selectedReport.id, updates: { status: 'resolved', admin_notes: adminNotes, resolution } })}>Resolve</Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && filteredReports(status).length > 0 && (
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={() => setPage(p => p + 1)} 
                  disabled={isFetching}
                  variant="outline"
                  size="lg"
                >
                  {isFetching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}

            {!hasMore && filteredReports(status).length > 0 && (
              <div className="text-center text-gray-500 py-4">
                All reports loaded
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
