import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from '../components/ui'
import { AuthProvider } from '../hooks/useAuth'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Component {...pageProps} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
            },
            error: {
              duration: 5000,
            },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  )
}