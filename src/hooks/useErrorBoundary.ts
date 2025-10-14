import { useState, useEffect } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export function useErrorBoundary() {
  const [errorBoundaryState, setErrorBoundaryState] = useState<ErrorBoundaryState>({
    hasError: false
  })

  const resetError = () => {
    setErrorBoundaryState({ hasError: false })
  }

  const captureError = (error: Error) => {
    console.error('Error captured by error boundary hook:', error)
    setErrorBoundaryState({ hasError: true, error })
  }

  // Effect to handle unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      if (event.reason instanceof Error) {
        captureError(event.reason)
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return {
    ...errorBoundaryState,
    resetError,
    captureError
  }
}