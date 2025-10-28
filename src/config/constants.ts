// Configuration constants for the certificate system
// Update these values for different environments (development, staging, production)

export const CERTIFICATE_CONFIG = {
  // Verification URL - change this for testing
  // For development: 'http://localhost:5000'
  // For production: 'https://maximally.in'
  VERIFICATION_BASE_URL: 'https://maximally.in',
  
  // Full verification URL template
  get VERIFICATION_URL() {
    return `${this.VERIFICATION_BASE_URL}/certificates/verify`
  },
  
  // API verification URL template (for programmatic access)
  get API_VERIFICATION_URL() {
    return `${this.VERIFICATION_BASE_URL}/api/certificates/verify`
  },
  
  // Certificate ID format
  ID_FORMAT: 'CERT-XXXXXX',
  ID_LENGTH: 6,
  ID_CHARS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  
  // File generation settings
  PDF_SETTINGS: {
    orientation: 'landscape' as const,
    unit: 'mm' as const,
    format: [297, 210], // A4 landscape
  },
  
  // Canvas settings for certificate generation
  CANVAS_SETTINGS: {
    width: 1200,
    height: 800,
    scale: 2,
  },
  
  // QR Code settings
  QR_CODE_SETTINGS: {
    width: 120,
    margin: 2,
    color: {
      dark: '#1F2937', // Dark gray
      light: '#FFFFFF' // White background
    }
  }
}

// Environment-specific configuration
export const ENV_CONFIG = {
  // Automatically detect environment and set appropriate base URL
  get VERIFICATION_BASE_URL() {
    // Check if we're in development mode
    if (import.meta.env.DEV) {
      // For development, you can set a custom environment variable
      return import.meta.env.VITE_VERIFICATION_BASE_URL || 'http://localhost:5000'
    }
    
    // For production
    return 'https://maximally.in'
  },
  
  // API base URL for programmatic access
  get API_BASE_URL() {
    return this.VERIFICATION_BASE_URL
  }
}

// Helper function to get verification URL for a certificate (for QR codes and user-facing links)
export const getVerificationUrl = (certificateId: string): string => {
  return `${CERTIFICATE_CONFIG.VERIFICATION_BASE_URL}/certificates/verify/${certificateId}`
}

// Helper function to get API verification URL for programmatic access
export const getApiVerificationUrl = (certificateId: string): string => {
  return `${CERTIFICATE_CONFIG.VERIFICATION_BASE_URL}/api/certificates/verify/${certificateId}`
}

// Helper function to get QR code verification URL  
export const getQRVerificationUrl = (certificateId: string): string => {
  return getVerificationUrl(certificateId)
}