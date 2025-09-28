import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProtectedRoute from '../../components/auth/ProtectedRoute';

interface DailyActivity {
  time: string;
  activity: string;
  location: string;
  description?: string;
  cost?: number;
}

interface ItineraryProposal {
  id: string;
  local_id: string;
  local_name: string;
  local_avatar?: string;
  local_rating?: number;
  local_verified: boolean;
  title: string;
  description: string;
  daily_itinerary: DailyActivity[];
  price_per_person: number;
  duration_days: number;
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'declined' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

interface ItineraryRequest {
  id: string;
  traveler_id: string;
  traveler_name: string;
  traveler_avatar?: string;
  local_id?: string;
  local_name?: string;
  local_avatar?: string;
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
  preferences: Record<string, any>;
  special_requirements?: string;
  is_public: boolean;
  status: 'draft' | 'pending' | 'active' | 'accepted' | 'completed' | 'cancelled';
  proposal_count: number;
  created_at: string;
  updated_at: string;
}

interface ItineraryRequestDetailContentProps {
  user: any;
}

function ItineraryRequestDetailContent({ user }: ItineraryRequestDetailContentProps) {
  const router = useRouter();
  const { id } = router.query;
  const [request, setRequest] = useState<ItineraryRequest | null>(null);
  const [proposals, setProposals] = useState<ItineraryProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'details' | 'proposals'>('details');

  useEffect(() => {
    if (id && user) {
      fetchRequestDetails();
      fetchProposals();
    }
  }, [id, user]);

  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/v1/itineraries/requests/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch request details');
      }

      const data = await response.json();
      setRequest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async () => {
    try {
      const response = await fetch(`/api/v1/itineraries/requests/${id}/proposals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProposals(data.proposals || []);
      }
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/v1/itineraries/requests/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const updatedRequest = await response.json();
      setRequest(updatedRequest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleProposalAction = async (proposalId: string, action: 'accept' | 'decline') => {
    try {
      const response = await fetch(`/api/v1/itineraries/proposals/${proposalId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          status: action === 'accept' ? 'accepted' : 'declined'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} proposal`);
      }

      // Refresh data
      await fetchRequestDetails();
      await fetchProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} proposal`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      declined: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading itinerary request...</p>
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
          <button
            onClick={() => router.push('/itineraries')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Itineraries
          </button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Itinerary request not found</p>
          <button
            onClick={() => router.push('/itineraries')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Itineraries
          </button>
        </div>
      </div>
    );
  }

  const canManageRequest = request.traveler_id === user?.id;
  const canCreateProposal = user?.role === 'local' && request.traveler_id !== user?.id;

  return (
    <>
      <Head>
        <title>{request.title} - LocalGhost</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/itineraries')}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Back to Itineraries
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{request.title}</h1>
                <p className="mt-2 text-lg text-gray-600">
                  {request.destination_city}, {request.destination_country}
                </p>
              </div>

              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>

                {canManageRequest && request.status === 'draft' && (
                  <button
                    onClick={() => handleStatusUpdate('pending')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Publish Request
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedTab('details')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'details'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Request Details
              </button>
              <button
                onClick={() => setSelectedTab('proposals')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'proposals'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Proposals ({request.proposal_count})
              </button>
            </nav>
          </div>

          {/* Content */}
          {selectedTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Description</h3>
                    <p className="text-gray-700">{request.description}</p>
                  </div>
                </div>

                {request.special_requirements && (
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Special Requirements</h3>
                      <p className="text-gray-700">{request.special_requirements}</p>
                    </div>
                  </div>
                )}

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Preferences</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(request.preferences).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-sm font-medium text-gray-500">
                            {key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </dd>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Trip Details</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Dates</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Duration</dt>
                        <dd className="mt-1 text-sm text-gray-900">{request.duration_days} days</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Group Size</dt>
                        <dd className="mt-1 text-sm text-gray-900">{request.group_size} people</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Budget Range</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatCurrency(request.budget_min)} - {formatCurrency(request.budget_max)} per person
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Traveler</h3>
                    <div className="flex items-center">
                      {request.traveler_avatar && (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={request.traveler_avatar}
                          alt={request.traveler_name}
                        />
                      )}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{request.traveler_name}</p>
                        <p className="text-sm text-gray-500">Traveler</p>
                      </div>
                    </div>
                  </div>
                </div>

                {canCreateProposal && (
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Create Proposal</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        As a local guide, you can create a custom itinerary proposal for this request.
                      </p>
                      <button
                        onClick={() => router.push(`/itineraries/proposals/create?request_id=${request.id}`)}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Create Proposal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'proposals' && (
            <div className="space-y-6">
              {proposals.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No proposals yet for this request.</p>
                  {canCreateProposal && (
                    <button
                      onClick={() => router.push(`/itineraries/proposals/create?request_id=${request.id}`)}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Create First Proposal
                    </button>
                  )}
                </div>
              ) : (
                proposals.map((proposal) => (
                  <div key={proposal.id} className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          {proposal.local_avatar && (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={proposal.local_avatar}
                              alt={proposal.local_name}
                            />
                          )}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{proposal.local_name}</p>
                            <div className="flex items-center">
                              {proposal.local_verified && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mr-2">
                                  Verified
                                </span>
                              )}
                              {proposal.local_rating && (
                                <span className="text-sm text-gray-500">
                                  ⭐ {proposal.local_rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                            {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1).replace('_', ' ')}
                          </span>

                          {canManageRequest && proposal.status === 'submitted' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleProposalAction(proposal.id, 'accept')}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleProposalAction(proposal.id, 'decline')}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h4 className="text-lg font-medium text-gray-900 mb-2">{proposal.title}</h4>
                      <p className="text-gray-700 mb-4">{proposal.description}</p>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Price per person</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatCurrency(proposal.price_per_person)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Duration</dt>
                          <dd className="mt-1 text-sm text-gray-900">{proposal.duration_days} days</dd>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Daily Itinerary</h5>
                        <div className="space-y-2">
                          {proposal.daily_itinerary.slice(0, 3).map((activity, index) => (
                            <div key={index} className="flex items-start space-x-3 text-sm">
                              <span className="text-gray-500">{activity.time}</span>
                              <div>
                                <span className="font-medium">{activity.activity}</span>
                                <span className="text-gray-500"> at {activity.location}</span>
                              </div>
                            </div>
                          ))}
                          {proposal.daily_itinerary.length > 3 && (
                            <p className="text-sm text-gray-500">
                              +{proposal.daily_itinerary.length - 3} more activities...
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => router.push(`/itineraries/proposals/${proposal.id}`)}
                          className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                        >
                          View Full Proposal →
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ItineraryRequestDetail() {
  return (
    <ProtectedRoute redirectTo="/auth/login">
      {(user) => <ItineraryRequestDetailContent user={user} />}
    </ProtectedRoute>
  );
}