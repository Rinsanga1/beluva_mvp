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
      apiLogger.error('Unauthorized attempt to access admin stats');
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Check if the user is an admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (userError || userData?.is_admin !== true) {
      apiLogger.error('Non-admin user attempted to access admin stats', {
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: { message: 'Forbidden: Admin access required' } },
        { status: 403 }
      );
    }

    // Get user count
    const { count: userCount, error: userCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userCountError) {
      apiLogger.error('Error fetching user count', { error: userCountError });
      return NextResponse.json(
        { error: { message: 'Failed to fetch admin statistics' } },
        { status: 500 }
      );
    }

    // Get session count
    const { count: sessionCount, error: sessionCountError } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true });

    if (sessionCountError) {
      apiLogger.error('Error fetching session count', { error: sessionCountError });
      return NextResponse.json(
        { error: { message: 'Failed to fetch admin statistics' } },
        { status: 500 }
      );
    }

    // Get furniture count
    const { count: furnitureCount, error: furnitureCountError } = await supabase
      .from('furniture_items')
      .select('*', { count: 'exact', head: true });

    if (furnitureCountError) {
      apiLogger.error('Error fetching furniture count', { error: furnitureCountError });
      return NextResponse.json(
        { error: { message: 'Failed to fetch admin statistics' } },
        { status: 500 }
      );
    }

    // Get design count (sessions with generated images)
    const { count: designCount, error: designCountError } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .not('generated_image_url', 'is', null);

    if (designCountError) {
      apiLogger.error('Error fetching design count', { error: designCountError });
      return NextResponse.json(
        { error: { message: 'Failed to fetch admin statistics' } },
        { status: 500 }
      );
    }

    // Get recent activity (new users, new sessions, new designs)
    // First, get recent user signups
    const { data: recentUsers, error: recentUsersError } = await supabase
      .from('users')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentUsersError) {
      apiLogger.error('Error fetching recent users', { error: recentUsersError });
      return NextResponse.json(
        { error: { message: 'Failed to fetch admin statistics' } },
        { status: 500 }
      );
    }

    // Then, get recent sessions with generated images
    const { data: recentDesigns, error: recentDesignsError } = await supabase
      .from('user_sessions')
      .select('id, user_id, created_at, users(id, name)')
      .not('generated_image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentDesignsError) {
      apiLogger.error('Error fetching recent designs', { error: recentDesignsError });
      return NextResponse.json(
        { error: { message: 'Failed to fetch admin statistics' } },
        { status: 500 }
      );
    }

    // Then, get recent room uploads
    const { data: recentUploads, error: recentUploadsError } = await supabase
      .from('room_images')
      .select('id, user_id, uploaded_at, users(id, name)')
      .order('uploaded_at', { ascending: false })
      .limit(5);

    if (recentUploadsError) {
      apiLogger.error('Error fetching recent uploads', { error: recentUploadsError });
      return NextResponse.json(
        { error: { message: 'Failed to fetch admin statistics' } },
        { status: 500 }
      );
    }

    // Format recent activity
    const recentActivity = [
      ...recentUsers.map(user => ({
        id: `signup-${user.id}`,
        type: 'signup' as const,
        user: { id: user.id, name: user.name },
        timestamp: user.created_at,
      })),
      ...recentDesigns.map(design => ({
        id: `design-${design.id}`,
        type: 'design' as const,
        user: { 
          id: design.user_id, 
          name: (design.users as any)?.name || 'Unknown User' 
        },
        timestamp: design.created_at,
      })),
      ...recentUploads.map(upload => ({
        id: `upload-${upload.id}`,
        type: 'upload' as const,
        user: { 
          id: upload.user_id, 
          name: (upload.users as any)?.name || 'Unknown User' 
        },
        timestamp: upload.uploaded_at,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

    // Return all stats
    apiLogger.info('Admin stats retrieved successfully');
    
    return NextResponse.json({
      success: true,
      data: {
        userCount: userCount || 0,
        sessionCount: sessionCount || 0,
        furnitureCount: furnitureCount || 0,
        designCount: designCount || 0,
        recentActivity,
      },
    });
  } catch (error: any) {
    apiLogger.error('Unexpected error fetching admin stats', { error });
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