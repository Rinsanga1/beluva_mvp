import { NextResponse } from 'next/server';

// Sample furniture data for mock recommendations
const mockFurnitureItems = [
  {
    id: 'mock-item-1',
    name: 'Modern Sofa',
    description: 'Elegant modern sofa with clean lines and comfortable cushions',
    price: 1299.99,
    dimensions: '84" W x 38" D x 34" H',
    material: 'Premium fabric, solid wood frame',
    tags: ['living room', 'modern', 'sofa'],
    image_urls: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1000'
    ],
    stock_status: true,
    category: 'sofa',
    purchase_link: 'https://example.com/furniture/sofa1'
  },
  {
    id: 'mock-item-2',
    name: 'Mid-Century Armchair',
    description: 'Stylish mid-century inspired armchair with tufted back',
    price: 549.99,
    dimensions: '32" W x 34" D x 36" H',
    material: 'Velvet upholstery, walnut legs',
    tags: ['living room', 'mid-century', 'chair'],
    image_urls: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1000',
      'https://images.unsplash.com/photo-1589584649628-b597067e07a3?q=80&w=1000'
    ],
    stock_status: true,
    category: 'chair',
    purchase_link: 'https://example.com/furniture/chair1'
  },
  {
    id: 'mock-item-3',
    name: 'Minimalist Coffee Table',
    description: 'Sleek coffee table with clean geometric design',
    price: 399.99,
    dimensions: '48" W x 24" D x 18" H',
    material: 'Tempered glass, metal frame',
    tags: ['living room', 'minimalist', 'table'],
    image_urls: [
      'https://images.unsplash.com/photo-1532372576444-dda954194ad0?q=80&w=1000',
      'https://images.unsplash.com/photo-1565374395542-0ce18882c857?q=80&w=1000'
    ],
    stock_status: true,
    category: 'table',
    purchase_link: 'https://example.com/furniture/table1'
  },
  {
    id: 'mock-item-4',
    name: 'Scandinavian Floor Lamp',
    description: 'Elegant floor lamp with adjustable height and warm lighting',
    price: 199.99,
    dimensions: '15" Diameter x 60-72" H',
    material: 'Metal base, linen shade',
    tags: ['lighting', 'scandinavian', 'lamp'],
    image_urls: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=1000'
    ],
    stock_status: true,
    category: 'lighting',
    purchase_link: 'https://example.com/furniture/lamp1'
  },
  {
    id: 'mock-item-5',
    name: 'Geometric Area Rug',
    description: 'Contemporary rug with geometric pattern to define your space',
    price: 249.99,
    dimensions: '5\' x 8\'',
    material: 'Hand-tufted wool blend',
    tags: ['decor', 'contemporary', 'rug'],
    image_urls: [
      'https://images.unsplash.com/photo-1575414003880-7a921fa2062c?q=80&w=1000',
      'https://images.unsplash.com/photo-1584954597639-9e61d5cd3485?q=80&w=1000'
    ],
    stock_status: true,
    category: 'decor',
    purchase_link: 'https://example.com/furniture/rug1'
  },
  {
    id: 'mock-item-6',
    name: 'Floating Wall Shelf',
    description: 'Minimalist floating shelf for displaying decor',
    price: 89.99,
    dimensions: '36" W x 10" D x 2" H',
    material: 'Solid wood with invisible mounting',
    tags: ['decor', 'shelf', 'storage'],
    image_urls: [
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1000',
      'https://images.unsplash.com/photo-1588928781149-a2c89c605574?q=80&w=1000'
    ],
    stock_status: true,
    category: 'storage',
    purchase_link: 'https://example.com/furniture/shelf1'
  }
];

export async function GET(request: Request) {
  // Extract query parameters
  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get('imageId');
  const style = searchParams.get('style') || 'modern';
  const budget = searchParams.get('budget') || '2000';
  
  console.log('Mock recommendations requested for:', { imageId, style, budget });
  
  // Simulate API processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Filter based on style and budget if provided
  const filteredItems = mockFurnitureItems.filter(item => {
    // Simple style matching
    const matchesStyle = item.tags.some(tag => tag.includes(style.toLowerCase()));
    
    // Budget filtering
    const matchesBudget = item.price <= parseFloat(budget);
    
    return matchesStyle && matchesBudget;
  });
  
  // If no items match the filters, return some default items
  const recommendations = filteredItems.length > 0 ? filteredItems : mockFurnitureItems.slice(0, 3);
  
  // Add AI-generated reasoning for each recommendation
  const enhancedRecommendations = recommendations.map(item => ({
    ...item,
    ai_reasoning: `This ${item.name} would complement your room perfectly with its ${item.tags.join(', ')} style. The ${item.material} construction ensures durability while maintaining aesthetic appeal. Its dimensions (${item.dimensions}) would fit well in the space shown in your image.`,
    confidence_score: (Math.random() * 0.3 + 0.7).toFixed(2) // Random score between 0.7 and 1.0
  }));
  
  return NextResponse.json({
    success: true,
    data: {
      recommendations: enhancedRecommendations,
      room_analysis: {
        detected_style: style,
        room_type: 'Living Room',
        color_palette: ['#E0E0E0', '#C0C0C0', '#A0A0A0', '#FFFFFF'],
        dimensions_estimate: 'Approximately 12\' x 14\'',
        suggested_budget_range: `$${parseInt(budget) - 500} - $${parseInt(budget) + 500}`,
        ai_notes: "The room has good natural light and an open layout. I'd recommend furniture pieces that complement this openness while providing functional seating and surface areas."
      },
      metadata: {
        processed_at: new Date().toISOString(),
        image_id: imageId,
        request_id: `mock-req-${Date.now()}`,
        processing_time_ms: Math.floor(Math.random() * 500) + 1000,
      }
    }
  });
}

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { imageId, preferences } = body;
    
    console.log('Mock recommendations POST request:', { imageId, preferences });
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return the same mock data as GET but with a success message
    return NextResponse.json({
      success: true,
      data: {
        recommendations: mockFurnitureItems.slice(0, 4).map(item => ({
          ...item,
          ai_reasoning: `Based on your preferences, this ${item.name} would be an excellent addition to your space. It matches your ${preferences?.style || 'preferred'} style and fits within your budget constraints.`,
          confidence_score: (Math.random() * 0.3 + 0.7).toFixed(2)
        })),
        room_analysis: {
          detected_style: preferences?.style || 'modern',
          room_type: 'Living Room',
          color_palette: ['#E0E0E0', '#C0C0C0', '#A0A0A0', '#FFFFFF'],
          dimensions_estimate: 'Approximately 12\' x 14\'',
          suggested_budget_range: `$${preferences?.budget ? parseInt(preferences.budget) - 500 : 1500} - $${preferences?.budget ? parseInt(preferences.budget) + 500 : 2500}`,
          ai_notes: "I've analyzed your room and preferences to find pieces that will enhance your space while maintaining your desired aesthetic."
        },
        metadata: {
          processed_at: new Date().toISOString(),
          image_id: imageId,
          request_id: `mock-req-${Date.now()}`,
          processing_time_ms: Math.floor(Math.random() * 500) + 1000,
        }
      }
    });
  } catch (error) {
    console.error('Error in mock recommendations POST:', error);
    return NextResponse.json(
      { error: { message: 'Failed to process recommendations request' } },
      { status: 400 }
    );
  }
}