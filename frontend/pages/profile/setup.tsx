import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

// ===== INLINED PROFILE TYPES & CONSTANTS =====
interface UserProfileUpdate {
  full_name?: string;
  bio?: string;
  phone_number?: string;
  nationality?: string;
  languages_spoken?: string[];
  interests?: string[];
  travel_style?: string;
  profile_picture_url?: string;
  profile_visibility?: 'public' | 'friends' | 'private';
  show_age?: boolean;
  show_location?: boolean;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  onboarding_completed?: boolean;
}

interface LocalProfileCreate {
  title: string;
  description: string;
  expertise_areas: string[];
  languages?: string[];
  max_group_size?: number;
  base_hourly_rate?: number;
  currency?: string;
  home_city: string;
  home_country: string;
  travel_radius_km?: number;
  services_offered?: string;
  fun_fact?: string;
  why_local_guide?: string;
  instagram_handle?: string;
  website_url?: string;
}

// Constants
const EXPERTISE_AREAS = [
  'food', 'art', 'history', 'culture', 'nightlife', 'shopping',
  'nature', 'architecture', 'music', 'photography', 'adventure',
  'family-friendly', 'luxury', 'budget', 'hidden-gems', 'local-life'
];

const COMMON_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Mandarin', 'Japanese', 'Korean', 'Arabic', 'Russian', 'Dutch',
  'Hindi', 'Turkish', 'Greek', 'Polish', 'Swedish', 'Danish', 'Norwegian'
];

const TRAVEL_STYLES = [
  'Luxury', 'Budget', 'Adventure', 'Cultural', 'Relaxed', 'Family',
  'Solo', 'Business', 'Backpacker', 'Foodie', 'Photography', 'Nature'
];

// Simple API functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function updateMyProfile(data: UserProfileUpdate): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update profile');
  return response.json();
}

async function createLocalProfile(data: LocalProfileCreate): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const response = await fetch(`${API_BASE_URL}/locals/profile`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create local profile');
  return response.json();
}

interface FormData {
  // Basic user profile
  full_name: string;
  bio: string;
  phone_number: string;
  nationality: string;
  languages_spoken: string[];
  interests: string[];
  travel_style: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  
  // Local profile (if role is 'local')
  title: string;
  description: string;
  expertise_areas: string[];
  local_languages: string[];
  home_city: string;
  home_country: string;
  max_group_size: number;
  base_hourly_rate: number;
  currency: string;
  travel_radius_km: number;
  services_offered: string;
  fun_fact: string;
  why_local_guide: string;
  instagram_handle: string;
  website_url: string;
}

const INITIAL_FORM_DATA: FormData = {
  full_name: '',
  bio: '',
  phone_number: '',
  nationality: '',
  languages_spoken: [],
  interests: [],
  travel_style: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  title: '',
  description: '',
  expertise_areas: [],
  local_languages: ['English'],
  home_city: '',
  home_country: '',
  max_group_size: 4,
  base_hourly_rate: 25,
  currency: 'USD',
  travel_radius_km: 50,
  services_offered: '',
  fun_fact: '',
  why_local_guide: '',
  instagram_handle: '',
  website_url: ''
};

export default function ProfileSetup() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);

  const isLocal = user?.role === 'local';
  const totalSteps = isLocal ? 4 : 2;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Pre-fill existing user data
    if (user.full_name) {
      setFormData(prev => ({
        ...prev,
        full_name: user.full_name,
      }));
    }
  }, [user, router]);

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleArrayField = (field: keyof FormData, value: string) => {
    const currentArray = formData[field] as string[];
    if (currentArray.includes(value)) {
      updateFormData({
        [field]: currentArray.filter(item => item !== value)
      });
    } else {
      updateFormData({
        [field]: [...currentArray, value]
      });
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.full_name && formData.bio && formData.nationality);
      case 2:
        return !!(formData.languages_spoken.length > 0 && formData.emergency_contact_name && formData.emergency_contact_phone);
      case 3:
        if (!isLocal) return true;
        return !!(formData.title && formData.description && formData.expertise_areas.length > 0 && formData.home_city && formData.home_country);
      case 4:
        if (!isLocal) return true;
        return !!(formData.why_local_guide);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Update user profile
      const userProfileData: UserProfileUpdate = {
        full_name: formData.full_name,
        bio: formData.bio,
        phone_number: formData.phone_number,
        nationality: formData.nationality,
        languages_spoken: formData.languages_spoken,
        interests: formData.interests,
        travel_style: formData.travel_style,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        onboarding_completed: true,
      };

      await updateMyProfile(userProfileData);

      // Create local profile if user is a local guide
      if (isLocal) {
        const localProfileData: LocalProfileCreate = {
          title: formData.title,
          description: formData.description,
          expertise_areas: formData.expertise_areas,
          languages: formData.local_languages,
          home_city: formData.home_city,
          home_country: formData.home_country,
          max_group_size: formData.max_group_size,
          base_hourly_rate: formData.base_hourly_rate,
          currency: formData.currency,
          travel_radius_km: formData.travel_radius_km,
          services_offered: formData.services_offered,
          fun_fact: formData.fun_fact,
          why_local_guide: formData.why_local_guide,
          instagram_handle: formData.instagram_handle,
          website_url: formData.website_url,
        };

        await createLocalProfile(localProfileData);
      }

      toast.success('Profile setup completed successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Profile setup error:', error);
      toast.error(error.message || 'Failed to setup profile');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Tell us about yourself</h2>
        <p className="text-gray-600">Help other users get to know you better</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) => updateFormData({ full_name: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
          placeholder="Your full name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bio *</label>
        <textarea
          value={formData.bio}
          onChange={(e) => updateFormData({ bio: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200 resize-none"
          placeholder="Tell us about yourself, your interests, and what you love about traveling..."
          maxLength={1000}
        />
        <p className="text-sm text-gray-500 mt-1">{formData.bio.length}/1000</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            value={formData.phone_number}
            onChange={(e) => updateFormData({ phone_number: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
            placeholder="+1 (555) 123-4567"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nationality *</label>
          <input
            type="text"
            value={formData.nationality}
            onChange={(e) => updateFormData({ nationality: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
            placeholder="e.g., American, British, Canadian"
          />
        </div>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Your preferences</h2>
        <p className="text-gray-600">Help us personalize your experience</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Languages You Speak *</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {COMMON_LANGUAGES.map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => handleArrayField('languages_spoken', language)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                formData.languages_spoken.includes(language)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {language}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Travel Style</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TRAVEL_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => updateFormData({ travel_style: style })}
              className={`px-4 py-2 rounded-lg border transition-all ${
                formData.travel_style === style
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Interests</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EXPERTISE_AREAS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => handleArrayField('interests', interest)}
              className={`px-3 py-2 rounded-lg border transition-all capitalize ${
                formData.interests.includes(interest)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {interest.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name *</label>
            <input
              type="text"
              value={formData.emergency_contact_name}
              onChange={(e) => updateFormData({ emergency_contact_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
              placeholder="Emergency contact name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone *</label>
            <input
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => updateFormData({ emergency_contact_phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderLocalProfile = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Your guide profile</h2>
        <p className="text-gray-600">Let travelers know what makes you special</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Professional Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => updateFormData({ title: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
          placeholder="e.g., Food Tour Guide, History Expert, Adventure Guide"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Service Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200 resize-none"
          placeholder="Describe the experiences you offer, your expertise, and what makes your tours unique..."
          maxLength={2000}
        />
        <p className="text-sm text-gray-500 mt-1">{formData.description.length}/2000</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Expertise Areas * (select at least 1)</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EXPERTISE_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => handleArrayField('expertise_areas', area)}
              className={`px-3 py-2 rounded-lg border transition-all capitalize ${
                formData.expertise_areas.includes(area)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {area.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Home City *</label>
          <input
            type="text"
            value={formData.home_city}
            onChange={(e) => updateFormData({ home_city: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
            placeholder="e.g., New York, Paris, Tokyo"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Home Country *</label>
          <input
            type="text"
            value={formData.home_country}
            onChange={(e) => updateFormData({ home_country: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
            placeholder="e.g., United States, France, Japan"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Group Size</label>
          <input
            type="number"
            min="1"
            max="20"
            value={formData.max_group_size}
            onChange={(e) => updateFormData({ max_group_size: parseInt(e.target.value) || 4 })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.base_hourly_rate}
            onChange={(e) => updateFormData({ base_hourly_rate: parseFloat(e.target.value) || 25 })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => updateFormData({ currency: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
            <option value="CAD">CAD</option>
            <option value="AUD">AUD</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderLocalDetails = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Final touches</h2>
        <p className="text-gray-600">Add personality to your profile</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Why did you become a local guide? *</label>
        <textarea
          value={formData.why_local_guide}
          onChange={(e) => updateFormData({ why_local_guide: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200 resize-none"
          placeholder="Share your passion for showing travelers your city..."
          maxLength={1000}
        />
        <p className="text-sm text-gray-500 mt-1">{formData.why_local_guide.length}/1000</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Services You Offer</label>
        <textarea
          value={formData.services_offered}
          onChange={(e) => updateFormData({ services_offered: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200 resize-none"
          placeholder="Walking tours, food experiences, photography sessions, cultural activities..."
          maxLength={1000}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fun Fact About You</label>
        <input
          type="text"
          value={formData.fun_fact}
          onChange={(e) => updateFormData({ fun_fact: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
          placeholder="Something interesting that makes you unique!"
          maxLength={500}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Instagram Handle</label>
          <input
            type="text"
            value={formData.instagram_handle}
            onChange={(e) => updateFormData({ instagram_handle: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
            placeholder="@yourusername"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
          <input
            type="url"
            value={formData.website_url}
            onChange={(e) => updateFormData({ website_url: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
            placeholder="https://yourwebsite.com"
          />
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfo();
      case 2:
        return renderPreferences();
      case 3:
        return isLocal ? renderLocalProfile() : null;
      case 4:
        return isLocal ? renderLocalDetails() : null;
      default:
        return null;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-xl font-bold text-white">LG</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-lg text-gray-600">Let's get you set up on LocalGhost</p>
        </div>

        {/* Progress bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm font-medium text-gray-600">{Math.round((currentStep / totalSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form content */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10">
            {renderStep()}

            {/* Navigation buttons */}
            <div className="flex justify-between items-center mt-10 pt-8 border-t border-gray-200">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  currentStep === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                ← Back
              </button>

              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  disabled={!validateStep(currentStep)}
                  className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                    validateStep(currentStep)
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !validateStep(currentStep)}
                  className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                    loading || !validateStep(currentStep)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}