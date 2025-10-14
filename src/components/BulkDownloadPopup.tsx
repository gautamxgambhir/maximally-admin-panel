import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Download, 
  Package, 
  FileText, 
  Image, 
  Archive,
  CheckCircle,
  Clock,
  Users,
  Award,
  Scale
} from 'lucide-react'
import { toast } from 'sonner'
import { createBulkCertificateZip, downloadBlob } from '@/lib/certificateUtils'
import type { Certificate, CertificateType } from '@/types/certificate'

interface BulkDownloadPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  certificates: Certificate[]
  onNavigateToList: () => void
}

const certificateTypeIcons: Record<CertificateType, React.ElementType> = {
  winner: Award,
  participant: Users,
  judge: Scale
}

const certificateTypeColors: Record<CertificateType, string> = {
  winner: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  participant: 'bg-blue-100 text-blue-800 border-blue-200',
  judge: 'bg-green-100 text-green-800 border-green-200'
}

export function BulkDownloadPopup({
  open,
  onOpenChange,
  certificates,
  onNavigateToList
}: BulkDownloadPopupProps) {
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'jpg' | 'both'>('both')
  const [isDownloading, setIsDownloading] = useState(false)

  const certificateStats = certificates.reduce((acc, cert) => {
    acc[cert.type] = (acc[cert.type] || 0) + 1
    return acc
  }, {} as Record<CertificateType, number>)

  const handleDownload = async () => {
    if (certificates.length === 0) {
      toast.error('No certificates to download')
      return
    }

    setIsDownloading(true)
    try {
      // Create zip file with certificates
      const zipBlob = await createBulkCertificateZip(
        certificates.map(cert => cert.id),
        downloadFormat
      )

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `certificates_bulk_${certificates.length}_${timestamp}.zip`

      // Download the zip file
      downloadBlob(zipBlob, filename)

      toast.success(`Downloaded ${certificates.length} certificates successfully!`)
      
      // Close popup after successful download
      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (error) {
      console.error('Failed to download certificates:', error)
      toast.error('Failed to download certificates. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleViewCertificates = () => {
    onNavigateToList()
    onOpenChange(false)
  }

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Estimate file size (rough calculation)
  const estimatedSize = certificates.length * (downloadFormat === 'both' ? 500000 : 250000) // 500KB for both, 250KB for single format
  const estimatedSizeText = formatFileSize(estimatedSize)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Bulk Certificates Generated Successfully!
          </DialogTitle>
          <DialogDescription>
            {certificates.length} certificates have been generated and are ready for download.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Certificate Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Certificate Summary
              </CardTitle>
              <CardDescription>
                Overview of generated certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(certificateStats).map(([type, count]) => {
                  const Icon = certificateTypeIcons[type as CertificateType]
                  return (
                    <div key={type} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <div className="flex-1">
                        <div className="font-medium text-sm capitalize">{type}s</div>
                        <div className="text-xl font-bold text-gray-900">{count}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Certificates:</span>
                  <span className="font-medium">{certificates.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Generated:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date().toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Options
              </CardTitle>
              <CardDescription>
                Choose your preferred download format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">File Format</label>
                <Select value={downloadFormat} onValueChange={(value: 'pdf' | 'jpg' | 'both') => setDownloadFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">
                      <div className="flex items-center gap-2">
                        <Archive className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Both PDF & JPG</div>
                          <div className="text-xs text-gray-500">Complete package with all formats</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <div>
                          <div className="font-medium">PDF Only</div>
                          <div className="text-xs text-gray-500">High-quality documents</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="jpg">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        <div>
                          <div className="font-medium">JPG Only</div>
                          <div className="text-xs text-gray-500">Image format for sharing</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium text-blue-900">Estimated Download Size</div>
                  <div className="text-blue-700">{estimatedSizeText}</div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {certificates.length} files
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Certificates Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                📋 Certificate List Preview
              </CardTitle>
              <CardDescription>
                First {Math.min(5, certificates.length)} certificates in this batch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {certificates.slice(0, 5).map((cert, index) => (
                  <div key={cert.id} className="flex items-center gap-3 text-sm p-2 hover:bg-gray-50 rounded">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${certificateTypeColors[cert.type]}`}
                    >
                      {cert.type}
                    </Badge>
                    <div className="flex-1 truncate">
                      <span className="font-medium">{cert.participant_name}</span>
                      <span className="text-gray-500 ml-2">{cert.hackathon_name}</span>
                    </div>
                    {cert.position && (
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {cert.position}
                      </span>
                    )}
                  </div>
                ))}
                {certificates.length > 5 && (
                  <div className="text-center text-sm text-gray-500 py-2">
                    ... and {certificates.length - 5} more certificates
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleViewCertificates}
              className="flex-1 sm:flex-none"
            >
              View All Certificates
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="flex-1 sm:flex-none"
            >
              Close
            </Button>
          </div>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full sm:w-auto min-w-40"
          >
            {isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Preparing Download...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download {certificates.length} Certificates
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}