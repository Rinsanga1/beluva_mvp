import { NextResponse } from 'next/server';
import { z } from 'zod';
import supabase from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { SignupSchema } from '@/lib/validations';
import { authLogger } from '@/lib/logger';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  authLogger.info('Starting signup process');
  
  try {
    // Parse and validate the request body
    let body;
    try {
      body = await request.json();
      authLogger.info('Request body parsed successfully', { 
        hasName: !!body.name, 
        hasEmail: !!body.email, 
        hasPassword: !!body.password 
      });
    } catch (parseError) {
      authLogger.error('Failed to parse request body', { error: parseError });
      return NextResponse.json(
        { error: { message: 'Invalid request body - JSON parsing failed' } },
        { status: 400 }
      );
    }

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

    // Check if Supabase URL and key are properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      authLogger.error('Supabase configuration missing');
      return NextResponse.json(
        { error: { message: 'Server configuration error: Supabase credentials missing' } },
        { status: 500 }
      );
    }
    
    authLogger.info('Attempting to create user with Supabase Auth', { email });
    
    // For signup, we'll use the direct Supabase client which is more reliable for auth operations
        authLogger.info('Attempting to create user with Supabase Auth', { email });
    
        // First check if a user with this email already exists to provide better error messages
        const { data: existingUserCheck, error: checkError } = await supabase.auth.admin.listUsers();
    
        if (checkError) {
          authLogger.error('Error checking existing users', { error: checkError });
        } else if (existingUserCheck) {
          const existingUser = existingUserCheck.users.find(user => user.email === email);
          if (existingUser) {
            authLogger.warn('User already exists with this email', { email });
            return NextResponse.json(
              { error: { message: 'This email is already registered. Please log in instead.' } },
              { status: 409 }
            );
          }
        }
    
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback`
          }
        });

    if (authError) {
      authLogger.error('Supabase Auth signup failed', { 
        error: authError,
        message: authError.message,
        code: authError.code,
        status: authError.status,
        details: JSON.stringify(authError)
      });
      
      // Provide more specific error messages based on error code and message
      if (authError.message?.includes('already registered')) {
        return NextResponse.json(
          { error: { message: 'This email is already registered. Please log in instead.' } },
          { status: 409 }
        );
      } else if (authError.message?.includes('password')) {
        return NextResponse.json(
          { error: { message: 'Password does not meet requirements. Please use a stronger password.' } },
          { status: 400 }
        );
      } else if (authError.message?.includes('rate limit')) {
        return NextResponse.json(
          { error: { message: 'Too many signup attempts. Please try again later.' } },
          { status: 429 }
        );
      } else if (authError.message?.includes('Email') || authError.message?.includes('email')) {
        return NextResponse.json(
          { error: { message: 'Invalid email address. Please check and try again.' } },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: { 
            message: authError.message || 'Authentication failed',
            code: authError.code 
          } 
        },
        { status: authError.status || 500 }
      );
    }

    // If auth was successful but no user was created (should never happen)
    if (!authData?.user) {
      authLogger.error('Supabase Auth signup succeeded but no user was created', { 
        authData: JSON.stringify(authData)
      });
      return NextResponse.json(
        { error: { message: 'Failed to create user account - no user returned' } },
        { status: 500 }
      );
    }

    // Log confirmation - whether email confirmation is required
    authLogger.info('Supabase Auth signup status', { 
      userId: authData.user.id,
      email: authData.user.email,
      emailConfirmed: !authData.user.email_confirmed_at,
      confirmationSent: !!authData.session,
      sessionExists: !!authData.session
    });
    
    // Debug the returned user data structure
    authLogger.info('Auth user data structure', {
      id: authData.user.id,
      userMetadata: JSON.stringify(authData.user.user_metadata),
      appMetadata: JSON.stringify(authData.user.app_metadata),
      emailConfirmedAt: authData.user.email_confirmed_at
    });
    
    // Check if email confirmation is required by Supabase settings
    const emailConfirmationRequired = !authData.user.email_confirmed_at && !authData.session;
    
    // If email confirmation is required, we won't be able to create a user session yet
    // We should still try to create the users record, but need to handle the case where
    // the user might need to confirm their email first
    if (emailConfirmationRequired) {
      authLogger.info('Email confirmation required for new signup', { 
        userId: authData.user.id,
        email: authData.user.email
      });
    }

    try {
      authLogger.info('Attempting to insert user into custom users table', { 
        id: authData.user.id,
        name,
        email
      });
      
      // IMPORTANT: We need to use a service role client with admin privileges for this operation,
      // not the regular client which is affected by RLS policies
      
      // Create a service role client
      const serviceClient = process.env.SUPABASE_SERVICE_ROLE_KEY 
        ? createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL as string,
            process.env.SUPABASE_SERVICE_ROLE_KEY as string
          )
        : null;
        
      if (!serviceClient) {
        authLogger.error('Service role key missing, cannot properly create user profile');
        return NextResponse.json(
          { error: { message: 'Server configuration error: Missing service role key' } },
          { status: 500 }
        );
      }
      
      // Check if user already exists in users table
      const { data: existingUser, error: existingUserError } = await serviceClient
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();
        
      if (existingUser) {
        authLogger.info('User already exists in users table', { userId: authData.user.id });
        // Skip insertion since user already exists
        return NextResponse.json(
          {
            success: true,
            data: {
              id: authData.user.id,
              name,
              email,
              requiresEmailConfirmation: !authData.user.email_confirmed_at,
              session: authData.session ? {
                accessToken: authData.session.access_token,
                expiresAt: authData.session.expires_at
              } : null
            },
          },
          { status: 201 }
        );
      }
      
      // Insert additional user data into our custom users table using the service client
      // Add a substantial delay to ensure auth.users record is fully committed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: insertData, error: insertError } = await serviceClient
        .from('users')
        .insert([
          {
            id: authData.user.id,
            name,
            email,
            is_admin: false,  // Default to non-admin
            created_at: new Date().toISOString()
          },
        ])
        .select();

      if (insertError) {
        authLogger.error('Failed to insert user data into users table', { 
          error: insertError,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          message: insertError.message,
          formattedError: JSON.stringify(insertError)
        });
        
        // More specific error for missing tables
        if (insertError.code === '42P01') { // Undefined table
          return NextResponse.json(
            { error: { message: 'Database setup incomplete: The users table does not exist' } },
            { status: 500 }
          );
        }
        
        // Handle unique constraint violations
        if (insertError.code === '23505') { // Unique violation
          authLogger.warn('User already exists in users table (unique constraint)', { userId: authData.user.id });
          // This is actually ok - the user is already in the database
        } else if (insertError.code === '23503') { // Foreign key violation
          authLogger.error('Foreign key violation - auth.users record might be missing', { 
            userId: authData.user.id,
            details: insertError.details
          });
          
          // Add a longer delay and retry once more
          authLogger.info('Waiting longer and retrying user creation', { userId: authData.user.id });
          
          try {
            // Wait even longer to ensure auth.users entry is fully committed
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            // Retry the insert
            const { data: retryInsertData, error: retryInsertError } = await serviceClient
              .from('users')
              .insert([{
                id: authData.user.id,
                name,
                email,
                is_admin: false,
                created_at: new Date().toISOString()
              }])
              .select();
              
            if (!retryInsertError) {
              authLogger.success('User created on retry', { userId: authData.user.id });
              insertData = retryInsertData;
              insertError = null;
            } else {
              authLogger.error('Retry insert also failed', { error: retryInsertError });
            }
          } catch (retryError) {
            authLogger.error('Error during retry', { error: retryError });
          }
          
          // If we still have an error, return appropriate message
          if (insertError) {
            return NextResponse.json(
              { error: { 
                message: 'Account creation failed: Database constraint error',
                details: 'This might be caused by a misconfiguration in the database'
              }},
              { status: 500 }
            );
          }
        } else {
          // For other errors, return an error response
          return NextResponse.json(
            { error: { 
              message: 'User account created but profile data could not be saved',
              details: insertError.message
            }},
            { status: 500 }
          );
        }
      } else {
        authLogger.success('User data inserted into users table successfully', {
          userData: insertData,
        });
      }
    } catch (dbError: any) {
      authLogger.error('Exception during database operation', { 
        error: dbError,
        message: dbError.message,
        stack: dbError.stack,
        code: dbError.code 
      });
      return NextResponse.json(
        { error: { 
          message: 'Database error during user creation',
          details: dbError.message
        }},
        { status: 500 }
      );
    }

    authLogger.success('User signed up successfully', { 
      userId: authData.user.id,
      email: email,
      requiresEmailConfirmation: !authData.user.email_confirmed_at
    });

    // Check if email confirmation is required by Supabase settings
    const emailConfirmationRequired = !authData.user.email_confirmed_at && !authData.session;
    
    // For development convenience, we can try to auto-confirm the email
    // This should only be used in development environments!
    if (emailConfirmationRequired && process.env.NODE_ENV === 'development' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        authLogger.info('Attempting to auto-confirm email for development', { email });
        
        // Create a service role client with admin privileges (or reuse the one we created earlier)
        const adminClient = serviceClient || createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL as string,
          process.env.SUPABASE_SERVICE_ROLE_KEY as string
        );
        
        // Admin operation to confirm the user's email
        const { error: confirmError } = await adminClient.auth.admin.updateUserById(
          authData.user.id,
          { email_confirm: true }
        );
        
        if (!confirmError) {
          authLogger.success('Auto-confirmed user email for development', { userId: authData.user.id });
          
          // After confirming email, try to create a session for the user
          const { error: sessionError } = await adminClient.auth.admin.createSession({
            userId: authData.user.id
          });
          
          if (!sessionError) {
            authLogger.success('Created session for auto-confirmed user', { userId: authData.user.id });
          } else {
            authLogger.warn('Failed to create session for auto-confirmed user', { error: sessionError });
          }
        } else {
          authLogger.warn('Failed to auto-confirm email', { error: confirmError });
        }
      } catch (confirmError) {
        authLogger.warn('Error during auto-confirmation', { error: confirmError });
      }
    }
    
    // Return success response with info about email confirmation if needed
    return NextResponse.json(
      {
        success: true,
        data: {
          id: authData.user.id,
          name,
          email,
          requiresEmailConfirmation: emailConfirmationRequired,
          session: authData.session ? {
            accessToken: authData.session.access_token,
            expiresAt: authData.session.expires_at
          } : null
        },
        message: emailConfirmationRequired 
          ? "Account created! Please check your email to confirm your account before logging in." 
          : "Account created successfully!"
      },
      { status: 201 }
    );
  } catch (error: any) {
    authLogger.error('Unexpected error during signup', { 
      error,
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      details: JSON.stringify(error)
    });
    return NextResponse.json(
      { error: { 
        message: `An unexpected error occurred: ${error.message || 'Unknown error'}`,
        type: error.name || 'UnknownError',
        code: error.code
      }},
      { status: 500 }
    );
  }
}