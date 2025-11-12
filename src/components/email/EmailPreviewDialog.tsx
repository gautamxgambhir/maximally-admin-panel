import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface EmailPreviewDialogProps {
  open: boolean
  onClose: () => void
  subject: string
  body: string
  recipients: string[]
}

export function EmailPreviewDialog({
  open,
  onClose,
  subject,
  body,
  recipients,
}: EmailPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
          <DialogDescription>
            Preview how your email will look to recipients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients */}
          <div>
            <p className="text-sm font-medium mb-2">To:</p>
            <div className="flex flex-wrap gap-2">
              {recipients.slice(0, 10).map((email, i) => (
                <Badge key={i} variant="secondary">
                  {email}
                </Badge>
              ))}
              {recipients.length > 10 && (
                <Badge variant="outline">+{recipients.length - 10} more</Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Subject */}
          <div>
            <p className="text-sm font-medium mb-2">Subject:</p>
            <p className="text-lg font-semibold">{subject}</p>
          </div>

          <Separator />

          {/* Body - Rendered HTML */}
          <div>
            <p className="text-sm font-medium mb-2">Message Preview:</p>
            <div className="border rounded-lg overflow-hidden bg-black">
              <iframe
                srcDoc={body}
                className="w-full h-[600px] border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
