import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import ReviewCard from '../../components/reviews/ReviewCard';

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

function ReviewsPageContent({ user }: { user: any }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');
  const [hasMore, setHasMore] = useState(false);

  const fetchReviews = async (received: boolean = true) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/reviews/my-reviews?received=${received}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      setReviews(data.reviews);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(activeTab === 'received');
  }, [activeTab]);

  const handleRespondToReview = async (reviewId: string, response: string) => {
    try {
      const res = await fetch(`/api/v1/reviews/${reviewId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ response_content: response }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit response');
      }

      // Refresh reviews
      await fetchReviews(activeTab === 'received');
    } catch (err) {
      console.error('Failed to respond to review:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>My Reviews - LocalGhost</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Reviews</h1>
            <p className="mt-2 text-gray-600">
              Manage reviews you've received and given
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('received')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'received'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reviews Received
              </button>
              <button
                onClick={() => setActiveTab('given')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'given'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reviews Given
              </button>
            </nav>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <span className="text-6xl">⭐</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {activeTab === 'received' ? 'Reviews Received' : 'Reviews Given'} Yet
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'received'
                  ? "You haven't received any reviews yet. Complete some trips to start receiving reviews!"
                  : "You haven't given any reviews yet. Share your experiences to help other users!"}
              </p>
              {activeTab === 'received' && (
                <Link
                  href="/browse"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Browse Local Guides
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  showReviewee={activeTab === 'given'}
                  canRespond={activeTab === 'received' && !review.response_content}
                  onRespond={handleRespondToReview}
                />
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center pt-6">
                  <button
                    onClick={() => fetchReviews(activeTab === 'received')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Load More Reviews
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ReviewsPage() {
  return (
    <ProtectedRoute redirectTo="/auth/login">
      {(user) => <ReviewsPageContent user={user} />}
    </ProtectedRoute>
  );
}

// Force server-side rendering to avoid static generation
export async function getServerSideProps() {
  return {
    props: {},
  };
}