import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { HackathonPreviewModal } from '../components/HackathonPreviewModal';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Trash2,
  ExternalLink,
  Clock,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface OrganizerHackathon {
  id: number;
  organizer_id: string;
  organizer_email: string;
  hackathon_name: string;
  slug: string;
  tagline?: string;
  description?: string;
  start_date: string;
  end_date: string;
  format: string;
  venue?: string;
  status: string;
  publish_requested_at?: string;
  created_at: string;
  views_count: number;
  registrations_count: number;
  rejection_reason?: string;
  registration_deadline?: string;
  team_size_min?: number;
  team_size_max?: number;
  registration_fee?: number;
  total_prize_pool?: string;
  prize_breakdown?: string;
  discord_link?: string;
  whatsapp_link?: string;
  website_url?: string;
  contact_email?: string;
}

type TabType = 'pending' | 'approved' | 'rejected';

export function OrganizerHackathonRequests() {
  const [allRequests, setAllRequests] = useState<OrganizerHackathon[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<OrganizerHackathon | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewHackathon, setPreviewHackathon] = useState<OrganizerHackathon | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('organizer_hackathons')
        .select('*')
        .in('status', ['pending_review', 'published', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to fetch hackathon requests');
    } finally {
      setLoading(false);
    }
  };

  // Filter requests based on active tab
  const filteredRequests = allRequests.filter(request => {
    if (activeTab === 'pending') return request.status === 'pending_review';
    if (activeTab === 'approved') return request.status === 'published';
    if (activeTab === 'rejected') return request.status === 'rejected';
    return false;
  });

  const pendingCount = allRequests.filter(r => r.status === 'pending_review').length;
  const approvedCount = allRequests.filter(r => r.status === 'published').length;
  const rejectedCount = allRequests.filter(r => r.status === 'rejected').length;

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/api/admin/hackathons/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve');
      }

      toast.success('Hackathon approved successfully!');
      setShowApproveModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast.error(error.message || 'Failed to approve hackathon');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/api/admin/hackathons/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejectionReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject');
      }

      toast.success('Hackathon rejected and organizer notified');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast.error(error.message || 'Failed to reject hackathon');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/api/admin/hackathons/${selectedRequest.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete');
      }

      toast.success('Hackathon deleted successfully');
      setShowDeleteModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(error.message || 'Failed to delete hackathon');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Organizer Hackathon Requests</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage hackathons submitted by organizers
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          total: {allRequests.length} requests
        </div>
      </div>

      {/* Tabs - Dark Button Style */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center justify-center gap-3 px-6 py-4 rounded-lg border-2 transition-all ${
            activeTab === 'pending'
              ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-600'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
          }`}
        >
          <Clock className="h-5 w-5" />
          <span className="font-semibold">Pending ({pendingCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`flex items-center justify-center gap-3 px-6 py-4 rounded-lg border-2 transition-all ${
            activeTab === 'approved'
              ? 'bg-green-500/10 border-green-500/50 text-green-600'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
          }`}
        >
          <CheckCircle className="h-5 w-5" />
          <span className="font-semibold">Approved ({approvedCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`flex items-center justify-center gap-3 px-6 py-4 rounded-lg border-2 transition-all ${
            activeTab === 'rejected'
              ? 'bg-red-500/10 border-red-500/50 text-red-600'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
          }`}
        >
          <XCircle className="h-5 w-5" />
          <span className="font-semibold">Rejected ({rejectedCount})</span>
        </button>
      </div>

      {filteredRequests.length === 0 ? (
        <Card className="p-12 text-center">
          {activeTab === 'pending' && (
            <>
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No pending hackathon requests at the moment.
              </p>
            </>
          )}
          {activeTab === 'approved' && (
            <>
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold mb-2">No Approved Hackathons</h3>
              <p className="text-muted-foreground">
                No hackathons have been approved yet.
              </p>
            </>
          )}
          {activeTab === 'rejected' && (
            <>
              <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-xl font-semibold mb-2">No Rejected Hackathons</h3>
              <p className="text-muted-foreground">
                No hackathons have been rejected yet.
              </p>
            </>
          )}
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold">{request.hackathon_name}</h3>
                    {request.status === 'pending_review' && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        PENDING REVIEW
                      </Badge>
                    )}
                    {request.status === 'published' && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        APPROVED
                      </Badge>
                    )}
                    {request.status === 'rejected' && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                        REJECTED
                      </Badge>
                    )}
                  </div>
                  {request.tagline && (
                    <p className="text-muted-foreground mb-3">{request.tagline}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(request.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{request.format}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{request.organizer_email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Requested {new Date(request.publish_requested_at!).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {request.description && (
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm line-clamp-3">{request.description}</p>
                </div>
              )}

              {/* Show rejection reason for rejected hackathons */}
              {request.status === 'rejected' && request.rejection_reason && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-700">{request.rejection_reason}</p>
                </div>
              )}

              {/* Show stats for approved hackathons */}
              {request.status === 'published' && (
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-800">Views</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{request.views_count}</p>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-semibold text-green-800">Registrations</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{request.registrations_count}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {/* Show approve/reject buttons only for pending requests */}
                {request.status === 'pending_review' && (
                  <>
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApproveModal(true);
                      }}
                      disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectModal(true);
                      }}
                      disabled={actionLoading}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}

                {/* Show view link for approved hackathons */}
                {request.status === 'published' && (
                  <Button
                    onClick={() => window.open(`${API_BASE_URL}/hackathon/${request.slug}`, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Live
                  </Button>
                )}

                {/* Always show delete and preview */}
                <Button
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowDeleteModal(true);
                  }}
                  disabled={actionLoading}
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  onClick={() => {
                    setPreviewHackathon(request);
                    setShowPreviewModal(true);
                  }}
                  variant="outline"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewHackathon && (
        <HackathonPreviewModal
          hackathon={previewHackathon}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewHackathon(null);
          }}
        />
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4">Approve Hackathon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to approve "{selectedRequest.hackathon_name}"? 
              This will publish the hackathon and notify the organizer via email.
            </p>
            <div className="bg-muted p-4 rounded-md mb-4">
              <p className="text-sm font-semibold mb-2">Hackathon Details:</p>
              <p className="text-sm"><strong>Name:</strong> {selectedRequest.hackathon_name}</p>
              <p className="text-sm"><strong>Organizer:</strong> {selectedRequest.organizer_email}</p>
              <p className="text-sm"><strong>Format:</strong> {selectedRequest.format}</p>
              <p className="text-sm"><strong>Start Date:</strong> {new Date(selectedRequest.start_date).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRequest(null);
                }}
                variant="outline"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? 'Approving...' : 'Approve & Publish'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4">Reject Hackathon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for rejecting "{selectedRequest.hackathon_name}". 
              This will be sent to the organizer via email.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full min-h-[120px] p-3 border rounded-md mb-4"
              required
            />
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                variant="outline"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                variant="destructive"
              >
                {actionLoading ? 'Rejecting...' : 'Reject & Notify'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-red-600">Delete Hackathon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to permanently delete "{selectedRequest.hackathon_name}"? 
              This action cannot be undone.
            </p>
            <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-4">
              <p className="text-sm text-red-800 font-semibold">⚠️ Warning</p>
              <p className="text-sm text-red-700 mt-1">
                This will permanently remove all data associated with this hackathon.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRequest(null);
                }}
                variant="outline"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={actionLoading}
                variant="destructive"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
