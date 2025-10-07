import { useState } from 'react';

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  communication_rating?: number;
  knowledge_rating?: number;
  reliability_rating?: number;
  value_rating?: number;
  is_verified: boolean;
  response_content?: string;
  response_date?: string;
  created_at: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  reviewee_name: string;
  proposal_title: string;
}

interface ReviewCardProps {
  review: Review;
  showProposal?: boolean;
  showReviewee?: boolean;
  canRespond?: boolean;
  onRespond?: (reviewId: string, response: string) => Promise<void>;
}

export default function ReviewCard({
  review,
  showProposal = true,
  showReviewee = true,
  canRespond = false,
  onRespond
}: ReviewCardProps) {
  const [showResponse, setShowResponse] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const StarDisplay = ({ rating, label }: { rating: number; label?: string }) => (
    <div className="flex items-center space-x-1">
      {label && <span className="text-sm text-gray-600">{label}:</span>}
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-sm ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
      </div>
      <span className="text-sm text-gray-600">({rating})</span>
    </div>
  );

  const handleRespond = async () => {
    if (!onRespond || !responseText.trim()) return;

    setSubmittingResponse(true);
    try {
      await onRespond(review.id, responseText.trim());
      setShowResponse(false);
      setResponseText('');
    } catch (error) {
      console.error('Failed to submit response:', error);
    } finally {
      setSubmittingResponse(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {review.reviewer_avatar ? (
            <img
              src={review.reviewer_avatar}
              alt={review.reviewer_name}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {review.reviewer_name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900">{review.reviewer_name}</h4>
              {review.is_verified && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Verified
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
          </div>
        </div>

        <StarDisplay rating={review.rating} />
      </div>

      {/* Proposal Info */}
      {showProposal && (
        <div className="bg-gray-50 rounded-md p-3">
          <p className="text-sm text-gray-600">
            Review for: <span className="font-medium">{review.proposal_title}</span>
            {showReviewee && (
              <span> • Reviewed: <span className="font-medium">{review.reviewee_name}</span></span>
            )}
          </p>
        </div>
      )}

      {/* Review Content */}
      <div>
        <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
        <p className="text-gray-700 leading-relaxed">{review.content}</p>
      </div>

      {/* Aspect Ratings */}
      {(review.communication_rating || review.knowledge_rating || review.reliability_rating || review.value_rating) && (
        <div className="border-t pt-4">
          <h6 className="text-sm font-medium text-gray-900 mb-3">Detailed Ratings</h6>
          <div className="grid grid-cols-2 gap-3">
            {review.communication_rating && (
              <StarDisplay rating={review.communication_rating} label="Communication" />
            )}
            {review.knowledge_rating && (
              <StarDisplay rating={review.knowledge_rating} label="Local Knowledge" />
            )}
            {review.reliability_rating && (
              <StarDisplay rating={review.reliability_rating} label="Reliability" />
            )}
            {review.value_rating && (
              <StarDisplay rating={review.value_rating} label="Value" />
            )}
          </div>
        </div>
      )}

      {/* Response Section */}
      {review.response_content && (
        <div className="border-t pt-4">
          <div className="bg-blue-50 rounded-md p-4">
            <div className="flex items-center space-x-2 mb-2">
              <h6 className="text-sm font-medium text-blue-900">Response from {review.reviewee_name}</h6>
              {review.response_date && (
                <span className="text-xs text-blue-700">
                  {formatDate(review.response_date)}
                </span>
              )}
            </div>
            <p className="text-sm text-blue-800">{review.response_content}</p>
          </div>
        </div>
      )}

      {/* Response Form */}
      {canRespond && !review.response_content && (
        <div className="border-t pt-4">
          {!showResponse ? (
            <button
              onClick={() => setShowResponse(true)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Respond to this review
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowResponse(false);
                    setResponseText('');
                  }}
                  className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRespond}
                  disabled={!responseText.trim() || submittingResponse}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingResponse ? 'Submitting...' : 'Submit Response'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}