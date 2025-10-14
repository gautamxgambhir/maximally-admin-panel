import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, UserCheck, UserX, Mail, Users, UserPlus } from 'lucide-react'
import { toggleAdminRole } from '@/lib/profileApi'
import type { Profile } from '@/types/profile'
import { AdminList } from '@/components/AdminList'

const adminManagementSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type AdminManagementForm = z.infer<typeof adminManagementSchema>

interface UserResult {
  profile: Profile
  isNowAdmin: boolean
  action: 'promoted' | 'demoted'
}

export function AdminManagement() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<UserResult | null>(null)
  const [activeTab, setActiveTab] = useState('list')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AdminManagementForm>({
    resolver: zodResolver(adminManagementSchema),
  })

  const onSubmit = async (data: AdminManagementForm) => {
    setIsLoading(true)
    setLastResult(null)
    
    try {
      const { data: result, error } = await toggleAdminRole(data.email.trim().toLowerCase())
      
      if (error) {
        if (error.message === 'Email not found') {
          toast.error('Email not found in the system')
        } else {
          toast.error(error.message || 'Failed to update user role')
        }
        return
      }

      if (result) {
        const action = result.isNowAdmin ? 'promoted' : 'demoted'
        const actionText = result.isNowAdmin ? 'promoted to admin' : 'removed from admin'
        
        setLastResult({
          profile: result.profile,
          isNowAdmin: result.isNowAdmin,
          action,
        })
        
        toast.success(`User ${actionText} successfully`)
        reset()
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Admin Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage admin roles and view current administrators
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Current Admins
            </TabsTrigger>
            <TabsTrigger value="toggle" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Toggle Admin Role
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
            <AdminList />
          </TabsContent>

          <TabsContent value="toggle" className="space-y-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Toggle Admin Role
                  </CardTitle>
                  <CardDescription>
                    Enter an email address to toggle admin status. If the user is currently an admin, 
                    they will be demoted to a regular user. If they're a regular user, they'll be promoted to admin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">User Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        {...register('email')}
                        disabled={isLoading}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Toggle Admin Status'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {lastResult && (
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {lastResult.isNowAdmin ? (
                          <UserCheck className="h-6 w-6 text-green-600" />
                        ) : (
                          <UserX className="h-6 w-6 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{lastResult.profile.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Role:</span>
                          <Badge variant={lastResult.isNowAdmin ? "default" : "secondary"}>
                            {lastResult.profile.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          User was successfully {lastResult.action === 'promoted' ? 'promoted to admin' : 'demoted to regular user'}.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm space-y-1">
                      <p className="font-medium text-blue-900">Important Notes:</p>
                      <ul className="text-blue-800 space-y-1">
                        <li>• Only existing registered users can be made admins</li>
                        <li>• Admin users have full access to this admin panel</li>
                        <li>• Regular users will be automatically signed out if they try to access admin areas</li>
                        <li>• Changes take effect immediately</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}