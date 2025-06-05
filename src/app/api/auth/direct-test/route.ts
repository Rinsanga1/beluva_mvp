import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    authLogger.info('Starting direct test');
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Supabase credentials missing',
        envVars: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          hasServiceKey: !!supabaseServiceKey,
        }
      }, { status: 500 });
    }
    
    // Create clients with both anon and service keys
    const anonClient = createClient(supabaseUrl, supabaseKey);
    const serviceClient = supabaseServiceKey ? 
      createClient(supabaseUrl, supabaseServiceKey) : null;
    
    // Test results object
    const results: any = {
      timestamp: new Date().toISOString(),
      anonymousClient: {
        tablesQuery: null,
        usersTableExists: false,
        usersTableStructure: null,
        usersTableAccess: null,
      }
    };
    
    // 1. Test anonymous client
    try {
      // Check if we can query the list of tables
      const { data: tables, error: tablesError } = await anonClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(10);
      
      results.anonymousClient.tablesQuery = {
        success: !tablesError,
        error: tablesError ? tablesError.message : null,
        tables: tables?.map(t => t.table_name) || []
      };
      
      // Check if users table exists in the list
      results.anonymousClient.usersTableExists = 
        tables?.some(t => t.table_name === 'users') || false;
      
      // Try to query users table structure
      const { data: columns, error: columnsError } = await anonClient
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'users')
        .eq('table_schema', 'public');
      
      results.anonymousClient.usersTableStructure = {
        success: !columnsError,
        error: columnsError ? columnsError.message : null,
        columns: columns?.map(c => ({ name: c.column_name, type: c.data_type })) || []
      };
      
      // Try to access users table directly
      const { data: users, error: usersError } = await anonClient
        .from('users')
        .select('count')
        .limit(1);
      
      results.anonymousClient.usersTableAccess = {
        success: !usersError,
        error: usersError ? { 
          message: usersError.message, 
          code: usersError.code,
          details: usersError.details
        } : null,
        count: users?.length || 0
      };
      
      // Try to insert a test user (will likely fail)
      const testId = '00000000-0000-0000-0000-000000000001';
      const { data: insertData, error: insertError } = await anonClient
        .from('users')
        .insert({
          id: testId,
          name: 'Test User',
          email: 'test@example.com',
          created_at: new Date().toISOString()
        })
        .select();
        
      results.anonymousClient.insertTest = {
        success: !insertError,
        error: insertError ? { 
          message: insertError.message, 
          code: insertError.code,
          details: insertError.details
        } : null
      };
    } catch (error: any) {
      results.anonymousClient.error = {
        message: error.message,
        stack: error.stack
      };
    }
    
    // 2. Test service client if available
    if (serviceClient) {
      results.serviceClient = {
        usersTableAccess: null,
        insertTest: null
      };
      
      try {
        // Try to access users table directly with service role
        const { data: users, error: usersError } = await serviceClient
          .from('users')
          .select('count')
          .limit(1);
        
        results.serviceClient.usersTableAccess = {
          success: !usersError,
          error: usersError ? {
            message: usersError.message,
            code: usersError.code,
            details: usersError.details
          } : null,
          count: users?.length || 0
        };
        
        // Try to create a test user with service role
        const testServiceId = '00000000-0000-0000-0000-000000000002';
        const { data: insertData, error: insertError } = await serviceClient
          .from('users')
          .insert({
            id: testServiceId,
            name: 'Service Test User',
            email: 'service-test@example.com',
            created_at: new Date().toISOString()
          })
          .select();
          
        results.serviceClient.insertTest = {
          success: !insertError,
          error: insertError ? {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details
          } : null,
          result: insertData
        };
        
        // If insert succeeded, clean up the test user
        if (!insertError && insertData) {
          const { error: deleteError } = await serviceClient
            .from('users')
            .delete()
            .eq('id', testServiceId);
            
          results.serviceClient.cleanup = {
            success: !deleteError,
            error: deleteError ? deleteError.message : null
          };
        }
      } catch (error: any) {
        results.serviceClient.error = {
          message: error.message,
          stack: error.stack
        };
      }
    }
    
    // 3. Test auth operations with service client if available
    if (serviceClient) {
      results.authOperations = {
        listUsers: null
      };
      
      try {
        // Try to list users with the admin API
        const { data: users, error: usersError } = await serviceClient.auth.admin.listUsers();
        
        results.authOperations.listUsers = {
          success: !usersError,
          error: usersError ? usersError.message : null,
          count: users?.users?.length || 0,
          userEmails: users?.users?.map(u => u.email) || []
        };
      } catch (error: any) {
        results.authOperations.error = {
          message: error.message,
          stack: error.stack
        };
      }
    }
    
    authLogger.info('Direct test completed', { results });
    
    return NextResponse.json(results);
  } catch (error: any) {
    authLogger.error('Error in direct test', { 
      error,
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({
      error: 'Test failed with exception',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}