import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface ReviewFormProps {
  proposalId: string;
  proposalTitle: string;
  revieweeName: string;
  onSubmit: (reviewData: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ReviewForm({
  proposalId,
  proposalTitle,
  revieweeName,
  onSubmit,
  onCancel,
  loading = false
}: ReviewFormProps) {
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    content: '',
    communication_rating: null as number | null,
    knowledge_rating: null as number | null,
    reliability_rating: null as number | null,
    value_rating: null as number | null,
    is_public: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Review content is required';
    } else if (formData.content.length < 20) {
      newErrors.content = 'Review must be at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const reviewData = {
      proposal_id: proposalId,
      rating: formData.rating,
      title: formData.title.trim(),
      content: formData.content.trim(),
      communication_rating: formData.communication_rating,
      knowledge_rating: formData.knowledge_rating,
      reliability_rating: formData.reliability_rating,
      value_rating: formData.value_rating,
      is_public: formData.is_public
    };

    await onSubmit(reviewData);
  };

  const StarRating = ({
    value,
    onChange,
    label
  }: {
    value: number | null,
    onChange: (rating: number | null) => void,
    label: string
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-colors ${
              value && star <= value
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            ★
          </button>
        ))}
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Write a Review
        </h3>
        <p className="text-sm text-gray-600">
          Review your experience with <span className="font-medium">{revieweeName}</span> for
          "<span className="font-medium">{proposalTitle}</span>"
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Overall Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Overall Rating *
          </label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                className={`text-3xl transition-colors ${
                  star <= formData.rating
                    ? 'text-yellow-400 hover:text-yellow-500'
                    : 'text-gray-300 hover:text-gray-400'
                }`}
              >
                ★
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-600">
              {formData.rating} star{formData.rating !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Review Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
              errors.title
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
            }`}
            placeholder="e.g., Amazing local experience!"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Your Review *
          </label>
          <textarea
            id="content"
            rows={6}
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
              errors.content
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
            }`}
            placeholder="Share your experience in detail..."
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {formData.content.length} characters (minimum 20)
          </p>
        </div>

        {/* Aspect Ratings */}
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Detailed Ratings (Optional)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StarRating
              value={formData.communication_rating}
              onChange={(rating) => setFormData(prev => ({ ...prev, communication_rating: rating }))}
              label="Communication"
            />
            <StarRating
              value={formData.knowledge_rating}
              onChange={(rating) => setFormData(prev => ({ ...prev, knowledge_rating: rating }))}
              label="Local Knowledge"
            />
            <StarRating
              value={formData.reliability_rating}
              onChange={(rating) => setFormData(prev => ({ ...prev, reliability_rating: rating }))}
              label="Reliability"
            />
            <StarRating
              value={formData.value_rating}
              onChange={(rating) => setFormData(prev => ({ ...prev, value_rating: rating }))}
              label="Value for Money"
            />
          </div>
        </div>

        {/* Privacy Setting */}
        <div className="border-t pt-6">
          <div className="flex items-center">
            <input
              id="is_public"
              type="checkbox"
              checked={formData.is_public}
              onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
              Make this review public (others can see it on the user's profile)
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
}