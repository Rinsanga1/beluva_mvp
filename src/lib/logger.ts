import debug from 'debug';

/**
 * A logger utility built on the debug package
 * 
 * Usage:
 * ```
 * import { logger } from '@/lib/logger';
 * 
 * // Create namespaced loggers
 * const log = logger('beluva:component');
 * const apiLog = logger('beluva:api');
 * const authLog = logger('beluva:auth');
 * 
 * // Use the loggers
 * log('Component mounted');
 * apiLog('API request started', { endpoint: '/api/example', method: 'GET' });
 * authLog.error('Authentication failed', new Error('Invalid credentials'));
 * ```
 * 
 * Enable logs in the browser console by setting localStorage.debug:
 * ```
 * localStorage.debug = 'beluva:*'  // Enable all beluva logs
 * localStorage.debug = 'beluva:api,beluva:auth'  // Enable only api and auth logs
 * ```
 */

// Function to create a namespaced logger
export const logger = (namespace: string) => {
  const log = debug(namespace);
  
  // Attach additional methods for different log levels
  const enhancedLog = Object.assign(log, {
    info: (message: string, ...args: any[]) => log(`ℹ️ ${message}`, ...args),
    warn: (message: string, ...args: any[]) => log(`⚠️ ${message}`, ...args),
    error: (message: string, ...args: any[]) => log(`❌ ${message}`, ...args),
    success: (message: string, ...args: any[]) => log(`✅ ${message}`, ...args),
  });

  return enhancedLog;
};

// Create some common loggers that can be imported directly
export const appLogger = logger('beluva:app');
export const apiLogger = logger('beluva:api');
export const authLogger = logger('beluva:auth');
export const aiLogger = logger('beluva:ai');

// Enable all beluva logs in development by default
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  debug.enable('beluva:*');
}

// If running on the server and DEBUG env variable is set, it will be used automatically by the debug package