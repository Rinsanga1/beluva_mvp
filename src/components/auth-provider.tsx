"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { User } from '@/lib/supabase';
import { authLogger } from '@/lib/logger';

// Define the auth context types
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // For testing only
  useMockUser: boolean;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
  useMockUser: true, // Using mock user by default during testing
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  // TESTING MODE: Create a mock user for testing AI features
  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test User',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
  };
  
  // Setting useMockUser to true bypasses all real authentication
  const [useMockUser] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(useMockUser ? mockUser : null);
  const [isLoading, setIsLoading] = useState(false); // Set to false immediately for testing
  const router = useRouter();

  // Initialize the auth state
  useEffect(() => {
    // If using mock user, skip the real auth initialization
    if (useMockUser) {
      return;
    }
    
    const initAuth = async () => {
      try {
        // Check if the user is already logged in
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          authLogger.error('Error getting session', { error });
          return;
        }

        if (session?.user) {
          // Get user profile data from our custom users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            authLogger.error('Error fetching user data', { error: userError });
          } else if (userData) {
            setUser(userData as User);
            authLogger.info('User authenticated', { userId: userData.id });
          }
        }
      } catch (error) {
        authLogger.error('Unexpected error during auth initialization', { error });
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authLogger.info('Auth state changed', { event });

        if (event === 'SIGNED_IN' && session?.user) {
          // Get user profile data from our custom users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            authLogger.error('Error fetching user data after sign in', { error: userError });
          } else if (userData) {
            setUser(userData as User);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          router.push('/');
        }
      }
    );

    // Clean up the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      authLogger.info('Sending login request to API', { email });
      console.log('Login request starting', { email });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse login response as JSON', jsonError);
        authLogger.error('Failed to parse login response as JSON', { error: jsonError });
        return { success: false, error: 'Invalid response from server', parseError: true };
      }

      console.log('Login response received:', {
        status: response.status,
        ok: response.ok,
        data: JSON.stringify(data)
      });

      if (!response.ok) {
        authLogger.error('Login request failed', {
          status: response.status,
          statusText: response.statusText,
          error: data.error?.message || 'Unknown error',
          fullError: data.error ? JSON.stringify(data.error) : 'No error details'
        });
        return {
          success: false,
          error: data.error?.message || 'Login failed',
          status: response.status,
          fullResponse: data
        };
      }

      // Verify the user data is present
      if (!data.data?.user) {
        authLogger.error('Login API returned success but missing user data', {
          responseData: JSON.stringify(data)
        });
        return {
          success: false,
          error: 'Login succeeded but user data is missing',
          responseData: data
        };
      }

      authLogger.success('Login API call successful', { userId: data.data?.user?.id });
      console.log('Login successful, setting user data');
      setUser(data.data.user as User);
      return { success: true, user: data.data.user };
    } catch (error) {
      console.error('Login function exception:', error);
      authLogger.error('Unexpected error during login', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      return {
        success: false,
        error: 'An unexpected error occurred during login',
        exception: error instanceof Error ? error.message : String(error)
      };
    }
  };

  // Signup function
  const signup = async (name: string, email: string, password: string) => {
    try {
      authLogger.info('Initiating signup request', { name, email, passwordLength: password.length });

      console.log('Starting signup request', {
        name,
        email,
        passwordLength: password.length,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      });

      // First, check if there's already a session (user might be logged in)
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        authLogger.warn('Attempting to sign up while already logged in', {
          currentUser: sessionData.session.user.id
        });
        await supabase.auth.signOut(); // Sign out first
        authLogger.info('Signed out existing user before signup');
      }

      // Make signup API request with longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, password }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse signup response as JSON', jsonError);
          authLogger.error('Failed to parse signup response as JSON', { error: jsonError });
          return { success: false, error: 'Invalid response from server', parseError: true };
        }

        authLogger.info('Signup response received', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          hasError: !!data.error,
          responseData: JSON.stringify(data)
        });

        console.log('Signup response data:', data);

        if (!response.ok) {
          authLogger.error('Signup API returned error', {
            status: response.status,
            statusText: response.statusText,
            error: data.error?.message || 'Unknown error',
            errorDetails: data.error?.details || null,
            fullError: JSON.stringify(data.error)
          });

          // Check for specific error conditions
          if (response.status === 409) {
            return {
              success: false,
              error: 'This email is already registered. Please log in instead.',
              status: response.status
            };
          }

          return {
            success: false,
            error: data.error?.message || 'Signup failed',
            status: response.status,
            fullResponse: data
          };
        }

        authLogger.success('Signup successful', { email });

        // Check if email confirmation is required
        if (data.data?.requiresEmailConfirmation) {
          authLogger.info('Email confirmation required before login', { email });
          return {
            success: true,
            requiresEmailConfirmation: true,
            message: data.message || 'Account created! Please check your email to confirm your account before logging in.',
            userData: data.data
          };
        }

        // If we don't need email confirmation, try auto-login
        console.log('About to attempt auto-login after signup');

        // Wait longer before attempting login to ensure all DB operations have completed
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Automatically log in the user after signup
        try {
          const loginResult = await login(email, password);

          if (!loginResult.success) {
            authLogger.error('Auto-login after signup failed', {
              error: loginResult.error,
              loginResult: JSON.stringify(loginResult)
            });

            // Try one more time after a longer delay
            await new Promise(resolve => setTimeout(resolve, 4000));
            const secondLoginAttempt = await login(email, password);

            if (!secondLoginAttempt.success) {
              authLogger.error('Second auto-login attempt also failed', {
                error: secondLoginAttempt.error
              });
              
              // Still return success=true since the account was created
              return {
                success: true,
                error: 'Account created but automatic login failed. Please try logging in manually.',
                userData: data.data,
                loginError: secondLoginAttempt.error
              };
            }

            return secondLoginAttempt;
          }

          return loginResult;
        } catch (loginError) {
          console.error('Exception during auto-login:', loginError);
          authLogger.error('Exception during auto-login', { error: loginError });
          
          // Still return success=true since the account was created
          return {
            success: true,
            error: 'Account created but an error occurred during automatic login. Please try logging in manually.',
            loginException: loginError instanceof Error ? loginError.message : String(loginError),
            userData: data.data
          };
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          authLogger.error('Signup request timed out after 15 seconds');
          return {
            success: false,
            error: 'The signup request timed out. Please try again.',
            timeout: true
          };
        }
        throw fetchError; // Re-throw other fetch errors to be caught by outer try-catch
      }
    } catch (error) {
      console.error('Signup function exception:', error);
      authLogger.error('Unexpected error during signup', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      return {
        success: false,
        error: 'An unexpected error occurred during signup',
        exception: error instanceof Error ? error.message : String(error)
      };
    }
  };

  // Logout function
  const logout = async () => {
    // In mock mode, just redirect without calling the API
    if (useMockUser) {
      authLogger.info('Mock logout - no API call made');
      router.push('/');
      return;
    }
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setUser(null);
      router.push('/');
    } catch (error) {
      authLogger.error('Unexpected error during logout', { error });
    }
  };

  // Refresh user data function
  const refreshUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.user) {
        setUser(null);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError) {
        authLogger.error('Error fetching user data during refresh', { error: userError });
        return;
      }

      setUser(userData as User);
    } catch (error) {
      authLogger.error('Unexpected error during user refresh', { error });
    }
  };

  // Provide auth context to children
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
        useMockUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
