import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';

// ===== INLINED TYPES AND API =====
interface UserLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state_province?: string;
  country: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  is_primary: boolean;
  is_public: boolean;
}

interface GuideUser {
  id: string;
  email: string;
  full_name: string;
  bio?: string;
  profile_picture_url?: string;
  nationality?: string;
  languages_spoken?: string[];
  interests?: string[];
  travel_style?: string;
  is_email_verified: boolean;
  locations?: UserLocation[];
}

interface LocalGuideProfile {
  id: string;
  user_id: string;
  title: string;
  description: string;
  expertise_areas: string[];
  languages: string[];
  is_available: boolean;
  max_group_size: number;
  response_time_hours: number;
  is_verified: boolean;
  background_check_status: string;
  base_hourly_rate?: number;
  currency: string;
  services_offered?: string;
  home_city: string;
  home_country: string;
  travel_radius_km: number;
  total_bookings: number;
  average_rating: number;
  response_rate_percent: number;
  fun_fact?: string;
  why_local_guide?: string;
  instagram_handle?: string;
  website_url?: string;
  created_at: string;
  updated_at?: string;
  user?: GuideUser;
}

// API functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function getLocalGuideProfile(guideId: string): Promise<LocalGuideProfile> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const response = await fetch(`${API_BASE_URL}/locals/${guideId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Guide not found');
    }
    if (response.status === 403) {
      throw new Error('This profile is private');
    }
    throw new Error(`Failed to load profile: ${response.statusText}`);
  }

  return response.json();
}

// Helper components
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`${sizeClasses[size]} ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-neutral-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ))}
    </div>
  );
}

function Badge({ children, variant = 'default', className = '' }: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'primary' | 'accent';
  className?: string;
}) {
  const variants = {
    default: 'bg-neutral-100 text-neutral-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    primary: 'bg-primary-100 text-primary-800',
    accent: 'bg-accent-100 text-accent-800',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default function GuideProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  const [profile, setProfile] = useState<LocalGuideProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (id && typeof id === 'string') {
      loadProfile(id);
    }
  }, [user, id, router]);

  const loadProfile = async (guideId: string) => {
    setLoading(true);
    setError(null);

    try {
      const profileData = await getLocalGuideProfile(guideId);
      setProfile(profileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleContact = () => {
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || sendingMessage || !profile) return;

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/chats/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          local_id: profile.id,
          initial_message: messageContent.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      const conversation = await response.json();
      setShowMessageModal(false);
      setMessageContent('');

      // Redirect to messages page
      router.push('/messages');
    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-neutral-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              {error || 'Profile not found'}
            </h1>
            <p className="text-neutral-600 mb-6">
              The local guide profile you're looking for doesn't exist or is not available.
            </p>
            <Link href="/search" className="btn-primary">
              Find Other Guides
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryLocation = profile.user?.locations?.find(loc => loc.is_primary) || profile.user?.locations?.[0];

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>{profile.user?.full_name} - Local Guide | LocalGhost</title>
        <meta name="description" content={`Connect with ${profile.user?.full_name}, a local guide in ${profile.home_city}, ${profile.home_country}`} />
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
              <Link href="/search" className="text-neutral-600 hover:text-neutral-900">
                ← Back to Search
              </Link>
              <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
                Dashboard
              </Link>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-mobile md:container-tablet lg:container-desktop py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2">
            {/* Hero Section */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8">
              <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {profile.user?.profile_picture_url ? (
                    <img
                      src={profile.user.profile_picture_url}
                      alt={profile.user.full_name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {profile.user?.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-3xl font-bold text-neutral-900">
                      {profile.user?.full_name}
                    </h1>
                    {profile.is_verified && (
                      <Badge variant="accent" className="text-sm">
                        ✓ Verified Guide
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center">
                      <StarRating rating={profile.average_rating} size="md" />
                      <span className="ml-2 text-lg font-medium text-neutral-900">
                        {profile.average_rating.toFixed(1)}
                      </span>
                      <span className="ml-1 text-neutral-600">
                        ({profile.total_bookings} reviews)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-neutral-600 mb-4">
                    <span className="flex items-center">
                      📍 {primaryLocation ? `${primaryLocation.city}, ${primaryLocation.country}` : `${profile.home_city}, ${profile.home_country}`}
                    </span>
                    <span className="flex items-center">
                      🗣️ {profile.languages.join(', ')}
                    </span>
                    <span className="flex items-center">
                      ⏱️ Responds in {profile.response_time_hours}h
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    {profile.is_available ? (
                      <Badge variant="success">Available Now</Badge>
                    ) : (
                      <Badge variant="warning">Currently Busy</Badge>
                    )}
                    <Badge variant="default">
                      {profile.response_rate_percent}% Response Rate
                    </Badge>
                    <Badge variant="default">
                      {profile.total_bookings} Completed Experiences
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">About {profile.user?.full_name}</h2>

              {profile.user?.bio && (
                <div className="mb-6">
                  <p className="text-neutral-700 leading-relaxed whitespace-pre-line">
                    {profile.user.bio}
                  </p>
                </div>
              )}

              {profile.why_local_guide && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">Why I became a local guide</h3>
                  <p className="text-neutral-700 leading-relaxed">
                    {profile.why_local_guide}
                  </p>
                </div>
              )}

              {profile.fun_fact && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">Fun fact</h3>
                  <p className="text-neutral-700 leading-relaxed">
                    {profile.fun_fact}
                  </p>
                </div>
              )}
            </div>

            {/* Expertise & Interests */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Expertise & Interests</h2>

              {profile.expertise_areas.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">Areas of Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.expertise_areas.map((area) => (
                      <Badge key={area} variant="primary">
                        {area.charAt(0).toUpperCase() + area.slice(1).replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.user?.interests && profile.user.interests.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">Personal Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.user.interests.map((interest) => (
                      <Badge key={interest} variant="default">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.services_offered && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">Services Offered</h3>
                  <p className="text-neutral-700 leading-relaxed">
                    {profile.services_offered}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Contact & Details */}
          <div className="lg:col-span-1">
            {/* Contact Card */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-6 sticky top-4">
              <div className="text-center mb-6">
                {profile.base_hourly_rate && (
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-neutral-900">
                      ${profile.base_hourly_rate}
                    </span>
                    <span className="text-neutral-600 ml-1">/{profile.currency} per hour</span>
                  </div>
                )}

                <button
                  onClick={handleContact}
                  className="btn-primary w-full mb-3"
                  disabled={!profile.is_available}
                >
                  {profile.is_available ? 'Send Message' : 'Currently Unavailable'}
                </button>

                <p className="text-sm text-neutral-600">
                  Usually responds within {profile.response_time_hours} hours
                </p>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4 border-t border-neutral-200 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Experience Level</span>
                  <span className="font-medium text-neutral-900">
                    {profile.total_bookings > 50 ? 'Expert' : profile.total_bookings > 20 ? 'Experienced' : 'New Guide'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Max Group Size</span>
                  <span className="font-medium text-neutral-900">
                    {profile.max_group_size} people
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Travel Radius</span>
                  <span className="font-medium text-neutral-900">
                    {profile.travel_radius_km} km
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Member Since</span>
                  <span className="font-medium text-neutral-900">
                    {new Date(profile.created_at).getFullYear()}
                  </span>
                </div>

                {profile.user?.is_email_verified && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Email Verified</span>
                    <Badge variant="success">✓</Badge>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {(profile.instagram_handle || profile.website_url) && (
                <div className="border-t border-neutral-200 pt-6 mt-6">
                  <h3 className="font-semibold text-neutral-900 mb-3">Connect</h3>
                  <div className="space-y-2">
                    {profile.instagram_handle && (
                      <a
                        href={`https://instagram.com/${profile.instagram_handle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-neutral-600 hover:text-primary transition-colors"
                      >
                        <span className="mr-2">📷</span>
                        @{profile.instagram_handle.replace('@', '')}
                      </a>
                    )}
                    {profile.website_url && (
                      <a
                        href={profile.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-neutral-600 hover:text-primary transition-colors"
                      >
                        <span className="mr-2">🌐</span>
                        Website
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Location Card */}
            {primaryLocation && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h3 className="font-semibold text-neutral-900 mb-4">Location</h3>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="text-neutral-600 mr-2">📍</span>
                    <div>
                      <p className="font-medium text-neutral-900">{primaryLocation.city}</p>
                      <p className="text-neutral-600 text-sm">
                        {primaryLocation.state_province && `${primaryLocation.state_province}, `}
                        {primaryLocation.country}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Send Message to {profile.user?.full_name}
            </h3>

            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Hi! I'm interested in connecting with you as a local guide..."
              className="w-full p-3 border border-neutral-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={4}
              disabled={sendingMessage}
            />

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageContent('');
                }}
                className="px-4 py-2 text-neutral-600 hover:text-neutral-800 transition-colors"
                disabled={sendingMessage}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || sendingMessage}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}