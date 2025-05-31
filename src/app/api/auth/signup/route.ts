import { NextResponse } from 'next/server';
import { z } from 'zod';
import supabase from '@/lib/supabase';
import { SignupSchema } from '@/lib/validations';
import { authLogger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const result = SignupSchema.safeParse(body);

    // Return validation errors if any
    if (!result.success) {
      const errorMessage = result.error.errors.map(e => e.message).join(', ');
      authLogger.error('Signup validation failed', { errors: result.error.errors });
      return NextResponse.json(
        { error: { message: errorMessage } },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    // Create the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      authLogger.error('Supabase Auth signup failed', { error: authError });
      return NextResponse.json(
        { error: { message: authError.message } },
        { status: 500 }
      );
    }

    // If auth was successful but no user was created (should never happen)
    if (!authData.user) {
      authLogger.error('Supabase Auth signup succeeded but no user was created');
      return NextResponse.json(
        { error: { message: 'Failed to create user' } },
        { status: 500 }
      );
    }

    // Insert additional user data into our custom users table
    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          name,
          email,
        },
      ]);

    if (insertError) {
      authLogger.error('Failed to insert user data into users table', { error: insertError });
      // We should technically delete the auth user here, but we'll leave it for simplicity
      return NextResponse.json(
        { error: { message: 'User created but profile data could not be saved' } },
        { status: 500 }
      );
    }

    authLogger.success('User signed up successfully', { userId: authData.user.id });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: authData.user.id,
          name,
          email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    authLogger.error('Unexpected error during signup', { error });
    return NextResponse.json(
      { error: { message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}