import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Mail, Users, Calendar, Send, Settings, Activity } from 'lucide-react';
import { NewsletterComposer } from '@/components/newsletter/NewsletterComposer';
import { NewsletterList } from '@/components/newsletter/NewsletterList';
import { NewsletterSubscribers } from '@/components/newsletter/NewsletterSubscribers';
import { NewsletterSchedule } from '@/components/newsletter/NewsletterSchedule';
import { NewsletterStats } from '@/components/newsletter/NewsletterStats';
import { EmailQueueMonitor } from '@/components/newsletter/EmailQueueMonitor';
import { RateLimitTest } from '@/components/newsletter/RateLimitTest';

export default function NewsletterManagement() {
  const [activeTab, setActiveTab] = useState('compose');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingNewsletterId, setEditingNewsletterId] = useState<string | undefined>();

  const handleEditNewsletter = (id: string) => {
    setEditingNewsletterId(id);
    setIsComposerOpen(true);
    setActiveTab('compose');
  };

  const handleCloseComposer = () => {
    setIsComposerOpen(false);
    setEditingNewsletterId(undefined);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletter Management</h1>
          <p className="text-muted-foreground mt-2">
            Create, schedule, and send newsletters to your subscribers
          </p>
        </div>
        <Button onClick={() => setIsComposerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Newsletter
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="newsletters" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Newsletters
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Subscribers
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Queue
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose Newsletter</CardTitle>
              <CardDescription>
                Create beautiful newsletters with rich text formatting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NewsletterComposer
                newsletterId={editingNewsletterId}
                onClose={handleCloseComposer}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="newsletters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Newsletters</CardTitle>
              <CardDescription>
                View and manage all your newsletters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NewsletterList onEdit={handleEditNewsletter} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscribers</CardTitle>
              <CardDescription>
                Manage your newsletter subscribers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NewsletterSubscribers />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Settings</CardTitle>
              <CardDescription>
                Configure automatic newsletter sending schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NewsletterSchedule />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Queue Monitor</CardTitle>
              <CardDescription>
                Monitor email sending progress and rate limiting status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailQueueMonitor />
            </CardContent>
          </Card>
          
          <RateLimitTest />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <NewsletterStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}
