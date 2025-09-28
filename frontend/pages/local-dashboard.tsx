import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

interface ItineraryRequest {
  id: string;
  title: string;
  description: string;
  destination_city: string;
  destination_country: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  budget_min: number;
  budget_max: number;
  group_size: number;
  traveler_name: string;
  traveler_avatar?: string;
  proposal_count: number;
  status: string;
  can_propose?: boolean;
  my_proposal_id?: string;
  my_proposal_status?: string;
  created_at: string;
}

interface ItineraryProposal {
  id: string;
  request_id: string;
  title: string;
  description: string;
  price_per_person: number;
  duration_days: number;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  accepted_at?: string;
}

interface DashboardStats {
  total_proposals: number;
  accepted_proposals: number;
  pending_proposals: number;
  available_requests: number;
}

export default function LocalDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'available' | 'proposals'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<DashboardStats>({
    total_proposals: 0,
    accepted_proposals: 0,
    pending_proposals: 0,
    available_requests: 0
  });
  const [availableRequests, setAvailableRequests] = useState<ItineraryRequest[]>([]);
  const [myProposals, setMyProposals] = useState<ItineraryProposal[]>([]);

  // Filters
  const [requestFilters, setRequestFilters] = useState({
    destination_city: '',
    destination_country: '',
    budget_min: '',
    budget_max: ''
  });
  const [proposalStatusFilter, setProposalStatusFilter] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'local')) {
      router.push('/auth/login');
      return;
    }

    if (user && user.role === 'local') {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAvailableRequests(),
        fetchMyProposals(),
        fetchStats()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (requestFilters.destination_city) params.append('destination_city', requestFilters.destination_city);
      if (requestFilters.destination_country) params.append('destination_country', requestFilters.destination_country);
      if (requestFilters.budget_min) params.append('budget_min', requestFilters.budget_min);
      if (requestFilters.budget_max) params.append('budget_max', requestFilters.budget_max);

      const response = await fetch(`/api/v1/itineraries/available-requests?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch available requests:', err);
    }
  };

  const fetchMyProposals = async () => {
    try {
      const params = new URLSearchParams();
      if (proposalStatusFilter) params.append('status', proposalStatusFilter);

      const response = await fetch(`/api/v1/itineraries/my-proposals?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyProposals(data.proposals || []);
      }
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch both available requests and proposals to calculate stats
      const [availableResponse, proposalsResponse] = await Promise.all([
        fetch('/api/v1/itineraries/available-requests', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/v1/itineraries/my-proposals', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (availableResponse.ok && proposalsResponse.ok) {
        const [availableData, proposalsData] = await Promise.all([
          availableResponse.json(),
          proposalsResponse.json()
        ]);

        const proposals = proposalsData.proposals || [];
        setStats({
          total_proposals: proposals.length,
          accepted_proposals: proposals.filter((p: ItineraryProposal) => p.status === 'accepted').length,
          pending_proposals: proposals.filter((p: ItineraryProposal) => ['submitted', 'under_review'].includes(p.status)).length,
          available_requests: availableData.total || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleFilterChange = (type: 'request' | 'proposal', field: string, value: string) => {
    if (type === 'request') {
      setRequestFilters(prev => ({ ...prev, [field]: value }));
    } else {
      setProposalStatusFilter(value);
    }
  };

  const applyFilters = () => {
    if (activeTab === 'available') {
      fetchAvailableRequests();
    } else if (activeTab === 'proposals') {
      fetchMyProposals();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Local Guide Dashboard - LocalGhost</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Local Guide Dashboard</h1>
            <p className="mt-2 text-lg text-gray-600">
              Manage your itinerary proposals and find new opportunities
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📋</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Proposals</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.total_proposals}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">✅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Accepted</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.accepted_proposals}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">⏳</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.pending_proposals}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🆕</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Available</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.available_requests}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('available')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'available'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Available Requests ({availableRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('proposals')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'proposals'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Proposals ({myProposals.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveTab('available')}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="text-center">
                        <span className="text-2xl mb-2 block">🔍</span>
                        <h4 className="text-sm font-medium text-gray-900">Browse Available Requests</h4>
                        <p className="text-xs text-gray-500 mt-1">Find new opportunities to create proposals</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('proposals')}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="text-center">
                        <span className="text-2xl mb-2 block">📋</span>
                        <h4 className="text-sm font-medium text-gray-900">Manage Your Proposals</h4>
                        <p className="text-xs text-gray-500 mt-1">Track status and update your proposals</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {myProposals.slice(0, 5).map((proposal) => (
                      <div key={proposal.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{proposal.title}</p>
                          <p className="text-xs text-gray-500">
                            {proposal.status === 'accepted' ? 'Accepted' : 'Updated'} {formatDate(proposal.updated_at)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                          {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1).replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                    {myProposals.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No proposals yet. Start by browsing available requests!</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'available' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Filter Requests</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Destination City</label>
                      <input
                        type="text"
                        value={requestFilters.destination_city}
                        onChange={(e) => handleFilterChange('request', 'destination_city', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Paris"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Country</label>
                      <input
                        type="text"
                        value={requestFilters.destination_country}
                        onChange={(e) => handleFilterChange('request', 'destination_country', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., France"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Min Budget</label>
                      <input
                        type="number"
                        value={requestFilters.budget_min}
                        onChange={(e) => handleFilterChange('request', 'budget_min', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Budget</label>
                      <input
                        type="number"
                        value={requestFilters.budget_max}
                        onChange={(e) => handleFilterChange('request', 'budget_max', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="10000"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={applyFilters}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>

              {/* Available Requests */}
              <div className="space-y-4">
                {availableRequests.map((request) => (
                  <div key={request.id} className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{request.title}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-4">{request.description}</p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <dt className="text-xs font-medium text-gray-500">Destination</dt>
                              <dd className="text-sm text-gray-900">{request.destination_city}, {request.destination_country}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-gray-500">Duration</dt>
                              <dd className="text-sm text-gray-900">{request.duration_days} days</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-gray-500">Group Size</dt>
                              <dd className="text-sm text-gray-900">{request.group_size} people</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-gray-500">Budget Range</dt>
                              <dd className="text-sm text-gray-900">
                                {formatCurrency(request.budget_min)} - {formatCurrency(request.budget_max)}
                              </dd>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {request.traveler_avatar && (
                                <img
                                  className="h-8 w-8 rounded-full"
                                  src={request.traveler_avatar}
                                  alt={request.traveler_name}
                                />
                              )}
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{request.traveler_name}</p>
                                <p className="text-xs text-gray-500">{request.proposal_count} proposals</p>
                              </div>
                            </div>

                            <div className="flex space-x-3">
                              <button
                                onClick={() => router.push(`/itineraries/${request.id}`)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                              >
                                View Details
                              </button>

                              {request.can_propose ? (
                                <button
                                  onClick={() => router.push(`/itineraries/proposals/create?request_id=${request.id}`)}
                                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                  Create Proposal
                                </button>
                              ) : (
                                <button
                                  onClick={() => router.push(`/itineraries/proposals/${request.my_proposal_id}`)}
                                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  View My Proposal
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {availableRequests.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No available requests match your filters.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'proposals' && (
            <div className="space-y-6">
              {/* Proposal Status Filter */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Filter Proposals</h3>
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={proposalStatusFilter}
                        onChange={(e) => handleFilterChange('proposal', 'status', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="accepted">Accepted</option>
                        <option value="declined">Declined</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={applyFilters}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Apply Filter
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* My Proposals */}
              <div className="space-y-4">
                {myProposals.map((proposal) => (
                  <div key={proposal.id} className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{proposal.title}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1).replace('_', ' ')}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-4">{proposal.description}</p>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <dt className="text-xs font-medium text-gray-500">Price per Person</dt>
                              <dd className="text-sm text-gray-900">{formatCurrency(proposal.price_per_person)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-gray-500">Duration</dt>
                              <dd className="text-sm text-gray-900">{proposal.duration_days} days</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-gray-500">Created</dt>
                              <dd className="text-sm text-gray-900">{formatDate(proposal.created_at)}</dd>
                            </div>
                          </div>

                          <div className="flex space-x-3">
                            <button
                              onClick={() => router.push(`/itineraries/proposals/${proposal.id}`)}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              View Details
                            </button>

                            <button
                              onClick={() => router.push(`/itineraries/${proposal.request_id}`)}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              View Request
                            </button>

                            {proposal.status === 'accepted' && (
                              <button
                                onClick={() => router.push(`/chats?request_id=${proposal.request_id}`)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                              >
                                Start Chat
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {myProposals.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">You haven't created any proposals yet.</p>
                    <button
                      onClick={() => setActiveTab('available')}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Browse Available Requests
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}