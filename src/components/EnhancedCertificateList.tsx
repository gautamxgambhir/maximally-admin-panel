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
  QrCode,
  Check
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
import ErrorBoundary from './ErrorBoundary'
import { sendCertificateEmails } from '@/lib/emailApi'

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

  // Batch selection
  const handleBatchSelect = (batchId: string) => {
    const batchCertificates = certificates.filter(cert => cert.batch_id === batchId)
    const batchCertIds = batchCertificates.map(cert => cert.id)
    const allSelected = batchCertIds.every(id => selectedCertificates.includes(id))
    
    if (allSelected) {
      // Deselect all certificates from this batch
      setSelectedCertificates(prev => prev.filter(id => !batchCertIds.includes(id)))
      toast.info(`Deselected ${batchCertificates.length} certificates from batch`)
    } else {
      // Select all certificates from this batch
      setSelectedCertificates(prev => [...new Set([...prev, ...batchCertIds])])
      toast.success(`Selected ${batchCertificates.length} certificates from batch`)
    }
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

  // Resend single email
  const handleResendSingle = async (certificate: Certificate) => {
    if (!certificate.participant_email) {
      toast.error('No participant email on this certificate')
      return
    }
    const toastId = toast.loading('Resending email...')
    try {
      const res = await sendCertificateEmails([certificate])
      if (res.failed === 0) {
        toast.success(`Email resent to ${certificate.participant_email}`, { id: toastId })
      } else {
        toast.error(`Resend failed: ${res.errors?.[0] || 'Unknown error'}`, { id: toastId })
      }
    } catch (e) {
      toast.error('Resend failed', { id: toastId })
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

  // Bulk resend
  const handleBulkResend = async () => {
    if (selectedCertificates.length === 0) {
      toast.error('Please select certificates to resend')
      return
    }
    const selectedCerts = certificates.filter(cert => selectedCertificates.includes(cert.id) && !!cert.participant_email)
    if (selectedCerts.length === 0) {
      toast.error('None of the selected certificates have participant emails')
      return
    }
    const toastId = toast.loading(`Resending to ${selectedCerts.length} recipients...`)
    try {
      const res = await sendCertificateEmails(selectedCerts)
      if (res.failed === 0) {
        toast.success(`Resent ${res.sent} emails`, { id: toastId })
      } else if (res.sent > 0) {
        toast.warning(`Sent ${res.sent}, failed ${res.failed}`, { id: toastId })
      } else {
        toast.error('Failed to resend any emails', { id: toastId })
      }
    } catch (e) {
      toast.error('Bulk resend failed', { id: toastId })
    }
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedCertificates.length === 0) {
      toast.error('Please select certificates to delete')
      return
    }

    const selectedCerts = certificates.filter(cert => selectedCertificates.includes(cert.id))
    const confirmMessage = `Are you sure you want to delete ${selectedCerts.length} certificates?\n\nThis will permanently delete:\n${selectedCerts.slice(0, 5).map(c => `- ${c.participant_name} (${c.certificate_id})`).join('\n')}${selectedCerts.length > 5 ? `\n...and ${selectedCerts.length - 5} more certificates` : ''}\n\nThis action cannot be undone and will also delete the certificate files from storage.`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    const toastId = toast.loading(`Deleting ${selectedCerts.length} certificates...`)
    let deletedCount = 0
    const errors: string[] = []

    try {
      // Delete certificates one by one to ensure proper storage cleanup
      for (const cert of selectedCerts) {
        try {
          await deleteCertificate.mutateAsync(cert.id)
          deletedCount++
          toast.loading(`Deleted ${deletedCount}/${selectedCerts.length} certificates...`, { id: toastId })
        } catch (error) {
          console.error(`Failed to delete certificate ${cert.certificate_id}:`, error)
          errors.push(`${cert.participant_name} (${cert.certificate_id})`)
        }
      }

      // Clear selection
      setSelectedCertificates([])

      // Show final result
      if (errors.length === 0) {
        toast.success(`Successfully deleted all ${deletedCount} certificates`, { id: toastId })
      } else if (deletedCount > 0) {
        toast.warning(`Deleted ${deletedCount} certificates, but ${errors.length} failed:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''}`, { id: toastId })
      } else {
        toast.error(`Failed to delete certificates. Please try again.`, { id: toastId })
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete certificates', { id: toastId })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
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

  // Generate consistent colors for batch IDs
  const getBatchColor = (batchId: string | undefined): string => {
    if (!batchId) return 'bg-muted' // Single certificate (no batch)
    
    // Create a simple hash of the batch ID to generate consistent colors
    let hash = 0
    for (let i = 0; i < batchId.length; i++) {
      const char = batchId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    
    // Use predefined color palette for batches
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-violet-500',
      'bg-rose-500', 'bg-amber-500', 'bg-orange-500', 'bg-teal-500'
    ]
    
    return colors[Math.abs(hash) % colors.length]
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Certificates</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-muted-foreground">Loading certificates...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Certificate Management</h1>
          <p className="text-muted-foreground">Manage and download generated certificates</p>
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
                  <DropdownMenuItem onClick={handleBulkResend}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Emails to Selected
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleBulkDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedCertificates.length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          
          {/* Batch Selection Button - Show when there are certificates with batch IDs */}
          {certificates.some(cert => cert.batch_id) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Select by Batch
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Batch Selection</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[...new Set(certificates.filter(c => c.batch_id).map(c => c.batch_id))]
                  .slice(0, 10) // Limit to recent 10 batches
                  .map(batchId => {
                    const batchCerts = certificates.filter(c => c.batch_id === batchId)
                    const isSelected = batchCerts.every(cert => selectedCertificates.includes(cert.id))
                    return (
                      <DropdownMenuItem 
                        key={batchId}
                        onClick={() => handleBatchSelect(batchId!)}
                        className="flex items-center gap-2"
                      >
                        <div 
                          className={`w-2 h-2 rounded-full ${getBatchColor(batchId)}`}
                        />
                        <div className="flex-1">
                          <div className="font-mono text-xs">{batchId}</div>
                          <div className="text-xs text-muted-foreground">{batchCerts.length} certificates</div>
                        </div>
                        {isSelected && <Check className="h-3 w-3" />}
                      </DropdownMenuItem>
                    )
                  })}
                {certificates.filter(c => c.batch_id).length === 0 && (
                  <DropdownMenuItem disabled>
                    No batches found
                  </DropdownMenuItem>
                )}
                </DropdownMenuContent>
              </DropdownMenu>
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
                  <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.active || 0}</div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.inactive || 0}</div>
              <div className="text-sm text-muted-foreground">Inactive</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.byType?.winner || 0}</div>
              <div className="text-sm text-muted-foreground">Winners</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.byType?.participant || 0}</div>
              <div className="text-sm text-muted-foreground">Participants</div>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.byType?.judge || 0}</div>
              <div className="text-sm text-muted-foreground">Judges</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Filters */}
      {showFilters && (
        <ErrorBoundary>
          <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
                  value={filters.type || 'all'}
                  onValueChange={(value) => handleFilterChange('type', value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="winner">Winners</SelectItem>
                    <SelectItem value="participant">Participants</SelectItem>
                    <SelectItem value="judge">Judges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Hackathon</Label>
                <Select
                  value={filters.hackathon_name || 'all'}
                  onValueChange={(value) => handleFilterChange('hackathon_name', value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All hackathons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All hackathons</SelectItem>
                    {hackathonNames && hackathonNames.length > 0 ? hackathonNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    )) : (
                      <SelectItem value="no-hackathons" disabled>
                        No hackathons found
                      </SelectItem>
                    )}
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
        </ErrorBoundary>
      )}

      {/* Enhanced Certificates Table */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          {sortedCertificates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <div className="text-muted-foreground text-lg mb-2">No certificates found</div>
              <div className="text-muted-foreground">
                {Object.keys(filters).length > 0 
                  ? 'Try adjusting your filters to see more results'
                  : 'Start by generating some certificates'
                }
              </div>
            </div>
          ) : (
            <div className="w-full" style={{ overflowX: 'auto', overflowY: 'visible' }}>
              <div style={{ transform: 'scale(0.9)', transformOrigin: 'top left', width: '111.11%' }}>
                <Table className="text-xs" style={{ minWidth: '1000px', width: '100%' }}>
              <colgroup>
                <col className="w-12" />
                <col className="w-40" />
                <col className="w-44" />
                <col className="w-24" />
                <col className="w-44" />
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-36" />
                <col className="w-32" />
                <col className="w-32" />
              </colgroup>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="w-12 p-2">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center w-full"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-3 w-3" />
                      ) : isIndeterminate ? (
                        <CheckSquare className="h-3 w-3 opacity-50" />
                      ) : (
                        <Square className="h-3 w-3" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-xs font-medium p-2">Certificate ID</TableHead>
                  <TableHead className="text-xs font-medium p-2">Participant</TableHead>
                  <TableHead className="text-xs font-medium p-2">Type</TableHead>
                  <TableHead className="text-xs font-medium p-2">Hackathon</TableHead>
                  <TableHead className="text-xs font-medium p-2">Position</TableHead>
                  <TableHead className="text-xs font-medium p-2">Status</TableHead>
                  <TableHead className="text-xs font-medium p-2">Created By</TableHead>
                  <TableHead className="text-xs font-medium p-2">Created</TableHead>
                  <TableHead className="text-xs font-medium p-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCertificates.map((certificate) => {
                  const isSelected = selectedCertificates.includes(certificate.id)
                  const typeConfig = certificateTypeConfig[certificate.type]
                  const TypeIcon = typeConfig.icon

                  return (
                    <TableRow key={certificate.id} className={`h-10 ${isSelected ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                      <TableCell className="p-2">
                        <button
                          onClick={() => toggleSelectCertificate(certificate.id)}
                          className="flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-3 w-3 text-blue-600" />
                          ) : (
                            <Square className="h-3 w-3" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap p-2">
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1">
                            <div 
                              className={`w-1.5 h-1.5 rounded-full ${getBatchColor(certificate.batch_id)}`}
                              title={certificate.batch_id ? `Batch: ${certificate.batch_id}` : 'Single certificate'}
                            />
                            <span className="font-medium text-xs">{certificate.certificate_id}</span>
                          </div>
                          <button
                            type="button"
                            className="h-4 w-4 p-0 rounded hover:bg-accent flex items-center justify-center transition-colors"
                            onClick={() => copyVerificationUrl(certificate.certificate_id)}
                            title="Copy verification URL"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap p-2">
                        <div>
                          <div className="font-medium text-xs text-foreground">{certificate.participant_name}</div>
                          {certificate.participant_email && (
                            <div className="text-xs text-muted-foreground">{certificate.participant_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <Badge className={`${typeConfig.color} flex items-center gap-1 w-fit border text-xs`}>
                          <TypeIcon className="h-2.5 w-2.5" />
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap p-2">
                        <div className="font-medium text-xs text-foreground">
                          {certificate.hackathon_name}
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        {certificate.position ? (
                          <Badge variant="outline" className="border-purple-200 text-purple-700 text-xs">
                            {certificate.position}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        <button
                          onClick={() => handleStatusToggle(certificate)}
                          disabled={updateStatus.isPending}
                          className="flex items-center gap-1 hover:bg-accent p-1 rounded transition-colors"
                        >
                          {certificate.status === 'active' ? (
                            <>
                              <ToggleRight className="h-3 w-3 text-green-600" />
                              <span className="text-green-600 font-medium text-xs">Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground text-xs">Inactive</span>
                            </>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs p-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <div className="whitespace-nowrap">
                            {certificate.admin_email ? (
                              <div className="font-medium text-foreground text-xs">
                                {certificate.admin_email}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Unknown Admin</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap p-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          <span className="text-xs">
                            {new Date(certificate.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right p-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
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
                            
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
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

                            <DropdownMenuItem onClick={() => handleResendSingle(certificate)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Resend Email
                            </DropdownMenuItem>
                            
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}