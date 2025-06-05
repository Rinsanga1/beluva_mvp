"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { SignupSchema } from '@/lib/validations';
import { z } from 'zod';
import { authLogger } from '@/lib/logger';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // If user is already authenticated, redirect to dashboard
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const validateForm = () => {
    try {
      authLogger.info('Validating signup form', { name, email });
      SignupSchema.parse({ name, email, password });

      // Additional validation for password confirmation
      if (password !== confirmPassword) {
        authLogger.warn('Password confirmation failed');
        setErrors({ confirmPassword: 'Passwords do not match' });
        return false;
      }

      setErrors({});
      authLogger.info('Form validation successful');
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        authLogger.error('Form validation failed', { errors: newErrors });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Load debug info on mount
  useEffect(() => {
    fetch('/api/auth/debug')
      .then(res => res.json())
      .then(data => {
        console.log('Initial debug endpoint status:', data);
      })
      .catch(err => {
        console.error('Failed to fetch initial debug info:', err);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submission attempt', { name, email, passwordLength: password.length });

    if (!validateForm()) {
      console.log('Form validation failed', { errors });
      return;
    }

    authLogger.info('Starting signup process', { email, name, passwordLength: password.length });
    setIsLoading(true);
    setServerError('');
    setSuccessMessage('');
    setRequiresEmailConfirmation(false);
    setDebugInfo(null);

    // Log environment configuration
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL
    });

    try {
      authLogger.info('Calling signup function');
      const result = await signup(name, email, password);

      authLogger.info('Signup result received', {
        success: result.success,
        error: result.error,
        requiresEmailConfirmation: result.requiresEmailConfirmation,
        message: result.message,
        fullResult: JSON.stringify(result)
      });

      // Save debug info
      setDebugInfo(result);

      if (result.success) {
        if (result.requiresEmailConfirmation) {
          // Handle email confirmation required case
          authLogger.success('Signup successful but requires email confirmation');
          setSuccessMessage(result.message || 'Account created! Please check your email to confirm your account before logging in.');
          setRequiresEmailConfirmation(true);
        } else if (result.error && result.userData) {
          // This is the case where account was created but auto-login failed
          authLogger.warn('Signup successful but auto-login failed');
          setSuccessMessage('Your account was created successfully! However, we could not log you in automatically. Please try logging in manually.');
        } else {
          // Normal success case with auto-login
          authLogger.success('Signup successful, redirecting to dashboard');
          router.push('/dashboard');
        }
      } else {
        authLogger.error('Signup failed', { error: result.error });
        setServerError(result.error || 'Signup failed');

        // Make a call to the debug endpoint to check database status
        try {
          const debugResponse = await fetch('/api/auth/debug');
          const data = await debugResponse.json();
          console.log('Debug endpoint result:', data);
          authLogger.info('Debug info after failed signup', { debugData: data });
        } catch (err) {
          console.error('Failed to fetch debug info:', err);
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      authLogger.error('Unexpected error during signup', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown'
      });
      setServerError('An unexpected error occurred');
      setDebugInfo({ unexpectedError: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-serif font-extrabold text-gray-900">
            Beluva Interiors
          </h1>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              log in to your existing account
            </Link>
          </p>
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{serverError}</h3>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">{successMessage}</h3>
                {requiresEmailConfirmation && (
                  <div className="mt-2 text-sm text-green-700">
                    <p>Please check your email inbox and click the confirmation link before logging in.</p>
                    <p className="mt-1">
                      <Link href="/login" className="font-medium underline">Go to login page</Link>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Debug Information Panel */}
        {debugInfo && process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md text-xs overflow-auto max-h-40">
            <h4 className="font-bold mb-2">Debug Information:</h4>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Full Name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input ${errors.email ? 'border-red-500' : ''}`}
                placeholder="Email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input ${errors.password ? 'border-red-500' : ''}`}
                placeholder="Password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters and include uppercase, lowercase, and numbers
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`input ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="Confirm Password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || requiresEmailConfirmation}
              className="btn btn-primary w-full"
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
            
            {requiresEmailConfirmation && (
              <div className="mt-4">
                <Link href="/login" className="btn btn-secondary w-full">
                  Go to Login
                </Link>
              </div>
            )}
          </div>

          <div className="text-sm text-center">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="font-medium text-primary-600 hover:text-primary-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-primary-600 hover:text-primary-500">
              Privacy Policy
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
