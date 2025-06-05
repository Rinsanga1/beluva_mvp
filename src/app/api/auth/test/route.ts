import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { authLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    // Log test request
    authLogger.info('Testing Supabase connection');
    
    // Test 1: Get Supabase URL and key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      authLogger.error('Supabase credentials missing');
      return NextResponse.json({
        error: "Supabase URL or key is missing",
        envVars: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
        }
      }, { status: 500 });
    }
    
    // Test 2: Test auth connection
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    // Test 3: Test database connection - query the users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    // Return all test results
    return NextResponse.json({
      success: true,
      tests: {
        supabaseConfig: {
          success: !!supabaseUrl && !!supabaseKey,
          urlPrefix: supabaseUrl?.substring(0, 10) + '...',
          keyPrefix: supabaseKey?.substring(0, 10) + '...',
        },
        authConnection: {
          success: !authError,
          error: authError ? authError.message : null,
          sessionExists: !!authData?.session,
        },
        databaseConnection: {
          success: !usersError,
          error: usersError ? usersError.message : null,
          usersTableAccessible: !!usersData,
        }
      }
    });
  } catch (error) {
    authLogger.error('Supabase test failed with exception', { error });
    return NextResponse.json({
      error: "Test failed with exception",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}