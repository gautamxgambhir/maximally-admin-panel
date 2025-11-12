import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import {
  useEmailTemplate,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
} from '@/hooks/useEmailTemplates'
import { HtmlEditor } from './HtmlEditor'
import type { EmailTemplate, EmailCategory } from '@/types/email'

interface TemplateDialogProps {
  open: boolean
  onClose: () => void
  templateId?: string
}

interface FormData {
  name: string
  category: EmailCategory
  subject: string
}

interface TemplateDialogState {
  body: string
}

export function TemplateDialog({ open, onClose, templateId }: TemplateDialogProps) {
  const { data: template } = useEmailTemplate(templateId || '')
  const createTemplate = useCreateEmailTemplate()
  const updateTemplate = useUpdateEmailTemplate()
  const [placeholders, setPlaceholders] = useState<string[]>([])
  const [newPlaceholder, setNewPlaceholder] = useState('')
  const [body, setBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      name: '',
      category: 'general',
      subject: '',
    },
  })

  const isEditing = !!templateId
  const formValues = watch()

  // Load template data
  useEffect(() => {
    if (template) {
      setValue('name', template.name)
      setValue('category', template.category)
      setValue('subject', template.subject)
      setBody(template.body)
      setPlaceholders(template.placeholders || [])
    } else {
      reset()
      setBody('')
      setPlaceholders([])
    }
  }, [template, setValue, reset])

  // Autosave draft to localStorage
  useEffect(() => {
    if (!open) return

    const draftKey = templateId ? `email-template-draft-${templateId}` : 'email-template-draft-new'
    const draft = {
      name: formValues.name,
      category: formValues.category,
      subject: formValues.subject,
      body,
      placeholders,
      timestamp: new Date().toISOString(),
    }

    const timeoutId = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(draft))
      setLastSaved(new Date())
    }, 2000) // Autosave after 2 seconds of inactivity

    return () => clearTimeout(timeoutId)
  }, [formValues, body, placeholders, open, templateId])

  // Load draft on open
  useEffect(() => {
    if (open && !templateId) {
      const draftKey = 'email-template-draft-new'
      const savedDraft = localStorage.getItem(draftKey)
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          if (draft.name) setValue('name', draft.name)
          if (draft.category) setValue('category', draft.category)
          if (draft.subject) setValue('subject', draft.subject)
          if (draft.body) setBody(draft.body)
          if (draft.placeholders) setPlaceholders(draft.placeholders)
          setLastSaved(new Date(draft.timestamp))
        } catch (e) {
          console.error('Failed to load draft:', e)
        }
      }
    }
  }, [open, templateId, setValue])

  const handleClose = () => {
    reset()
    setBody('')
    setPlaceholders([])
    setNewPlaceholder('')
    setLastSaved(null)
    onClose()
  }

  const clearDraft = () => {
    const draftKey = templateId ? `email-template-draft-${templateId}` : 'email-template-draft-new'
    localStorage.removeItem(draftKey)
  }

  const addPlaceholder = () => {
    const trimmed = newPlaceholder.trim().toLowerCase().replace(/\s+/g, '_')
    if (trimmed && !placeholders.includes(trimmed)) {
      setPlaceholders([...placeholders, trimmed])
      setNewPlaceholder('')
    }
  }

  const removePlaceholder = (placeholder: string) => {
    setPlaceholders(placeholders.filter((p) => p !== placeholder))
  }

  const onSubmit = (data: FormData) => {
    if (!body.trim()) {
      alert('Please add email body content')
      return
    }

    setIsSaving(true)
    const templateData = {
      ...data,
      body,
      placeholders,
      is_active: true,
    }

    if (isEditing && templateId) {
      updateTemplate.mutate(
        { id: templateId, updates: templateData },
        {
          onSuccess: () => {
            clearDraft()
            setIsSaving(false)
            handleClose()
          },
          onError: () => {
            setIsSaving(false)
          }
        }
      )
    } else {
      createTemplate.mutate(templateData as any, {
        onSuccess: () => {
          clearDraft()
          setIsSaving(false)
          handleClose()
        },
        onError: () => {
          setIsSaving(false)
        }
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isEditing ? 'Edit Template' : 'Create New Template'}</span>
            {lastSaved && (
              <span className="text-xs text-muted-foreground font-normal">
                Draft saved {new Date(lastSaved).toLocaleTimeString()}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the email template details. Changes are auto-saved.'
              : 'Create a new email template with HTML styling and placeholders. Your work is auto-saved.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                {...register('name', { required: true })}
                placeholder="e.g., Judge Thank You"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={watch('category')}
                onValueChange={(value) => setValue('category', value as EmailCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="judges">Judges</SelectItem>
                  <SelectItem value="sponsors">Sponsors</SelectItem>
                  <SelectItem value="participants">Participants</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              {...register('subject', { required: true })}
              placeholder="Email subject (can include placeholders)"
            />
          </div>

          <div className="space-y-2">
            <Label>Placeholders</Label>
            <p className="text-xs text-muted-foreground">
              Add dynamic fields that can be filled when sending emails (e.g., name, event_name, date)
            </p>
            <div className="flex gap-2">
              <Input
                value={newPlaceholder}
                onChange={(e) => setNewPlaceholder(e.target.value)}
                placeholder="e.g., participant_name, event_date"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addPlaceholder()
                  }
                }}
              />
              <Button type="button" onClick={addPlaceholder} disabled={!newPlaceholder.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {placeholders.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {placeholders.map((placeholder) => (
                  <Badge
                    key={placeholder}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                  >
                    <span>{placeholder}</span>
                    <X
                      className="h-3 w-3 ml-2 cursor-pointer"
                      onClick={() => removePlaceholder(placeholder)}
                    />
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No placeholders added yet. Add some to make your template dynamic!
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">HTML Template</Label>
            <HtmlEditor
              value={body}
              onChange={setBody}
              placeholders={placeholders}
            />
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex-1">
              {lastSaved && (
                <p className="text-xs text-muted-foreground">
                  💾 Auto-saved at {new Date(lastSaved).toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || createTemplate.isPending || updateTemplate.isPending}
              >
                {isSaving ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
