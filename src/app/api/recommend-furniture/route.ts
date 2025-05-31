import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import llmService from '@/lib/llm-service';
import { RecommendationRequestSchema } from '@/lib/validations';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Get the current user from Supabase Auth
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      apiLogger.error('Unauthorized attempt to get furniture recommendations');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const result = RecommendationRequestSchema.safeParse(body);

    // Return validation errors if any
    if (!result.success) {
      const errorMessage = result.error.errors.map(e => e.message).join(', ');
      apiLogger.error('Recommendation request validation failed', { errors: result.error.errors });
      return NextResponse.json(
        { error: { message: errorMessage } },
        { status: 400 }
      );
    }

    const { room_image_id, budget, style, furniture_types } = result.data;

    // Get the room image from the database
    const { data: roomImage, error: roomImageError } = await supabase
      .from('room_images')
      .select('*')
      .eq('id', room_image_id)
      .single();

    if (roomImageError) {
      apiLogger.error('Error fetching room image for recommendation', { error: roomImageError });
      return NextResponse.json(
        { error: { message: 'Room image not found' } },
        { status: 404 }
      );
    }

    // Check if the user has permission to access this image
    if (roomImage.user_id !== session.user.id) {
      apiLogger.error('User attempted to get recommendations for another user\'s room image', {
        userId: session.user.id,
        imageOwnerId: roomImage.user_id,
        imageId: room_image_id,
      });
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }

    // Get the public URL for the image
    const { data: publicUrlData } = supabase.storage
      .from('room-uploads')
      .getPublicUrl(roomImage.file_path);

    const imageUrl = publicUrlData.publicUrl;

    // Create a prompt for the LLM
    const prompt = `
      You are an interior design AI assistant. Analyze the provided room image and recommend furniture items 
      that would complement the room. Consider the following constraints:
      
      - Total budget: $${budget}
      - Style preference: ${style || 'No specific style preference'}
      - Furniture types needed: ${furniture_types.join(', ')}
      
      Provide 5 specific furniture recommendations that:
      1. Match the aesthetic of the room
      2. Stay within budget
      3. Are appropriate for the size and layout of the room
      4. Complement existing furniture visible in the image
      
      For each recommendation, include:
      - Name of the item
      - Brief description
      - Estimated price
      - Reason why it would work well in this space
      
      Format your response as JSON with this structure:
      {
        "recommendations": [
          {
            "id": "unique-id-1",
            "name": "Item name",
            "description": "Brief description",
            "price": 299.99,
            "image_url": "https://example.com/image.jpg",
            "purchase_link": "https://example.com/product",
            "reason": "Why this works in the space"
          }
        ]
      }
    `;

    apiLogger.info('Requesting furniture recommendations from AI', {
      roomImageId: room_image_id,
      budget,
      style,
      furnitureTypes: furniture_types,
    });

    // Get recommendations from the LLM
    const imageAnalysisResponse = await llmService.analyzeImage({
      imageUrl,
      prompt,
      maxTokens: 2048,
    });

    // Parse the LLM response to extract the JSON
    let recommendations;
    try {
      // Find JSON in the response by looking for a pattern that matches JSON structure
      const jsonMatch = imageAnalysisResponse.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract recommendations from AI response');
      }
    } catch (parseError) {
      apiLogger.error('Error parsing AI recommendations', { error: parseError, aiResponse: imageAnalysisResponse.text });
      
      // Fallback to providing mock data in development environment
      if (process.env.NODE_ENV === 'development') {
        recommendations = {
          recommendations: [
            {
              id: 'mock-id-1',
              name: 'Mid-Century Modern Sofa',
              description: 'Elegant 3-seater sofa with wooden legs and light gray upholstery',
              price: 799.99,
              image_url: 'https://example.com/sofa.jpg',
              purchase_link: 'https://example.com/sofa',
              reason: 'The clean lines match your room\'s aesthetic and the neutral color will complement your existing decor.'
            },
            {
              id: 'mock-id-2',
              name: 'Round Coffee Table',
              description: 'Solid wood coffee table with storage shelf',
              price: 249.99,
              image_url: 'https://example.com/table.jpg',
              purchase_link: 'https://example.com/table',
              reason: 'The round shape works well with your seating arrangement and adds a nice contrast to the rectangular elements.'
            }
          ]
        };
      } else {
        return NextResponse.json(
          { error: { message: 'Failed to generate furniture recommendations' } },
          { status: 500 }
        );
      }
    }
    
    // Create a user session record to track this recommendation
    const { data: userSession, error: sessionError } = await supabase
      .from('user_sessions')
      .insert([
        {
          user_id: session.user.id,
          uploaded_image_id: room_image_id,
          selected_furniture_ids: [],
          preferences: {
            budget,
            style,
            furniture_types,
          },
        },
      ])
      .select()
      .single();

    if (sessionError) {
      apiLogger.error('Error creating user session record', { error: sessionError });
      // Continue anyway as this is non-critical
    }

    // Return the recommendations
    apiLogger.success('Furniture recommendations generated successfully', {
      roomImageId: room_image_id,
      recommendationCount: recommendations.recommendations.length,
    });
    
    return NextResponse.json({
      success: true,
      data: recommendations,
    });
  } catch (error: any) {
    apiLogger.error('Unexpected error generating furniture recommendations', { error });
    return NextResponse.json(
      { 
        error: { 
          message: error.message || 'An unexpected error occurred',
          code: error.code || 'unknown_error'
        } 
      },
      { status: 500 }
    );
  }
}