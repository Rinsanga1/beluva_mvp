"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';

export default function VisualizationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, isAuthenticated, useMockUser } = useAuth();
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [furnitureDetails, setFurnitureDetails] = useState<Record<string, any>>({});
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [isMockImage, setIsMockImage] = useState(false);

  const imageId = searchParams?.get('imageId');
  const itemsParam = searchParams?.get('items');

  // Parse selected item IDs from URL params
  useEffect(() => {
    if (itemsParam) {
      setSelectedItems(itemsParam.split(','));
    }
  }, [itemsParam]);

  // Authentication check is disabled for AI testing
  // When auth is re-enabled, uncomment this code
  /*
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);
  */

  // Redirect if no image ID or items are provided
  useEffect(() => {
    if (!isLoading && (!imageId || !itemsParam)) {
      router.push('/dashboard');
    }
  }, [imageId, itemsParam, isLoading, router]);

  // Fetch room image details
  useEffect(() => {
    if (imageId) {
      // Check if we're using a mock image from local storage
      const mockParam = searchParams?.get('mockImage');
      if (mockParam === 'true') {
        const storedImage = localStorage.getItem('mockRoomImage');
        if (storedImage) {
          setRoomImage(storedImage);
          setIsMockImage(true);
          return;
        }
      }
      
      // For real images, fetch from API
      if (isAuthenticated || useMockUser) {
        const fetchRoomImage = async () => {
          try {
            // During testing mode, we don't actually fetch
            if (useMockUser) {
              // Use a placeholder image for testing
              setRoomImage('https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1000');
              return;
            }
            
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
    }
  }, [imageId, isAuthenticated, useMockUser, searchParams]);

  // Fetch furniture details for selected items
  useEffect(() => {
    if (selectedItems.length > 0) {
      const fetchFurnitureDetails = async () => {
        try {
          // Use mock data if in test mode
          if (useMockUser) {
            console.log('Test mode: Using mock furniture data');
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mock furniture data
            const mockFurniture = {
              'mock-item-1': {
                id: 'mock-item-1',
                name: 'Modern Sofa',
                description: 'Elegant modern sofa with clean lines and comfortable cushions',
                price: 1299.99,
                dimensions: '84" W x 38" D x 34" H',
                material: 'Premium fabric, solid wood frame',
                image_urls: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000'],
                category: 'sofa'
              },
              'mock-item-2': {
                id: 'mock-item-2',
                name: 'Mid-Century Armchair',
                description: 'Stylish mid-century inspired armchair with tufted back',
                price: 549.99,
                dimensions: '32" W x 34" D x 36" H',
                material: 'Velvet upholstery, walnut legs',
                image_urls: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1000'],
                category: 'chair'
              },
              'mock-item-3': {
                id: 'mock-item-3',
                name: 'Minimalist Coffee Table',
                description: 'Sleek coffee table with clean geometric design',
                price: 399.99,
                dimensions: '48" W x 24" D x 18" H',
                material: 'Tempered glass, metal frame',
                image_urls: ['https://images.unsplash.com/photo-1532372576444-dda954194ad0?q=80&w=1000'],
                category: 'table'
              }
            };
            
            // Filter to just the selected items
            const detailsMap: Record<string, any> = {};
            selectedItems.forEach(id => {
              // Use mock item if we have it, otherwise create a placeholder
              detailsMap[id] = mockFurniture[id] || {
                id,
                name: `Furniture Item ${id.slice(-5)}`,
                description: 'A beautiful piece of furniture for your home',
                price: Math.floor(Math.random() * 1000) + 200,
                image_urls: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1000'],
                category: 'furniture'
              };
            });
            
            setFurnitureDetails(detailsMap);
            return;
          }
          
          // Real API call for non-test mode
          const response = await fetch(`/api/furniture?ids=${selectedItems.join(',')}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch furniture details');
          }
          
          const data = await response.json();
          
          // Convert array to object with ID as key for easier access
          const detailsMap: Record<string, any> = {};
          data.data.forEach((item: any) => {
            detailsMap[item.id] = item;
          });
          
          setFurnitureDetails(detailsMap);
        } catch (error) {
          console.error('Error fetching furniture details:', error);
        }
      };
      
      fetchFurnitureDetails();
    }
  }, [selectedItems, isAuthenticated, useMockUser]);

  // Generate visualization
  const generateVisualization = async () => {
    if (!imageId || selectedItems.length === 0) return;
    
    setIsGenerating(true);
    setError(null);
    
    // For testing mode, use mock visualization
    if (useMockUser) {
      console.log('Test mode: Generating mock visualization');
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Use the room image as the "generated" image for testing
        // In a real app, this would be an AI-generated image
        const mockGeneratedImage = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1000';
        setGeneratedImage(mockGeneratedImage);
      } catch (error: any) {
        console.error('Error in mock visualization:', error);
        setError('Failed to generate test visualization');
      } finally {
        setIsGenerating(false);
      }
      return;
    }
    
    // Real API call for non-test mode
    try {
      const response = await fetch('/api/generate-room-visual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_image_id: imageId,
          furniture_item_ids: selectedItems,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate visualization');
      }
      
      const data = await response.json();
      setGeneratedImage(data.data.image_url);
    } catch (error: any) {
      console.error('Error generating visualization:', error);
      setError(error.message || 'An error occurred while generating the visualization');
    } finally {
      setIsGenerating(false);
    }
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
        <h2 className="text-2xl font-bold mb-6">Room Visualization</h2>
        
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h3 className="text-lg font-medium mb-4">Original Room</h3>
              {roomImage ? (
                <div className="relative w-full h-64 rounded-lg overflow-hidden">
                  <Image 
                    src={roomImage} 
                    alt="Your room" 
                    fill 
                    style={{ objectFit: 'cover' }} 
                    sizes="(max-width: 768px) 100vw, 500px"
                  />
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <p className="text-gray-500">Loading room image...</p>
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Selected Furniture</h3>
              
              {Object.keys(furnitureDetails).length > 0 ? (
                <div className="space-y-4">
                  {selectedItems.map(itemId => {
                    const item = furnitureDetails[itemId];
                    if (!item) return null;
                    
                    return (
                      <div key={itemId} className="flex items-start border-b pb-3">
                        <div className="relative h-16 w-16 flex-shrink-0 mr-4 rounded overflow-hidden">
                          {item.image_url && (
                            <Image
                              src={item.image_url}
                              alt={item.name}
                              fill
                              style={{ objectFit: 'cover' }}
                              sizes="64px"
                            />
                          )}
                        </div>
                        <div className="flex-grow">
                          <h4 className="text-sm font-medium">{item.name}</h4>
                          <p className="text-xs text-gray-500">{item.price ? `$${item.price.toFixed(2)}` : ''}</p>
                          <a
                            href={item.purchase_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:text-primary-800"
                          >
                            View Details
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Loading furniture details...</p>
              )}
              
              <div className="mt-6">
                <Link href={`/recommendations?imageId=${imageId}`} className="btn btn-outline w-full">
                  Change Selection
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Visualized Room</h3>
                
                {!generatedImage && !isGenerating && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={generateVisualization}
                    disabled={isGenerating || !roomImage || selectedItems.length === 0}
                  >
                    Generate Visualization
                  </button>
                )}
              </div>
              
              {isGenerating ? (
                <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Generating your visualization...</p>
                    <p className="text-xs text-gray-500 mt-2">This may take a minute or two</p>
                  </div>
                </div>
              ) : generatedImage ? (
                <div className="relative w-full h-96 rounded-lg overflow-hidden">
                  <Image 
                    src={generatedImage} 
                    alt="Visualized room with furniture" 
                    fill 
                    style={{ objectFit: 'cover' }} 
                    sizes="(max-width: 768px) 100vw, 700px"
                  />
                  
                  {/* Example hotspots - in a real app these would come from the API */}
                  {selectedItems.map((itemId, index) => {
                    // These are placeholder positions - would come from API in real app
                    const positions = [
                      { left: '20%', top: '50%' },
                      { left: '50%', top: '70%' },
                      { left: '70%', top: '30%' },
                      { left: '30%', top: '40%' },
                      { left: '60%', top: '60%' },
                    ];
                    
                    const pos = positions[index % positions.length];
                    const item = furnitureDetails[itemId];
                    
                    if (!item) return null;
                    
                    return (
                      <div 
                        key={itemId}
                        className={`absolute w-6 h-6 rounded-full bg-white border-2 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                          activeHotspot === itemId ? 'border-primary-500 scale-125' : 'border-primary-300'
                        }`}
                        style={{ left: pos.left, top: pos.top }}
                        onMouseEnter={() => setActiveHotspot(itemId)}
                        onMouseLeave={() => setActiveHotspot(null)}
                      >
                        <div className={`absolute z-10 bg-white p-3 rounded shadow-lg w-48 transition-opacity ${
                          activeHotspot === itemId ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                        style={{ 
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          marginBottom: '10px'
                        }}
                        >
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-gray-600 mt-1">${item.price?.toFixed(2)}</div>
                          <a
                            href={item.purchase_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:text-primary-800 mt-2 block"
                          >
                            View Product →
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No visualization yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Click "Generate Visualization" to see your room with the selected furniture.
                    </p>
                  </div>
                </div>
              )}
              
              {generatedImage && (
                <div className="mt-4 flex justify-between">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setGeneratedImage(null)}
                  >
                    Try Again
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      // In a real app, this would save to user's saved designs
                      alert('Design saved to your account!');
                    }}
                  >
                    Save Design
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}