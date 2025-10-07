import { useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AnalyticsDashboard from '../components/dashboard/AnalyticsDashboard';
import NotificationBell from '../components/notifications/NotificationBell';

interface DashboardContentProps {
  user: any;
  logout: () => Promise<void>;
}

function DashboardContent({ user, logout }: DashboardContentProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-lg font-bold text-white">LG</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">LocalGhost</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationBell />

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                  <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoggingOut ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing out...
                  </>
                ) : (
                  'Sign out'
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user.full_name}!
                </h2>
                <p className="text-lg text-gray-600">
                  Ready to explore amazing local experiences?
                </p>
              </div>
              {!user.onboarding_completed && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 lg:max-w-md">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        <svg className="h-5 w-5 text-amber-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-amber-800 mb-1">Complete your profile</h3>
                      <p className="text-sm text-amber-700 mb-4">
                        Finish setting up your profile to get the best experience.
                      </p>
                      <button
                        onClick={() => router.push('/profile/setup')}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        Complete Setup
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="mb-8">
          <AnalyticsDashboard />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/itineraries/new')}
              className="flex items-center p-6 border border-gray-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 text-left">
                <div className="text-base font-semibold text-gray-900">New Request</div>
                <div className="text-sm text-gray-500">Create itinerary request</div>
              </div>
            </button>

            <button
              onClick={() => router.push('/profile')}
              className="flex items-center p-6 border border-gray-200 rounded-2xl hover:border-green-300 hover:bg-green-50 transition-all duration-200 group"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 text-left">
                <div className="text-base font-semibold text-gray-900">View Profile</div>
                <div className="text-sm text-gray-500">Manage your profile</div>
              </div>
            </button>

            <button
              onClick={() => router.push('/chats')}
              className="flex items-center p-6 border border-gray-200 rounded-2xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors duration-200">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 text-left">
                <div className="text-base font-semibold text-gray-900">Messages</div>
                <div className="text-sm text-gray-500">View conversations</div>
              </div>
            </button>

            <button
              onClick={() => router.push('/notifications')}
              className="flex items-center p-6 border border-gray-200 rounded-2xl hover:border-amber-300 hover:bg-amber-50 transition-all duration-200 group"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors duration-200">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM5.07 6.07a.999.999 0 000 1.41l1.42 1.42a.999.999 0 001.41 0l.71-.71a.999.999 0 000-1.41L7.19 5.36a.999.999 0 00-1.41 0l-.71.71z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 4h6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 text-left">
                <div className="text-base font-semibold text-gray-900">Notifications</div>
                <div className="text-sm text-gray-500">View all notifications</div>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute redirectTo="/login">
      {(user, authContext) => <DashboardContent user={user} logout={authContext.logout} />}
    </ProtectedRoute>
  );
}

// Force server-side rendering to avoid static generation
export async function getServerSideProps() {
  return {
    props: {},
  };
}