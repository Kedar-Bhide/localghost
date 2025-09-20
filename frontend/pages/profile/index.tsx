import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { profileApi, UserProfileResponse, LocalProfileResponse } from '../../lib/profileApi';
import toast from 'react-hot-toast';

export default function ProfileView() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [localProfile, setLocalProfile] = useState<LocalProfileResponse | null>(null);

  const isLocal = user?.role === 'local';

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadProfiles();
  }, [user, router]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      // Load user profile
      const userProfileData = await profileApi.getMyProfile();
      setUserProfile(userProfileData);

      // Load local profile if user is a local guide
      if (isLocal) {
        try {
          const localProfileData = await profileApi.getMyLocalProfile();
          setLocalProfile(localProfileData);
        } catch (error: any) {
          if (error.statusCode !== 404) {
            console.error('Error loading local profile:', error);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading profiles:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getVerificationStatus = () => {
    if (!userProfile) return 'incomplete';
    
    const hasBasicInfo = userProfile.full_name && userProfile.bio;
    const hasContact = userProfile.emergency_contact_name && userProfile.emergency_contact_phone;
    const hasOnboarded = userProfile.onboarding_completed;
    
    if (hasBasicInfo && hasContact && hasOnboarded) return 'complete';
    if (hasBasicInfo && hasOnboarded) return 'partial';
    return 'incomplete';
  };

  const renderProfileBadges = () => {
    if (!userProfile) return null;

    const badges = [];
    
    if (userProfile.is_email_verified) {
      badges.push(
        <span key="email" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Email Verified
        </span>
      );
    }
    
    if (userProfile.is_phone_verified) {
      badges.push(
        <span key="phone" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Phone Verified
        </span>
      );
    }
    
    if (localProfile?.is_verified) {
      badges.push(
        <span key="local-verified" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          ✓ Verified Guide
        </span>
      );
    }

    return badges.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {badges}
      </div>
    ) : null;
  };

  const renderUserProfileCard = () => {
    if (!userProfile) return null;

    const status = getVerificationStatus();
    const statusColors = {
      complete: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      incomplete: 'bg-red-100 text-red-800'
    };

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{userProfile.full_name}</h2>
            <p className="text-gray-600 mb-2">{userProfile.role} • {userProfile.email}</p>
            {renderProfileBadges()}
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
              {status === 'complete' && '✓ Complete'}
              {status === 'partial' && '⚠ Partial'}
              {status === 'incomplete' && '⚡ Incomplete'}
            </span>
          </div>
        </div>

        {userProfile.bio && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">About</h3>
            <p className="text-gray-700">{userProfile.bio}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userProfile.nationality && (
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Nationality</h4>
              <p className="text-gray-700">{userProfile.nationality}</p>
            </div>
          )}
          
          {userProfile.travel_style && (
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Travel Style</h4>
              <p className="text-gray-700">{userProfile.travel_style}</p>
            </div>
          )}
          
          {userProfile.languages_spoken && userProfile.languages_spoken.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Languages</h4>
              <div className="flex flex-wrap gap-1">
                {userProfile.languages_spoken.map((language) => (
                  <span key={language} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                    {language}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {userProfile.interests && userProfile.interests.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Interests</h4>
              <div className="flex flex-wrap gap-1">
                {userProfile.interests.map((interest) => (
                  <span key={interest} className="inline-flex items-center px-2 py-1 rounded text-xs bg-rose-100 text-rose-700 capitalize">
                    {interest.replace('-', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Member since {formatDate(userProfile.created_at)}</span>
            {userProfile.updated_at && (
              <span>Last updated {formatDate(userProfile.updated_at)}</span>
            )}
          </div>
        </div>

        <div className="mt-6 flex space-x-4">
          <button
            onClick={() => router.push('/profile/edit')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Edit Profile
          </button>
          
          {!userProfile.onboarding_completed && (
            <button
              onClick={() => router.push('/profile/setup')}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Complete Setup
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderLocalProfileCard = () => {
    if (!isLocal) return null;

    if (!localProfile) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center py-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Local Guide Profile</h3>
            <p className="text-gray-600 mb-6">You haven't set up your local guide profile yet.</p>
            <button
              onClick={() => router.push('/profile/setup')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Local Profile
            </button>
          </div>
        </div>
      );
    }

    const statusColors = {
      available: 'bg-green-100 text-green-800',
      unavailable: 'bg-gray-100 text-gray-800',
      busy: 'bg-yellow-100 text-yellow-800'
    };

    const availabilityStatus = localProfile.is_available ? 'available' : 'unavailable';

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{localProfile.title}</h2>
            <p className="text-gray-600 mb-2">{localProfile.home_city}, {localProfile.home_country}</p>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[availabilityStatus]}`}>
                {localProfile.is_available ? '● Available' : '● Unavailable'}
              </span>
              {localProfile.is_verified && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  ✓ Verified Guide
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-rose-600">
              {localProfile.average_rating > 0 ? localProfile.average_rating.toFixed(1) : 'New'}
            </div>
            <p className="text-sm text-gray-500">
              {localProfile.total_bookings} {localProfile.total_bookings === 1 ? 'booking' : 'bookings'}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
          <p className="text-gray-700">{localProfile.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Expertise Areas</h4>
            <div className="flex flex-wrap gap-1">
              {localProfile.expertise_areas.map((area) => (
                <span key={area} className="inline-flex items-center px-2 py-1 rounded text-xs bg-rose-100 text-rose-700 capitalize">
                  {area.replace('-', ' ')}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Languages</h4>
            <div className="flex flex-wrap gap-1">
              {localProfile.languages.map((language) => (
                <span key={language} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                  {language}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{localProfile.max_group_size}</div>
            <p className="text-sm text-gray-500">Max Group Size</p>
          </div>
          
          {localProfile.base_hourly_rate && (
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{localProfile.currency} {localProfile.base_hourly_rate}</div>
              <p className="text-sm text-gray-500">Per Hour</p>
            </div>
          )}
          
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{localProfile.travel_radius_km}km</div>
            <p className="text-sm text-gray-500">Travel Radius</p>
          </div>
          
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{localProfile.response_rate_percent}%</div>
            <p className="text-sm text-gray-500">Response Rate</p>
          </div>
        </div>

        {localProfile.why_local_guide && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Why I became a local guide</h4>
            <p className="text-gray-700">{localProfile.why_local_guide}</p>
          </div>
        )}

        {(localProfile.fun_fact || localProfile.services_offered) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {localProfile.fun_fact && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Fun Fact</h4>
                <p className="text-gray-700 italic">"{localProfile.fun_fact}"</p>
              </div>
            )}
            
            {localProfile.services_offered && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Services Offered</h4>
                <p className="text-gray-700">{localProfile.services_offered}</p>
              </div>
            )}
          </div>
        )}

        {(localProfile.instagram_handle || localProfile.website_url) && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Connect</h4>
            <div className="flex space-x-4">
              {localProfile.instagram_handle && (
                <a
                  href={`https://instagram.com/${localProfile.instagram_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 hover:text-rose-700 font-medium"
                >
                  Instagram
                </a>
              )}
              {localProfile.website_url && (
                <a
                  href={localProfile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 hover:text-rose-700 font-medium"
                >
                  Website
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between text-sm text-gray-500 mb-6">
          <span>Guide since {formatDate(localProfile.created_at)}</span>
          {localProfile.updated_at && (
            <span>Updated {formatDate(localProfile.updated_at)}</span>
          )}
        </div>

        <button
          onClick={() => router.push('/profile/edit')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Edit Guide Profile
        </button>
      </div>
    );
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-xl font-bold text-white">LG</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-lg text-gray-600">Manage your profile information and settings</p>
          </div>

          <div className="space-y-8">
            {renderUserProfileCard()}
            {renderLocalProfileCard()}
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