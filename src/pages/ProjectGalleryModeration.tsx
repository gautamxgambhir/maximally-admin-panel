import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Star,
  Clock,
  ExternalLink,
  Github,
  User,
  Calendar,
  Filter,
  ChevronDown,
  Trophy,
  Heart,
  Code,
  RefreshCw,
  Download
} from 'lucide-react';
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
import { getApiBaseUrl } from '@/lib/apiHelpers';

interface GalleryProject {
  id: number;
  name: string;
  tagline?: string;
  description: string;
  logo_url?: string;
  cover_image_url?: string;
  github_url?: string;
  demo_url?: string;
  category?: string;
  technologies?: string[];
  status: string;
  like_count: number;
  view_count: number;
  hackathon_id?: number;
  hackathon_position?: string;
  moderation_notes?: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
  featured: { label: 'Featured', color: 'bg-purple-500', icon: Star },
};

export default function ProjectGalleryModeration() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedProject, setSelectedProject] = useState<GalleryProject | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const queryClient = useQueryClient();

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['gallery-stats'],
    queryFn: async () => {
      const [pending, approved, rejected, featured, total] = await Promise.all([
        supabaseAdmin.from('gallery_projects').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabaseAdmin.from('gallery_projects').select('id', { count: 'exact' }).eq('status', 'approved'),
        supabaseAdmin.from('gallery_projects').select('id', { count: 'exact' }).eq('status', 'rejected'),
        supabaseAdmin.from('gallery_projects').select('id', { count: 'exact' }).eq('status', 'featured'),
        supabaseAdmin.from('gallery_projects').select('id', { count: 'exact' }),
      ]);
      return {
        pending: pending.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0,
        featured: featured.count || 0,
        total: total.count || 0,
      };
    },
  });

  // Fetch projects
  const { data: projects = [], isLoading, error: projectsError } = useQuery({
    queryKey: ['gallery-projects', statusFilter, search],
    queryFn: async () => {
      // First get the projects
      let query = supabaseAdmin
        .from('gallery_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,tagline.ilike.%${search}%`);
      }

      const { data: projectsData, error } = await query.limit(50);
      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }

      // Then fetch profiles for each project
      const projectsWithProfiles = await Promise.all(
        (projectsData || []).map(async (project: any) => {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('username, full_name, email, avatar_url')
            .eq('id', project.user_id)
            .single();
          return { ...project, profiles: profile };
        })
      );

      return projectsWithProfiles as GalleryProject[];
    },
  });

  // Moderate project mutation
  const moderateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const { data: session } = await supabaseAdmin.auth.getSession();
      const adminId = session?.session?.user?.id;

      const { error } = await supabaseAdmin
        .from('gallery_projects')
        .update({
          status,
          moderation_notes: notes,
          moderated_by: adminId,
          moderated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-projects'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-stats'] });
      toast.success('Project moderated successfully');
      setSelectedProject(null);
      setModerationNotes('');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Sync hackathon submissions mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabaseAdmin.auth.getSession();
      const token = session?.session?.access_token;
      
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/api/gallery/admin/sync-hackathon-submissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gallery-projects'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-stats'] });
      toast.success(data.message || 'Sync completed');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleModerate = (status: string) => {
    if (!selectedProject) return;
    moderateMutation.mutate({
      id: selectedProject.id,
      status,
      notes: moderationNotes,
    });
  };

  const quickModerate = (project: GalleryProject, status: string) => {
    moderateMutation.mutate({ id: project.id, status });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Gallery Moderation</h1>
          <p className="text-gray-600 mt-2">Review and moderate community project submissions</p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {syncMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Sync Hackathon Submissions
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-gray-500">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-gray-500">Rejected</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.featured}</div>
              <div className="text-sm text-gray-500">Featured</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No projects found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Project Image */}
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                    {project.cover_image_url ? (
                      <img
                        src={project.cover_image_url}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : project.logo_url ? (
                      <img
                        src={project.logo_url}
                        alt={project.name}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Code className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Project Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{project.name}</h3>
                          {getStatusBadge(project.status)}
                          {project.hackathon_id && (
                            <Badge variant="outline" className="border-orange-500 text-orange-600">
                              <Trophy className="h-3 w-3 mr-1" />
                              Hackathon
                            </Badge>
                          )}
                        </div>
                        {project.tagline && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {project.tagline}
                          </p>
                        )}
                      </div>

                      {/* Quick Actions */}
                      {project.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => quickModerate(project, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => quickModerate(project, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                      {project.profiles && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          @{project.profiles.username}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {project.view_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {project.like_count}
                      </div>
                      {project.category && (
                        <Badge variant="secondary">{project.category}</Badge>
                      )}
                    </div>

                    {/* Technologies */}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {project.technologies.slice(0, 5).map((tech, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                        {project.technologies.length > 5 && (
                          <span className="text-xs text-gray-400">
                            +{project.technologies.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Links & Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {project.github_url && (
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {project.demo_url && (
                        <a
                          href={project.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProject(project);
                              setModerationNotes(project.moderation_notes || '');
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Review Project: {selectedProject?.name}</DialogTitle>
                          </DialogHeader>

                          {selectedProject && (
                            <Tabs defaultValue="details" className="mt-4">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="moderate">Moderate</TabsTrigger>
                              </TabsList>

                              <TabsContent value="details" className="space-y-4 mt-4">
                                {/* Cover Image */}
                                {selectedProject.cover_image_url && (
                                  <img
                                    src={selectedProject.cover_image_url}
                                    alt={selectedProject.name}
                                    className="w-full h-48 object-cover rounded-lg"
                                  />
                                )}

                                {/* Project Info */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <h4 className="font-semibold mb-2">Project Info</h4>
                                    <p><strong>Name:</strong> {selectedProject.name}</p>
                                    <p><strong>Tagline:</strong> {selectedProject.tagline || 'N/A'}</p>
                                    <p><strong>Category:</strong> {selectedProject.category || 'N/A'}</p>
                                    <p><strong>Status:</strong> {selectedProject.status}</p>
                                  </div>
                                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <h4 className="font-semibold mb-2">Submitter</h4>
                                    <p><strong>Username:</strong> @{selectedProject.profiles?.username}</p>
                                    <p><strong>Name:</strong> {selectedProject.profiles?.full_name || 'N/A'}</p>
                                    <p><strong>Email:</strong> {selectedProject.profiles?.email}</p>
                                  </div>
                                </div>

                                {/* Description */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                  <h4 className="font-semibold mb-2">Description</h4>
                                  <p className="text-sm whitespace-pre-wrap">{selectedProject.description}</p>
                                </div>

                                {/* Links */}
                                <div className="flex gap-2">
                                  {selectedProject.github_url && (
                                    <a
                                      href={selectedProject.github_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                    >
                                      <Github className="h-4 w-4" />
                                      GitHub
                                    </a>
                                  )}
                                  {selectedProject.demo_url && (
                                    <a
                                      href={selectedProject.demo_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      Demo
                                    </a>
                                  )}
                                </div>
                              </TabsContent>

                              <TabsContent value="moderate" className="space-y-4 mt-4">
                                <div>
                                  <label className="text-sm font-medium">Moderation Notes</label>
                                  <Textarea
                                    value={moderationNotes}
                                    onChange={(e) => setModerationNotes(e.target.value)}
                                    placeholder="Add notes about this moderation decision..."
                                    className="mt-1"
                                    rows={4}
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    onClick={() => handleModerate('approved')}
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={moderateMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => handleModerate('rejected')}
                                    variant="destructive"
                                    disabled={moderateMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                  <Button
                                    onClick={() => handleModerate('featured')}
                                    className="bg-purple-600 hover:bg-purple-700"
                                    disabled={moderateMutation.isPending}
                                  >
                                    <Star className="h-4 w-4 mr-2" />
                                    Feature
                                  </Button>
                                  <Button
                                    onClick={() => handleModerate('pending')}
                                    variant="outline"
                                    disabled={moderateMutation.isPending}
                                  >
                                    <Clock className="h-4 w-4 mr-2" />
                                    Set Pending
                                  </Button>
                                </div>

                                {selectedProject.moderation_notes && (
                                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                    <h4 className="font-semibold text-sm mb-1">Previous Notes</h4>
                                    <p className="text-sm">{selectedProject.moderation_notes}</p>
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
