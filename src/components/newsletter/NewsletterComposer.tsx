import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Send, Save, Calendar, Eye } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { NewsletterPreview } from './NewsletterPreview';
import { EmailQueueMonitor } from './EmailQueueMonitor';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/apiHelpers';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NewsletterComposerProps {
  newsletterId?: string;
  onClose?: () => void;
}

export function NewsletterComposer({ newsletterId, onClose }: NewsletterComposerProps) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [showQueueMonitor, setShowQueueMonitor] = useState(false);

  useEffect(() => {
    if (newsletterId) {
      loadNewsletter(newsletterId);
    }
  }, [newsletterId]);

  const loadNewsletter = async (id: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/${id}`, { headers });
      if (!response.ok) throw new Error('Failed to load newsletter');
      
      const data = await response.json();
      setSubject(data.subject);
      setContent(data.content);
      setHtmlContent(data.html_content);
      
      if (data.scheduled_for) {
        const date = new Date(data.scheduled_for);
        setScheduleDate(date.toISOString().split('T')[0]);
        setScheduleTime(date.toTimeString().slice(0, 5));
      }
    } catch (error) {
      toast.error('Failed to load newsletter');
    }
  };

  const handleSaveDraft = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject for the newsletter');
      return;
    }

    setIsSaving(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: newsletterId,
          subject,
          content,
          html_content: htmlContent,
          status: 'draft',
        }),
      });

      if (!response.ok) throw new Error('Failed to save draft');

      toast.success('Newsletter saved as draft successfully');
    } catch (error) {
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSchedule = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error('Please fill in subject and content');
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      toast.error('Please select date and time for scheduling');
      return;
    }

    setIsLoading(true);
    try {
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${baseUrl}/api/admin/newsletter/schedule`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: newsletterId,
          subject,
          content,
          html_content: htmlContent,
          scheduled_for: scheduledFor.toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to schedule newsletter');

      toast.success(`Newsletter will be sent on ${scheduledFor.toLocaleString()}`);

      resetForm();
      onClose?.();
    } catch (error) {
      toast.error('Failed to schedule newsletter');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error('Please fill in subject and content');
      return;
    }

    setShowSendConfirm(true);
  };

  const confirmSendNow = async () => {
    setShowSendConfirm(false);
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: newsletterId,
          subject,
          content,
          html_content: htmlContent,
        }),
      });

      if (!response.ok) throw new Error('Failed to send newsletter');

      const data = await response.json();
      
      toast.success(`Newsletter queued for sending to ${data.total_recipients} subscribers`);
      
      // Show queue monitor with batch tracking
      if (data.batch_id) {
        setCurrentBatchId(data.batch_id);
        setShowQueueMonitor(true);
      }

      resetForm();
    } catch (error) {
      toast.error('Failed to send newsletter');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setContent('');
    setHtmlContent('');
    setScheduleDate('');
    setScheduleTime('');
  };

  const handleQueueMonitorRefresh = () => {
    // Optionally refresh the newsletter list or perform other actions
    onClose?.();
  };

  // Show queue monitor if we have a batch ID
  if (showQueueMonitor && currentBatchId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Newsletter Sending Progress</h3>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowQueueMonitor(false);
              setCurrentBatchId(null);
              onClose?.();
            }}
          >
            Close
          </Button>
        </div>
        <EmailQueueMonitor 
          batchId={currentBatchId} 
          onRefresh={handleQueueMonitorRefresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="Enter newsletter subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Content</Label>
          <RichTextEditor
            value={content}
            onChange={(text, html) => {
              setContent(text);
              setHtmlContent(html);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="schedule-date">Schedule Date (Optional)</Label>
            <Input
              id="schedule-date"
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="schedule-time">Schedule Time (Optional)</Label>
            <Input
              id="schedule-time"
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleSaveDraft}
          variant="outline"
          disabled={isSaving || isLoading}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </>
          )}
        </Button>

        <Button
          onClick={() => setShowPreview(true)}
          variant="outline"
          disabled={!subject || !content}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>

        <Button
          onClick={handleSchedule}
          variant="secondary"
          disabled={isLoading || !scheduleDate || !scheduleTime}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Scheduling...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </>
          )}
        </Button>

        <Button
          onClick={handleSendNow}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Now
            </>
          )}
        </Button>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Newsletter Preview</DialogTitle>
            <DialogDescription>
              This is how your newsletter will appear to subscribers
            </DialogDescription>
          </DialogHeader>
          <NewsletterPreview subject={subject} htmlContent={htmlContent} />
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        onConfirm={confirmSendNow}
        title="Send Newsletter Now?"
        message="Are you sure you want to send this newsletter to all subscribers immediately? This action cannot be undone."
        confirmText="Send Now"
        variant="warning"
        isLoading={isLoading}
      />
    </div>
  );
}
