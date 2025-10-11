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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Archive,
  Copy,
  ExternalLink,
  RefreshCw,
  SortAsc,
  SortDesc,
  TrendingUp,
  Activity,
  QrCode
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  useCertificates, 
  useHackathonNames, 
  useUpdateCertificateStatus,
  useDeleteCertificate,
  useCertificateStats
} from '@/hooks/useCertificates'
import { createCertificateZip, downloadBlob } from '@/lib/certificateUtils'
import { getVerificationUrl } from '@/config/constants'
import type { Certificate, CertificateFilters, CertificateStatus, CertificateType } from '@/types/certificate'

const certificateTypeConfig = {
  winner: { label: 'Winner', icon: Award, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  participant: { label: 'Participant', icon: Users, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  judge: { label: 'Judge', icon: Scale, color: 'bg-green-100 text-green-800 border-green-200' }
}

const sortOptions = [
  { value: 'created_at_desc', label: 'Newest First' },
  { value: 'created_at_asc', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'type_asc', label: 'Type A-Z' },
  { value: 'hackathon_asc', label: 'Hackathon A-Z' }
]

export function EnhancedCertificateList() {
  const [filters, setFilters] = useState<CertificateFilters>({})
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [bulkDownloadLoading, setBulkDownloadLoading] = useState(false)
  const [sortBy, setSortBy] = useState('created_at_desc')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  const { data: certificates = [], isLoading, refetch } = useCertificates(filters)
  const { data: hackathonNames = [] } = useHackathonNames()
  const { data: stats } = useCertificateStats()
  const updateStatus = useUpdateCertificateStatus()
  const deleteCertificate = useDeleteCertificate()

  // Sorting logic
  const sortedCertificates = useMemo(() => {
    const sorted = [...certificates]
    const [field, direction] = sortBy.split('_')
    
    sorted.sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (field) {
        case 'created':
          aVal = new Date(a.created_at)
          bVal = new Date(b.created_at)
          break
        case 'name':
          aVal = a.participant_name.toLowerCase()
          bVal = b.participant_name.toLowerCase()
          break
        case 'type':
          aVal = a.type
          bVal = b.type
          break
        case 'hackathon':
          aVal = a.hackathon_name.toLowerCase()
          bVal = b.hackathon_name.toLowerCase()
          break
        default:
          return 0
      }
      
      if (direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })
    
    return sorted
  }, [certificates, sortBy])

  const handleFilterChange = (key: keyof CertificateFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }

  const clearFilters = () => {
    setFilters({})
    setSortBy('created_at_desc')
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

  // Bulk status update
  const handleBulkStatusUpdate = async (status: CertificateStatus) => {
    if (selectedCertificates.length === 0) return
    
    try {
      await Promise.all(
        selectedCertificates.map(id => 
          updateStatus.mutateAsync({ id, status })
        )
      )
      toast.success(`Updated ${selectedCertificates.length} certificates to ${status}`)
      setSelectedCertificates([])
    } catch (error) {
      toast.error('Failed to update some certificates')
    }
  }

  // Copy verification URL
  const copyVerificationUrl = (certificateId: string) => {
    const url = getVerificationUrl(certificateId)
    navigator.clipboard.writeText(url)
    toast.success('Verification URL copied to clipboard')
  }

  // Open verification URL
  const openVerificationUrl = (certificateId: string) => {
    const url = getVerificationUrl(certificateId)
    window.open(url, '_blank')
  }

  // Download individual certificate
  const handleDownload = async (certificate: Certificate, format: 'pdf' | 'jpg') => {
    const url = format === 'pdf' ? certificate.pdf_url : certificate.jpg_url
    if (!url) {
      toast.error(`${format.toUpperCase()} file not available for this certificate`)
      return
    }

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const blob = await response.blob()
      const filename = `${certificate.certificate_id}_${certificate.participant_name.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`
      downloadBlob(blob, filename)
      
      toast.success(`Downloaded ${filename}`)
    } catch (error) {
      console.error('Download error:', error)
      toast.error(`Failed to download ${format.toUpperCase()} file. The file may not be accessible.`)
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-500">Loading certificates...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificate Management</h1>
          <p className="text-gray-600">Manage and download generated certificates</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          
          {selectedCertificates.length > 0 && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Actions ({selectedCertificates.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')}>
                    <ToggleRight className="h-4 w-4 mr-2" />
                    Activate All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('inactive')}>
                    <ToggleLeft className="h-4 w-4 mr-2" />
                    Deactivate All
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleBulkDownload} disabled={bulkDownloadLoading}>
                    <Archive className="h-4 w-4 mr-2" />
                    {bulkDownloadLoading ? 'Creating ZIP...' : 'Download ZIP'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Filters'}
          </Button>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  <div className="text-sm text-gray-600">Active</div>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
              <div className="text-sm text-gray-600">Inactive</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.byType.winner || 0}</div>
              <div className="text-sm text-gray-600">Winners</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.byType.participant || 0}</div>
              <div className="text-sm text-gray-600">Participants</div>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.byType.judge || 0}</div>
              <div className="text-sm text-gray-600">Judges</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, ID, or admin email..."
                    value={filters.search || ''}
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
              
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(Object.keys(filters).length > 0 || sortBy !== 'created_at_desc') && (
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
                  Clear All Filters & Sort
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Certificates Table */}
      <Card>
        <CardContent className="p-0">
          {sortedCertificates.length === 0 ? (
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
                  <TableHead>Created By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCertificates.map((certificate) => {
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
                        <div className="flex items-center gap-2">
                          <span>{certificate.certificate_id}</span>
                          <button
                            type="button"
                            className="h-6 w-6 p-0 rounded hover:bg-gray-100 flex items-center justify-center transition-colors"
                            onClick={() => copyVerificationUrl(certificate.certificate_id)}
                            title="Copy verification URL"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
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
                        <Badge className={`${typeConfig.color} flex items-center gap-1 w-fit border`}>
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={certificate.hackathon_name}>
                          {certificate.hackathon_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {certificate.position ? (
                          <Badge variant="outline" className="border-purple-200 text-purple-700">
                            {certificate.position}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleStatusToggle(certificate)}
                          disabled={updateStatus.isPending}
                          className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded transition-colors"
                        >
                          {certificate.status === 'active' ? (
                            <>
                              <ToggleRight className="h-5 w-5 text-green-600" />
                              <span className="text-green-600 font-medium">Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-400">Inactive</span>
                            </>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div className="max-w-[150px]">
                            {certificate.admin_email ? (
                              <div>
                                <div className="font-medium text-gray-900 truncate" title={certificate.admin_email}>
                                  {certificate.admin_email.split('@')[0]}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  @{certificate.admin_email.split('@')[1]}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Unknown Admin</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(certificate.created_at)}
                          </div>
                          <span className="text-xs text-gray-400">
                            {getRelativeTime(certificate.created_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Certificate Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem onClick={() => openVerificationUrl(certificate.certificate_id)}>
                              <QrCode className="h-4 w-4 mr-2" />
                              View Verification Page
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => copyVerificationUrl(certificate.certificate_id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Verification URL
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <div className="px-2 py-1.5 text-xs text-gray-500">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                <span>Created by: {certificate.admin_email || 'Unknown'}</span>
                              </div>
                            </div>
                            
                            <DropdownMenuSeparator />
                            
                            {certificate.pdf_url && (
                              <DropdownMenuItem onClick={() => handleDownload(certificate, 'pdf')}>
                                <FileText className="h-4 w-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                            )}
                            
                            {certificate.jpg_url && (
                              <DropdownMenuItem onClick={() => handleDownload(certificate, 'jpg')}>
                                <Image className="h-4 w-4 mr-2" />
                                Download JPG
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => handleStatusToggle(certificate)}
                              disabled={updateStatus.isPending}
                            >
                              {certificate.status === 'active' ? (
                                <>
                                  <ToggleLeft className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  onSelect={(e: Event) => e.preventDefault()}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Certificate
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Certificate</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the certificate for <strong>{certificate.participant_name}</strong>? 
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
                          </DropdownMenuContent>
                        </DropdownMenu>
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