import React from 'react'
import { Link } from 'react-router-dom'
import { useBlogs, useDeleteBlog } from '@/hooks/useBlogs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import { Blog } from '@/types/blog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function BlogList() {
  const { data: blogs = [], isLoading, error } = useBlogs()
  const deleteBlog = useDeleteBlog()

  const handleDeleteBlog = async (blog: Blog) => {
    try {
      await deleteBlog.mutateAsync(blog.id)
    } catch (error) {
      console.error('Error deleting blog:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading blogs: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
            Blog Posts
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your blog posts
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/blogs/create" className="text-sm sm:text-base">
            <Plus className="mr-1 sm:mr-2 h-4 w-4" />
            Create Blog
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Blogs ({blogs.length})</CardTitle>
          <CardDescription>
            A list of all your blog posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No blogs</h3>
              <p className="mt-1 text-sm text-gray-500">
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogs.map((blog) => (
                    <TableRow key={blog.id}>
                      <TableCell className="font-medium">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{blog.title}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">
                            /{blog.slug}
                          </div>
                          <div className="sm:hidden text-xs text-muted-foreground mt-1">
                            by {blog.author_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {blog.author_name}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={blog.status === 'published' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {blog.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {new Date(blog.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          {blog.status === 'published' && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              <a
                                href={`https://maximally.vercel.app/blog/${blog.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Live"
                              >
                                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Link to={`/blogs/edit/${blog.id}`} title="Edit">
                              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-sm sm:max-w-lg">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Blog</AlertDialogTitle>
                                <AlertDialogDescription className="break-words">
                                  Are you sure you want to delete "{blog.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteBlog(blog)}
                                  disabled={deleteBlog.isPending}
                                  className="bg-red-500 hover:bg-red-600 w-full sm:w-auto"
                                >
                                  {deleteBlog.isPending ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
