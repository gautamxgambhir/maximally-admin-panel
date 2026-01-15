import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBlogs } from '@/hooks/useBlogs'
import { useHackathons } from '@/hooks/useHackathons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Edit, Users, Trophy, Calendar } from 'lucide-react'
import { FeaturedEvents } from '@/components/FeaturedEvents'

export function Dashboard() {
  const { user } = useAuth()
  const { data: blogs = [], isLoading: blogsLoading } = useBlogs()
  const { data: hackathons = [], isLoading: hackathonsLoading } = useHackathons()

  const isLoading = blogsLoading || hackathonsLoading

  const stats = {
    totalBlogs: blogs.length,
    publishedBlogs: blogs.filter(blog => blog.status === 'published').length,
    draftBlogs: blogs.filter(blog => blog.status === 'draft').length,
    totalHackathons: hackathons.length,
    liveHackathons: hackathons.filter(hackathon => hackathon.status === 'ongoing').length,
    upcomingHackathons: hackathons.filter(hackathon => hackathon.status === 'upcoming').length,
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.email}! Here's an overview of your content management.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Blogs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBlogs}</div>
            <p className="text-xs text-muted-foreground">
              All blog posts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedBlogs}</div>
            <p className="text-xs text-muted-foreground">
              Live on website
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftBlogs}</div>
            <p className="text-xs text-muted-foreground">
              Work in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hackathons</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHackathons}</div>
            <p className="text-xs text-muted-foreground">
              All hackathons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.liveHackathons}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingHackathons}</div>
            <p className="text-xs text-muted-foreground">
              Events coming soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 min-h-[80px]">
              <Button asChild size="sm" className="w-full justify-start text-xs">
                <Link to="/blogs/create">
                  <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Create Blog</span>
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start text-xs">
                <Link to="/hackathons/create">
                  <Trophy className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Create Hackathon</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* REMOVED - Featured Sections deprecated (Platform Simplification) */}

      {/* Featured Events Management */}
      <FeaturedEvents />

      {/* Recent Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Blogs */}
        <Card>
        <CardHeader>
          <CardTitle>Recent Blogs</CardTitle>
          <CardDescription>
            Your latest blog posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blogs.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">No blogs yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating your first blog post.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link to="/blogs/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Blog
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {blogs.slice(0, 5).map((blog) => (
                <div key={blog.id} className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">{blog.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {blog.status} • {new Date(blog.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/blogs/edit/${blog.id}`}>Edit</Link>
                  </Button>
                </div>
              ))}
              {blogs.length > 5 && (
                <div className="pt-4">
                  <Button variant="outline" asChild>
                    <Link to="/blogs">View All Blogs</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Hackathons */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Hackathons</CardTitle>
          <CardDescription>
            Your latest hackathons and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hackathons.length === 0 ? (
            <div className="text-center py-6">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">No hackathons yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating your first hackathon.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link to="/hackathons/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Hackathon
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {hackathons.slice(0, 5).map((hackathon) => (
                <div key={hackathon.id} className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">{hackathon.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {hackathon.status} • {new Date(hackathon.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/hackathons/edit/${hackathon.id}`}>Edit</Link>
                  </Button>
                </div>
              ))}
              {hackathons.length > 5 && (
                <div className="pt-4">
                  <Button variant="outline" asChild>
                    <Link to="/hackathons">View All Hackathons</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
