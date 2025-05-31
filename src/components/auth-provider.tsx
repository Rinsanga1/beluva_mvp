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
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize the auth state
  useEffect(() => {
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error.message };
      }

      setUser(data.data.user as User);
      return { success: true };
    } catch (error) {
      authLogger.error('Unexpected error during login', { error });
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Signup function
  const signup = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error.message };
      }

      // Automatically log in the user after signup
      return login(email, password);
    } catch (error) {
      authLogger.error('Unexpected error during signup', { error });
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Logout function
  const logout = async () => {
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);