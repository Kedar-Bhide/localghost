import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';

// ===== INLINED TYPES AND API =====
interface ItineraryRequestCreate {
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
  activity_level?: 'low' | 'moderate' | 'high';
  accommodation_preference?: string;
  transportation_preference?: string;
  dietary_restrictions?: string[];
  special_requirements?: string;
  is_public: boolean;
  urgency_level?: 'low' | 'medium' | 'high';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function createItineraryRequest(data: ItineraryRequestCreate) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const response = await fetch(`${API_BASE_URL}/itineraries/requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create itinerary request');
  }

  return response.json();
}

export default function CreateItineraryPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState<ItineraryRequestCreate>({
    title: '',
    description: '',
    destination_city: '',
    destination_country: '',
    start_date: '',
    end_date: '',
    group_size: 1,
    budget_min: undefined,
    budget_max: undefined,
    currency: 'USD',
    interests: [],
    activity_level: undefined,
    accommodation_preference: '',
    transportation_preference: '',
    dietary_restrictions: [],
    special_requirements: '',
    is_public: true,
    urgency_level: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commonInterests = [
    'Culture & History', 'Food & Dining', 'Nature & Wildlife', 'Adventure Sports',
    'Art & Museums', 'Shopping', 'Nightlife', 'Photography', 'Local Experiences',
    'Architecture', 'Music & Festivals', 'Wellness & Spa', 'Family Activities'
  ];

  const commonDietaryRestrictions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Dairy-Free',
    'Nut Allergies', 'Shellfish Allergies', 'Low Sodium', 'Diabetic-Friendly'
  ];

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? undefined : Number(value)
      }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests?.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...(prev.interests || []), interest]
    }));
  };

  const handleDietaryRestrictionToggle = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions?.includes(restriction)
        ? prev.dietary_restrictions.filter(r => r !== restriction)
        : [...(prev.dietary_restrictions || []), restriction]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (!formData.destination_city.trim()) {
      newErrors.destination_city = 'Destination city is required';
    }

    if (!formData.destination_country.trim()) {
      newErrors.destination_country = 'Destination country is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    } else if (formData.start_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      newErrors.end_date = 'End date must be after start date';
    }

    if (formData.group_size < 1 || formData.group_size > 20) {
      newErrors.group_size = 'Group size must be between 1 and 20';
    }

    if (formData.budget_min !== undefined && formData.budget_max !== undefined) {
      if (formData.budget_max <= formData.budget_min) {
        newErrors.budget_max = 'Maximum budget must be greater than minimum budget';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert dates to ISO format
      const submitData = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        interests: formData.interests?.length ? formData.interests : undefined,
        dietary_restrictions: formData.dietary_restrictions?.length ? formData.dietary_restrictions : undefined,
        accommodation_preference: formData.accommodation_preference?.trim() || undefined,
        transportation_preference: formData.transportation_preference?.trim() || undefined,
        special_requirements: formData.special_requirements?.trim() || undefined,
      };

      const result = await createItineraryRequest(submitData);

      // Redirect to the created request
      router.push(`/itineraries/${result.id}`);
    } catch (error) {
      console.error('Failed to create itinerary request:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create itinerary request'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Head>
        <title>Create Itinerary Request - LocalGhost</title>
        <meta name="description" content="Request a custom itinerary from local guides" />
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
              <Link href="/itineraries" className="text-neutral-600 hover:text-neutral-900">
                ← Back to Itineraries
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <div className="container-mobile md:container-tablet lg:container-desktop">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-neutral-900 mb-4">Create Itinerary Request</h1>
                <p className="text-lg text-neutral-600">
                  Tell local guides about your dream trip and receive custom itinerary proposals.
                </p>
              </div>

              {errors.submit && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-neutral-900">Basic Information</h2>

                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-2">
                      Trip Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g., Family Adventure in Tokyo"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                        errors.title ? 'border-red-300' : 'border-neutral-300'
                      }`}
                    />
                    {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Describe your ideal trip, what you want to see and do, and any specific preferences..."
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                        errors.description ? 'border-red-300' : 'border-neutral-300'
                      }`}
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="destination_city" className="block text-sm font-medium text-neutral-700 mb-2">
                        Destination City *
                      </label>
                      <input
                        type="text"
                        id="destination_city"
                        name="destination_city"
                        value={formData.destination_city}
                        onChange={handleInputChange}
                        placeholder="e.g., Tokyo"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                          errors.destination_city ? 'border-red-300' : 'border-neutral-300'
                        }`}
                      />
                      {errors.destination_city && <p className="mt-1 text-sm text-red-600">{errors.destination_city}</p>}
                    </div>

                    <div>
                      <label htmlFor="destination_country" className="block text-sm font-medium text-neutral-700 mb-2">
                        Destination Country *
                      </label>
                      <input
                        type="text"
                        id="destination_country"
                        name="destination_country"
                        value={formData.destination_country}
                        onChange={handleInputChange}
                        placeholder="e.g., Japan"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                          errors.destination_country ? 'border-red-300' : 'border-neutral-300'
                        }`}
                      />
                      {errors.destination_country && <p className="mt-1 text-sm text-red-600">{errors.destination_country}</p>}
                    </div>
                  </div>
                </div>

                {/* Trip Details */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-neutral-900">Trip Details</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="start_date" className="block text-sm font-medium text-neutral-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                          errors.start_date ? 'border-red-300' : 'border-neutral-300'
                        }`}
                      />
                      {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>}
                    </div>

                    <div>
                      <label htmlFor="end_date" className="block text-sm font-medium text-neutral-700 mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        id="end_date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        min={formData.start_date || new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                          errors.end_date ? 'border-red-300' : 'border-neutral-300'
                        }`}
                      />
                      {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>}
                    </div>

                    <div>
                      <label htmlFor="group_size" className="block text-sm font-medium text-neutral-700 mb-2">
                        Group Size *
                      </label>
                      <input
                        type="number"
                        id="group_size"
                        name="group_size"
                        value={formData.group_size}
                        onChange={handleInputChange}
                        min="1"
                        max="20"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                          errors.group_size ? 'border-red-300' : 'border-neutral-300'
                        }`}
                      />
                      {errors.group_size && <p className="mt-1 text-sm text-red-600">{errors.group_size}</p>}
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Budget Range (Optional)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <input
                          type="number"
                          name="budget_min"
                          value={formData.budget_min || ''}
                          onChange={handleInputChange}
                          placeholder="Minimum budget"
                          min="0"
                          step="50"
                          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          name="budget_max"
                          value={formData.budget_max || ''}
                          onChange={handleInputChange}
                          placeholder="Maximum budget"
                          min="0"
                          step="50"
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                            errors.budget_max ? 'border-red-300' : 'border-neutral-300'
                          }`}
                        />
                        {errors.budget_max && <p className="mt-1 text-sm text-red-600">{errors.budget_max}</p>}
                      </div>
                      <div>
                        <select
                          name="currency"
                          value={formData.currency}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="JPY">JPY</option>
                          <option value="AUD">AUD</option>
                          <option value="CAD">CAD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-neutral-900">Preferences</h2>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-3">
                      Interests (Select all that apply)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {commonInterests.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => handleInterestToggle(interest)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            formData.interests?.includes(interest)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary'
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="activity_level" className="block text-sm font-medium text-neutral-700 mb-2">
                        Activity Level
                      </label>
                      <select
                        id="activity_level"
                        name="activity_level"
                        value={formData.activity_level || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Select activity level</option>
                        <option value="low">Low - Relaxed pace</option>
                        <option value="moderate">Moderate - Some walking</option>
                        <option value="high">High - Active & adventurous</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="accommodation_preference" className="block text-sm font-medium text-neutral-700 mb-2">
                        Accommodation Preference
                      </label>
                      <input
                        type="text"
                        id="accommodation_preference"
                        name="accommodation_preference"
                        value={formData.accommodation_preference}
                        onChange={handleInputChange}
                        placeholder="e.g., Hotel, Ryokan, Airbnb"
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="transportation_preference" className="block text-sm font-medium text-neutral-700 mb-2">
                        Transportation Preference
                      </label>
                      <input
                        type="text"
                        id="transportation_preference"
                        name="transportation_preference"
                        value={formData.transportation_preference}
                        onChange={handleInputChange}
                        placeholder="e.g., Public transport, Private car"
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-3">
                      Dietary Restrictions (Select all that apply)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {commonDietaryRestrictions.map((restriction) => (
                        <button
                          key={restriction}
                          type="button"
                          onClick={() => handleDietaryRestrictionToggle(restriction)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            formData.dietary_restrictions?.includes(restriction)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary'
                          }`}
                        >
                          {restriction}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="special_requirements" className="block text-sm font-medium text-neutral-700 mb-2">
                      Special Requirements
                    </label>
                    <textarea
                      id="special_requirements"
                      name="special_requirements"
                      value={formData.special_requirements}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Any accessibility needs, special occasions, or other requirements..."
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Request Settings */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-neutral-900">Request Settings</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="urgency_level" className="block text-sm font-medium text-neutral-700 mb-2">
                        Urgency Level
                      </label>
                      <select
                        id="urgency_level"
                        name="urgency_level"
                        value={formData.urgency_level || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Select urgency</option>
                        <option value="low">Low - Flexible timing</option>
                        <option value="medium">Medium - Planning ahead</option>
                        <option value="high">High - Need soon</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_public"
                        name="is_public"
                        checked={formData.is_public}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-primary bg-white border-neutral-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <label htmlFor="is_public" className="ml-3 text-sm text-neutral-700">
                        Make this request public (other local guides can see and propose)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-neutral-200">
                  <Link href="/itineraries">
                    <button
                      type="button"
                      className="px-6 py-3 text-neutral-600 hover:text-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
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