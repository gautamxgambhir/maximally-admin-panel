import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/apiHelpers';

interface ScheduleSettings {
  id?: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number;
  day_of_month?: number;
  time_of_day: string;
  is_active: boolean;
  next_scheduled_at?: string;
}

export function NewsletterSchedule() {
  const [settings, setSettings] = useState<ScheduleSettings>({
    frequency: 'weekly',
    day_of_week: 1,
    time_of_day: '09:00',
    is_active: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/schedule`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setSettings(data);
        }
      }
    } catch (error) {
      console.error('Failed to load schedule settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(`${baseUrl}/api/admin/newsletter/schedule/settings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      const data = await response.json();
      setSettings(data);

      toast.success('Newsletter schedule settings have been updated');
    } catch (error) {
      toast.error('Failed to save schedule settings');
    } finally {
      setIsSaving(false);
    }
  };

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  if (isLoading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="active">Enable Automatic Sending</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically send pending newsletters based on schedule
            </p>
          </div>
          <Switch
            id="active"
            checked={settings.is_active}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, is_active: checked })
            }
          />
        </div>

        <div>
          <Label htmlFor="frequency">Frequency</Label>
          <Select
            value={settings.frequency}
            onValueChange={(value: any) =>
              setSettings({ ...settings, frequency: value })
            }
          >
            <SelectTrigger id="frequency" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly (Every 2 weeks)</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(settings.frequency === 'weekly' || settings.frequency === 'biweekly') && (
          <div>
            <Label htmlFor="day-of-week">Day of Week</Label>
            <Select
              value={settings.day_of_week?.toString()}
              onValueChange={(value) =>
                setSettings({ ...settings, day_of_week: parseInt(value) })
              }
            >
              <SelectTrigger id="day-of-week" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {settings.frequency === 'monthly' && (
          <div>
            <Label htmlFor="day-of-month">Day of Month</Label>
            <Input
              id="day-of-month"
              type="number"
              min="1"
              max="31"
              value={settings.day_of_month || 1}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  day_of_month: parseInt(e.target.value),
                })
              }
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter a day between 1 and 31
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="time">Time of Day</Label>
          <Input
            id="time"
            type="time"
            value={settings.time_of_day}
            onChange={(e) =>
              setSettings({ ...settings, time_of_day: e.target.value })
            }
            className="mt-1"
          />
        </div>

        {settings.next_scheduled_at && settings.is_active && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Next Scheduled Send</p>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(settings.next_scheduled_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </>
        )}
      </Button>

      <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          How it works
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 list-disc list-inside">
          <li>Create a newsletter and set its status to "Pending"</li>
          <li>The system will automatically send it based on your schedule</li>
          <li>Only one pending newsletter will be sent per scheduled time</li>
          <li>You can still send newsletters manually at any time</li>
        </ul>
      </div>
    </div>
  );
}
