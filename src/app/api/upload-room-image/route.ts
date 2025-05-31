import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { validateFile, uploadRoomImage } from '@/lib/storage/supabase-storage';
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
      apiLogger.error('Unauthorized attempt to upload image');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate that a file was provided
    if (!file) {
      apiLogger.error('No file provided in upload request');
      return NextResponse.json(
        { error: { message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate the file format and size
    const validation = validateFile(file);
    if (!validation.valid) {
      apiLogger.error('File validation failed', { error: validation.error });
      return NextResponse.json(
        { error: { message: validation.error?.message } },
        { status: 400 }
      );
    }

    // Upload the file to Supabase Storage
    const { path, id } = await uploadRoomImage(file, session.user.id);

    // Return success response with file details
    apiLogger.success('Room image uploaded successfully', { id, path });
    return NextResponse.json({
      success: true,
      data: {
        id,
        path,
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/room-uploads/${path}`,
      },
    });
  } catch (error: any) {
    apiLogger.error('Error during room image upload', { error });
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