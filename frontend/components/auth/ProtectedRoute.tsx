import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { useEffect, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requireRole?: 'traveler' | 'local';
  showLoadingPage?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = '/',
  requireRole,
  showLoadingPage = true
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Not authenticated, redirect to login/home
        router.replace(redirectTo);
        return;
      }

      if (requireRole && user?.role !== requireRole) {
        // User doesn't have required role
        router.replace('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, router, redirectTo, requireRole]);

  // Show loading state
  if (isLoading) {
    if (!showLoadingPage) {
      return null;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Authenticating your session</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated or wrong role
  if (!isAuthenticated || (requireRole && user?.role !== requireRole)) {
    return null;
  }

  return <>{children}</>;
}

// Higher-order component for easier use
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}