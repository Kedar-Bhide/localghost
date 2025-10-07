interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<number, number>;
  average_communication?: number;
  average_knowledge?: number;
  average_reliability?: number;
  average_value?: number;
}

interface ReviewStatsProps {
  stats: ReviewStats;
  showDetailed?: boolean;
}

export default function ReviewStats({ stats, showDetailed = true }: ReviewStatsProps) {
  if (stats.total_reviews === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <div className="text-gray-400 mb-2">
          <span className="text-4xl">⭐</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Reviews Yet</h3>
        <p className="text-gray-600">This user hasn't received any reviews.</p>
      </div>
    );
  }

  const StarDisplay = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) => {
    const starSize = size === 'lg' ? 'text-2xl' : 'text-lg';

    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${starSize} ${
              star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const RatingBar = ({ rating, count }: { rating: number; count: number }) => {
    const percentage = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;

    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 w-2">{rating}</span>
        <span className="text-yellow-400">★</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      {/* Overall Rating */}
      <div className="text-center">
        <div className="text-4xl font-bold text-gray-900 mb-2">
          {stats.average_rating.toFixed(1)}
        </div>
        <StarDisplay rating={stats.average_rating} size="lg" />
        <p className="text-sm text-gray-600 mt-2">
          Based on {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Rating Distribution */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Rating Distribution</h4>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <RatingBar
              key={rating}
              rating={rating}
              count={stats.rating_distribution[rating] || 0}
            />
          ))}
        </div>
      </div>

      {/* Detailed Ratings */}
      {showDetailed && (stats.average_communication || stats.average_knowledge || stats.average_reliability || stats.average_value) && (
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Detailed Ratings</h4>
          <div className="space-y-3">
            {stats.average_communication && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Communication</span>
                <div className="flex items-center space-x-2">
                  <StarDisplay rating={stats.average_communication} />
                  <span className="text-sm font-medium text-gray-900">
                    {stats.average_communication.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
            {stats.average_knowledge && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Local Knowledge</span>
                <div className="flex items-center space-x-2">
                  <StarDisplay rating={stats.average_knowledge} />
                  <span className="text-sm font-medium text-gray-900">
                    {stats.average_knowledge.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
            {stats.average_reliability && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Reliability</span>
                <div className="flex items-center space-x-2">
                  <StarDisplay rating={stats.average_reliability} />
                  <span className="text-sm font-medium text-gray-900">
                    {stats.average_reliability.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
            {stats.average_value && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Value for Money</span>
                <div className="flex items-center space-x-2">
                  <StarDisplay rating={stats.average_value} />
                  <span className="text-sm font-medium text-gray-900">
                    {stats.average_value.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}