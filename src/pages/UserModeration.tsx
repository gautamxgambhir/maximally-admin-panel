import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, User, Ban, Volume2, VolumeX, AlertTriangle, Shield, Clock, Eye, History, Mail, Calendar, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabaseAdmin } from '@/lib/supabase';
import { toast } from 'sonner';

interface UserWithModeration {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url: string;
  role: string;
  created_at: string;
  moderation_status?: {
    is_banned: boolean;
    is_muted: boolean;
    is_suspended: boolean;
    warning_count: number;
    total_reports_received: number;
  } | null;
}

const ACTION_TYPES = [
  { value: 'warning', label: 'Issue Warning', icon: AlertTriangle, color: 'text-yellow-500' },
  { value: 'mute', label: 'Mute User', icon: VolumeX, color: 'text-orange-500' },
  { value: 'suspend', label: 'Suspend User', icon: Clock, color: 'text-red-400' },
  { value: 'ban', label: 'Ban User', icon: Ban, color: 'text-red-600' },
  { value: 'unban', label: 'Unban User', icon: CheckCircle, color: 'text-green-500' },
  { value: 'unmute', label: 'Unmute User', icon: Volume2, color: 'text-green-500' },
  { value: 'note', label: 'Add Note', icon: History, color: 'text-blue-500' },
];


export default function UserModeration() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserWithModeration | null>(null);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionDuration, setActionDuration] = useState('');
  const [loadedUsers, setLoadedUsers] = useState<UserWithModeration[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20; // Load 20 users at a time
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check for userId in URL parameters and auto-open modal
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId && !selectedUser) {
      // Fetch the user by ID and open the modal
      supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(async ({ data: profile, error }) => {
          if (error || !profile) {
            toast.error('User not found');
            // Remove the userId param from URL
            searchParams.delete('userId');
            setSearchParams(searchParams);
            return;
          }

          // Get moderation status
          const { data: modStatus } = await supabaseAdmin
            .from('user_moderation_status')
            .select('*')
            .eq('user_id', profile.id)
            .maybeSingle();

          const userWithStatus: UserWithModeration = {
            ...profile,
            moderation_status: modStatus || null
          };

          setSelectedUser(userWithStatus);
        });
    }
  }, [searchParams, selectedUser, setSearchParams]);

  // Clear userId param when modal is closed
  useEffect(() => {
    if (!selectedUser && searchParams.get('userId')) {
      searchParams.delete('userId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [selectedUser, searchParams, setSearchParams]);

  // Fetch users directly from Supabase with pagination
  const { data: queryResult, isLoading, isFetching } = useQuery({
    queryKey: ['moderation-users', search, filter, page],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (search) {
        query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data: profiles, error, count } = await query;
      if (error) throw new Error(error.message);

      // Get moderation status for each user
      const usersWithStatus = await Promise.all(
        (profiles || []).map(async (profile: any) => {
          const { data: modStatus } = await supabaseAdmin
            .from('user_moderation_status')
            .select('*')
            .eq('user_id', profile.id)
            .maybeSingle(); // Use maybeSingle to avoid 406 errors when no row exists

          return {
            ...profile,
            moderation_status: modStatus || null
          };
        })
      );

      // Apply filter
      let filtered = usersWithStatus;
      if (filter === 'banned') filtered = filtered.filter(u => u.moderation_status?.is_banned);
      else if (filter === 'muted') filtered = filtered.filter(u => u.moderation_status?.is_muted);
      else if (filter === 'suspended') filtered = filtered.filter(u => u.moderation_status?.is_suspended);
      else if (filter === 'warned') filtered = filtered.filter(u => (u.moderation_status?.warning_count || 0) > 0);

      return {
        users: filtered as UserWithModeration[],
        hasMore: count ? (from + pageSize) < count : false
      };
    }
  });

  const newUsers = queryResult?.users || [];

  // Update loaded users and hasMore when new data arrives
  useEffect(() => {
    if (queryResult) {
      setHasMore(queryResult.hasMore);
      if (page === 1) {
        // Reset on new search/filter
        setLoadedUsers(queryResult.users);
      } else {
        // Append new users for "Load More"
        setLoadedUsers(prev => [...prev, ...queryResult.users]);
      }
    }
  }, [queryResult, page]);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
    setLoadedUsers([]);
  }, [search, filter]);

  const users = loadedUsers;

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['moderation-stats'],
    queryFn: async () => {
      const [pendingRes, bannedRes, mutedRes] = await Promise.all([
        supabaseAdmin.from('user_reports').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabaseAdmin.from('user_moderation_status').select('user_id', { count: 'exact' }).eq('is_banned', true),
        supabaseAdmin.from('user_moderation_status').select('user_id', { count: 'exact' }).eq('is_muted', true)
      ]);
      return {
        pendingReports: pendingRes.data?.length || 0,
        bannedUsers: bannedRes.data?.length || 0,
        mutedUsers: mutedRes.data?.length || 0
      };
    }
  });

  // Fetch user details
  const { data: userDetails } = useQuery({
    queryKey: ['user-moderation-details', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;

      const [modStatusRes, historyRes, reportsRes] = await Promise.all([
        supabaseAdmin.from('user_moderation_status').select('*').eq('user_id', selectedUser.id).maybeSingle(),
        supabaseAdmin.from('user_moderation_actions').select('*').eq('user_id', selectedUser.id).order('created_at', { ascending: false }),
        supabaseAdmin.from('user_reports').select('*').eq('reported_user_id', selectedUser.id).order('created_at', { ascending: false })
      ]);

      return {
        profile: selectedUser,
        moderationStatus: modStatusRes.data || { is_banned: false, is_muted: false, is_suspended: false, warning_count: 0 },
        moderationHistory: historyRes.data || [],
        reportsAgainst: reportsRes.data || []
      };
    },
    enabled: !!selectedUser
  });

  // Take moderation action
  const takeAction = useMutation({
    mutationFn: async (payload: { user_id: string; action_type: string; reason: string; duration_hours?: number }) => {
      const { data: session } = await supabaseAdmin.auth.getSession();
      const adminId = session?.session?.user?.id;

      let expires_at = null;
      if (payload.duration_hours && ['mute', 'suspend', 'ban'].includes(payload.action_type)) {
        expires_at = new Date(Date.now() + payload.duration_hours * 60 * 60 * 1000).toISOString();
      }

      const { data, error } = await supabaseAdmin
        .from('user_moderation_actions')
        .insert({
          user_id: payload.user_id,
          action_type: payload.action_type,
          reason: payload.reason,
          duration_hours: payload.duration_hours || null,
          expires_at,
          performed_by: adminId
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-moderation-details'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
      toast.success('Action taken successfully');
      setActionType('');
      setActionReason('');
      setActionDuration('');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const handleTakeAction = () => {
    if (!selectedUser || !actionType || !actionReason) {
      toast.error('Please fill all required fields');
      return;
    }
    takeAction.mutate({
      user_id: selectedUser.id,
      action_type: actionType,
      reason: actionReason,
      duration_hours: actionDuration ? parseInt(actionDuration) : undefined
    });
  };

  const getUserStatusBadges = (user: UserWithModeration) => {
    const badges = [];
    const status = user.moderation_status;
    if (status?.is_banned) badges.push(<Badge key="banned" variant="destructive">BANNED</Badge>);
    if (status?.is_muted) badges.push(<Badge key="muted" className="bg-orange-500">MUTED</Badge>);
    if (status?.is_suspended) badges.push(<Badge key="suspended" className="bg-red-400">SUSPENDED</Badge>);
    if (status?.warning_count && status.warning_count > 0) badges.push(<Badge key="warnings" variant="outline" className="border-yellow-500 text-yellow-600">{status.warning_count} Warning(s)</Badge>);
    if (status?.total_reports_received && status.total_reports_received > 0) badges.push(<Badge key="reports" variant="outline">{status.total_reports_received} Report(s)</Badge>);
    return badges;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Moderation</h1>
          <p className="text-gray-600 mt-2">Manage users and take moderation actions</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-600">{stats.pendingReports}</div><div className="text-sm text-gray-500">Pending Reports</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-600">{stats.bannedUsers}</div><div className="text-sm text-gray-500">Banned Users</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-orange-600">{stats.mutedUsers}</div><div className="text-sm text-gray-500">Muted Users</div></CardContent></Card>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search by username, name, or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="muted">Muted</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="warned">With Warnings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      {isLoading && page === 1 ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {users.map(user => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" /> : <User className="h-6 w-6 text-gray-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{user.full_name || user.username}</h3>
                        <span className="text-gray-500">@{user.username}</span>
                        {user.role === 'admin' && <Badge className="bg-purple-500">Admin</Badge>}
                        {user.role === 'judge' && <Badge className="bg-blue-500">Judge</Badge>}
                        {user.role === 'organizer' && <Badge className="bg-green-500">Organizer</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="h-3 w-3" /> {user.email}
                        <Calendar className="h-3 w-3 ml-2" /> Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">{getUserStatusBadges(user)}</div>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => setSelectedUser(user)}><Eye className="h-4 w-4 mr-1" /> Manage</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Manage User: @{selectedUser?.username}</DialogTitle></DialogHeader>
                      {selectedUser && userDetails && (
                        <Tabs defaultValue="overview" className="mt-4">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="history">Mod History</TabsTrigger>
                            <TabsTrigger value="action">Take Action</TabsTrigger>
                          </TabsList>
                          <TabsContent value="overview" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <h4 className="font-semibold mb-2">User Info</h4>
                                <p><strong>Name:</strong> {userDetails.profile.full_name}</p>
                                <p><strong>Email:</strong> {userDetails.profile.email}</p>
                                <p><strong>Role:</strong> {userDetails.profile.role}</p>
                                <p><strong>Joined:</strong> {new Date(userDetails.profile.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <h4 className="font-semibold mb-2">Moderation Status</h4>
                                <p><strong>Banned:</strong> {userDetails.moderationStatus.is_banned ? 'Yes' : 'No'}</p>
                                <p><strong>Muted:</strong> {userDetails.moderationStatus.is_muted ? 'Yes' : 'No'}</p>
                                <p><strong>Warnings:</strong> {userDetails.moderationStatus.warning_count || 0}</p>
                                <p><strong>Reports:</strong> {userDetails.reportsAgainst.length}</p>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="history" className="mt-4">
                            {userDetails.moderationHistory.length === 0 ? (
                              <p className="text-gray-500 text-center py-8">No moderation history</p>
                            ) : (
                              <div className="space-y-2">
                                {userDetails.moderationHistory.map((action: any) => (
                                  <div key={action.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-start gap-3">
                                    <History className="h-5 w-5 text-gray-400 mt-0.5" />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">{action.action_type.toUpperCase()}</Badge>
                                        <span className="text-sm text-gray-500">{new Date(action.created_at).toLocaleString()}</span>
                                      </div>
                                      <p className="text-sm mt-1">{action.reason}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                          <TabsContent value="action" className="mt-4 space-y-4">
                            <div>
                              <label className="text-sm font-medium">Action Type</label>
                              <Select value={actionType} onValueChange={setActionType}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select action" /></SelectTrigger>
                                <SelectContent>
                                  {ACTION_TYPES.map(a => (
                                    <SelectItem key={a.value} value={a.value}>
                                      <div className="flex items-center gap-2">
                                        <a.icon className={`h-4 w-4 ${a.color}`} />
                                        {a.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Reason</label>
                              <Textarea value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Explain the reason..." className="mt-1" />
                            </div>
                            {['mute', 'suspend', 'ban'].includes(actionType) && (
                              <div>
                                <label className="text-sm font-medium">Duration (hours, empty = permanent)</label>
                                <Input type="number" value={actionDuration} onChange={e => setActionDuration(e.target.value)} placeholder="e.g., 24" className="mt-1" />
                              </div>
                            )}
                            <Button onClick={handleTakeAction} disabled={!actionType || !actionReason || takeAction.isPending} className="w-full">
                              {takeAction.isPending ? 'Processing...' : 'Take Action'}
                            </Button>
                          </TabsContent>
                        </Tabs>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
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

          {!hasMore && users.length > 0 && (
            <div className="text-center text-gray-500 py-4">
              All users loaded
            </div>
          )}
        </div>
      )}
    </div>
  );
}
