import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../../hooks/useAuth';

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
}

interface ProposalFormData {
  title: string;
  description: string;
  price_per_person: number;
  daily_itinerary: DailyActivity[];
  price_breakdown: PriceBreakdownItem[];
  included_services: string[];
  excluded_services: string[];
  terms_and_conditions: string;
  cancellation_policy: string;
}

export default function CreateProposal() {
  const router = useRouter();
  const { request_id } = router.query;
  const { user, isLoading: authLoading } = useAuth();
  const [request, setRequest] = useState<ItineraryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProposalFormData>({
    title: '',
    description: '',
    price_per_person: 0,
    daily_itinerary: [],
    price_breakdown: [],
    included_services: [],
    excluded_services: [],
    terms_and_conditions: '',
    cancellation_policy: ''
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'local')) {
      router.push('/auth/login');
      return;
    }

    if (request_id && user) {
      fetchRequestDetails();
    }
  }, [request_id, user, authLoading]);

  useEffect(() => {
    if (request) {
      // Initialize daily itinerary with empty days
      const initialItinerary: DailyActivity[] = [];
      for (let i = 0; i < request.duration_days; i++) {
        initialItinerary.push({
          time: '09:00',
          activity: '',
          location: '',
          description: '',
          cost: 0
        });
      }
      setFormData(prev => ({
        ...prev,
        daily_itinerary: initialItinerary,
        title: `Custom ${request.duration_days}-Day ${request.destination_city} Experience`
      }));
    }
  }, [request]);

  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/v1/itineraries/requests/${request_id}`, {
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

  const handleInputChange = (field: keyof ProposalFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleActivityChange = (dayIndex: number, field: keyof DailyActivity, value: any) => {
    setFormData(prev => ({
      ...prev,
      daily_itinerary: prev.daily_itinerary.map((activity, index) =>
        index === dayIndex ? { ...activity, [field]: value } : activity
      )
    }));
  };

  const addActivity = () => {
    setFormData(prev => ({
      ...prev,
      daily_itinerary: [
        ...prev.daily_itinerary,
        {
          time: '09:00',
          activity: '',
          location: '',
          description: '',
          cost: 0
        }
      ]
    }));
  };

  const removeActivity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      daily_itinerary: prev.daily_itinerary.filter((_, i) => i !== index)
    }));
  };

  const handlePriceBreakdownChange = (index: number, field: keyof PriceBreakdownItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      price_breakdown: prev.price_breakdown.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addPriceBreakdownItem = () => {
    setFormData(prev => ({
      ...prev,
      price_breakdown: [
        ...prev.price_breakdown,
        { category: '', description: '', amount: 0 }
      ]
    }));
  };

  const removePriceBreakdownItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      price_breakdown: prev.price_breakdown.filter((_, i) => i !== index)
    }));
  };

  const handleArrayChange = (field: 'included_services' | 'excluded_services', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: 'included_services' | 'excluded_services') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'included_services' | 'excluded_services', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.description.trim()) return 'Description is required';
    if (formData.price_per_person <= 0) return 'Price must be greater than 0';
    if (formData.daily_itinerary.length === 0) return 'At least one activity is required';

    for (let i = 0; i < formData.daily_itinerary.length; i++) {
      const activity = formData.daily_itinerary[i];
      if (!activity.activity.trim()) return `Activity ${i + 1} name is required`;
      if (!activity.location.trim()) return `Activity ${i + 1} location is required`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError && !saveAsDraft) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const proposalData = {
        request_id: request_id,
        ...formData,
        included_services: formData.included_services.filter(s => s.trim()),
        excluded_services: formData.excluded_services.filter(s => s.trim()),
        status: saveAsDraft ? 'draft' : 'submitted'
      };

      const response = await fetch('/api/v1/itineraries/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(proposalData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create proposal');
      }

      const createdProposal = await response.json();
      router.push(`/itineraries/proposals/${createdProposal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !request) {
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
        <title>Create Proposal - LocalGhost</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Back
            </button>

            <h1 className="text-3xl font-bold text-gray-900">Create Itinerary Proposal</h1>
            {request && (
              <p className="mt-2 text-lg text-gray-600">
                For: {request.title} in {request.destination_city}, {request.destination_country}
              </p>
            )}
          </div>

          {/* Request Summary */}
          {request && (
            <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Request Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      ${request.budget_min} - ${request.budget_max}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Requested by</dt>
                    <dd className="mt-1 text-sm text-gray-900">{request.traveler_name}</dd>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Proposal Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Give your proposal a compelling title"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description *
                    </label>
                    <textarea
                      id="description"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Describe your proposed itinerary and what makes it special"
                    />
                  </div>

                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                      Price per Person (USD) *
                    </label>
                    <input
                      type="number"
                      id="price"
                      value={formData.price_per_person}
                      onChange={(e) => handleInputChange('price_per_person', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Itinerary */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Daily Itinerary</h2>
                  <button
                    type="button"
                    onClick={addActivity}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                  >
                    Add Activity
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.daily_itinerary.map((activity, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">Activity {index + 1}</h4>
                        {formData.daily_itinerary.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeActivity(index)}
                            className="text-red-600 hover:text-red-500 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Time</label>
                          <input
                            type="time"
                            value={activity.time}
                            onChange={(e) => handleActivityChange(index, 'time', e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Cost (USD)</label>
                          <input
                            type="number"
                            value={activity.cost || ''}
                            onChange={(e) => handleActivityChange(index, 'cost', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Activity Name *</label>
                          <input
                            type="text"
                            value={activity.activity}
                            onChange={(e) => handleActivityChange(index, 'activity', e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="e.g., Visit local market"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Location *</label>
                          <input
                            type="text"
                            value={activity.location}
                            onChange={(e) => handleActivityChange(index, 'location', e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="e.g., Central Market"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            value={activity.description || ''}
                            onChange={(e) => handleActivityChange(index, 'description', e.target.value)}
                            rows={2}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Optional details about this activity"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Price Breakdown (Optional)</h2>
                  <button
                    type="button"
                    onClick={addPriceBreakdownItem}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                  >
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.price_breakdown.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) => handlePriceBreakdownChange(index, 'category', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Category (e.g., Transportation)"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handlePriceBreakdownChange(index, 'description', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Description"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => handlePriceBreakdownChange(index, 'amount', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Amount"
                        />
                        <button
                          type="button"
                          onClick={() => removePriceBreakdownItem(index)}
                          className="text-red-600 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Services</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Included Services */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Included Services</label>
                      <button
                        type="button"
                        onClick={() => addArrayItem('included_services')}
                        className="text-indigo-600 hover:text-indigo-500 text-sm"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.included_services.map((service, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={service}
                            onChange={(e) => handleArrayChange('included_services', index, e.target.value)}
                            className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="e.g., Airport pickup"
                          />
                          <button
                            type="button"
                            onClick={() => removeArrayItem('included_services', index)}
                            className="text-red-600 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Excluded Services */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Excluded Services</label>
                      <button
                        type="button"
                        onClick={() => addArrayItem('excluded_services')}
                        className="text-indigo-600 hover:text-indigo-500 text-sm"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.excluded_services.map((service, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={service}
                            onChange={(e) => handleArrayChange('excluded_services', index, e.target.value)}
                            className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="e.g., International flights"
                          />
                          <button
                            type="button"
                            onClick={() => removeArrayItem('excluded_services', index)}
                            className="text-red-600 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Policies */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Terms and Policies</h2>

                <div className="space-y-6">
                  <div>
                    <label htmlFor="terms" className="block text-sm font-medium text-gray-700">
                      Terms and Conditions
                    </label>
                    <textarea
                      id="terms"
                      rows={4}
                      value={formData.terms_and_conditions}
                      onChange={(e) => handleInputChange('terms_and_conditions', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Specify your terms and conditions"
                    />
                  </div>

                  <div>
                    <label htmlFor="cancellation" className="block text-sm font-medium text-gray-700">
                      Cancellation Policy
                    </label>
                    <textarea
                      id="cancellation"
                      rows={3}
                      value={formData.cancellation_policy}
                      onChange={(e) => handleInputChange('cancellation_policy', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Describe your cancellation policy"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={submitting}
                className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save as Draft'}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}