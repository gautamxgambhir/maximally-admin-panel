import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as certificateApi from '@/lib/certificateApi'
import type { 
  Certificate, 
  CreateCertificateData, 
  CertificateFilters,
  CertificateStatus 
} from '@/types/certificate'

const QUERY_KEYS = {
  certificates: ['certificates'] as const,
  certificate: (id: string) => ['certificates', id] as const,
  certificateByCertId: (certId: string) => ['certificates', 'cert-id', certId] as const,
  certificateStats: ['certificates', 'stats'] as const,
  hackathonNames: ['certificates', 'hackathon-names'] as const,
}

/**
 * Hook to get certificates with filtering
 */
export function useCertificates(filters: CertificateFilters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.certificates, filters],
    queryFn: () => certificateApi.getCertificates(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to get a single certificate by ID
 */
export function useCertificate(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.certificate(id),
    queryFn: () => certificateApi.getCertificateById(id),
    enabled: !!id,
  })
}

/**
 * Hook to get certificate by certificate ID
 */
export function useCertificateByCertificateId(certificateId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.certificateByCertId(certificateId),
    queryFn: () => certificateApi.getCertificateByCertificateId(certificateId),
    enabled: !!certificateId,
  })
}

/**
 * Hook to get certificate statistics
 */
export function useCertificateStats() {
  return useQuery({
    queryKey: QUERY_KEYS.certificateStats,
    queryFn: certificateApi.getCertificateStats,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Hook to get hackathon names for filtering
 */
export function useHackathonNames() {
  return useQuery({
    queryKey: QUERY_KEYS.hackathonNames,
    queryFn: certificateApi.getHackathonNames,
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}

/**
 * Hook to create a single certificate
 */
export function useCreateCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: certificateApi.createCertificate,
    onSuccess: (newCertificate) => {
      // Invalidate certificates queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.certificates })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.certificateStats })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hackathonNames })
      
      // Add the new certificate to the cache
      queryClient.setQueryData(
        QUERY_KEYS.certificate(newCertificate.id), 
        newCertificate
      )
      
      toast.success(`Certificate created for ${newCertificate.participant_name}`)

      // Email sending (if desired) is handled in the component layer.
    },
    onError: (error) => {
      console.error('Failed to create certificate:', error)
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to create certificate'
      )
    },
  })
}

/**
 * Hook to create bulk certificates
 */
export function useCreateBulkCertificates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: certificateApi.createBulkCertificates,
    onSuccess: (certificates) => {
      // Invalidate certificates queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.certificates })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.certificateStats })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hackathonNames })
      
      if (certificates.length > 0) {
        toast.success(`Created ${certificates.length} certificates`)
      } else {
        toast.warning('No certificates were created')
      }

      // Email sending (if desired) is handled in the component layer.
    },
    onError: (error) => {
      console.error('Failed to create bulk certificates:', error)
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to create certificates'
      )
    },
  })
}

/**
 * Hook to update certificate status
 */
export function useUpdateCertificateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CertificateStatus }) =>
      certificateApi.updateCertificateStatus(id, status),
    onSuccess: (updatedCertificate) => {
      // Invalidate and update cache
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.certificates })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.certificateStats })
      queryClient.setQueryData(
        QUERY_KEYS.certificate(updatedCertificate.id), 
        updatedCertificate
      )
      
      const statusText = updatedCertificate.status === 'active' ? 'activated' : 'deactivated'
      toast.success(`Certificate ${statusText} successfully`)
    },
    onError: (error) => {
      console.error('Failed to update certificate status:', error)
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to update certificate status'
      )
    },
  })
}

/**
 * Hook to delete certificate
 */
export function useDeleteCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: certificateApi.deleteCertificate,
    onSuccess: (_, deletedId) => {
      // Remove from cache and invalidate queries
      queryClient.removeQueries({ queryKey: QUERY_KEYS.certificate(deletedId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.certificates })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.certificateStats })
      
      toast.success('Certificate deleted successfully')
    },
    onError: (error) => {
      console.error('Failed to delete certificate:', error)
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to delete certificate'
      )
    },
  })
}