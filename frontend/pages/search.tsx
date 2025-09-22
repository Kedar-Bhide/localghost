import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

// ===== INLINED SEARCH TYPES AND API =====
interface LocalGuide {
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
  user?: {
    id: string;
    email: string;
    full_name: string;
    bio?: string;
    profile_picture_url?: string;
  };
}

interface SearchFilters {
  q?: string;
  city?: string;
  country?: string;
  expertise?: string;
  available_only: boolean;
  verified_only: boolean;
  min_rating?: number;
  max_distance_km?: number;
  latitude?: number;
  longitude?: number;
}

// API functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function searchLocalGuides(filters: SearchFilters, limit = 20, offset = 0): Promise<LocalGuide[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await fetch(`${API_BASE_URL}/locals/?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}

// Constants
const EXPERTISE_AREAS = [
  'food', 'art', 'history', 'culture', 'nightlife', 'shopping',
  'nature', 'architecture', 'music', 'photography', 'adventure',
  'family-friendly', 'luxury', 'budget', 'hidden-gems', 'local-life'
];

// Hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    available_only: true,
    verified_only: false,
  });
  const [results, setResults] = useState<LocalGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search query
  const debouncedQuery = useDebounce(searchQuery, 500);

  // Search function
  const performSearch = useCallback(async (searchFilters: SearchFilters) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const searchResults = await searchLocalGuides(searchFilters);
      setResults(searchResults);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Effect for real-time search
  useEffect(() => {
    if (user && (debouncedQuery || hasSearched)) {
      const searchFilters = { ...filters, q: debouncedQuery || undefined };
      performSearch(searchFilters);
    }
  }, [debouncedQuery, filters, performSearch, user, hasSearched]);

  // Initialize search from URL params
  useEffect(() => {
    if (router.isReady && user) {
      const { q, city, country, expertise } = router.query;
      if (q || city || country || expertise) {
        setSearchQuery((q as string) || '');
        setFilters(prev => ({
          ...prev,
          city: city as string,
          country: country as string,
          expertise: expertise as string,
        }));
      }
    }
  }, [router.isReady, router.query, user]);

  // Filter handlers
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      available_only: true,
      verified_only: false,
    });
    setSearchQuery('');
  };

  // Redirect if not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Search Local Guides - LocalGhost</title>
        <meta name="description" content="Find amazing local guides for your next adventure" />
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
        <div className="mb-8">
          <h1 className="text-headline md:text-headline-lg text-neutral-900 mb-2">
            Find Local Guides
          </h1>
          <p className="text-body text-neutral-600">
            Discover amazing local experts who will make your trip unforgettable
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-50 rounded-2xl p-6 sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:text-primary-hover"
                >
                  Clear all
                </button>
              </div>

              {/* Search Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search guides by name or bio..."
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Location Filters */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={filters.city || ''}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  placeholder="Enter city name"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={filters.country || ''}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  placeholder="Enter country name"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Expertise Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Expertise
                </label>
                <select
                  value={filters.expertise || ''}
                  onChange={(e) => handleFilterChange('expertise', e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All expertise areas</option>
                  {EXPERTISE_AREAS.map(area => (
                    <option key={area} value={area}>
                      {area.charAt(0).toUpperCase() + area.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Minimum Rating
                </label>
                <select
                  value={filters.min_rating || ''}
                  onChange={(e) => handleFilterChange('min_rating', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Any rating</option>
                  <option value="3">3+ stars</option>
                  <option value="4">4+ stars</option>
                  <option value="4.5">4.5+ stars</option>
                </select>
              </div>

              {/* Toggle Filters */}
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.available_only}
                    onChange={(e) => handleFilterChange('available_only', e.target.checked)}
                    className="w-4 h-4 text-primary bg-white border-neutral-300 rounded focus:ring-primary focus:ring-2"
                  />
                  <span className="ml-3 text-sm text-neutral-700">Available only</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.verified_only}
                    onChange={(e) => handleFilterChange('verified_only', e.target.checked)}
                    className="w-4 h-4 text-primary bg-white border-neutral-300 rounded focus:ring-primary focus:ring-2"
                  />
                  <span className="ml-3 text-sm text-neutral-700">Verified guides only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">
                  <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium">{error}</p>
                </div>
                <button
                  onClick={() => performSearch(filters)}
                  className="btn-primary"
                >
                  Try Again
                </button>
              </div>
            ) : !hasSearched ? (
              <div className="text-center py-12">
                <div className="text-neutral-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-lg">Start searching to find amazing local guides</p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-neutral-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">No guides found</p>
                  <p className="text-neutral-600">Try adjusting your search filters</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {results.length} guide{results.length !== 1 ? 's' : ''} found
                  </h2>
                </div>

                <div className="grid gap-6">
                  {results.map((guide) => (
                    <div key={guide.id} className="bg-white border border-neutral-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {guide.user?.profile_picture_url ? (
                            <img
                              src={guide.user.profile_picture_url}
                              alt={guide.user.full_name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xl font-bold text-white">
                                {guide.user?.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-neutral-900">
                              {guide.user?.full_name}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {guide.is_verified && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent-100 text-accent-800">
                                  ✓ Verified
                                </span>
                              )}
                              {guide.is_available && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Available
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 mb-3">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${i < Math.floor(guide.average_rating) ? 'text-yellow-400' : 'text-neutral-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              ))}
                              <span className="ml-2 text-sm text-neutral-600">
                                {guide.average_rating.toFixed(1)} ({guide.total_bookings} reviews)
                              </span>
                            </div>
                            <span className="text-sm text-neutral-600">
                              📍 {guide.home_city}, {guide.home_country}
                            </span>
                          </div>

                          {guide.user?.bio && (
                            <p className="text-neutral-600 mb-3 line-clamp-2">
                              {guide.user.bio}
                            </p>
                          )}

                          {guide.expertise_areas.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {guide.expertise_areas.slice(0, 3).map((area) => (
                                <span
                                  key={area}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800"
                                >
                                  {area.charAt(0).toUpperCase() + area.slice(1).replace('-', ' ')}
                                </span>
                              ))}
                              {guide.expertise_areas.length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                                  +{guide.expertise_areas.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-neutral-600">
                              <span>🗣️ {guide.languages.join(', ')}</span>
                              <span>⏱️ Responds in {guide.response_time_hours}h</span>
                            </div>
                            <Link
                              href={`/guides/${guide.id}`}
                              className="btn-primary"
                            >
                              View Profile
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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