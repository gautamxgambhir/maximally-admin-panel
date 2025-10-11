import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { 
  Search, 
  Download, 
  Eye, 
  MoreHorizontal, 
  Filter,
  CheckSquare,
  Square,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  User,
  Award,
  Users,
  Scale,
  FileText,
  Image,
  Archive
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  useCertificates, 
  useHackathonNames, 
  useUpdateCertificateStatus,
  useDeleteCertificate 
} from '@/hooks/useCertificates'
import { createCertificateZip, downloadBlob } from '@/lib/certificateUtils'
import type { Certificate, CertificateFilters, CertificateStatus, CertificateType } from '@/types/certificate'

const certificateTypeConfig = {
  winner: { label: 'Winner', icon: Award, color: 'bg-yellow-100 text-yellow-800' },
  participant: { label: 'Participant', icon: Users, color: 'bg-blue-100 text-blue-800' },
  judge: { label: 'Judge', icon: Scale, color: 'bg-green-100 text-green-800' }
}

export function CertificateList() {
  const [filters, setFilters] = useState<CertificateFilters>({})
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [bulkDownloadLoading, setBulkDownloadLoading] = useState(false)

  const { data: certificates = [], isLoading, refetch } = useCertificates(filters)
  const { data: hackathonNames = [] } = useHackathonNames()
  const updateStatus = useUpdateCertificateStatus()
  const deleteCertificate = useDeleteCertificate()

  // Filter and search logic
  const searchTerm = filters.search || ''

  const handleFilterChange = (key: keyof CertificateFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  // Selection logic
  const isAllSelected = certificates.length > 0 && selectedCertificates.length === certificates.length
  const isIndeterminate = selectedCertificates.length > 0 && selectedCertificates.length < certificates.length

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCertificates([])
    } else {
      setSelectedCertificates(certificates.map(cert => cert.id))
    }
  }

  const toggleSelectCertificate = (certificateId: string) => {
    setSelectedCertificates(prev => 
      prev.includes(certificateId) 
        ? prev.filter(id => id !== certificateId)
        : [...prev, certificateId]
    )
  }

  // Status update
  const handleStatusToggle = async (certificate: Certificate) => {
    const newStatus: CertificateStatus = certificate.status === 'active' ? 'inactive' : 'active'
    try {
      await updateStatus.mutateAsync({ 
        id: certificate.id, 
        status: newStatus 
      })
    } catch (error) {
      // Error handled by hook
    }
  }

  // Delete certificate
  const handleDelete = async (certificateId: string) => {
    try {
      await deleteCertificate.mutateAsync(certificateId)
      setSelectedCertificates(prev => prev.filter(id => id !== certificateId))
    } catch (error) {
      // Error handled by hook
    }
  }

  // Download individual certificate
  const handleDownload = (certificate: Certificate, format: 'pdf' | 'jpg') => {
    const url = format === 'pdf' ? certificate.pdf_url : certificate.jpg_url
    if (!url) {
      toast.error(`${format.toUpperCase()} file not available for this certificate`)
      return
    }

    const filename = `${certificate.certificate_id}_${certificate.participant_name.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`
    
    // Create temporary link to download
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Bulk download
  const handleBulkDownload = async () => {
    if (selectedCertificates.length === 0) {
      toast.error('Please select certificates to download')
      return
    }

    setBulkDownloadLoading(true)
    
    try {
      const selectedCerts = certificates.filter(cert => selectedCertificates.includes(cert.id))
      const zipBlob = await createCertificateZip(selectedCerts)
      
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `certificates_${timestamp}_${selectedCerts.length}_certs.zip`
      
      downloadBlob(zipBlob, filename)
      
      toast.success(`Downloaded ${selectedCerts.length} certificates as ZIP file`)
    } catch (error) {
      console.error('Bulk download error:', error)
      toast.error('Failed to create download archive')
    } finally {
      setBulkDownloadLoading(false)
    }
  }

  // Statistics
  const stats = useMemo(() => {
    return {
      total: certificates.length,
      active: certificates.filter(cert => cert.status === 'active').length,
      inactive: certificates.filter(cert => cert.status === 'inactive').length,
      winners: certificates.filter(cert => cert.type === 'winner').length,
      participants: certificates.filter(cert => cert.type === 'participant').length,
      judges: certificates.filter(cert => cert.type === 'judge').length,
    }
  }, [certificates])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
        </div>
        <div className="text-center py-12">
          <div className="text-gray-500">Loading certificates...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
          <p className="text-gray-600">Manage and download generated certificates</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedCertificates.length > 0 && (
            <Button 
              onClick={handleBulkDownload}
              disabled={bulkDownloadLoading}
              className="flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              {bulkDownloadLoading ? 'Creating ZIP...' : `Download ${selectedCertificates.length} Selected`}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
            <div className="text-sm text-gray-600">Inactive</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.winners}</div>
            <div className="text-sm text-gray-600">Winners</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.participants}</div>
            <div className="text-sm text-gray-600">Participants</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.judges}</div>
            <div className="text-sm text-gray-600">Judges</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or certificate ID..."
                    value={searchTerm}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Certificate Type</Label>
                <Select
                  value={filters.type || ''}
                  onValueChange={(value) => handleFilterChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="winner">Winners</SelectItem>
                    <SelectItem value="participant">Participants</SelectItem>
                    <SelectItem value="judge">Judges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Hackathon</Label>
                <Select
                  value={filters.hackathon_name || ''}
                  onValueChange={(value) => handleFilterChange('hackathon_name', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All hackathons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All hackathons</SelectItem>
                    {hackathonNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {Object.keys(filters).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Certificates Table */}
      <Card>
        <CardContent className="p-0">
          {certificates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500 text-lg mb-2">No certificates found</div>
              <div className="text-gray-400">
                {Object.keys(filters).length > 0 
                  ? 'Try adjusting your filters to see more results'
                  : 'Start by generating some certificates'
                }
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center w-full"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : isIndeterminate ? (
                        <CheckSquare className="h-4 w-4 opacity-50" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Certificate ID</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Hackathon</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((certificate) => {
                  const isSelected = selectedCertificates.includes(certificate.id)
                  const typeConfig = certificateTypeConfig[certificate.type]
                  const TypeIcon = typeConfig.icon

                  return (
                    <TableRow key={certificate.id} className={isSelected ? 'bg-blue-50' : ''}>
                      <TableCell>
                        <button
                          onClick={() => toggleSelectCertificate(certificate.id)}
                          className="flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {certificate.certificate_id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{certificate.participant_name}</div>
                          {certificate.participant_email && (
                            <div className="text-sm text-gray-500">{certificate.participant_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${typeConfig.color} flex items-center gap-1 w-fit`}>
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {certificate.hackathon_name}
                      </TableCell>
                      <TableCell>
                        {certificate.position ? (
                          <Badge variant="outline">{certificate.position}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleStatusToggle(certificate)}
                          disabled={updateStatus.isPending}
                          className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded"
                        >
                          {certificate.status === 'active' ? (
                            <ToggleRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                          <span className={certificate.status === 'active' ? 'text-green-600' : 'text-gray-400'}>
                            {certificate.status}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(certificate.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {certificate.pdf_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(certificate, 'pdf')}
                              className="h-8 w-8 p-0"
                              title="Download PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {certificate.jpg_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(certificate, 'jpg')}
                              className="h-8 w-8 p-0"
                              title="Download JPG"
                            >
                              <Image className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                title="Delete Certificate"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Certificate</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the certificate for {certificate.participant_name}? 
                                  This action cannot be undone and will also delete the certificate files from storage.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(certificate.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Certificate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}