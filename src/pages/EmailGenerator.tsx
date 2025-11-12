import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Mail, FileText, BarChart3 } from 'lucide-react'
import { EmailComposer } from '@/components/email/EmailComposer'
import { TemplateList } from '@/components/email/TemplateList'
import { EmailLogs } from '@/components/email/EmailLogs'
import { EmailStats } from '@/components/email/EmailStats'
import { TemplateDialog } from '@/components/email/TemplateDialog'

export function EmailGenerator() {
  const [activeTab, setActiveTab] = useState('compose')
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>()

  const handleEditTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setIsTemplateDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsTemplateDialogOpen(false)
    setSelectedTemplateId(undefined)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Generator</h1>
          <p className="text-muted-foreground mt-2">
            Create, manage, and send emails to judges, sponsors, and participants
          </p>
        </div>
        <Button onClick={() => setIsTemplateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose Email</CardTitle>
              <CardDescription>
                Send emails using templates or create custom messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailComposer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Manage your email templates for different categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateList onEdit={handleEditTemplate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Logs</CardTitle>
              <CardDescription>
                View history of all sent emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailLogs />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <EmailStats />
        </TabsContent>
      </Tabs>

      <TemplateDialog
        open={isTemplateDialogOpen}
        onClose={handleCloseDialog}
        templateId={selectedTemplateId}
      />
    </div>
  )
}
