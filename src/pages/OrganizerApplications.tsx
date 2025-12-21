import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  Check,
  X,
  Clock,
  User,
  Mail,
  MapPin,
  Building,
  Calendar,
  Users,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Globe,
  Phone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const getAuthToken = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

interface OrganizerApplication {
  id: string;
  user_id?: string;
  username: string;
  email: string;
  full_name: string;
  organization_name?: string;
  organization_type?: string;
  organization_website?: string;
  phone: string;
  location: string;
  previous_organizing_experience: string;
  why_maximally: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  additional_info?: string;
  agreed_to_terms: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export default function OrganizerApplications() {
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<OrganizerApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch applications
  const { data: applications = [], isLoading } = useQuery<OrganizerApplication[]>({
    queryKey: ['organizer-applications'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/organizer-applications`, {
        headers
      });
      if (!response.ok) throw new Error('Failed to fetch applications');
      return response.json();
    }
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();
      console.log('Approving application:', id);
      console.log('API URL:', `${import.meta.env.VITE_API_BASE_URL}/api/admin/organizer-applications/${id}/approve`);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/organizer-applications/${id}/approve`,
        {
          method: 'POST',
          headers
        }
      );
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Approval failed:', errorData);
        throw new Error(errorData.message || 'Failed to approve application');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer-applications'] });
      toast.success('Application approved successfully');
      setSelectedApplication(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve application');
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/organizer-applications/${id}/reject`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason })
        }
      );
      if (!response.ok) throw new Error('Failed to reject application');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer-applications'] });
      toast.success('Application rejected');
      setSelectedApplication(null);
      setShowRejectDialog(false);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject application');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/organizer-applications/${id}`,
        {
          method: 'DELETE',
          headers
        }
      );
      if (!response.ok) throw new Error('Failed to delete application');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer-applications'] });
      toast.success('Application deleted');
      setSelectedApplication(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete application');
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      approved: { variant: 'default', icon: CheckCircle2, label: 'Approved' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
      under_review: { variant: 'outline', icon: AlertCircle, label: 'Under Review' }
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filterByStatus = (status: string) => {
    if (status === 'all') return applications;
    return applications.filter(app => app.status === status);
  };

  const pendingCount = applications.filter(app => app.status === 'pending').length;
  const approvedCount = applications.filter(app => app.status === 'approved').length;
  const rejectedCount = applications.filter(app => app.status === 'rejected').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizer Applications</h1>
          <p className="text-gray-600 mt-1">Review and manage organizer applications</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {pendingCount} Pending
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedCount})</TabsTrigger>
        </TabsList>

        {['all', 'pending', 'approved', 'rejected'].map(status => (
          <TabsContent key={status} value={status} className="space-y-4">
            {filterByStatus(status).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No applications found
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filterByStatus(status).map(application => (
                  <Card key={application.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-lg">
                              {application.full_name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold">{application.full_name}</h3>
                              <p className="text-sm text-gray-500">@{application.username}</p>
                            </div>
                            {getStatusBadge(application.status)}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="truncate">{application.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>{application.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Building className="h-4 w-4 text-gray-400" />
                              <span>{application.organization_name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{new Date(application.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>


                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedApplication(application)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>

                          {application.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveMutation.mutate(application.id)}
                                disabled={approveMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedApplication(application);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this application?')) {
                                deleteMutation.mutate(application.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Application Details Dialog */}
      <Dialog open={!!selectedApplication && !showRejectDialog} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Application Details</DialogTitle>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="text-sm text-gray-500">Full Name</label>
                    <p className="text-gray-900">{selectedApplication.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Username</label>
                    <p className="text-gray-900">@{selectedApplication.username}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <p className="text-gray-900">{selectedApplication.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Location</label>
                    <p className="text-gray-900">{selectedApplication.location}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedApplication.status)}</div>
                  </div>
                </div>
              </div>

              {/* Organization Info */}
              {selectedApplication.organization_name && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Organization
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="text-sm text-gray-500">Name</label>
                      <p className="text-gray-900">{selectedApplication.organization_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Type</label>
                      <p className="text-gray-900 capitalize">{selectedApplication.organization_type?.replace('_', ' ')}</p>
                    </div>
                    {selectedApplication.organization_website && (
                      <div className="col-span-2">
                        <label className="text-sm text-gray-500">Website</label>
                        <a href={selectedApplication.organization_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          {selectedApplication.organization_website}
                          <Globe className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Experience */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Experience & Motivation</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Previous Organizing Experience</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedApplication.previous_organizing_experience}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Why Maximally?</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedApplication.why_maximally}</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              {(selectedApplication.linkedin || selectedApplication.twitter || selectedApplication.instagram) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Social Links</h3>
                  <div className="flex gap-4 bg-gray-50 p-4 rounded-lg">
                    {selectedApplication.linkedin && (
                      <a href={selectedApplication.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        LinkedIn
                      </a>
                    )}
                    {selectedApplication.twitter && (
                      <a href={selectedApplication.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Twitter
                      </a>
                    )}
                    {selectedApplication.instagram && (
                      <a href={selectedApplication.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Instagram
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              {selectedApplication.additional_info && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedApplication.additional_info}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedApplication.status === 'pending' && (
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => approveMutation.mutate(selectedApplication.id)}
                    disabled={approveMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve Application
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject Application
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Rejection Reason</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedApplication) {
                    rejectMutation.mutate({
                      id: selectedApplication.id,
                      reason: rejectionReason
                    });
                  }
                }}
                disabled={!rejectionReason || rejectMutation.isPending}
                className="flex-1"
              >
                Reject Application
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
