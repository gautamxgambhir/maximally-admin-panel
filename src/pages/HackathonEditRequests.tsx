import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2, Eye, Clock, Calendar } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ConfirmModal';
import { InputModal } from '@/components/InputModal';

interface EditRequest {
  id: number;
  hackathon_id: number;
  organizer_email: string;
  requested_changes: any;
  edit_reason: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  hackathon: {
    hackathon_name: string;
    slug: string;
    status: string;
  };
}

export default function HackathonEditRequests() {
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modal states
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdminNotesModal, setShowAdminNotesModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'approve' | 'reject'; id: number } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: editRequests, error } = await supabaseAdmin
        .from('hackathon_edit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch hackathon details for each request
      const requestsWithHackathons = await Promise.all(
        (editRequests || []).map(async (request) => {
          const { data: hackathon } = await supabaseAdmin
            .from('organizer_hackathons')
            .select('hackathon_name, slug, status')
            .eq('id', request.hackathon_id)
            .single();

          return {
            ...request,
            hackathon: hackathon || { hackathon_name: 'Unknown', slug: '', status: '' }
          };
        })
      );

      setRequests(requestsWithHackathons);
    } catch (error: any) {
      console.error('Error fetching edit requests:', error);
      toast.error('Failed to fetch edit requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    setPendingAction({ type: 'approve', id: requestId });
    setShowApproveConfirm(true);
  };

  const confirmApprove = async (adminNotes?: string) => {
    if (!pendingAction) return;

    setActionLoading(true);
    try {
      // Get the edit request
      const { data: editRequest, error: fetchError } = await supabaseAdmin
        .from('hackathon_edit_requests')
        .select('*')
        .eq('id', pendingAction.id)
        .single();

      if (fetchError) throw fetchError;

      // Apply changes to hackathon
      const { error: updateError } = await supabaseAdmin
        .from('organizer_hackathons')
        .update({
          ...editRequest.requested_changes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editRequest.hackathon_id);

      if (updateError) throw updateError;

      // Update edit request status
      const { error: statusError } = await supabaseAdmin
        .from('hackathon_edit_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', pendingAction.id);

      if (statusError) throw statusError;

      toast.success('Edit request approved successfully!');
      fetchRequests();
      setShowPreview(false);
      setShowApproveConfirm(false);
      setShowAdminNotesModal(false);
      setPendingAction(null);
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve edit request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: number) => {
    setPendingAction({ type: 'reject', id: requestId });
    setShowRejectModal(true);
  };

  const confirmReject = async (reason: string) => {
    if (!pendingAction || !reason.trim()) return;

    setActionLoading(true);
    setRejectionReason(reason);
    setShowRejectModal(false);
    setShowAdminNotesModal(true);
  };

  const finalizeReject = async (adminNotes?: string) => {
    if (!pendingAction) return;

    setActionLoading(true);
    try {
      const { error } = await supabaseAdmin
        .from('hackathon_edit_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          admin_notes: adminNotes || null
        })
        .eq('id', pendingAction.id);

      if (error) throw error;

      toast.success('Edit request rejected');
      fetchRequests();
      setShowPreview(false);
      setShowAdminNotesModal(false);
      setPendingAction(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject edit request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (requestId: number) => {
    setSelectedRequest(requests.find(r => r.id === requestId) || null);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const { error } = await supabaseAdmin
        .from('hackathon_edit_requests')
        .delete()
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Edit request deleted');
      fetchRequests();
      setShowPreview(false);
      setShowDeleteConfirm(false);
      setSelectedRequest(null);
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete edit request');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => req.status === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Hackathon Edit Requests</h1>
        <p className="text-muted-foreground">Review and manage edit requests for published hackathons</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 font-semibold transition-colors relative ${
            activeTab === 'pending'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-6 py-3 font-semibold transition-colors relative ${
            activeTab === 'approved'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Approved ({requests.filter(r => r.status === 'approved').length})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-6 py-3 font-semibold transition-colors relative ${
            activeTab === 'rejected'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Rejected ({requests.filter(r => r.status === 'rejected').length})
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-lg">
            <p className="text-muted-foreground">No {activeTab} edit requests</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {request.hackathon.hackathon_name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Submitted: {new Date(request.created_at).toLocaleString()}</span>
                    </div>
                    <div>Organizer: {request.organizer_email}</div>
                    {request.edit_reason && (
                      <div>Reason: {request.edit_reason}</div>
                    )}
                    {request.reviewed_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Reviewed: {new Date(request.reviewed_at).toLocaleString()}</span>
                      </div>
                    )}
                    {request.rejection_reason && (
                      <div className="text-red-600">
                        Rejection reason: {request.rejection_reason}
                      </div>
                    )}
                    {request.admin_notes && (
                      <div className="text-blue-600">
                        Admin notes: {request.admin_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowPreview(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-500 dark:hover:bg-blue-400 transition-colors font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      View Changes
                    </button>

                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-500 dark:hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-500 dark:hover:bg-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDelete(request.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-500 dark:hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-border bg-card sticky top-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Requested Changes</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review the changes requested by {selectedRequest.organizer_email}
                  </p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4 max-w-3xl">
                {Object.entries(selectedRequest.requested_changes).map(([key, value]) => (
                  <div key={key} className="border-b border-border pb-4">
                    <div className="font-semibold text-sm text-muted-foreground uppercase mb-2">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-foreground">
                      {typeof value === 'object' && value !== null ? (
                        <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <div className="whitespace-pre-wrap">{String(value || 'Not set')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-500 dark:hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Approve Changes
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-500 dark:hover:bg-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <XCircle className="h-5 w-5" />
                    Reject Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={showApproveConfirm}
        onClose={() => {
          setShowApproveConfirm(false);
          setPendingAction(null);
        }}
        onConfirm={() => {
          setShowApproveConfirm(false);
          setShowAdminNotesModal(true);
        }}
        title="Approve Edit Request"
        message="Are you sure you want to approve this edit request? The changes will be applied to the hackathon immediately."
        confirmText="Approve"
        variant="success"
        isLoading={actionLoading}
      />

      {/* Reject Reason Modal */}
      <InputModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setPendingAction(null);
        }}
        onSubmit={confirmReject}
        title="Reject Edit Request"
        label="Rejection Reason"
        placeholder="Please provide a reason for rejecting this edit request..."
        required
        multiline
        rows={4}
      />

      {/* Admin Notes Modal */}
      <InputModal
        isOpen={showAdminNotesModal}
        onClose={() => {
          setShowAdminNotesModal(false);
          if (pendingAction?.type === 'approve') {
            confirmApprove();
          } else if (pendingAction?.type === 'reject') {
            finalizeReject();
          }
        }}
        onSubmit={(notes) => {
          if (pendingAction?.type === 'approve') {
            confirmApprove(notes);
          } else if (pendingAction?.type === 'reject') {
            finalizeReject(notes);
          }
        }}
        title="Admin Notes (Optional)"
        label="Additional Notes"
        placeholder="Add any additional notes for the organizer..."
        multiline
        rows={3}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedRequest(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Edit Request"
        message="Are you sure you want to delete this edit request? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={actionLoading}
      />
    </div>
  );
}
