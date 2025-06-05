import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { apiLogger } from '@/lib/logger';
import { FurnitureUpdateSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current user from Supabase Auth
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      apiLogger.error('Unauthorized attempt to access furniture item');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const id = params.id;

    // Fetch the furniture item
    const { data: item, error } = await supabase
      .from('furniture_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      apiLogger.error('Error fetching furniture item', { error, id });
      return NextResponse.json(
        { error: { message: 'Furniture item not found' } },
        { status: 404 }
      );
    }

    // Return the furniture item
    apiLogger.info('Furniture item retrieved successfully', { id });
    
    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    apiLogger.error('Unexpected error fetching furniture item', { error });
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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current user from Supabase Auth
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      apiLogger.error('Unauthorized attempt to update furniture item');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Check if user is an admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (userError || userData?.is_admin !== true) {
      apiLogger.error('Non-admin user attempted to update furniture item', {
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: { message: 'Forbidden: Admin access required' } },
        { status: 403 }
      );
    }

    const id = params.id;

    // Parse and validate the request body
    const body = await request.json();
    const validationResult = FurnitureUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
      apiLogger.error('Furniture update validation failed', { errors: validationResult.error.errors });
      return NextResponse.json(
        { error: { message: errorMessage } },
        { status: 400 }
      );
    }
    
    const updateData = validationResult.data;

    // Check if the furniture item exists
    const { data: existingItem, error: checkError } = await supabase
      .from('furniture_items')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      apiLogger.error('Error checking furniture item existence', { error: checkError, id });
      return NextResponse.json(
        { error: { message: 'Furniture item not found' } },
        { status: 404 }
      );
    }

    // Update the furniture item
    const { data: updatedItem, error: updateError } = await supabase
      .from('furniture_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      apiLogger.error('Error updating furniture item', { error: updateError, id });
      return NextResponse.json(
        { error: { message: 'Failed to update furniture item' } },
        { status: 500 }
      );
    }

    // Return the updated furniture item
    apiLogger.success('Furniture item updated successfully', { id });
    
    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error: any) {
    apiLogger.error('Unexpected error updating furniture item', { error });
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current user from Supabase Auth
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      apiLogger.error('Unauthorized attempt to delete furniture item');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Check if user is an admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (userError || userData?.is_admin !== true) {
      apiLogger.error('Non-admin user attempted to delete furniture item', {
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: { message: 'Forbidden: Admin access required' } },
        { status: 403 }
      );
    }

    const id = params.id;

    // Check if the furniture item is referenced in any user sessions
    const { data: usedInSessions, error: sessionCheckError } = await supabase
      .from('user_sessions')
      .select('id')
      .contains('selected_furniture_ids', [id])
      .limit(1);

    if (sessionCheckError) {
      apiLogger.error('Error checking furniture usage in sessions', { error: sessionCheckError, id });
    } else if (usedInSessions && usedInSessions.length > 0) {
      apiLogger.error('Attempted to delete furniture item used in user sessions', { id });
      return NextResponse.json(
        { error: { message: 'Cannot delete furniture item that is used in user sessions' } },
        { status: 409 }
      );
    }

    // Delete the furniture item
    const { error: deleteError } = await supabase
      .from('furniture_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      apiLogger.error('Error deleting furniture item', { error: deleteError, id });
      return NextResponse.json(
        { error: { message: 'Failed to delete furniture item' } },
        { status: 500 }
      );
    }

    // Return success
    apiLogger.success('Furniture item deleted successfully', { id });
    
    return NextResponse.json({
      success: true,
      message: 'Furniture item deleted successfully',
    });
  } catch (error: any) {
    apiLogger.error('Unexpected error deleting furniture item', { error });
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