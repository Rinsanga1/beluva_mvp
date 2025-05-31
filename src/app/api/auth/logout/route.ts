import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { authLogger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Sign out the user from Supabase Auth
    const { error } = await supabase.auth.signOut();

    if (error) {
      authLogger.error('Logout failed', { error: error.message });
      return NextResponse.json(
        { error: { message: 'Failed to log out' } },
        { status: 500 }
      );
    }

    authLogger.success('User logged out successfully');

    // Return success response
    return NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    authLogger.error('Unexpected error during logout', { error });
    return NextResponse.json(
      { error: { message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}