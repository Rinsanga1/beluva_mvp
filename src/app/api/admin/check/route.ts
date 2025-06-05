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
      apiLogger.error('Unauthorized attempt to check admin status');
      return NextResponse.json(
        { 
          isAdmin: false,
          error: { message: 'Unauthorized' } 
        },
        { status: 401 }
      );
    }

    // Check if the user is an admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      apiLogger.error('Error fetching user data for admin check', { error: userError });
      return NextResponse.json(
        { 
          isAdmin: false,
          error: { message: 'Failed to verify admin status' } 
        },
        { status: 500 }
      );
    }

    // Return the admin status
    const isAdmin = userData?.is_admin === true;
    
    apiLogger.info('Admin status check', { 
      userId: session.user.id,
      isAdmin
    });
    
    return NextResponse.json({ isAdmin });
  } catch (error: any) {
    apiLogger.error('Unexpected error checking admin status', { error });
    return NextResponse.json(
      { 
        isAdmin: false,
        error: { 
          message: error.message || 'An unexpected error occurred',
          code: error.code || 'unknown_error'
        } 
      },
      { status: 500 }
    );
  }
}