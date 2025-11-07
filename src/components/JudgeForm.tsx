import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Judge, JudgeInput } from '@/lib/judgesApi'

const judgeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  role_in_company: z.string().min(1, 'Role is required').max(255, 'Role is too long'),
  company: z.string().min(1, 'Company is required').max(255, 'Company name is too long'),
  display_order: z.number().int().min(0).optional(),
  username: z.string().optional(),
  headline: z.string().optional(),
  location: z.string().optional(),
  tier: z.enum(['starter', 'verified', 'senior', 'chief', 'legacy']).optional(),
  total_events_judged: z.number().int().min(0).optional(),
  total_teams_evaluated: z.number().int().min(0).optional(),
  total_mentorship_hours: z.number().int().min(0).optional(),
  is_published: z.boolean().optional(),
})

type JudgeFormData = z.infer<typeof judgeSchema>

interface JudgeFormProps {
  judge?: Judge
  onSubmit: (data: JudgeInput) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function JudgeForm({ 
  judge, 
  onSubmit, 
  onCancel, 
  isSubmitting = false
}: JudgeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<JudgeFormData>({
    resolver: zodResolver(judgeSchema),
    defaultValues: {
      name: judge?.name || '',
      role_in_company: judge?.role_in_company || '',
      company: judge?.company || '',
      display_order: judge?.display_order || 0,
      username: judge?.username || '',
      headline: judge?.headline || '',
      location: judge?.location || '',
      tier: judge?.tier as any || 'starter',
      total_events_judged: judge?.total_events_judged || 0,
      total_teams_evaluated: judge?.total_teams_evaluated || 0,
      total_mentorship_hours: judge?.total_mentorship_hours || 0,
      is_published: judge?.is_published ?? true,
    },
  })

  const tier = watch('tier')
  const isPublished = watch('is_published')

  const handleFormSubmit = (data: JudgeFormData) => {
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter full name"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            {...register('username')}
            placeholder="e.g., johndoe"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tier">Tier</Label>
          <Select value={tier} onValueChange={(value) => setValue('tier', value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter Judge</SelectItem>
              <SelectItem value="verified">Verified Judge</SelectItem>
              <SelectItem value="senior">Senior Judge</SelectItem>
              <SelectItem value="chief">Chief Judge</SelectItem>
              <SelectItem value="legacy">Legacy Judge</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 col-span-2">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            {...register('headline')}
            placeholder="e.g., Senior Software Engineer at Google"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role_in_company">Role *</Label>
          <Input
            id="role_in_company"
            {...register('role_in_company')}
            placeholder="e.g., Senior Software Engineer"
            className={errors.role_in_company ? 'border-red-500' : ''}
          />
          {errors.role_in_company && (
            <p className="text-sm text-red-500">{errors.role_in_company.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Company *</Label>
          <Input
            id="company"
            {...register('company')}
            placeholder="Enter company name"
            className={errors.company ? 'border-red-500' : ''}
          />
          {errors.company && (
            <p className="text-sm text-red-500">{errors.company.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            {...register('location')}
            placeholder="e.g., San Francisco, CA"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_order">Display Order</Label>
          <Input
            id="display_order"
            type="number"
            min="0"
            {...register('display_order', { valueAsNumber: true })}
            placeholder="0"
            className={errors.display_order ? 'border-red-500' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="total_events_judged">Events Judged</Label>
          <Input
            id="total_events_judged"
            type="number"
            min="0"
            {...register('total_events_judged', { valueAsNumber: true })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="total_teams_evaluated">Teams Evaluated</Label>
          <Input
            id="total_teams_evaluated"
            type="number"
            min="0"
            {...register('total_teams_evaluated', { valueAsNumber: true })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="total_mentorship_hours">Mentorship Hours</Label>
          <Input
            id="total_mentorship_hours"
            type="number"
            min="0"
            {...register('total_mentorship_hours', { valueAsNumber: true })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="is_published">Published Status</Label>
          <Select 
            value={isPublished ? 'true' : 'false'} 
            onValueChange={(value) => setValue('is_published', value === 'true')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Published</SelectItem>
              <SelectItem value="false">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : judge ? 'Update Judge' : 'Create Judge'}
        </Button>
      </DialogFooter>
    </form>
  )
}