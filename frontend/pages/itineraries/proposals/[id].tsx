import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DeliveryWorkflow from '../../../components/DeliveryWorkflow';
import ProtectedRoute from '../../../components/auth/ProtectedRoute';

interface DailyActivity {
  time: string;
  activity: string;
  location: string;
  description?: string;
  cost?: number;
}

interface PriceBreakdownItem {
  category: string;
  description: string;
  amount: number;
}

interface ItineraryProposal {
  id: string;
  request_id: string;
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
  price_breakdown?: PriceBreakdownItem[];
  included_services: string[];
  excluded_services: string[];
  terms_and_conditions?: string;
  cancellation_policy?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'declined' | 'withdrawn';
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  accepted_at?: string;
  reviewed_at?: string;
}

interface ProposalDetailContentProps {
  user: any;
}

function ProposalDetailContent({ user }: ProposalDetailContentProps) {
  const router = useRouter();
  const { id } = router.query;
  const [proposal, setProposal] = useState<ItineraryProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchProposalDetails();
    }
  }, [id, user]);

  const fetchProposalDetails = async () => {
    try {
      const response = await fetch(`/api/v1/itineraries/proposals/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch proposal details');
      }

      const data = await response.json();
      setProposal(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!proposal) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/v1/itineraries/proposals/${proposal.id}/status`, {
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

      const updatedProposal = await response.json();
      setProposal(updatedProposal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
      withdrawn: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const calculateTotalCost = () => {
    if (!proposal) return 0;
    return proposal.daily_itinerary.reduce((total, activity) => total + (activity.cost || 0), 0);
  };

  const calculateBreakdownTotal = () => {
    if (!proposal?.price_breakdown) return 0;
    return proposal.price_breakdown.reduce((total, item) => total + item.amount, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading proposal...</p>
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
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Proposal not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isLocalGuide = proposal.local_id === user?.id;
  const canEdit = isLocalGuide && proposal.status === 'draft';
  const canSubmit = isLocalGuide && proposal.status === 'draft';
  const canWithdraw = isLocalGuide && ['submitted', 'under_review'].includes(proposal.status);

  return (
    <>
      <Head>
        <title>{proposal.title} - LocalGhost</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Back
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{proposal.title}</h1>
                <p className="mt-2 text-lg text-gray-600">
                  {formatCurrency(proposal.price_per_person)} per person • {proposal.duration_days} days
                </p>
              </div>

              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                  {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1).replace('_', ' ')}
                </span>

                {canSubmit && (
                  <button
                    onClick={() => handleStatusUpdate('submitted')}
                    disabled={actionLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Submitting...' : 'Submit Proposal'}
                  </button>
                )}

                {canWithdraw && (
                  <button
                    onClick={() => handleStatusUpdate('withdrawn')}
                    disabled={actionLoading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {actionLoading ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                )}

                {canEdit && (
                  <button
                    onClick={() => router.push(`/itineraries/proposals/${proposal.id}/edit`)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Edit Proposal
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Proposal Description</h3>
                  <p className="text-gray-700">{proposal.description}</p>
                </div>
              </div>

              {/* Daily Itinerary */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Daily Itinerary</h3>
                  <div className="space-y-4">
                    {proposal.daily_itinerary.map((activity, index) => (
                      <div key={index} className="border-l-4 border-indigo-400 pl-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-500">{activity.time}</span>
                              <h4 className="text-lg font-medium text-gray-900">{activity.activity}</h4>
                              {activity.cost && activity.cost > 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {formatCurrency(activity.cost)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">📍 {activity.location}</p>
                            {activity.description && (
                              <p className="text-sm text-gray-700 mt-2">{activity.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {calculateTotalCost() > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Total Activity Costs:</span>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(calculateTotalCost())}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Breakdown */}
              {proposal.price_breakdown && proposal.price_breakdown.length > 0 && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Price Breakdown</h3>
                    <div className="space-y-3">
                      {proposal.price_breakdown.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{item.category}</span>
                            {item.description && (
                              <p className="text-sm text-gray-500">{item.description}</p>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-medium text-gray-900">Total:</span>
                          <span className="text-lg font-bold text-gray-900">{formatCurrency(calculateBreakdownTotal())}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Services */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Services</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Included Services */}
                    {proposal.included_services.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">✅ Included</h4>
                        <ul className="space-y-1">
                          {proposal.included_services.map((service, index) => (
                            <li key={index} className="text-sm text-gray-700">• {service}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Excluded Services */}
                    {proposal.excluded_services.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">❌ Not Included</h4>
                        <ul className="space-y-1">
                          {proposal.excluded_services.map((service, index) => (
                            <li key={index} className="text-sm text-gray-700">• {service}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms and Policies */}
              {(proposal.terms_and_conditions || proposal.cancellation_policy) && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Terms and Policies</h3>
                    <div className="space-y-4">
                      {proposal.terms_and_conditions && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Terms and Conditions</h4>
                          <p className="text-sm text-gray-700">{proposal.terms_and_conditions}</p>
                        </div>
                      )}

                      {proposal.cancellation_policy && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Cancellation Policy</h4>
                          <p className="text-sm text-gray-700">{proposal.cancellation_policy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Local Guide Info */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Local Guide</h3>
                  <div className="flex items-center">
                    {proposal.local_avatar && (
                      <img
                        className="h-12 w-12 rounded-full"
                        src={proposal.local_avatar}
                        alt={proposal.local_name}
                      />
                    )}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{proposal.local_name}</p>
                      <div className="flex items-center mt-1">
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
                </div>
              </div>

              {/* Proposal Summary */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Proposal Summary</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Price per Person</dt>
                      <dd className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(proposal.price_per_person)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Duration</dt>
                      <dd className="mt-1 text-sm text-gray-900">{proposal.duration_days} days</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Activities</dt>
                      <dd className="mt-1 text-sm text-gray-900">{proposal.daily_itinerary.length} activities</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                          {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1).replace('_', ' ')}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full"></div>
                      <div className="ml-3">
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-1 text-gray-900">{formatDate(proposal.created_at)}</span>
                      </div>
                    </div>

                    {proposal.submitted_at && (
                      <div className="flex items-center text-sm">
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full"></div>
                        <div className="ml-3">
                          <span className="text-gray-500">Submitted:</span>
                          <span className="ml-1 text-gray-900">{formatDate(proposal.submitted_at)}</span>
                        </div>
                      </div>
                    )}

                    {proposal.reviewed_at && (
                      <div className="flex items-center text-sm">
                        <div className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <div className="ml-3">
                          <span className="text-gray-500">Under Review:</span>
                          <span className="ml-1 text-gray-900">{formatDate(proposal.reviewed_at)}</span>
                        </div>
                      </div>
                    )}

                    {proposal.accepted_at && (
                      <div className="flex items-center text-sm">
                        <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full"></div>
                        <div className="ml-3">
                          <span className="text-gray-500">Accepted:</span>
                          <span className="ml-1 text-gray-900">{formatDate(proposal.accepted_at)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => router.push(`/itineraries/${proposal.request_id}`)}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      View Original Request
                    </button>

                    {proposal.status === 'accepted' && (
                      <button
                        onClick={() => router.push(`/chats?request_id=${proposal.request_id}`)}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Start Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Workflow */}
          <div className="mt-8">
            <DeliveryWorkflow
              proposalId={proposal.id}
              requestId={proposal.request_id}
              proposalStatus={proposal.status}
              isLocal={isLocalGuide}
              isTraveler={!isLocalGuide}
              onStatusUpdate={(newStatus) => {
                setProposal(prev => prev ? { ...prev, status: newStatus as any } : null);
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProposalDetail() {
  return (
    <ProtectedRoute redirectTo="/auth/login">
      {(user) => <ProposalDetailContent user={user} />}
    </ProtectedRoute>
  );
}