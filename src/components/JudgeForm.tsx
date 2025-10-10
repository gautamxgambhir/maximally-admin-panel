import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DialogFooter } from '@/components/ui/dialog'
import { Judge, JudgeInput } from '@/lib/judgesApi'

const judgeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  role_in_company: z.string().min(1, 'Role is required').max(255, 'Role is too long'),
  company: z.string().min(1, 'Company is required').max(255, 'Company name is too long'),
  display_order: z.number().int().min(0).optional(),
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
  } = useForm<JudgeFormData>({
    resolver: zodResolver(judgeSchema),
    defaultValues: {
      name: judge?.name || '',
      role_in_company: judge?.role_in_company || '',
      company: judge?.company || '',
      display_order: judge?.display_order || 0,
    },
  })

  const handleFormSubmit = (data: JudgeFormData) => {
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
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
        <Label htmlFor="display_order">Display Order</Label>
        <Input
          id="display_order"
          type="number"
          min="0"
          {...register('display_order', { valueAsNumber: true })}
          placeholder="0"
          className={errors.display_order ? 'border-red-500' : ''}
        />
        {errors.display_order && (
          <p className="text-sm text-red-500">{errors.display_order.message}</p>
        )}
      </div>

      <DialogFooter className="flex gap-2">
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