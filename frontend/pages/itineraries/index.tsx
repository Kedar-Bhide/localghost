import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';

// ===== INLINED TYPES AND API =====
interface ItineraryRequest {
  id: string;
  traveler_id: string;
  local_id?: string;
  title: string;
  description: string;
  destination_city: string;
  destination_country: string;
  start_date: string;
  end_date: string;
  group_size: number;
  budget_min?: number;
  budget_max?: number;
  currency: string;
  interests?: string[];
  activity_level?: string;
  status: string;
  is_public: boolean;
  urgency_level?: string;
  created_at: string;
  updated_at: string;
  duration_days?: number;
  proposal_count: number;
  traveler_name: string;
  traveler_avatar?: string;
  local_name?: string;
  local_avatar?: string;
}

interface ItineraryRequestListResponse {
  requests: ItineraryRequest[];
  total: number;
  has_more: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function getItineraryRequests(
  myRequestsOnly = false,
  status?: string,
  destination_city?: string,
  limit = 20,
  offset = 0
): Promise<ItineraryRequestListResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  if (myRequestsOnly) params.append('my_requests_only', 'true');
  if (status) params.append('status', status);
  if (destination_city) params.append('destination_city', destination_city);

  const response = await fetch(`${API_BASE_URL}/itineraries/requests?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch itinerary requests: ${response.statusText}`);
  }

  return response.json();
}

const statusColors = {
  draft: 'bg-neutral-100 text-neutral-700',
  pending: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  cancelled: 'bg-neutral-100 text-neutral-600',
  completed: 'bg-purple-100 text-purple-800',
};

const urgencyColors = {
  low: 'border-l-neutral-300',
  medium: 'border-l-yellow-400',
  high: 'border-l-red-400',
};

export default function ItinerariesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<ItineraryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'my_requests'>('all');
  const [filters, setFilters] = useState({
    status: '',
    destination_city: '',
  });

  // Show loading while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }

  useEffect(() => {
    loadRequests();
  }, [activeTab, filters]);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getItineraryRequests(
        activeTab === 'my_requests',
        filters.status || undefined,
        filters.destination_city || undefined
      );
      setRequests(response.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load itinerary requests');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      destination_city: '',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatBudget = (min?: number, max?: number, currency = 'USD') => {
    if (!min && !max) return 'Budget not specified';
    if (min && max) return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `From ${currency} ${min.toLocaleString()}`;
    if (max) return `Up to ${currency} ${max.toLocaleString()}`;
    return '';
  };

  const getStatusDisplay = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Head>
        <title>Itinerary Requests - LocalGhost</title>
        <meta name="description" content="Manage your itinerary requests and proposals" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="container-mobile md:container-tablet lg:container-desktop">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-white">LG</span>
              </div>
              <span className="text-xl font-bold text-neutral-900">LocalGhost</span>
            </Link>

            <div className="flex items-center space-x-4">
              <Link href="/search" className="text-neutral-600 hover:text-neutral-900">
                Search Guides
              </Link>
              <Link href="/messages" className="text-neutral-600 hover:text-neutral-900">
                Messages
              </Link>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <div className="container-mobile md:container-tablet lg:container-desktop">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">Itinerary Requests</h1>
                <p className="text-lg text-neutral-600 mt-2">
                  {user.role === 'traveler'
                    ? 'Create custom itinerary requests and receive proposals from local guides'
                    : 'Browse itinerary requests and submit your proposals'
                  }
                </p>
              </div>

              {user.role === 'traveler' && (
                <Link href="/itineraries/create">
                  <button className="btn-primary">
                    Create Request
                  </button>
                </Link>
              )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-neutral-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {user.role === 'traveler' ? 'All Requests' : 'Browse Requests'}
              </button>
              <button
                onClick={() => setActiveTab('my_requests')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'my_requests'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                My Requests
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <label htmlFor="destination_city" className="block text-sm font-medium text-neutral-700 mb-2">
                  Destination City
                </label>
                <input
                  type="text"
                  id="destination_city"
                  value={filters.destination_city}
                  onChange={(e) => handleFilterChange('destination_city', e.target.value)}
                  placeholder="Filter by city..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="status" className="block text-sm font-medium text-neutral-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="in_review">In Review</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-800 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={loadRequests}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-neutral-600">Loading requests...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadRequests}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-xl font-medium text-neutral-900 mb-2">
                {activeTab === 'my_requests' ? 'No requests yet' : 'No requests found'}
              </h3>
              <p className="text-neutral-600 mb-6">
                {activeTab === 'my_requests' && user.role === 'traveler'
                  ? 'Create your first itinerary request to get started.'
                  : 'Try adjusting your filters or check back later for new requests.'
                }
              </p>
              {activeTab === 'my_requests' && user.role === 'traveler' && (
                <Link href="/itineraries/create">
                  <button className="btn-primary">
                    Create Your First Request
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-md transition-shadow border-l-4 ${
                    urgencyColors[request.urgency_level as keyof typeof urgencyColors] || 'border-l-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Link href={`/itineraries/${request.id}`}>
                          <h3 className="text-lg font-semibold text-neutral-900 hover:text-primary cursor-pointer">
                            {request.title}
                          </h3>
                        </Link>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          statusColors[request.status as keyof typeof statusColors] || 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {getStatusDisplay(request.status)}
                        </span>
                        {request.proposal_count > 0 && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {request.proposal_count} proposal{request.proposal_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <p className="text-neutral-600 mb-4 line-clamp-2">
                        {request.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-neutral-500">Destination:</span>
                          <p className="font-medium">{request.destination_city}, {request.destination_country}</p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Dates:</span>
                          <p className="font-medium">
                            {formatDate(request.start_date)} - {formatDate(request.end_date)}
                            {request.duration_days && <span className="text-neutral-500 ml-1">({request.duration_days} days)</span>}
                          </p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Group Size:</span>
                          <p className="font-medium">{request.group_size} person{request.group_size !== 1 ? 's' : ''}</p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Budget:</span>
                          <p className="font-medium">{formatBudget(request.budget_min, request.budget_max, request.currency)}</p>
                        </div>
                      </div>

                      {request.interests && request.interests.length > 0 && (
                        <div className="mt-4">
                          <span className="text-neutral-500 text-sm">Interests: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {request.interests.slice(0, 5).map((interest) => (
                              <span
                                key={interest}
                                className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full"
                              >
                                {interest}
                              </span>
                            ))}
                            {request.interests.length > 5 && (
                              <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full">
                                +{request.interests.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 ml-6">
                      {request.traveler_avatar ? (
                        <img
                          src={request.traveler_avatar}
                          alt={request.traveler_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-neutral-600">
                            {request.traveler_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-sm font-medium text-neutral-900">{request.traveler_name}</p>
                        <p className="text-xs text-neutral-500">
                          Created {formatDate(request.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}