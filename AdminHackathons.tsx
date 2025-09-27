import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { insertHackathonSchema } from '@shared/schema';
import { z } from 'zod';
import { Plus, Trash2, Settings, Palette, Type, Layout } from 'lucide-react';
import SEO from '@/components/SEO';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Form schema for hackathon creation (already has proper validation from shared schema)
const hackathonFormSchema = insertHackathonSchema;

type HackathonFormData = z.infer<typeof hackathonFormSchema>;

// Font options
const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter (Sans Serif)' },
  { value: 'Press Start 2P, monospace', label: 'Press Start 2P (Pixel)' },
  { value: 'VT323, monospace', label: 'VT323 (Terminal)' },
  { value: 'JetBrains Mono, monospace', label: 'JetBrains Mono' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Space Mono, monospace', label: 'Space Mono' },
  { value: 'Orbitron, sans-serif', label: 'Orbitron (Futuristic)' },
];

// Font size options
const FONT_SIZE_OPTIONS = [
  { value: '12px', label: 'Small (12px)' },
  { value: '14px', label: 'Default (14px)' },
  { value: '16px', label: 'Medium (16px)' },
  { value: '18px', label: 'Large (18px)' },
  { value: '20px', label: 'Extra Large (20px)' },
  { value: '24px', label: 'Huge (24px)' },
];

// Color picker component
function ColorPicker({ value, onChange, label }: { value: string; onChange: (color: string) => void; label: string }) {
  const [showPicker, setShowPicker] = useState(false);
  
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgb = hexToRgb(value);
  const rgbString = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '';

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="w-12 h-8 border-2 border-gray-300 rounded cursor-pointer"
            style={{ backgroundColor: value }}
            onClick={() => setShowPicker(!showPicker)}
          />
          {showPicker && (
            <div className="absolute top-10 left-0 z-10">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-20 h-20"
                data-testid={`color-picker-${label.toLowerCase().replace(' ', '-')}`}
              />
            </div>
          )}
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="w-24"
          data-testid={`input-${label.toLowerCase().replace(' ', '-')}`}
        />
        <span className="text-sm text-gray-500 min-w-[120px]">{rgbString}</span>
      </div>
    </div>
  );
}

// Array field component
function ArrayField({ 
  values, 
  onChange, 
  label, 
  placeholder 
}: { 
  values: string[]; 
  onChange: (values: string[]) => void; 
  label: string; 
  placeholder: string;
}) {
  const addItem = () => {
    onChange([...values, '']);
  };

  const removeItem = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    onChange(newValues);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => updateItem(index, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
            data-testid={`${label.toLowerCase().replace(' ', '-')}-${index}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeItem(index)}
            data-testid={`remove-${label.toLowerCase().replace(' ', '-')}-${index}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        data-testid={`add-${label.toLowerCase().replace(' ', '-')}`}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add {label.slice(0, -1)}
      </Button>
    </div>
  );
}

export default function AdminHackathons() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<HackathonFormData>({
    resolver: zodResolver(hackathonFormSchema),
    defaultValues: {
      slug: '',
      title: '',
      subtitle: undefined,
      tagline: '',
      badge_text: undefined,
      description: '',
      registration_url: undefined,
      start_date: '',
      end_date: '',
      duration: '',
      format: 'Online',
      team_size: 'Solo or up to 4',
      judging_type: 'Async with optional pitch',
      results_date: '',
      what_it_is: '',
      the_idea: '',
      who_joins: [],
      tech_rules: [],
      fun_awards: [],
      perks: [],
      cash_pool: undefined,
      judging_description: '',
      judging_criteria: '',
      required_submissions: [],
      optional_submissions: [],
      // New text content fields
      announcements: undefined,
      event_highlights: undefined,
      sponsor_message: undefined,
      faq_content: undefined,
      timeline_details: undefined,
      special_instructions: undefined,
      theme_color_primary: '#dc2626',
      theme_color_secondary: '#fbbf24',
      theme_color_accent: '#10b981',
      theme_config: {
        fonts: {
          primary: 'VT323, monospace',
          secondary: 'Press Start 2P, monospace',
          accent: 'JetBrains Mono, monospace',
          body: 'Inter, sans-serif'
        },
        colors: {
          primary: '#dc2626',
          secondary: '#fbbf24',
          accent: '#10b981',
          background: '#0f0f23',
          surface: '#1a1a2e',
          text: '#ffffff',
          textSecondary: '#cccccc',
          border: '#333333'
        },
        spacing: {
          section: '4rem',
          container: '2rem',
          element: '1rem'
        },
        animations: {
          enabled: true,
          speed: 'fast',
          effects: ['glow', 'float']
        },
        layout: {
          heroStyle: 'centered',
          gridCols: 2,
          borderRadius: '0.5rem',
          shadows: true
        },
        svgElements: {
          heroIcon: undefined,
          decorativePattern: undefined,
          sectionDivider: undefined
        },
        customCSS: {
          heroBackgroundPattern: undefined,
          glowEffect: '0 0 20px rgba(220, 38, 38, 0.5)',
          textGradient: 'linear-gradient(45deg, #dc2626, #fbbf24)'
        }
      },
      is_active: true
    },
  });

  const onSubmit = async (data: HackathonFormData) => {
    console.log('Form submission started', data);
    setIsSubmitting(true);
    try {
      console.log('Making API request to /api/hackathons');
      const response = await fetch('/api/hackathons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      console.log('API response received', response.status, response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.details) {
          // Handle validation errors from server
          errorData.details.forEach((issue: any) => {
            if (issue.path && issue.path.length > 0) {
              form.setError(issue.path.join('.') as any, {
                type: 'server',
                message: issue.message,
              });
            }
          });
          toast({
            title: 'Validation Error',
            description: 'Please check the form for errors and try again.',
            variant: 'destructive',
          });
        } else {
          throw new Error(errorData.error || 'Failed to create hackathon');
        }
        return;
      }

      const result = await response.json();
      toast({
        title: 'Success!',
        description: `Hackathon "${result.title}" created successfully.`,
      });

      // Reset form
      form.reset();
    } catch (error) {
      console.error('Error creating hackathon:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create hackathon. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <SEO
        title="Admin - Create Hackathon | Maximally"
        description="Admin panel for creating and managing hackathons with custom theming"
      />
      
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-press-start text-3xl md:text-4xl text-red-500 mb-4">
              <Settings className="inline-block mr-3 h-8 w-8" />
              HACKATHON ADMIN
            </h1>
            <p className="text-gray-300 text-lg">Create and customize hackathon events</p>
          </div>

          <Card className="bg-black border-red-500 border-2">
            <CardHeader>
              <CardTitle className="text-red-500 font-press-start">Create New Hackathon</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  console.log('Form validation errors:', errors);
                  toast({
                    title: 'Form Invalid',
                    description: 'Please check all required fields and try again.',
                    variant: 'destructive',
                  });
                })} className="space-y-6">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid grid-cols-4 w-full">
                      <TabsTrigger value="basic">
                        <Settings className="h-4 w-4 mr-2" />
                        Basic Info
                      </TabsTrigger>
                      <TabsTrigger value="content">
                        <Type className="h-4 w-4 mr-2" />
                        Content
                      </TabsTrigger>
                      <TabsTrigger value="theming">
                        <Palette className="h-4 w-4 mr-2" />
                        Theming
                      </TabsTrigger>
                      <TabsTrigger value="advanced">
                        <Layout className="h-4 w-4 mr-2" />
                        Advanced
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slug (URL identifier)</FormLabel>
                              <FormControl>
                                <Input placeholder="my-awesome-hackathon" data-testid="input-slug" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="MAXIMALLY HACKATHON" data-testid="input-title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tagline"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tagline</FormLabel>
                              <FormControl>
                                <Input placeholder="Build the future in 48 hours" data-testid="input-tagline" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="badge_text"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Badge Text (optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="⚡ LIVE EVENT ⚡" data-testid="input-badge-text" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="A brief description of your hackathon..."
                                className="min-h-[100px]"
                                data-testid="textarea-description"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                          control={form.control}
                          name="start_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input placeholder="Dec 15, 2025" data-testid="input-start-date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="end_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input placeholder="Dec 17, 2025" data-testid="input-end-date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration</FormLabel>
                              <FormControl>
                                <Input placeholder="48 hours" data-testid="input-duration" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="registration_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration URL (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/register" data-testid="input-registration-url" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="content" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="what_it_is"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>What It Is</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe what this hackathon is about..."
                                  className="min-h-[120px]"
                                  data-testid="textarea-what-it-is"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="the_idea"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>The Idea</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Explain the core concept and goals..."
                                  className="min-h-[120px]"
                                  data-testid="textarea-the-idea"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="who_joins"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ArrayField
                                  values={field.value}
                                  onChange={field.onChange}
                                  label="Who Joins"
                                  placeholder="Students, developers, etc."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tech_rules"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ArrayField
                                  values={field.value}
                                  onChange={field.onChange}
                                  label="Tech Rules"
                                  placeholder="Any stack, AI tools allowed, etc."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="fun_awards"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ArrayField
                                  values={field.value}
                                  onChange={field.onChange}
                                  label="Fun Awards"
                                  placeholder="Most creative, best hack, etc."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="perks"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ArrayField
                                  values={field.value}
                                  onChange={field.onChange}
                                  label="Perks"
                                  placeholder="Certificates, networking, etc."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Additional text content fields */}
                      <Separator />
                      <div className="space-y-4">
                        <h3 className="font-press-start text-lg text-red-500">Additional Content</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="announcements"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Announcements (optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Important updates, deadlines, or news about the hackathon..."
                                    className="min-h-[100px]"
                                    data-testid="textarea-announcements"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="event_highlights"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Event Highlights (optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Key features, unique aspects, or selling points of this hackathon..."
                                    className="min-h-[100px]"
                                    data-testid="textarea-event-highlights"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="sponsor_message"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sponsor Message (optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Message from event sponsors, acknowledgments, or partnership details..."
                                    className="min-h-[100px]"
                                    data-testid="textarea-sponsor-message"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="faq_content"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>FAQ Content (optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Frequently asked questions and answers..."
                                    className="min-h-[100px]"
                                    data-testid="textarea-faq-content"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="timeline_details"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Timeline Details (optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Detailed schedule, milestones, or timeline information..."
                                    className="min-h-[100px]"
                                    data-testid="textarea-timeline-details"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="special_instructions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Special Instructions (optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Any special notes, requirements, or instructions for participants..."
                                    className="min-h-[100px]"
                                    data-testid="textarea-special-instructions"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="theming" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ColorPicker
                          value={form.watch('theme_color_primary')}
                          onChange={(color) => {
                            form.setValue('theme_color_primary', color);
                            form.setValue('theme_config.colors.primary', color);
                          }}
                          label="Primary Color"
                        />

                        <ColorPicker
                          value={form.watch('theme_color_secondary')}
                          onChange={(color) => {
                            form.setValue('theme_color_secondary', color);
                            form.setValue('theme_config.colors.secondary', color);
                          }}
                          label="Secondary Color"
                        />

                        <ColorPicker
                          value={form.watch('theme_color_accent')}
                          onChange={(color) => {
                            form.setValue('theme_color_accent', color);
                            form.setValue('theme_config.colors.accent', color);
                          }}
                          label="Accent Color"
                        />
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="font-press-start text-lg text-red-500">Fonts</h3>
                          
                          <div className="space-y-3">
                            <div>
                              <Label>Primary Font</Label>
                              <Select
                                value={form.watch('theme_config.fonts.primary')}
                                onValueChange={(value) => form.setValue('theme_config.fonts.primary', value)}
                              >
                                <SelectTrigger data-testid="select-primary-font">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FONT_OPTIONS.map((font) => (
                                    <SelectItem key={font.value} value={font.value}>
                                      {font.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Secondary Font</Label>
                              <Select
                                value={form.watch('theme_config.fonts.secondary')}
                                onValueChange={(value) => form.setValue('theme_config.fonts.secondary', value)}
                              >
                                <SelectTrigger data-testid="select-secondary-font">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FONT_OPTIONS.map((font) => (
                                    <SelectItem key={font.value} value={font.value}>
                                      {font.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-press-start text-lg text-red-500">Additional Colors</h3>
                          
                          <div className="space-y-3">
                            <ColorPicker
                              value={form.watch('theme_config.colors.background') || '#0f0f23'}
                              onChange={(color) => form.setValue('theme_config.colors.background', color)}
                              label="Background"
                            />

                            <ColorPicker
                              value={form.watch('theme_config.colors.surface') || '#1a1a2e'}
                              onChange={(color) => form.setValue('theme_config.colors.surface', color)}
                              label="Surface"
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="required_submissions"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ArrayField
                                  values={field.value}
                                  onChange={field.onChange}
                                  label="Required Submissions"
                                  placeholder="Code/files, demo link, etc."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="optional_submissions"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ArrayField
                                  values={field.value || []}
                                  onChange={field.onChange}
                                  label="Optional Submissions"
                                  placeholder="Demo video, pitch deck, etc."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="judging_description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Judging Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Who will judge and how..."
                                  className="min-h-[100px]"
                                  data-testid="textarea-judging-description"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="judging_criteria"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Judging Criteria</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Creativity, technical execution, etc..."
                                  className="min-h-[100px]"
                                  data-testid="textarea-judging-criteria"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="cash_pool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cash Pool (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="₹10,000 total prizes" data-testid="input-cash-pool" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                      data-testid="button-reset"
                    >
                      Reset Form
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-red-500 hover:bg-red-600"
                      data-testid="button-submit"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Hackathon'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}