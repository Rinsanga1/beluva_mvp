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
      apiLogger.error('Unauthorized attempt to access user history');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse the URL to get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    
    // Fetch the user's session history with pagination
    const { data: sessions, error: sessionsError, count } = await supabase
      .from('user_sessions')
      .select('*, room_images(*)', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sessionsError) {
      apiLogger.error('Error fetching user history', { error: sessionsError });
      return NextResponse.json(
        { error: { message: 'Failed to fetch history' } },
        { status: 500 }
      );
    }

    // For each session, fetch the furniture details for the selected items
    const sessionsWithDetails = await Promise.all(
      sessions.map(async (userSession) => {
        // Skip if no furniture items were selected
        if (!userSession.selected_furniture_ids?.length) {
          return {
            ...userSession,
            furniture_items: [],
          };
        }

        // Fetch furniture details
        const { data: furnitureItems, error: furnitureError } = await supabase
          .from('furniture_items')
          .select('id, name, price, image_urls')
          .in('id', userSession.selected_furniture_ids);

        if (furnitureError) {
          apiLogger.error('Error fetching furniture details for session', {
            error: furnitureError,
            sessionId: userSession.id,
          });
          return {
            ...userSession,
            furniture_items: [],
          };
        }

        return {
          ...userSession,
          furniture_items: furnitureItems,
        };
      })
    );

    // Return the user's session history
    apiLogger.info('User history retrieved successfully', {
      userId: session.user.id,
      sessionCount: count,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessionsWithDetails,
        pagination: {
          total: count,
          limit,
          offset,
          hasMore: count !== null && offset + limit < count,
        },
      },
    });
  } catch (error: any) {
    apiLogger.error('Unexpected error fetching user history', { error });
    return NextResponse.json(
      {
        error: {
          message: error.message || 'An unexpected error occurred',
          code: error.code || 'unknown_error',
        },
      },
      { status: 500 }
    );
  }
}