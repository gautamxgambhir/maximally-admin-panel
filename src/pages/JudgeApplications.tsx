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
  Award,
  ExternalLink,
  FileText,
  Calendar,
  Star,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Auth utility function for admin panel
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

interface JudgeApplication {
  id: string;
  username: string;
  full_name: string;
  profile_photo?: string;
  headline: string;
  short_bio: string;
  judge_location: string;
  role_title: string;
  company: string;
  primary_expertise: string[];
  secondary_expertise: string[];
  total_events_judged: number;
  total_teams_evaluated: number;
  total_mentorship_hours: number;
  years_of_experience: number;
  average_feedback_rating?: number;
  linkedin: string;
  github?: string;
  twitter?: string;
  website?: string;
  languages_spoken: string[];
  public_achievements?: string;
  mentorship_statement: string;
  availability_status: 'available' | 'not-available' | 'seasonal';
  email: string;
  phone?: string;
  resume?: string;
  proof_of_judging?: string;
  timezone?: string;
  calendar_link?: string;
  compensation_preference?: 'volunteer' | 'paid' | 'negotiable';
  judge_references?: string;
  conflict_of_interest?: string;
  agreed_to_nda: boolean;
  address?: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  judge_application_events?: JudgeApplicationEvent[];
}

interface JudgeApplicationEvent {
  id: string;
  application_id: string;
  event_name: string;
  event_role: string;
  event_date: string;
  event_link?: string;
  verified: boolean;
  created_at: string;
}

const JudgeApplications = () => {
  const [selectedApplication, setSelectedApplication] = useState<JudgeApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('starter');
  const [adminNotes, setAdminNotes] = useState('');
  const queryClient = useQueryClient();

  // Fetch judge applications directly from Supabase
  const { data: applications = [], isLoading, error } = useQuery({
    queryKey: ['judge-applications'],
    queryFn: async () => {
      try {
        console.log('📋 Fetching judge applications from Supabase...');

        const { data, error } = await supabase
          .from('judge_applications')
          .select(`
            *,
            judge_application_events (*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Supabase error:', error);
          throw new Error(error.message);
        }

        console.log('✅ Fetched applications:', data?.length || 0);
        return (data || []) as JudgeApplication[];
      } catch (error) {
        console.error('❌ Error fetching applications:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 30000
  });

  // Approve application mutation - use database function
  const approveApplication = useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: string }) => {
      console.log('✅ Approving application:', id, 'with tier:', tier);
      
      // Use the database function for atomic approval
      const { data, error } = await supabase.rpc('approve_judge_application', {
        application_id_param: parseInt(id, 10),
        tier_param: tier
      });

      if (error) {
        console.error('❌ Error approving application:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ Application approved successfully:', data);
      return data;
    },
    onSuccess: async () => {
      console.log('✅ Approve successful, refetching...');
      await queryClient.invalidateQueries({ queryKey: ['judge-applications'] });
      await queryClient.refetchQueries({ queryKey: ['judge-applications'] });
      toast.success('Application approved successfully!');
      setSelectedApplication(null);
    },
    onError: (error: Error) => {
      console.error('❌ Approve error:', error);
      toast.error(`Failed to approve: ${error.message}`);
    }
  });

  // Reject application mutation - use database function
  const rejectApplication = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      console.log('❌ Rejecting application:', id);
      
      // Use the database function for rejection
      const { data, error } = await supabase.rpc('reject_judge_application', {
        application_id_param: parseInt(id, 10),
        rejection_reason_param: reason
      });

      if (error) {
        console.error('❌ Error rejecting application:', error);
        throw new Error(error.message);
      }

      console.log('✅ Application rejected successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-applications'] });
      toast.success('Application rejected');
      setSelectedApplication(null);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      console.error('❌ Reject error:', error);
      toast.error(error.message);
    }
  });

  // Delete application mutation - use database function
  const deleteApplication = useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ Deleting application:', id);
      
      // Use the database function for deletion
      const { data, error } = await supabase.rpc('delete_judge_application', {
        application_id_param: parseInt(id, 10)
      });

      if (error) {
        console.error('❌ Error deleting application:', error);
        throw new Error(error.message);
      }

      console.log('✅ Application deleted successfully:', data);
      return data;
    },
    onSuccess: async () => {
      console.log('✅ Delete successful, refetching applications...');
      await queryClient.invalidateQueries({ queryKey: ['judge-applications'] });
      await queryClient.refetchQueries({ queryKey: ['judge-applications'] });
      toast.success('Application deleted successfully');
    },
    onError: (error: Error) => {
      console.error('❌ Delete mutation error:', error);
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      under_review: { variant: 'outline' as const, icon: Eye, color: 'text-blue-600' },
      approved: { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const handleApprove = () => {
    if (!selectedApplication) return;
    approveApplication.mutate({
      id: selectedApplication.id,
      tier: selectedTier
    });
  };

  const handleReject = () => {
    if (!selectedApplication || !rejectionReason.trim()) return;
    rejectApplication.mutate({
      id: selectedApplication.id,
      reason: rejectionReason
    });
  };

  const handleDelete = (applicationId: string) => {
    if (window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      deleteApplication.mutate(applicationId);
    }
  };

  const filteredApplications = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load applications</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Judge Applications</h1>
          <p className="text-gray-600 mt-2">Review and manage judge applications</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Total: {applications.length} applications
          </div>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({filteredApplications('pending').length})
          </TabsTrigger>
          <TabsTrigger value="under_review" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Under Review ({filteredApplications('under_review').length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Approved ({filteredApplications('approved').length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejected ({filteredApplications('rejected').length})
          </TabsTrigger>
        </TabsList>

        {['pending', 'under_review', 'approved', 'rejected'].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {filteredApplications(status).length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-gray-500">No {status} applications</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredApplications(status).map((application) => (
                  <Card key={application.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {application.profile_photo ? (
                              <img
                                src={application.profile_photo}
                                alt={application.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="h-6 w-6 text-gray-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{application.full_name}</h3>
                              {getStatusBadge(application.status)}
                            </div>

                            <p className="text-gray-600 mb-2">{application.headline}</p>

                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                @{application.username}
                              </div>
                              <div className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                {application.company}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {application.judge_location}
                              </div>
                            </div>

                            <div className="flex items-center gap-6 text-sm">
                              <div className="flex items-center gap-1">
                                <Award className="h-4 w-4 text-blue-500" />
                                <span>{application.total_events_judged} events</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4 text-green-500" />
                                <span>{application.total_teams_evaluated} teams</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-purple-500" />
                                <span>{application.total_mentorship_hours}h mentorship</span>
                              </div>
                              {application.average_feedback_rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  <span>{application.average_feedback_rating}/5</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1 mt-3">
                              {application.primary_expertise.slice(0, 3).map((skill, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {application.primary_expertise.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{application.primary_expertise.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedApplication(application)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <User className="h-5 w-5" />
                                  {selectedApplication?.full_name} - Judge Application
                                </DialogTitle>
                              </DialogHeader>

                              {selectedApplication && (
                                <div className="space-y-6">
                                  {/* Basic Info */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-gray-500">Username</label>
                                      <p className="font-medium">@{selectedApplication.username}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-500">Email</label>
                                      <p className="font-medium">{selectedApplication.email}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-500">Phone</label>
                                      <p className="font-medium">{selectedApplication.phone || 'Not provided'}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-500">Location</label>
                                      <p className="font-medium">{selectedApplication.judge_location}</p>
                                    </div>
                                  </div>

                                  {/* Professional Info */}
                                  <div>
                                    <h3 className="font-semibold mb-3">Professional Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Current Role</label>
                                        <p className="font-medium">{selectedApplication.role_title}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Company</label>
                                        <p className="font-medium">{selectedApplication.company}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Years of Experience</label>
                                        <p className="font-medium">{selectedApplication.years_of_experience} years</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Availability</label>
                                        <p className="font-medium capitalize">{selectedApplication.availability_status}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Bio */}
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Bio</label>
                                    <p className="mt-1 text-gray-700">{selectedApplication.short_bio}</p>
                                  </div>

                                  {/* Expertise */}
                                  <div>
                                    <h3 className="font-semibold mb-3">Expertise</h3>
                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Primary Expertise</label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {selectedApplication.primary_expertise.map((skill, index) => (
                                            <Badge key={index} variant="default">{skill}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Secondary Expertise</label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {selectedApplication.secondary_expertise.map((skill, index) => (
                                            <Badge key={index} variant="outline">{skill}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Experience Metrics */}
                                  <div>
                                    <h3 className="font-semibold mb-3">Experience Metrics</h3>
                                    <div className="grid grid-cols-4 gap-4">
                                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">{selectedApplication.total_events_judged}</div>
                                        <div className="text-sm text-gray-600">Events Judged</div>
                                      </div>
                                      <div className="text-center p-3 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{selectedApplication.total_teams_evaluated}</div>
                                        <div className="text-sm text-gray-600">Teams Evaluated</div>
                                      </div>
                                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">{selectedApplication.total_mentorship_hours}</div>
                                        <div className="text-sm text-gray-600">Mentorship Hours</div>
                                      </div>
                                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                        <div className="text-2xl font-bold text-yellow-600">
                                          {selectedApplication.average_feedback_rating || 'N/A'}
                                        </div>
                                        <div className="text-sm text-gray-600">Avg Rating</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Events */}
                                  {selectedApplication.judge_application_events && selectedApplication.judge_application_events.length > 0 && (
                                    <div>
                                      <h3 className="font-semibold mb-3">Previous Events</h3>
                                      <div className="space-y-2">
                                        {selectedApplication.judge_application_events.map((event) => (
                                          <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                              <p className="font-medium">{event.event_name}</p>
                                              <p className="text-sm text-gray-600">{event.event_role} • {event.event_date}</p>
                                            </div>
                                            {event.event_link && (
                                              <Button variant="outline" size="sm" asChild>
                                                <a href={event.event_link} target="_blank" rel="noopener noreferrer">
                                                  <ExternalLink className="h-4 w-4" />
                                                </a>
                                              </Button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Mentorship Statement */}
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Mentorship Statement</label>
                                    <p className="mt-1 text-gray-700">{selectedApplication.mentorship_statement}</p>
                                  </div>

                                  {/* Social Links */}
                                  <div>
                                    <h3 className="font-semibold mb-3">Social Links</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">LinkedIn</label>
                                        <a href={selectedApplication.linkedin} target="_blank" rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline block">
                                          {selectedApplication.linkedin}
                                        </a>
                                      </div>
                                      {selectedApplication.github && (
                                        <div>
                                          <label className="text-sm font-medium text-gray-500">GitHub</label>
                                          <a href={selectedApplication.github} target="_blank" rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline block">
                                            {selectedApplication.github}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  {selectedApplication.status === 'pending' && (
                                    <div className="flex items-center gap-4 pt-4 border-t">
                                      <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-500">Assign Tier</label>
                                        <Select value={selectedTier} onValueChange={setSelectedTier}>
                                          <SelectTrigger className="mt-1">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="starter">Starter Judge</SelectItem>
                                            <SelectItem value="verified">Verified Judge</SelectItem>
                                            <SelectItem value="senior">Senior Judge</SelectItem>
                                            <SelectItem value="chief">Chief Judge</SelectItem>
                                            <SelectItem value="legacy">Legacy Judge</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="flex gap-2">
                                        <Button
                                          onClick={handleApprove}
                                          disabled={approveApplication.isPending}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          <Check className="h-4 w-4 mr-1" />
                                          Approve
                                        </Button>

                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button variant="destructive">
                                              <X className="h-4 w-4 mr-1" />
                                              Reject
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent>
                                            <DialogHeader>
                                              <DialogTitle>Reject Application</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                              <div>
                                                <label className="text-sm font-medium">Rejection Reason</label>
                                                <Textarea
                                                  value={rejectionReason}
                                                  onChange={(e) => setRejectionReason(e.target.value)}
                                                  placeholder="Please provide a reason for rejection..."
                                                  className="mt-1"
                                                />
                                              </div>
                                              <div className="flex justify-end gap-2">
                                                <Button variant="outline" onClick={() => setRejectionReason('')}>
                                                  Cancel
                                                </Button>
                                                <Button
                                                  variant="destructive"
                                                  onClick={handleReject}
                                                  disabled={!rejectionReason.trim() || rejectApplication.isPending}
                                                >
                                                  Reject Application
                                                </Button>
                                              </div>
                                            </div>
                                          </DialogContent>
                                        </Dialog>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          <div className="flex gap-1">
                            {application.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setSelectedApplication(application);
                                    approveApplication.mutate({ id: application.id, tier: 'starter' });
                                  }}
                                  disabled={approveApplication.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedApplication(application);
                                    setRejectionReason('Application does not meet our current requirements.');
                                    rejectApplication.mutate({
                                      id: application.id,
                                      reason: 'Application does not meet our current requirements.'
                                    });
                                  }}
                                  disabled={rejectApplication.isPending}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(application.id)}
                              disabled={deleteApplication.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                        Applied: {new Date(application.created_at).toLocaleDateString()} •
                        {application.reviewed_at && (
                          <span> Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default JudgeApplications;