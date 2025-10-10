import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DialogFooter } from '@/components/ui/dialog'
import { Person, PersonInput, PersonCategory } from '@/lib/peopleApi'

const personSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  role_in_company: z.string().min(1, 'Role is required').max(255, 'Role is too long'),
  company: z.string().min(1, 'Company is required').max(255, 'Company name is too long'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['advisors', 'organizing_board', 'developers', 'alumni']),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  twitter_url: z.string().url().optional().or(z.literal('')),
  github_url: z.string().url().optional().or(z.literal('')),
  website_url: z.string().url().optional().or(z.literal('')),
  display_order: z.number().int().min(0).optional(),
})

type PersonFormData = z.infer<typeof personSchema>

interface PersonFormProps {
  person?: Person
  onSubmit: (data: PersonInput) => void
  onCancel: () => void
  isSubmitting?: boolean
  defaultCategory?: PersonCategory
}

const categoryOptions = [
  { value: 'advisors', label: 'Advisors' },
  { value: 'organizing_board', label: 'Organizing Board' },
  { value: 'developers', label: 'Developers' },
  { value: 'alumni', label: 'Alumni' },
] as const

export function PersonForm({ 
  person, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  defaultCategory = 'advisors'
}: PersonFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      name: person?.name || '',
      role_in_company: person?.role_in_company || '',
      company: person?.company || '',
      description: person?.description || '',
      category: person?.category || defaultCategory,
      linkedin_url: person?.linkedin_url || '',
      twitter_url: person?.twitter_url || '',
      github_url: person?.github_url || '',
      website_url: person?.website_url || '',
      display_order: person?.display_order || 0,
    },
  })

  const category = watch('category')

  const handleFormSubmit = (data: PersonFormData) => {
    // Clean up empty string URLs
    const cleanData = {
      ...data,
      linkedin_url: data.linkedin_url || undefined,
      twitter_url: data.twitter_url || undefined,
      github_url: data.github_url || undefined,
      website_url: data.website_url || undefined,
    }
    
    onSubmit(cleanData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
          <Label htmlFor="category">Category *</Label>
          <Select 
            value={category} 
            onValueChange={(value) => setValue('category', value as PersonCategory)}
          >
            <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-red-500">{errors.category.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role_in_company">Role in Company *</Label>
          <Input
            id="role_in_company"
            {...register('role_in_company')}
            placeholder="e.g., Senior Developer"
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Brief description of the person's background and expertise"
          className={`resize-none ${errors.description ? 'border-red-500' : ''}`}
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>


      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input
            id="linkedin_url"
            {...register('linkedin_url')}
            type="url"
            placeholder="https://linkedin.com/in/username"
            className={errors.linkedin_url ? 'border-red-500' : ''}
          />
          {errors.linkedin_url && (
            <p className="text-sm text-red-500">{errors.linkedin_url.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="twitter_url">Twitter URL</Label>
          <Input
            id="twitter_url"
            {...register('twitter_url')}
            type="url"
            placeholder="https://twitter.com/username"
            className={errors.twitter_url ? 'border-red-500' : ''}
          />
          {errors.twitter_url && (
            <p className="text-sm text-red-500">{errors.twitter_url.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="github_url">GitHub URL</Label>
          <Input
            id="github_url"
            {...register('github_url')}
            type="url"
            placeholder="https://github.com/username"
            className={errors.github_url ? 'border-red-500' : ''}
          />
          {errors.github_url && (
            <p className="text-sm text-red-500">{errors.github_url.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website_url">Website URL</Label>
          <Input
            id="website_url"
            {...register('website_url')}
            type="url"
            placeholder="https://example.com"
            className={errors.website_url ? 'border-red-500' : ''}
          />
          {errors.website_url && (
            <p className="text-sm text-red-500">{errors.website_url.message}</p>
          )}
        </div>
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
          {isSubmitting ? 'Saving...' : person ? 'Update Person' : 'Create Person'}
        </Button>
      </DialogFooter>
    </form>
  )
}