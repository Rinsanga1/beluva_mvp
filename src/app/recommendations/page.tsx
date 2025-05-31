"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';

type Recommendation = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  purchase_link: string;
  reason: string;
};

export default function RecommendationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState('1000');
  const [style, setStyle] = useState('modern');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const imageId = searchParams?.get('imageId');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Redirect if no image ID is provided
  useEffect(() => {
    if (!imageId && !isLoading) {
      router.push('/dashboard');
    }
  }, [imageId, isLoading, router]);

  // Fetch room image details
  useEffect(() => {
    if (imageId && isAuthenticated) {
      const fetchRoomImage = async () => {
        try {
          const response = await fetch(`/api/room-images/${imageId}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch room image');
          }
          
          const data = await response.json();
          setRoomImage(data.data.url);
        } catch (error) {
          console.error('Error fetching room image:', error);
          setError('Failed to load room image');
        }
      };
      
      fetchRoomImage();
    }
  }, [imageId, isAuthenticated]);

  const generateRecommendations = async () => {
    if (!imageId) return;
    
    setIsLoadingRecommendations(true);
    setError(null);
    
    try {
      const response = await fetch('/api/recommend-furniture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_image_id: imageId,
          budget: parseInt(budget),
          style: style,
          furniture_types: ['sofa', 'chair', 'table', 'lamp', 'rug'],
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate recommendations');
      }
      
      const data = await response.json();
      setRecommendations(data.data.recommendations);
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      setError(error.message || 'An error occurred while generating recommendations');
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleVisualize = () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one furniture item');
      return;
    }
    
    const queryParams = new URLSearchParams();
    queryParams.append('imageId', imageId as string);
    queryParams.append('items', selectedItems.join(','));
    
    router.push(`/visualization?${queryParams.toString()}`);
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
        <h2 className="text-2xl font-bold mb-6">Furniture Recommendations</h2>
        
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            {/* Room Image Preview */}
            {roomImage ? (
              <div className="bg-white p-4 rounded-lg shadow mb-6">
                <h3 className="text-lg font-medium mb-4">Your Room</h3>
                <div className="relative w-full h-64 rounded-lg overflow-hidden">
                  <Image 
                    src={roomImage} 
                    alt="Your room" 
                    fill 
                    style={{ objectFit: 'cover' }} 
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg shadow mb-6 flex items-center justify-center h-64">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Loading room image...</p>
                </div>
              </div>
            )}

            {/* Preferences Form */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Preferences</h3>
              
              <div className="mb-4">
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                  Budget (USD)
                </label>
                <select
                  id="budget"
                  className="input"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                >
                  <option value="500">Under $500</option>
                  <option value="1000">Under $1,000</option>
                  <option value="2000">Under $2,000</option>
                  <option value="5000">Under $5,000</option>
                  <option value="10000">Under $10,000</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-1">
                  Style
                </label>
                <select
                  id="style"
                  className="input"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  <option value="modern">Modern</option>
                  <option value="minimalist">Minimalist</option>
                  <option value="traditional">Traditional</option>
                  <option value="industrial">Industrial</option>
                  <option value="scandinavian">Scandinavian</option>
                  <option value="bohemian">Bohemian</option>
                  <option value="mid-century">Mid-Century</option>
                  <option value="rustic">Rustic</option>
                </select>
              </div>
              
              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={generateRecommendations}
                disabled={isLoadingRecommendations || !imageId}
              >
                {isLoadingRecommendations ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : 'Generate Recommendations'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            {/* Recommendations Display */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-medium">Recommended Furniture</h3>
                
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleVisualize}
                  disabled={selectedItems.length === 0}
                >
                  Visualize in Room
                </button>
              </div>
              
              {isLoadingRecommendations ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recommendations.map((item) => (
                    <div 
                      key={item.id} 
                      className={`border rounded-lg overflow-hidden ${
                        selectedItems.includes(item.id) ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-200'
                      }`}
                    >
                      <div className="relative h-48 w-full">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <h4 className="text-lg font-medium">{item.name}</h4>
                          <span className="font-medium text-gray-900">${item.price.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <div className="mt-3 bg-gray-50 p-2 rounded text-sm">
                          <p className="font-medium text-gray-700">Why this matches:</p>
                          <p className="text-gray-600">{item.reason}</p>
                        </div>
                        <div className="mt-4 flex justify-between">
                          <button
                            type="button"
                            className={`px-3 py-1 rounded-md text-sm font-medium ${
                              selectedItems.includes(item.id)
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            onClick={() => toggleItemSelection(item.id)}
                          >
                            {selectedItems.includes(item.id) ? 'Selected' : 'Select'}
                          </button>
                          <a
                            href={item.purchase_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                          >
                            View Product →
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No recommendations yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Set your preferences and click 'Generate Recommendations' to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}