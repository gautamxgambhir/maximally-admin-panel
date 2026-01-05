import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  Calendar,
  User,
  Building,
  Award
} from 'lucide-react';

interface JudgeEvent {
  id: number;
  judge_id: number;
  event_name: string;
  event_role: string;
  event_date: string;
  event_link: string | null;
  verified: boolean;
  created_at: string;
  judge: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    tier: string;
  };
}

export function JudgeEventsVerification() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'all'>('pending');

  // Fetch all judge events with judge info
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['judge-events-verification'],
    queryFn: async () => {
      const { data, error } = await supabaseAdmin
        .from('judge_events')
        .select(`
          *,
          judge:judges!judge_events_judge_id_fkey (
            id,
            username,
            full_name,
            email,
            tier
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JudgeEvent[];
    }
  });

  // Verify event mutation
  const verifyEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const { error } = await supabaseAdmin
        .from('judge_events')
        .update({ verified: true })
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-events-verification'] });
      toast.success('Event verified successfully!');
    },
    onError: (error: any) => {
      toast.error(`Failed to verify event: ${error.message}`);
    }
  });

  // Unverify event mutation
  const unverifyEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const { error } = await supabaseAdmin
        .from('judge_events')
        .update({ verified: false })
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-events-verification'] });
      toast.success('Event unverified successfully!');
    },
    onError: (error: any) => {
      toast.error(`Failed to unverify event: ${error.message}`);
    }
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const { error } = await supabaseAdmin
        .from('judge_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-events-verification'] });
      toast.success('Event deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete event: ${error.message}`);
    }
  });

  const pendingEvents = events.filter(e => !e.verified);
  const verifiedEvents = events.filter(e => e.verified);

  const renderEventCard = (event: JudgeEvent) => (
    <Card key={event.id} className="mb-4">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg font-semibold">{event.event_name}</h3>
              {event.verified ? (
                <Badge className="bg-green-600 dark:bg-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <div>
                  <span className="font-medium text-foreground">{event.judge.full_name}</span>
                  <span className="text-muted-foreground ml-2">@{event.judge.username}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Award className="h-4 w-4" />
                <span className="capitalize">{event.judge.tier} Judge</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                <span>{event.event_role}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(event.event_date).toLocaleDateString()}</span>
              </div>
            </div>

            {event.event_link && (
              <a
                href={event.event_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ExternalLink className="h-3 w-3" />
                View Event Link
              </a>
            )}

            <div className="mt-3 text-xs text-muted-foreground">
              Submitted: {new Date(event.created_at).toLocaleString()}
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {!event.verified ? (
              <Button
                onClick={() => verifyEventMutation.mutate(event.id)}
                disabled={verifyEventMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify
              </Button>
            ) : (
              <Button
                onClick={() => unverifyEventMutation.mutate(event.id)}
                disabled={unverifyEventMutation.isPending}
                variant="outline"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Unverify
              </Button>
            )}

            <Button
              onClick={() => {
                if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                  deleteEventMutation.mutate(event.id);
                }
              }}
              disabled={deleteEventMutation.isPending}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Judge Events Verification</h1>
        <p className="text-muted-foreground mt-2">
          Review and verify judge event submissions to maintain credibility
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingEvents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Verified Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedEvents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{events.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({verifiedEvents.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({events.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingEvents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No pending events to verify</p>
              </CardContent>
            </Card>
          ) : (
            pendingEvents.map(renderEventCard)
          )}
        </TabsContent>

        <TabsContent value="verified" className="mt-6">
          {verifiedEvents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No verified events yet</p>
              </CardContent>
            </Card>
          ) : (
            verifiedEvents.map(renderEventCard)
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {events.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No events submitted yet</p>
              </CardContent>
            </Card>
          ) : (
            events.map(renderEventCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
