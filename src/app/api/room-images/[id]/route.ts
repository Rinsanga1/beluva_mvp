import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the image ID from the URL parameters
    const id = params.id;

    // Get the current user from Supabase Auth
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      apiLogger.error('Unauthorized attempt to access room image');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get the room image from the database
    const { data: roomImage, error } = await supabase
      .from('room_images')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      apiLogger.error('Error fetching room image', { error, imageId: id });
      return NextResponse.json(
        { error: { message: 'Room image not found' } },
        { status: 404 }
      );
    }

    // Check if the user has permission to access this image
    if (roomImage.user_id !== session.user.id) {
      apiLogger.error('User attempted to access another user\'s room image', {
        userId: session.user.id,
        imageOwnerId: roomImage.user_id,
        imageId: id,
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

    // Return the room image data
    apiLogger.info('Room image retrieved successfully', { imageId: id });
    return NextResponse.json({
      success: true,
      data: {
        ...roomImage,
        url: publicUrlData.publicUrl,
      },
    });
  } catch (error: any) {
    apiLogger.error('Unexpected error fetching room image', { error });
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