import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get the current user from Supabase Auth
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      apiLogger.error('Unauthorized attempt to access furniture data');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse the URL to get query parameters
    const url = new URL(request.url);
    const ids = url.searchParams.get('ids');
    const category = url.searchParams.get('category');
    const searchTerm = url.searchParams.get('search');
    
    // Start building the query
    let query = supabase.from('furniture_items').select('*');
    
    // Apply filters based on query parameters
    if (ids) {
      const idArray = ids.split(',');
      query = query.in('id', idArray);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`);
    }
    
    // Execute the query
    const { data: furnitureItems, error } = await query;

    if (error) {
      apiLogger.error('Error fetching furniture items', { error });
      return NextResponse.json(
        { error: { message: 'Failed to fetch furniture items' } },
        { status: 500 }
      );
    }

    // Return the furniture items
    apiLogger.info('Furniture items retrieved successfully', { 
      count: furnitureItems.length,
      filters: { ids, category, searchTerm }
    });
    
    return NextResponse.json({
      success: true,
      data: furnitureItems,
    });
  } catch (error: any) {
    apiLogger.error('Unexpected error fetching furniture items', { error });
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

    // Check if user is authenticated and is an admin
    if (!session?.user) {
      apiLogger.error('Unauthorized attempt to create furniture item');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }
    
    // Check if user is an admin (you would need to implement this check)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();
      
    if (userError || !userData?.is_admin) {
      apiLogger.error('Non-admin user attempted to create furniture item', {
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: { message: 'Forbidden: Admin access required' } },
        { status: 403 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    
    // Insert the new furniture item
    const { data: newItem, error: insertError } = await supabase
      .from('furniture_items')
      .insert([body])
      .select()
      .single();

    if (insertError) {
      apiLogger.error('Error creating furniture item', { error: insertError });
      return NextResponse.json(
        { error: { message: 'Failed to create furniture item' } },
        { status: 500 }
      );
    }

    // Return the new furniture item
    apiLogger.success('Furniture item created successfully', { id: newItem.id });
    
    return NextResponse.json({
      success: true,
      data: newItem,
    }, { status: 201 });
  } catch (error: any) {
    apiLogger.error('Unexpected error creating furniture item', { error });
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