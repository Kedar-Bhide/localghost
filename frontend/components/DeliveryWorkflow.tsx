import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface DeliveryStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  completedAt?: string;
  assignedTo?: 'traveler' | 'local' | 'both';
  action?: () => void;
  actionLabel?: string;
}

interface DeliveryWorkflowProps {
  proposalId: string;
  requestId: string;
  proposalStatus: string;
  isLocal: boolean;
  isTraveler: boolean;
  onStatusUpdate?: (newStatus: string) => void;
}

export default function DeliveryWorkflow({
  proposalId,
  requestId,
  proposalStatus,
  isLocal,
  isTraveler,
  onStatusUpdate
}: DeliveryWorkflowProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWorkflowSteps = (): DeliveryStep[] => {
    const baseSteps: DeliveryStep[] = [
      {
        id: 'proposal_created',
        title: 'Proposal Created',
        description: 'Local guide has created an itinerary proposal',
        status: 'completed',
        assignedTo: 'local',
        completedAt: new Date().toISOString() // This would come from actual data
      },
      {
        id: 'proposal_submitted',
        title: 'Proposal Submitted',
        description: 'Proposal has been submitted for traveler review',
        status: proposalStatus === 'draft' ? 'pending' : 'completed',
        assignedTo: 'local',
        action: isLocal && proposalStatus === 'draft' ? () => handleStatusUpdate('submitted') : undefined,
        actionLabel: 'Submit Proposal'
      },
      {
        id: 'traveler_review',
        title: 'Traveler Review',
        description: 'Traveler is reviewing the proposal',
        status: proposalStatus === 'submitted' ? 'active' :
                proposalStatus === 'under_review' ? 'active' :
                ['accepted', 'declined'].includes(proposalStatus) ? 'completed' : 'pending',
        assignedTo: 'traveler'
      },
      {
        id: 'proposal_decision',
        title: 'Proposal Decision',
        description: 'Traveler accepts or declines the proposal',
        status: proposalStatus === 'accepted' ? 'completed' :
                proposalStatus === 'declined' ? 'completed' :
                ['submitted', 'under_review'].includes(proposalStatus) ? 'active' : 'pending',
        assignedTo: 'traveler',
        action: isTraveler && ['submitted', 'under_review'].includes(proposalStatus)
          ? () => handleStatusUpdate('accepted') : undefined,
        actionLabel: 'Accept Proposal'
      }
    ];

    // Add delivery steps only if proposal is accepted
    if (proposalStatus === 'accepted') {
      baseSteps.push(
        {
          id: 'initiate_communication',
          title: 'Start Communication',
          description: 'Begin discussing trip details and coordination',
          status: 'active',
          assignedTo: 'both',
          action: () => window.open(`/chats?request_id=${requestId}`, '_blank'),
          actionLabel: 'Open Chat'
        },
        {
          id: 'finalize_details',
          title: 'Finalize Details',
          description: 'Confirm final itinerary, logistics, and arrangements',
          status: 'pending',
          assignedTo: 'both'
        },
        {
          id: 'pre_trip_preparation',
          title: 'Pre-Trip Preparation',
          description: 'Share contact information, meeting points, and final preparations',
          status: 'pending',
          assignedTo: 'local'
        },
        {
          id: 'trip_execution',
          title: 'Trip Execution',
          description: 'Deliver the planned itinerary experience',
          status: 'pending',
          assignedTo: 'local'
        },
        {
          id: 'completion_review',
          title: 'Completion & Review',
          description: 'Trip completed, feedback and review process',
          status: 'pending',
          assignedTo: 'both'
        }
      );
    }

    return baseSteps;
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/itineraries/proposals/${proposalId}/status`, {
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

      onStatusUpdate?.(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'active':
        return '🔄';
      case 'pending':
        return '⏳';
      case 'skipped':
        return '⏭️';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'active':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'skipped':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const canUserAct = (step: DeliveryStep) => {
    if (!step.assignedTo || !step.action) return false;

    if (step.assignedTo === 'both') return true;
    if (step.assignedTo === 'local' && isLocal) return true;
    if (step.assignedTo === 'traveler' && isTraveler) return true;

    return false;
  };

  const steps = getWorkflowSteps();

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Delivery Workflow</h3>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className={`border rounded-lg p-4 ${getStatusColor(step.status)}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-lg">{getStatusIcon(step.status)}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{step.title}</h4>
                    <p className="text-sm opacity-75 mt-1">{step.description}</p>

                    {step.assignedTo && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {step.assignedTo === 'both' ? 'Both Parties' :
                           step.assignedTo === 'local' ? 'Local Guide' : 'Traveler'}
                        </span>
                      </div>
                    )}

                    {step.completedAt && (
                      <p className="text-xs opacity-60 mt-1">
                        Completed: {new Date(step.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {step.action && canUserAct(step) && step.status !== 'completed' && (
                    <button
                      onClick={step.action}
                      disabled={loading}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : step.actionLabel}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress connector */}
              {index < steps.length - 1 && (
                <div className="ml-6 mt-2">
                  <div className="w-0.5 h-4 bg-gray-300"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Status Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Current Status: <span className="font-medium capitalize">
                {proposalStatus.replace('_', ' ')}
              </span>
            </span>

            <div className="flex items-center space-x-4">
              <span className="text-gray-500">
                Progress: {Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100)}%
              </span>
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}