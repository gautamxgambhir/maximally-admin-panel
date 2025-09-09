import React, { useState } from 'react'
import { useJudges, useCreateJudge, useUpdateJudge, useDeleteJudge, useUploadJudgeImage } from '@/hooks/useJudges'
import { Judge } from '@/types/hackathon'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Plus, Edit, Trash2, X, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const judgeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  bio: z.string().optional(),
})

type JudgeForm = z.infer<typeof judgeSchema>

interface JudgeManagerProps {
  hackathonId: string
  hackathonName: string
}

export function JudgeManager({ hackathonId, hackathonName }: JudgeManagerProps) {
  const { data: judges = [], isLoading, error } = useJudges(hackathonId)
  const createJudge = useCreateJudge()
  const updateJudge = useUpdateJudge()
  const deleteJudge = useDeleteJudge()
  const uploadImage = useUploadJudgeImage()
  
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JudgeForm>({
    resolver: zodResolver(judgeSchema),
  })

  const handleCreateJudge = async (data: JudgeForm) => {
    try {
      await createJudge.mutateAsync({
        hackathon_id: hackathonId,
        ...data,
        profile_image: profileImageUrl || undefined,
        bio: data.bio || undefined,
      })
      reset()
      setProfileImageUrl('')
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Error creating judge:', error)
    }
  }

  const handleUpdateJudge = async (data: JudgeForm) => {
    if (!editingJudge) return
    
    try {
      await updateJudge.mutateAsync({
        id: editingJudge.id,
        hackathon_id: hackathonId,
        ...data,
        profile_image: profileImageUrl || editingJudge.profile_image || undefined,
        bio: data.bio || undefined,
      })
      reset()
      setProfileImageUrl('')
      setEditingJudge(null)
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating judge:', error)
    }
  }

  const handleDeleteJudge = async (judge: Judge) => {
    try {
      await deleteJudge.mutateAsync(judge.id)
    } catch (error) {
      console.error('Error deleting judge:', error)
    }
  }

  const handleImageUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const url = await uploadImage.mutateAsync(file)
      setProfileImageUrl(url)
    } catch {
      // Error handled by hook
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        handleImageUpload(file)
      } else {
        alert('Please select an image file')
      }
    }
  }

  const openCreateDialog = () => {
    reset()
    setProfileImageUrl('')
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (judge: Judge) => {
    setEditingJudge(judge)
    setValue('name', judge.name)
    setValue('role', judge.role)
    setValue('bio', judge.bio || '')
    setProfileImageUrl(judge.profile_image || '')
    setIsEditDialogOpen(true)
  }

  const removeProfileImage = () => {
    setProfileImageUrl('')
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-500">Error loading judges: {error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Judges for {hackathonName}</CardTitle>
              <CardDescription>
                Manage the judges for this hackathon ({judges.length} total)
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Judge
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Judge</DialogTitle>
                  <DialogDescription>
                    Add a judge to this hackathon
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(handleCreateJudge)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-name">Name *</Label>
                    <Input
                      id="create-name"
                      placeholder="Judge name"
                      {...register('name')}
                      disabled={isSubmitting}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-role">Role *</Label>
                    <Input
                      id="create-role"
                      placeholder="e.g., AI Researcher, Google"
                      {...register('role')}
                      disabled={isSubmitting}
                    />
                    {errors.role && (
                      <p className="text-sm text-red-500">{errors.role.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-bio">Bio</Label>
                    <Textarea
                      id="create-bio"
                      placeholder="Short bio about the judge..."
                      {...register('bio')}
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Profile Image</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      {profileImageUrl ? (
                        <div className="relative">
                          <img
                            src={profileImageUrl}
                            alt="Profile"
                            className="w-20 h-20 object-cover rounded-full mx-auto"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeProfileImage}
                            className="absolute top-0 right-1/2 transform translate-x-1/2 -translate-y-2"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <User className="mx-auto h-8 w-8 text-gray-400" />
                          <div className="mt-2">
                            <label htmlFor="create-profile-image" className="cursor-pointer">
                              <span className="text-sm font-medium text-gray-900">
                                {isUploading ? 'Uploading...' : 'Upload profile image'}
                              </span>
                            </label>
                            <input
                              id="create-profile-image"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleFileChange}
                              disabled={isUploading || isSubmitting}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || isUploading}>
                      {isSubmitting ? 'Adding...' : 'Add Judge'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {judges.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No judges yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding judges to this hackathon.
              </p>
              <div className="mt-6">
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Judge
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {judges.map((judge) => (
                <div key={judge.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {judge.profile_image ? (
                        <img
                          src={judge.profile_image}
                          alt={judge.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-sm">{judge.name}</h4>
                        <p className="text-xs text-gray-500">{judge.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(judge)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Judge</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {judge.name} from this hackathon? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteJudge(judge)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {judge.bio && (
                    <p className="text-xs text-gray-600 line-clamp-2">{judge.bio}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Judge</DialogTitle>
            <DialogDescription>
              Update judge information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleUpdateJudge)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Judge name"
                {...register('name')}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role *</Label>
              <Input
                id="edit-role"
                placeholder="e.g., AI Researcher, Google"
                {...register('role')}
                disabled={isSubmitting}
              />
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                placeholder="Short bio about the judge..."
                {...register('bio')}
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Profile Image</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {profileImageUrl ? (
                  <div className="relative">
                    <img
                      src={profileImageUrl}
                      alt="Profile"
                      className="w-20 h-20 object-cover rounded-full mx-auto"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeProfileImage}
                      className="absolute top-0 right-1/2 transform translate-x-1/2 -translate-y-2"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="mt-2 text-center">
                      <label htmlFor="edit-profile-image" className="cursor-pointer">
                        <span className="text-xs text-gray-600">
                          {isUploading ? 'Uploading...' : 'Change image'}
                        </span>
                      </label>
                      <input
                        id="edit-profile-image"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isUploading || isSubmitting}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <User className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="mt-2">
                      <label htmlFor="edit-profile-image" className="cursor-pointer">
                        <span className="text-sm font-medium text-gray-900">
                          {isUploading ? 'Uploading...' : 'Upload profile image'}
                        </span>
                      </label>
                      <input
                        id="edit-profile-image"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isUploading || isSubmitting}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
