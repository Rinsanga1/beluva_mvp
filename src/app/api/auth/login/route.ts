import { NextResponse } from 'next/server';
import { z } from 'zod';
import supabase from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
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
        { error: { message: errorMessage, validationFailed: true } },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    authLogger.info('Attempting to authenticate user', { email });
    
    // Check if Supabase URL and key are properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      authLogger.error('Supabase configuration missing');
      return NextResponse.json(
        { error: { message: 'Server configuration error: Supabase credentials missing' } },
        { status: 500 }
      );
    }
    
    // Authenticate the user with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      authLogger.error('Login failed', { 
        error: error.message,
        code: error.code,
        status: error.status,
        details: error.details
      });
      
      let errorMessage = 'Invalid email or password';
      let errorCode = 'auth_error';
      
      // Provide more specific error messages based on the error code
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'The email or password you entered is incorrect';
        errorCode = 'invalid_credentials';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address before logging in';
        errorCode = 'email_not_confirmed';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Too many login attempts. Please try again later';
        errorCode = 'rate_limited';
      } else if (error.message.includes('User not found')) {
        errorMessage = 'No account found with this email address';
        errorCode = 'user_not_found';
      }
      
      return NextResponse.json(
        { error: { 
          message: errorMessage,
          supabaseError: error.message,
          code: error.code,
          errorType: errorCode
        }},
        { status: 401 }
      );
    }

    authLogger.info('Authentication successful, retrieving user profile', { userId: data.user.id });
    
    // Get user profile data from our custom users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      authLogger.error('Error fetching user data after login', { 
        error: userError,
        code: userError.code,
        details: userError.details,
        userId: data.user.id
      });
      
      // Check if user record exists - this is a common issue when auth users exist but not in users table
      if (userError.code === 'PGRST116') {
        authLogger.warn('User exists in auth but not in users table', { userId: data.user.id });
        
        // Try to create the user record
        try {
          authLogger.info('Attempting to create missing user record', { userId: data.user.id });
          
          // Try with service role if available for better permissions
          const serviceClient = process.env.SUPABASE_SERVICE_ROLE_KEY 
            ? createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL as string,
                process.env.SUPABASE_SERVICE_ROLE_KEY as string
              )
            : supabase;
            
          const { data: newUserData, error: createError } = await serviceClient
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'New User',
              created_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (createError) {
            authLogger.error('Failed to create user record after login', { error: createError });
          } else if (newUserData) {
            authLogger.success('Created missing user record', { userId: newUserData.id });
            userData = newUserData;
          }
        } catch (createUserError) {
          authLogger.error('Exception creating user record', { error: createUserError });
        }
      }
      
      // Return auth data anyway as the login was successful
    }

    authLogger.success('User logged in successfully', { userId: data.user.id });

    // Log detailed success information
    authLogger.success('User logged in successfully', { 
      userId: data.user.id,
      hasUserRecord: !!userData,
      email: data.user.email
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        user: userData || { 
          id: data.user.id, 
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'
        },
        session: {
          access_token: data.session?.access_token,
          expires_at: data.session?.expires_at,
          refresh_token: data.session?.refresh_token
        },
      },
    });
  } catch (error: any) {
    authLogger.error('Unexpected error during login', { 
      error,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: { 
        message: 'An unexpected error occurred during login',
        details: error.message,
        type: error.name || 'UnknownError'
      }},
      { status: 500 }
    );
  }
}