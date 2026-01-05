import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Send,
  FileText,
  Plus,
  Trash2,
  Eye,
  Users,
  CheckCircle,
  Edit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabaseAdmin } from '@/lib/supabase';
import { toast } from 'sonner';

interface OrganizerMessage {
  id: number;
  subject: string;
  content: string;
  recipient_type: 'all' | 'specific' | 'tier' | 'location';
  recipient_filter: any;
  recipient_count: number;
  sent_by: string;
  sent_by_name: string;
  sent_by_email: string;
  status: 'draft' | 'sent' | 'scheduled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  scheduled_for: string | null;
  total_sent: number;
  total_read: number;
  total_replied: number;
}

const OrganizerInbox = () => {
  const [selectedMessage, setSelectedMessage] = useState<OrganizerMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // Form state
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'specific' | 'tier'>('all');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [recipientFilter, setRecipientFilter] = useState<string[]>([]);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  // Fetch messages
  const { data: messages = [], isLoading, error: messagesError } = useQuery({
    queryKey: ['organizer-messages'],
    queryFn: async () => {
      const { data, error } = await supabaseAdmin
        .from('organizer_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organizer messages:', error);
        // Return empty array if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return [];
        }
        throw error;
      }
      return data as OrganizerMessage[];
    },
    retry: false
  });

  // Fetch organizers for recipient selection
  const { data: organizers = [] } = useQuery({
    queryKey: ['organizers-list'],
    queryFn: async () => {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, username, full_name, role')
        .eq('role', 'organizer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get tier info from organizer_profiles
      const userIds = data.map((p: any) => p.id);
      const { data: profiles } = await supabaseAdmin
        .from('organizer_profiles')
        .select('user_id, tier, location')
        .in('user_id', userIds);
      
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p as { tier: string; location: string }]));
      
      return data.map((p: any) => ({
        ...p,
        tier: (profileMap.get(p.id) as any)?.tier || 'starter',
        location: (profileMap.get(p.id) as any)?.location
      }));
    }
  });

  // Create/Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const { data: { user } } = await supabaseAdmin.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: newMessage, error: insertError } = await supabaseAdmin
        .from('organizer_messages')
        .insert({
          subject,
          content,
          recipient_type: recipientType,
          recipient_filter: recipientFilter.length > 0 ? recipientFilter : null,
          sent_by: user.id,
          sent_by_name: profile?.full_name || 'Admin',
          sent_by_email: user.email,
          status: isDraft ? 'draft' : 'sent',
          priority
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (!isDraft) {
        const { data: sendResult, error: sendError } = await supabaseAdmin
          .rpc('send_message_to_organizers', {
            message_id_param: newMessage.id
          });

        if (sendError) throw sendError;
        return sendResult;
      }

      return newMessage;
    },
    onSuccess: (_, isDraft) => {
      queryClient.invalidateQueries({ queryKey: ['organizer-messages'] });
      toast.success(isDraft ? 'Draft saved!' : 'Message sent to organizers!');
      resetForm();
      setShowCompose(false);
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message || 'Unknown error'}`);
    }
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({ messageId, updates }: { messageId: number; updates: any }) => {
      const { error } = await supabaseAdmin
        .from('organizer_messages')
        .update(updates)
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer-messages'] });
      toast.success('Message updated successfully!');
      setIsEditing(false);
      setShowViewDialog(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  // Send draft message mutation
  const sendDraftMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const { data: sendResult, error: sendError } = await supabaseAdmin
        .rpc('send_message_to_organizers', {
          message_id_param: messageId
        });

      if (sendError) throw sendError;
      return sendResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer-messages'] });
      toast.success('Draft sent to organizers!');
      setShowViewDialog(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to send: ${error.message}`);
    }
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const { error } = await supabaseAdmin
        .from('organizer_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer-messages'] });
      toast.success('Message deleted');
      setShowViewDialog(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  const resetForm = () => {
    setSubject('');
    setContent('');
    setRecipientType('all');
    setSelectedTier('');
    setRecipientFilter([]);
    setPriority('normal');
  };

  const handleSend = () => sendMessageMutation.mutate(false);
  const handleSaveDraft = () => sendMessageMutation.mutate(true);

  const handleViewMessage = (message: OrganizerMessage) => {
    setSelectedMessage(message);
    setIsEditing(false);
    setShowViewDialog(true);
  };

  const handleEditMessage = (message: OrganizerMessage) => {
    setSelectedMessage(message);
    setSubject(message.subject);
    setContent(message.content);
    setPriority(message.priority);
    setIsEditing(true);
    setShowViewDialog(true);
  };

  const handleSaveEdit = () => {
    if (!selectedMessage) return;
    
    updateMessageMutation.mutate({
      messageId: selectedMessage.id,
      updates: {
        subject,
        content,
        priority,
        updated_at: new Date().toISOString()
      }
    });
  };

  const sentMessages = messages.filter(m => m.status === 'sent');
  const draftMessages = messages.filter(m => m.status === 'draft');

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { variant: 'secondary' as const, label: 'Low' },
      normal: { variant: 'default' as const, label: 'Normal' },
      high: { variant: 'destructive' as const, label: 'High' },
      urgent: { variant: 'destructive' as const, label: 'URGENT' }
    };
    return config[priority as keyof typeof config] || config.normal;
  };

  if (isLoading && !messagesError) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (messagesError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 mb-4">Failed to load messages. The organizer_messages table may not exist yet.</p>
        <p className="text-gray-500 text-sm">Please run the SQL migration: add-organizer-system.sql</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizer Inbox</h1>
          <p className="text-gray-600 mt-2">Send messages to organizers</p>
        </div>
        <Button onClick={() => setShowCompose(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Compose Message
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Send className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Sent Messages</p>
                <p className="text-2xl font-bold">{sentMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Drafts</p>
                <p className="text-2xl font-bold">{draftMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Organizers</p>
                <p className="text-2xl font-bold">{organizers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages Tabs */}
      <Tabs defaultValue="sent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent ({sentMessages.length})
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Drafts ({draftMessages.length})
          </TabsTrigger>
        </TabsList>

        {/* Sent Messages */}
        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle>Sent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {sentMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sent messages yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sentMessages.map((message) => (
                    <div
                      key={message.id}
                      className="flex items-center justify-between p-4 border border-gray-700 rounded-lg hover:bg-gray-800/50 hover:border-gray-600 transition-colors"
                    >
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleViewMessage(message)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{message.subject}</h3>
                          <Badge {...getPriorityBadge(message.priority)}>
                            {getPriorityBadge(message.priority).label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-1">{message.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>To: {message.recipient_type === 'all' ? 'All Organizers' : `${message.recipient_count} organizers`}</span>
                          <span>Sent: {new Date(message.sent_at!).toLocaleDateString()}</span>
                          <span>Read: {message.total_read}/{message.total_sent}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewMessage(message)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEditMessage(message); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this message?')) {
                              deleteMessageMutation.mutate(message.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Draft Messages */}
        <TabsContent value="drafts">
          <Card>
            <CardHeader>
              <CardTitle>Draft Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {draftMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No drafts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {draftMessages.map((message) => (
                    <div
                      key={message.id}
                      className="flex items-center justify-between p-4 border border-gray-700 rounded-lg hover:bg-gray-800/50 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{message.subject}</h3>
                        <p className="text-sm text-gray-400 line-clamp-1">{message.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>To: {message.recipient_type === 'all' ? 'All Organizers' : message.recipient_type === 'tier' ? `Tier: ${message.recipient_filter?.[0] || 'N/A'}` : 'Specific'}</span>
                          <span>Modified: {new Date(message.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            if (confirm('Send this draft to organizers?')) {
                              sendDraftMutation.mutate(message.id);
                            }
                          }}
                          disabled={sendDraftMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditMessage(message)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewMessage(message)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => {
                            if (confirm('Delete this draft?')) {
                              deleteMessageMutation.mutate(message.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compose Message to Organizers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter subject..." />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Message Content</label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type your message here..." rows={8} />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Recipients</label>
              <Select value={recipientType} onValueChange={(value: any) => {
                setRecipientType(value);
                if (value === 'all') {
                  setSelectedTier('');
                  setRecipientFilter([]);
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizers</SelectItem>
                  <SelectItem value="tier">By Tier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === 'tier' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Select Tier</label>
                <Select value={selectedTier} onValueChange={(value) => {
                  setSelectedTier(value);
                  setRecipientFilter([value]);
                }}>
                  <SelectTrigger><SelectValue placeholder="Choose a tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="chief">Chief</SelectItem>
                    <SelectItem value="legacy">Legacy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
              <Button variant="outline" onClick={handleSaveDraft} disabled={sendMessageMutation.isPending}>
                <FileText className="h-4 w-4 mr-2" />Save Draft
              </Button>
              <Button onClick={handleSend} disabled={sendMessageMutation.isPending || !subject || !content}>
                <Send className="h-4 w-4 mr-2" />Send Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Edit Message Dialog */}
      <Dialog open={showViewDialog} onOpenChange={(open) => {
        setShowViewDialog(open);
        if (!open) { setIsEditing(false); resetForm(); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Message' : 'Message Details'}</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4 py-4">
              {isEditing ? (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Subject</label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Content</label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Priority</label>
                    <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => { setIsEditing(false); resetForm(); }}>Cancel</Button>
                    <Button onClick={handleSaveEdit} disabled={updateMessageMutation.isPending || !subject || !content}>
                      <CheckCircle className="h-4 w-4 mr-2" />{updateMessageMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Subject</label>
                    <p className="text-lg font-semibold">{selectedMessage.subject}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Content</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.content}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p className="capitalize">{selectedMessage.status}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Priority</label>
                      <Badge {...getPriorityBadge(selectedMessage.priority)}>{getPriorityBadge(selectedMessage.priority).label}</Badge>
                    </div>
                  </div>
                  {selectedMessage.status === 'sent' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Total Sent</label>
                        <p className="text-2xl font-bold">{selectedMessage.total_sent}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Read</label>
                        <p className="text-2xl font-bold text-green-600">{selectedMessage.total_read}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Unread</label>
                        <p className="text-2xl font-bold text-gray-400">{selectedMessage.total_sent - selectedMessage.total_read}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      setSubject(selectedMessage.subject);
                      setContent(selectedMessage.content);
                      setPriority(selectedMessage.priority);
                      setIsEditing(true);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />Edit Message
                    </Button>
                    <Button variant="destructive" onClick={() => {
                      if (confirm('Delete this message?')) deleteMessageMutation.mutate(selectedMessage.id);
                    }} disabled={deleteMessageMutation.isPending}>
                      <Trash2 className="h-4 w-4 mr-2" />{deleteMessageMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerInbox;
