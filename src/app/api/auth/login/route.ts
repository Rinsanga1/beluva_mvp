import { NextResponse } from 'next/server';
import { z } from 'zod';
import supabase from '@/lib/supabase';
import { LoginSchema } from '@/lib/validations';
import { authLogger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const result = LoginSchema.safeParse(body);

    // Return validation errors if any
    if (!result.success) {
      const errorMessage = result.error.errors.map(e => e.message).join(', ');
      authLogger.error('Login validation failed', { errors: result.error.errors });
      return NextResponse.json(
        { error: { message: errorMessage } },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Authenticate the user with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      authLogger.error('Login failed', { error: error.message });
      return NextResponse.json(
        { error: { message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Get user profile data from our custom users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      authLogger.error('Error fetching user data after login', { error: userError });
      // Return auth data anyway as the login was successful
    }

    authLogger.success('User logged in successfully', { userId: data.user.id });

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        user: userData || { id: data.user.id, email: data.user.email },
        session: {
          access_token: data.session?.access_token,
          expires_at: data.session?.expires_at,
        },
      },
    });
  } catch (error) {
    authLogger.error('Unexpected error during login', { error });
    return NextResponse.json(
      { error: { message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}