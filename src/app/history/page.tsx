"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';

type HistorySession = {
  id: string;
  created_at: string;
  generated_image_url: string | null;
  room_images: {
    id: string;
    file_path: string;
    url: string;
  };
  furniture_items: Array<{
    id: string;
    name: string;
    price: number;
    image_urls: string[];
  }>;
};

export default function HistoryPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalSessions, setTotalSessions] = useState(0);
  
  const limit = 6; // Number of sessions per page

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch user's session history
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions(currentPage);
    }
  }, [isAuthenticated, currentPage]);

  const fetchSessions = async (page: number) => {
    setIsLoadingSessions(true);
    setError(null);
    
    try {
      const offset = page * limit;
      const response = await fetch(`/api/user/history?limit=${limit}&offset=${offset}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch history');
      }
      
      const data = await response.json();
      
      if (page === 0) {
        setSessions(data.data.sessions);
      } else {
        setSessions(prev => [...prev, ...data.data.sessions]);
      }
      
      setHasMore(data.data.pagination.hasMore);
      setTotalSessions(data.data.pagination.total);
    } catch (error: any) {
      console.error('Error fetching session history:', error);
      setError(error.message || 'An error occurred while fetching your history');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadMore = () => {
    if (!isLoadingSessions && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-serif font-bold text-gray-900">Beluva Interiors</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user?.name}</span>
              </div>
              <Link href="/dashboard" className="btn btn-outline text-sm">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Design History</h2>
          <Link href="/dashboard" className="btn btn-primary">
            Create New Design
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {sessions.length === 0 && !isLoadingSessions ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No history found</h3>
            <p className="mt-1 text-sm text-gray-500">
              You haven't created any designs yet. Get started by uploading a room image.
            </p>
            <div className="mt-6">
              <Link href="/dashboard" className="btn btn-primary">
                Upload Room Image
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="relative h-48 w-full">
                  {session.generated_image_url ? (
                    <Image
                      src={session.generated_image_url}
                      alt="Visualized room"
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : session.room_images?.url ? (
                    <Image
                      src={session.room_images.url}
                      alt="Original room"
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium">
                      {session.generated_image_url ? 'Visualized Room' : 'Room Upload'}
                    </h3>
                    <p className="text-xs text-gray-500">{formatDate(session.created_at)}</p>
                  </div>
                  
                  {session.furniture_items?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-2">{session.furniture_items.length} furniture items selected</p>
                      <div className="flex -space-x-2 overflow-hidden">
                        {session.furniture_items.slice(0, 5).map((item) => (
                          <div key={item.id} className="relative inline-block h-8 w-8 rounded-full border border-white">
                            {item.image_urls?.[0] ? (
                              <Image
                                src={item.image_urls[0]}
                                alt={item.name}
                                fill
                                style={{ objectFit: 'cover' }}
                                className="rounded-full"
                                sizes="32px"
                              />
                            ) : (
                              <div className="h-full w-full bg-gray-200 rounded-full"></div>
                            )}
                          </div>
                        ))}
                        {session.furniture_items.length > 5 && (
                          <div className="relative inline-block h-8 w-8 rounded-full border border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                            +{session.furniture_items.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-between">
                    {session.generated_image_url ? (
                      <Link 
                        href={`/visualization?imageId=${session.room_images.id}&items=${session.furniture_items.map(item => item.id).join(',')}`}
                        className="btn btn-primary w-full"
                      >
                        View Design
                      </Link>
                    ) : (
                      <Link 
                        href={`/recommendations?imageId=${session.room_images.id}`}
                        className="btn btn-primary w-full"
                      >
                        Continue Design
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={loadMore}
              disabled={isLoadingSessions}
              className="btn btn-outline"
            >
              {isLoadingSessions ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                `Load More (${sessions.length} of ${totalSessions})`
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}