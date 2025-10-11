import React, { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Papa from 'papaparse'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
import { Plus, Upload, FileText, Users, Award, Scale, X, Eye, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateCertificate, useCreateBulkCertificates } from '@/hooks/useCertificates'
import { SimpleCertificatePreview } from './SimpleCertificatePreview'
import { TemplateGallery } from './TemplateGallery'
import { BulkDownloadPopup } from './BulkDownloadPopup'
import { getTemplateById, type ExtendedCertificateTemplate } from '@/lib/certificateTemplates'
import type { CertificateType, CreateCertificateData, Certificate } from '@/types/certificate'

const certificateSchema = z.object({
  participant_name: z.string().min(1, 'Participant name is required'),
  participant_email: z.string().email('Invalid email').optional().or(z.literal('')),
  hackathon_name: z.string().min(1, 'Hackathon name is required'),
  type: z.enum(['winner', 'participant', 'judge']),
  position: z.string().optional(),
})

type CertificateFormData = z.infer<typeof certificateSchema>

const certificateTypes: { value: CertificateType; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: 'winner',
    label: 'Winner',
    icon: Award,
    description: 'Certificate for competition winners'
  },
  {
    value: 'participant',
    label: 'Participant',
    icon: Users,
    description: 'Certificate for event participants'
  },
  {
    value: 'judge',
    label: 'Judge',
    icon: Scale,
    description: 'Certificate for judges and evaluators'
  }
]

interface CsvData {
  participant_name: string
  participant_email?: string
  hackathon_name: string
  type: CertificateType
  position?: string
}

export function CertificateGenerator() {
  const [activeTab, setActiveTab] = useState('single')
  const [csvData, setCsvData] = useState<CsvData[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ExtendedCertificateTemplate | null>(null)
  const [showTemplateGallery, setShowTemplateGallery] = useState(false)
  const [showBulkDownloadPopup, setShowBulkDownloadPopup] = useState(false)
  const [bulkDownloadData, setBulkDownloadData] = useState<Certificate[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const createCertificate = useCreateCertificate()
  const createBulkCertificates = useCreateBulkCertificates()
  
  const form = useForm<CertificateFormData>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      participant_name: '',
      participant_email: '',
      hackathon_name: '',
      type: 'participant',
      position: '',
    },
  })

  const onSubmit = async (data: CertificateFormData) => {
    if (!selectedTemplate) {
      toast.error('Please select a certificate template before generating.')
      setShowTemplateGallery(true)
      return
    }

    const certificateData: CreateCertificateData = {
      participant_name: data.participant_name,
      participant_email: data.participant_email || undefined,
      hackathon_name: data.hackathon_name,
      type: data.type,
      position: data.position || undefined,
      template: selectedTemplate // Pass the selected template
    }

    try {
      await createCertificate.mutateAsync(certificateData)
      form.reset()
      setSelectedTemplate(null) // Reset template selection
      
      // Redirect to certificate management (list tab)
      navigate('/certificates?tab=list')
      toast.success('Certificate generated successfully! Redirecting to certificate management...')
    } catch (error) {
      // Error handled by the hook
    }
  }
  
  // Watch form values for real-time updates
  const watchedValues = form.watch()
  
  const getCurrentFormData = (): CreateCertificateData => {
    return {
      participant_name: watchedValues.participant_name || '',
      participant_email: watchedValues.participant_email || undefined,
      hackathon_name: watchedValues.hackathon_name || '',
      type: watchedValues.type || 'participant',
      position: watchedValues.position || undefined,
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvFile(file)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const validData: CsvData[] = []
          const errors: string[] = []

          results.data.forEach((row: any, index: number) => {
            try {
              // Validate required fields
              if (!row.participant_name?.trim()) {
                errors.push(`Row ${index + 1}: Missing participant name`)
                return
              }

              if (!row.hackathon_name?.trim()) {
                errors.push(`Row ${index + 1}: Missing hackathon name`)
                return
              }

              if (!row.type?.trim()) {
                errors.push(`Row ${index + 1}: Missing certificate type`)
                return
              }

              if (!['winner', 'participant', 'judge'].includes(row.type.toLowerCase())) {
                errors.push(`Row ${index + 1}: Invalid certificate type "${row.type}". Must be winner, participant, or judge`)
                return
              }

              // Validate email if provided
              if (row.participant_email?.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailRegex.test(row.participant_email.trim())) {
                  errors.push(`Row ${index + 1}: Invalid email format`)
                  return
                }
              }

              validData.push({
                participant_name: row.participant_name.trim(),
                participant_email: row.participant_email?.trim() || undefined,
                hackathon_name: row.hackathon_name.trim(),
                type: row.type.toLowerCase() as CertificateType,
                position: row.position?.trim() || undefined,
              })
            } catch (error) {
              errors.push(`Row ${index + 1}: Invalid data format`)
            }
          })

          if (errors.length > 0) {
            toast.error(`CSV validation failed:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''}`)
            setCsvData([])
          } else if (validData.length === 0) {
            toast.error('No valid data found in CSV file')
            setCsvData([])
          } else {
            setCsvData(validData)
            toast.success(`Successfully parsed ${validData.length} certificates from CSV`)
          }
        } catch (error) {
          toast.error('Failed to parse CSV file')
          setCsvData([])
        }
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`)
        setCsvData([])
      }
    })
  }

  const handleBulkCreate = async () => {
    if (csvData.length === 0) {
      toast.error('No CSV data to process')
      return
    }

    try {
      const certificates = await createBulkCertificates.mutateAsync(csvData)
      
      // Store certificates for download popup
      setBulkDownloadData(certificates)
      setShowBulkDownloadPopup(true)
      
      // Clear form data
      setCsvData([])
      setCsvFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      // Error handled by the hook
    }
  }

  const clearCsvData = () => {
    setCsvData([])
    setCsvFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleTemplateSelect = (template: ExtendedCertificateTemplate) => {
    setSelectedTemplate(template)
  }

  const handleNavigateToList = () => {
    navigate('/certificates?tab=list')
  }

  const downloadSampleCsv = () => {
    const sampleData = [
      {
        participant_name: 'John Doe',
        participant_email: 'john@example.com',
        hackathon_name: 'AI Innovation Challenge 2024',
        type: 'winner',
        position: '1st Place'
      },
      {
        participant_name: 'Jane Smith',
        participant_email: 'jane@example.com',
        hackathon_name: 'AI Innovation Challenge 2024',
        type: 'participant',
        position: ''
      },
      {
        participant_name: 'Bob Johnson',
        participant_email: 'bob@example.com',
        hackathon_name: 'AI Innovation Challenge 2024',
        type: 'judge',
        position: ''
      }
    ]

    const csv = Papa.unparse(sampleData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'certificate_sample.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificate Generator</h1>
          <p className="text-gray-600">Create certificates for winners, participants, and judges</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Single Certificate
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Upload (CSV)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Single Certificate
              </CardTitle>
              <CardDescription>
                Generate a certificate for an individual participant
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Template Selection */}
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Certificate Template
                    </h3>
                    <p className="text-sm text-gray-600">Choose a design template for your certificate</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTemplateGallery(true)}
                    className="flex items-center gap-2"
                  >
                    <Palette className="h-4 w-4" />
                    {selectedTemplate ? 'Change Template' : 'Choose Template'}
                  </Button>
                </div>
                
                {selectedTemplate ? (
                  <div className="flex items-center gap-4 p-3 bg-white border rounded-lg">
                    <div 
                      dangerouslySetInnerHTML={{ __html: selectedTemplate.preview }}
                      className="flex-shrink-0 scale-75"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{selectedTemplate.name}</h4>
                      <p className="text-sm text-gray-600">{selectedTemplate.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">Colors:</span>
                        <div className="flex gap-1">
                          <div 
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: selectedTemplate.primaryColor }}
                            title={`Primary: ${selectedTemplate.primaryColor}`}
                          />
                          <div 
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: selectedTemplate.secondaryColor }}
                            title={`Secondary: ${selectedTemplate.secondaryColor}`}
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTemplate(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Palette className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No template selected. Choose a template to get started.</p>
                  </div>
                )}
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="participant_name">Participant Name *</Label>
                    <Input
                      id="participant_name"
                      {...form.register('participant_name')}
                      placeholder="Enter participant name"
                    />
                    {form.formState.errors.participant_name && (
                      <p className="text-sm text-red-600">{form.formState.errors.participant_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="participant_email">Participant Email</Label>
                    <Input
                      id="participant_email"
                      type="email"
                      {...form.register('participant_email')}
                      placeholder="Enter email (optional)"
                    />
                    {form.formState.errors.participant_email && (
                      <p className="text-sm text-red-600">{form.formState.errors.participant_email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hackathon_name">Hackathon Name *</Label>
                    <Input
                      id="hackathon_name"
                      {...form.register('hackathon_name')}
                      placeholder="Enter hackathon name"
                    />
                    {form.formState.errors.hackathon_name && (
                      <p className="text-sm text-red-600">{form.formState.errors.hackathon_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Certificate Type *</Label>
                    <Select
                      value={form.watch('type')}
                      onValueChange={(value: CertificateType) => form.setValue('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select certificate type" />
                      </SelectTrigger>
                      <SelectContent>
                        {certificateTypes.map((type) => {
                          const Icon = type.icon
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-xs text-gray-500">{type.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.type && (
                      <p className="text-sm text-red-600">{form.formState.errors.type.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="position">Position/Achievement</Label>
                    <Input
                      id="position"
                      {...form.register('position')}
                      placeholder="e.g., 1st Place, Best Innovation, etc. (optional)"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <SimpleCertificatePreview
                    data={getCurrentFormData()}
                    onGenerate={() => form.handleSubmit(onSubmit)()}
                    isGenerating={createCertificate.isPending}
                    selectedTemplate={selectedTemplate}
                  />
                  
                  <Button 
                    type="submit" 
                    disabled={createCertificate.isPending}
                    className="min-w-32"
                  >
                    {createCertificate.isPending ? 'Generating...' : 'Generate Certificate'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Certificate Upload
              </CardTitle>
              <CardDescription>
                Upload a CSV file to create multiple certificates at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="csv-file">CSV File</Label>
                    <Input
                      ref={fileInputRef}
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="mt-2"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={downloadSampleCsv}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Download Sample CSV
                  </Button>
                </div>

                <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>participant_name</strong> (required): Full name of the participant</li>
                    <li><strong>participant_email</strong> (optional): Email address</li>
                    <li><strong>hackathon_name</strong> (required): Name of the hackathon/event</li>
                    <li><strong>type</strong> (required): Must be "winner", "participant", or "judge"</li>
                    <li><strong>position</strong> (optional): Achievement or position (e.g., "1st Place")</li>
                  </ul>
                </div>

                {csvData.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium">
                          {csvData.length} certificates ready to generate
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCsvData}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                        Clear
                      </Button>
                    </div>

                    <div className="max-h-60 overflow-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left p-3 font-medium">Name</th>
                            <th className="text-left p-3 font-medium">Email</th>
                            <th className="text-left p-3 font-medium">Hackathon</th>
                            <th className="text-left p-3 font-medium">Type</th>
                            <th className="text-left p-3 font-medium">Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.slice(0, 10).map((cert, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-3">{cert.participant_name}</td>
                              <td className="p-3 text-gray-600">{cert.participant_email || '-'}</td>
                              <td className="p-3">{cert.hackathon_name}</td>
                              <td className="p-3 capitalize">{cert.type}</td>
                              <td className="p-3">{cert.position || '-'}</td>
                            </tr>
                          ))}
                          {csvData.length > 10 && (
                            <tr className="border-t">
                              <td colSpan={5} className="p-3 text-center text-gray-500">
                                ...and {csvData.length - 10} more certificates
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            disabled={createBulkCertificates.isPending}
                            className="min-w-32"
                          >
                            {createBulkCertificates.isPending 
                              ? 'Generating...' 
                              : `Generate ${csvData.length} Certificates`
                            }
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Generate Bulk Certificates</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to generate {csvData.length} certificates? 
                              This action cannot be undone and will create certificate files and database records.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkCreate}>
                              Generate All Certificates
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Gallery Dialog */}
      <TemplateGallery
        open={showTemplateGallery}
        onOpenChange={setShowTemplateGallery}
        certificateType={watchedValues.type || 'participant'}
        onTemplateSelect={handleTemplateSelect}
        selectedTemplateId={selectedTemplate?.id}
      />

      {/* Bulk Download Popup */}
      {bulkDownloadData && (
        <BulkDownloadPopup
          open={showBulkDownloadPopup}
          onOpenChange={setShowBulkDownloadPopup}
          certificates={bulkDownloadData}
          onNavigateToList={handleNavigateToList}
        />
      )}
    </div>
  )
}
