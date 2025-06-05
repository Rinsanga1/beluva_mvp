import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { apiLogger } from '@/lib/logger';
import { z } from 'zod';
import { FurniturePlacementMetadataSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// Schema for batch operations
const BatchPlacementSchema = z.object({
  generated_image_id: z.string().uuid(),
  placements: z.array(
    z.object({
      furniture_id: z.string().uuid(),
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
  ),
});

export async function GET(request: Request) {
  try {
    // Get the current user from Supabase Auth
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      apiLogger.error('Unauthorized attempt to access furniture placement metadata');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse the URL to get query parameters
    const url = new URL(request.url);
    const generatedImageId = url.searchParams.get('generated_image_id');
    
    if (!generatedImageId) {
      apiLogger.error('Missing generated_image_id parameter');
      return NextResponse.json(
        { error: { message: 'Missing generated_image_id parameter' } },
        { status: 400 }
      );
    }

    // Get the user session to verify ownership
    const { data: userSession, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', generatedImageId)
      .single();

    if (sessionError) {
      apiLogger.error('Error fetching user session', { error: sessionError });
      return NextResponse.json(
        { error: { message: 'Generated image not found' } },
        { status: 404 }
      );
    }

    // Check if the user has permission to access this data
    if (userSession.user_id !== session.user.id) {
      apiLogger.error('User attempted to access another user\'s metadata', {
        userId: session.user.id,
        sessionOwnerId: userSession.user_id,
      });
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }

    // Fetch the furniture placement metadata
    const { data: placements, error: placementsError } = await supabase
      .from('furniture_placement_metadata')
      .select('*')
      .eq('generated_image_id', generatedImageId);

    if (placementsError) {
      apiLogger.error('Error fetching furniture placement metadata', { error: placementsError });
      return NextResponse.json(
        { error: { message: 'Failed to fetch placement metadata' } },
        { status: 500 }
      );
    }

    // Return the placement metadata
    apiLogger.info('Furniture placement metadata retrieved successfully', { 
      generatedImageId,
      count: placements.length
    });
    
    return NextResponse.json({
      success: true,
      data: placements,
    });
  } catch (error: any) {
    apiLogger.error('Unexpected error fetching furniture placement metadata', { error });
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

export async function POST(request: Request) {
  try {
    // Get the current user from Supabase Auth
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      apiLogger.error('Unauthorized attempt to create furniture placement metadata');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    
    // Check if this is a single placement or batch operation
    if (Array.isArray(body)) {
      // Handle batch placement (for admin tools)
      const validationResult = BatchPlacementSchema.safeParse(body);
      
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
        apiLogger.error('Batch placement validation failed', { errors: validationResult.error.errors });
        return NextResponse.json(
          { error: { message: errorMessage } },
          { status: 400 }
        );
      }
      
      const { generated_image_id, placements } = validationResult.data;
      
      // Verify ownership of the generated image
      const { data: userSession, error: sessionError } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('id', generated_image_id)
        .single();
        
      if (sessionError || userSession.user_id !== session.user.id) {
        apiLogger.error('User attempted to create metadata for another user\'s image', {
          userId: session.user.id,
          generatedImageId: generated_image_id,
        });
        return NextResponse.json(
          { error: { message: 'Unauthorized' } },
          { status: 403 }
        );
      }
      
      // Insert all placements
      const placementsToInsert = placements.map(p => ({
        ...p,
        generated_image_id,
      }));
      
      const { data: insertedPlacements, error: insertError } = await supabase
        .from('furniture_placement_metadata')
        .insert(placementsToInsert)
        .select();
        
      if (insertError) {
        apiLogger.error('Error inserting batch furniture placement metadata', { error: insertError });
        return NextResponse.json(
          { error: { message: 'Failed to create placement metadata' } },
          { status: 500 }
        );
      }
      
      apiLogger.success('Batch furniture placement metadata created', {
        generatedImageId: generated_image_id,
        count: insertedPlacements.length,
      });
      
      return NextResponse.json({
        success: true,
        data: insertedPlacements,
      }, { status: 201 });
    } else {
      // Handle single placement
      const validationResult = FurniturePlacementMetadataSchema.omit({ id: true }).safeParse(body);
      
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
        apiLogger.error('Placement validation failed', { errors: validationResult.error.errors });
        return NextResponse.json(
          { error: { message: errorMessage } },
          { status: 400 }
        );
      }
      
      const placementData = validationResult.data;
      
      // Verify ownership of the generated image
      const { data: userSession, error: sessionError } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('id', placementData.generated_image_id)
        .single();
        
      if (sessionError || userSession.user_id !== session.user.id) {
        apiLogger.error('User attempted to create metadata for another user\'s image', {
          userId: session.user.id,
          generatedImageId: placementData.generated_image_id,
        });
        return NextResponse.json(
          { error: { message: 'Unauthorized' } },
          { status: 403 }
        );
      }
      
      // Insert the placement metadata
      const { data: newPlacement, error: insertError } = await supabase
        .from('furniture_placement_metadata')
        .insert([placementData])
        .select()
        .single();
        
      if (insertError) {
        apiLogger.error('Error creating furniture placement metadata', { error: insertError });
        return NextResponse.json(
          { error: { message: 'Failed to create placement metadata' } },
          { status: 500 }
        );
      }
      
      apiLogger.success('Furniture placement metadata created', {
        id: newPlacement.id,
        generatedImageId: placementData.generated_image_id,
      });
      
      return NextResponse.json({
        success: true,
        data: newPlacement,
      }, { status: 201 });
    }
  } catch (error: any) {
    apiLogger.error('Unexpected error creating furniture placement metadata', { error });
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

export async function PUT(request: Request) {
  try {
    // Get the current user from Supabase Auth
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      apiLogger.error('Unauthorized attempt to update furniture placement metadata');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const validationResult = FurniturePlacementMetadataSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
      apiLogger.error('Placement update validation failed', { errors: validationResult.error.errors });
      return NextResponse.json(
        { error: { message: errorMessage } },
        { status: 400 }
      );
    }
    
    const placementData = validationResult.data;
    
    // Verify that the placement exists and belongs to this user
    const { data: existingPlacement, error: fetchError } = await supabase
      .from('furniture_placement_metadata')
      .select('generated_image_id')
      .eq('id', placementData.id)
      .single();
      
    if (fetchError) {
      apiLogger.error('Error fetching existing placement', { error: fetchError });
      return NextResponse.json(
        { error: { message: 'Placement not found' } },
        { status: 404 }
      );
    }
    
    // Verify ownership through the user session
    const { data: userSession, error: sessionError } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('id', existingPlacement.generated_image_id)
      .single();
      
    if (sessionError || userSession.user_id !== session.user.id) {
      apiLogger.error('User attempted to update another user\'s metadata', {
        userId: session.user.id,
        generatedImageId: existingPlacement.generated_image_id,
      });
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }
    
    // Update the placement metadata
    const { data: updatedPlacement, error: updateError } = await supabase
      .from('furniture_placement_metadata')
      .update({
        furniture_id: placementData.furniture_id,
        x: placementData.x,
        y: placementData.y,
        width: placementData.width,
        height: placementData.height,
      })
      .eq('id', placementData.id)
      .select()
      .single();
      
    if (updateError) {
      apiLogger.error('Error updating furniture placement metadata', { error: updateError });
      return NextResponse.json(
        { error: { message: 'Failed to update placement metadata' } },
        { status: 500 }
      );
    }
    
    apiLogger.success('Furniture placement metadata updated', {
      id: updatedPlacement.id,
    });
    
    return NextResponse.json({
      success: true,
      data: updatedPlacement,
    });
  } catch (error: any) {
    apiLogger.error('Unexpected error updating furniture placement metadata', { error });
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