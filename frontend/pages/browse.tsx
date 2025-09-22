import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

// ===== INLINED TYPES AND API =====
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

// API functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function browseLocalGuides(limit = 20, offset = 0): Promise<LocalGuide[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const params = new URLSearchParams({
    available_only: 'false', // Show all guides for browsing
    verified_only: 'false',
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/locals/?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Browse failed: ${response.statusText}`);
  }

  return response.json();
}

export default function BrowsePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [guides, setGuides] = useState<LocalGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const guidesPerPage = 12;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadGuides();
  }, [user, router]);

  const loadGuides = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * guidesPerPage;
      const newGuides = await browseLocalGuides(guidesPerPage, offset);

      if (page === 1) {
        setGuides(newGuides);
      } else {
        setGuides(prev => [...prev, ...newGuides]);
      }

      setHasMore(newGuides.length === guidesPerPage);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guides');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadGuides(currentPage + 1);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Browse Local Guides - LocalGhost</title>
        <meta name="description" content="Browse all local guides on LocalGhost" />
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
                Search
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
        <div className="mb-8">
          <h1 className="text-headline md:text-headline-lg text-neutral-900 mb-2">
            Browse Local Guides
          </h1>
          <p className="text-body text-neutral-600 mb-6">
            Discover amazing local experts from around the world
          </p>

          <div className="flex items-center space-x-4">
            <Link href="/search" className="btn-primary">
              Advanced Search
            </Link>
            <span className="text-neutral-600">
              or browse all guides below
            </span>
          </div>
        </div>

        {error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">{error}</p>
            </div>
            <button
              onClick={() => loadGuides(1)}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Guides Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {guides.map((guide) => (
                <div key={guide.id} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Avatar */}
                  <div className="p-6 pb-4">
                    <div className="flex items-center space-x-4 mb-4">
                      {guide.user?.profile_picture_url ? (
                        <img
                          src={guide.user.profile_picture_url}
                          alt={guide.user.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-white">
                            {guide.user?.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-neutral-900 truncate">
                          {guide.user?.full_name}
                        </h3>
                        <p className="text-sm text-neutral-600">
                          📍 {guide.home_city}, {guide.home_country}
                        </p>
                      </div>
                    </div>

                    {/* Rating & Status */}
                    <div className="flex items-center justify-between mb-3">
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
                          {guide.average_rating.toFixed(1)} ({guide.total_bookings})
                        </span>
                      </div>

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

                    {/* Bio */}
                    {guide.user?.bio && (
                      <p className="text-neutral-600 text-sm line-clamp-2 mb-4">
                        {guide.user.bio}
                      </p>
                    )}

                    {/* Expertise Tags */}
                    {guide.expertise_areas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
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
                            +{guide.expertise_areas.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Languages & Response Time */}
                    <div className="flex items-center justify-between text-sm text-neutral-600 mb-4">
                      <span>🗣️ {guide.languages.slice(0, 2).join(', ')}</span>
                      <span>⏱️ {guide.response_time_hours}h</span>
                    </div>

                    {/* View Profile Button */}
                    <Link
                      href={`/guides/${guide.id}`}
                      className="btn-primary w-full text-center"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-neutral-600">Loading guides...</span>
              </div>
            )}

            {/* Load More Button */}
            {!loading && hasMore && guides.length > 0 && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  className="btn-primary"
                >
                  Load More Guides
                </button>
              </div>
            )}

            {/* No More Results */}
            {!loading && !hasMore && guides.length > 0 && (
              <div className="text-center text-neutral-600 py-8">
                <p>You've seen all available guides!</p>
                <Link href="/search" className="text-primary hover:text-primary-hover">
                  Try searching with specific filters
                </Link>
              </div>
            )}

            {/* No Results */}
            {!loading && guides.length === 0 && (
              <div className="text-center py-12">
                <div className="text-neutral-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">No guides available</p>
                  <p className="text-neutral-600">Check back later for new local guides</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}