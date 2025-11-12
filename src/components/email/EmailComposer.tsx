import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Send, Eye, Plus, Edit, FileText, Code } from 'lucide-react'
import { useEmailTemplates, useSendEmail } from '@/hooks/useEmailTemplates'
import { EmailPreviewDialog } from './EmailPreviewDialog'
import { HtmlEditor } from './HtmlEditor'
import type { SendEmailPayload } from '@/types/email'
import Papa from 'papaparse'

interface FormData {
  templateId: string
  recipients: string
  subject: string
  body: string
}

export function EmailComposer() {
  const { data: templates = [], isLoading } = useEmailTemplates()
  const sendEmail = useSendEmail()
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({})
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPlaceholderModalOpen, setIsPlaceholderModalOpen] = useState(false)
  const [recipientsList, setRecipientsList] = useState<string[]>([])
  const [currentPlaceholders, setCurrentPlaceholders] = useState<string[]>([])
  const [tempPlaceholderValues, setTempPlaceholderValues] = useState<Record<string, string>>({})

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      templateId: '',
      recipients: '',
      subject: '',
      body: '',
    },
  })

  const selectedTemplateId = watch('templateId') || ''
  const subject = watch('subject')
  const body = watch('body')
  const recipients = watch('recipients')

  // Update form when template is selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template) {
        setValue('subject', template.subject)
        setValue('body', template.body)
        setCurrentPlaceholders(template.placeholders || [])
        
        // Reset placeholder values
        const newPlaceholders: Record<string, string> = {}
        template.placeholders?.forEach(p => {
          newPlaceholders[p] = ''
        })
        setPlaceholderValues(newPlaceholders)
      }
    }
  }, [selectedTemplateId, templates, setValue])

  // Parse recipients
  useEffect(() => {
    const emails = recipients
      .split(/[,;\n]/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'))
    setRecipientsList(emails)
  }, [recipients])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        // Look for email column
        const emailColumn = Object.keys(results.data[0] || {}).find(
          key => key.toLowerCase().includes('email')
        )
        
        if (emailColumn) {
          const emails = results.data
            .map((row: any) => row[emailColumn])
            .filter((email: string) => email && email.includes('@'))
            .join(', ')
          
          setValue('recipients', emails)
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error)
      }
    })
  }

  const openPlaceholderModal = () => {
    setTempPlaceholderValues({ ...placeholderValues })
    setIsPlaceholderModalOpen(true)
  }

  const savePlaceholders = () => {
    setPlaceholderValues({ ...tempPlaceholderValues })
    
    // Replace placeholders in subject and body
    let newSubject = subject
    let newBody = body
    
    Object.entries(tempPlaceholderValues).forEach(([key, value]) => {
      if (value) {
        const regex = new RegExp(`{{${key}}}`, 'g')
        newSubject = newSubject.replace(regex, value)
        newBody = newBody.replace(regex, value)
      }
    })
    
    setValue('subject', newSubject)
    setValue('body', newBody)
    setIsPlaceholderModalOpen(false)
  }

  const onSubmit = (data: FormData) => {
    if (recipientsList.length === 0) {
      alert('Please enter at least one valid email address')
      return
    }

    const template = templates.find(t => t.id === data.templateId)

    const payload: SendEmailPayload = {
      recipients: recipientsList,
      subject: data.subject,
      body: data.body,
      templateId: data.templateId || undefined,
      templateName: template?.name || 'Custom Email',
      placeholders: placeholderValues,
    }

    sendEmail.mutate(payload, {
      onSuccess: () => {
        reset()
        setPlaceholderValues({})
        setRecipientsList([])
        setCurrentPlaceholders([])
      }
    })
  }

  const replacePlaceholders = (text: string) => {
    let result = text
    Object.entries(placeholderValues).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`)
    })
    return result
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Template Selection */}
      <div className="space-y-2">
        <Label htmlFor="template">Select Template (Optional)</Label>
        <Select
          value={selectedTemplateId}
          onValueChange={(value) => setValue('templateId', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a template or compose from scratch" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name} ({template.category})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Recipients */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="recipients">Recipients</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
        <Textarea
          {...register('recipients', { required: true })}
          placeholder="Enter email addresses (comma, semicolon, or newline separated)"
          rows={3}
          className="font-mono text-sm"
        />
        {recipientsList.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {recipientsList.length} recipient{recipientsList.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          {...register('subject', { required: true })}
          placeholder="Email subject"
        />
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label htmlFor="body">Email Template</Label>
        <HtmlEditor
          value={body}
          onChange={(value) => setValue('body', value)}
          placeholders={currentPlaceholders}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {currentPlaceholders.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={openPlaceholderModal}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Placeholders
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsPreviewOpen(true)}
          disabled={!subject || !body}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button
          type="submit"
          disabled={sendEmail.isPending || recipientsList.length === 0}
        >
          <Send className="h-4 w-4 mr-2" />
          {sendEmail.isPending ? 'Sending...' : `Send to ${recipientsList.length} recipient${recipientsList.length !== 1 ? 's' : ''}`}
        </Button>
      </div>

      {/* Placeholder Edit Modal */}
      <Dialog open={isPlaceholderModalOpen} onOpenChange={setIsPlaceholderModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Placeholders</DialogTitle>
            <DialogDescription>
              Fill in the placeholder values. They will be replaced in the subject and body when you save.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            {currentPlaceholders.map((placeholder) => (
              <div key={placeholder} className="space-y-2">
                <Label htmlFor={`modal-placeholder-${placeholder}`} className="text-sm font-medium">
                  {placeholder.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
                <Input
                  id={`modal-placeholder-${placeholder}`}
                  value={tempPlaceholderValues[placeholder] || ''}
                  onChange={(e) =>
                    setTempPlaceholderValues({
                      ...tempPlaceholderValues,
                      [placeholder]: e.target.value,
                    })
                  }
                  placeholder={`Enter ${placeholder.replace(/_/g, ' ')}`}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPlaceholderModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={savePlaceholders}>
              Save & Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmailPreviewDialog
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        subject={replacePlaceholders(subject)}
        body={replacePlaceholders(body)}
        recipients={recipientsList}
      />
    </form>
  )
}
