import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import llmService from '@/lib/llm-service';
import { RoomVisualizationRequestSchema } from '@/lib/validations';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

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
      apiLogger.error('Unauthorized attempt to generate room visualization');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const result = RoomVisualizationRequestSchema.safeParse(body);

    // Return validation errors if any
    if (!result.success) {
      const errorMessage = result.error.errors.map(e => e.message).join(', ');
      apiLogger.error('Room visualization request validation failed', { errors: result.error.errors });
      return NextResponse.json(
        { error: { message: errorMessage } },
        { status: 400 }
      );
    }

    const { room_image_id, furniture_item_ids } = result.data;

    // Get the room image from the database
    const { data: roomImage, error: roomImageError } = await supabase
      .from('room_images')
      .select('*')
      .eq('id', room_image_id)
      .single();

    if (roomImageError) {
      apiLogger.error('Error fetching room image for visualization', { error: roomImageError });
      return NextResponse.json(
        { error: { message: 'Room image not found' } },
        { status: 404 }
      );
    }

    // Check if the user has permission to access this image
    if (roomImage.user_id !== session.user.id) {
      apiLogger.error('User attempted to generate visualization for another user\'s room image', {
        userId: session.user.id,
        imageOwnerId: roomImage.user_id,
        imageId: room_image_id,
      });
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }

    // Get the public URL for the room image
    const { data: roomImageUrlData } = supabase.storage
      .from('room-uploads')
      .getPublicUrl(roomImage.file_path);

    const roomImageUrl = roomImageUrlData.publicUrl;

    // Get furniture details for the selected items
    const { data: furnitureItems, error: furnitureError } = await supabase
      .from('furniture_items')
      .select('*')
      .in('id', furniture_item_ids);

    if (furnitureError) {
      apiLogger.error('Error fetching furniture details', { error: furnitureError });
      return NextResponse.json(
        { error: { message: 'Failed to fetch furniture details' } },
        { status: 500 }
      );
    }

    // Format furniture details for the prompt
    const furnitureDetails = furnitureItems.map(item => {
      return `
        - ${item.name}: ${item.description}
        - Price: $${item.price}
        - Materials: ${item.material}
        - Image URL: ${item.image_urls[0] || 'Not provided'}
      `;
    }).join('\n');

    // Create a prompt for image generation
    const prompt = `
      Generate a realistic visualization of a room with specific furniture items placed in it.
      
      Room image: ${roomImageUrl}
      
      Furniture to place in the room:
      ${furnitureDetails}
      
      Instructions:
      1. Use the provided room image as the base
      2. Add the furniture items described above to the room in appropriate locations
      3. Make the result look realistic and to scale
      4. Maintain the original style and lighting of the room
      5. The output should be a single coherent image showing the room with all the new furniture items
      
      Generate a high-quality, realistic image that looks like a professional interior design visualization.
    `;

    apiLogger.info('Requesting room visualization from AI', {
      roomImageId: room_image_id,
      furnitureItemIds: furniture_item_ids,
    });

    // Generate the visualization using AI
    const imageGenerationResponse = await llmService.generateImage({
      prompt,
      width: 1024,
      height: 768,
    });

    // If the visualization was successfully generated
    if (imageGenerationResponse.imageUrl) {
      // Download the generated image to upload to Supabase
      const imageResponse = await fetch(imageGenerationResponse.imageUrl);
      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(imageArrayBuffer);
      
      // Generate a unique filename for the visualization
      const fileName = `${uuidv4()}.jpg`;
      const filePath = `${session.user.id}/${fileName}`;
      
      // Upload the visualization to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated-rooms')
        .upload(filePath, imageBuffer, {
          contentType: 'image/jpeg',
        });
        
      if (uploadError) {
        apiLogger.error('Error uploading visualization to storage', { error: uploadError });
        return NextResponse.json(
          { error: { message: 'Failed to save visualization' } },
          { status: 500 }
        );
      }
      
      // Get the public URL for the uploaded visualization
      const { data: visualizationUrlData } = supabase.storage
        .from('generated-rooms')
        .getPublicUrl(filePath);
        
      const visualizationUrl = visualizationUrlData.publicUrl;
      
      // Create or update user session
      const { data: userSession, error: sessionError } = await supabase
        .from('user_sessions')
        .upsert([
          {
            user_id: session.user.id,
            uploaded_image_id: room_image_id,
            selected_furniture_ids: furniture_item_ids,
            generated_image_url: visualizationUrl,
          },
        ])
        .select()
        .single();
        
      if (sessionError) {
        apiLogger.error('Error creating/updating user session', { error: sessionError });
        // Continue anyway as this is non-critical
      }
      
      // Return the visualization URL
      apiLogger.success('Room visualization generated successfully', {
        roomImageId: room_image_id,
        sessionId: userSession?.id,
      });
      
      return NextResponse.json({
        success: true,
        data: {
          url: visualizationUrl,
          session_id: userSession?.id,
        },
      });
    } else {
      apiLogger.error('Failed to generate room visualization', { 
        response: imageGenerationResponse,
      });
      
      return NextResponse.json(
        { error: { message: 'Failed to generate room visualization' } },
        { status: 500 }
      );
    }
  } catch (error: any) {
    apiLogger.error('Unexpected error generating room visualization', { error });
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