/**
 * React hook for handling API errors in components
 * Provides error state management and user-friendly error messages
 */

import { useState, useEffect, useCallback } from 'react';
import { ApiError, globalErrorHandler } from '../services/errorHandling';

export interface ApiErrorState {
  error: ApiError | null;
  isLoading: boolean;
  hasError: boolean;
}

export interface UseApiErrorOptions {
  showToast?: boolean;
  logErrors?: boolean;
  retryCallback?: () => void;
}

export function useApiError(options: UseApiErrorOptions = {}) {
  const { showToast = true, logErrors = true, retryCallback } = options;
  
  const [errorState, setErrorState] = useState<ApiErrorState>({
    error: null,
    isLoading: false,
    hasError: false,
  });

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isLoading: false,
      hasError: false,
    });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setErrorState(prev => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  const handleError = useCallback((error: ApiError | Error) => {
    const apiError = error instanceof ApiError 
      ? error 
      : new ApiError(error.message, 'unknown', 'unknown');

    setErrorState({
      error: apiError,
      isLoading: false,
      hasError: true,
    });

    if (logErrors) {
      console.error('API Error in component:', apiError);
    }

    if (showToast && typeof window !== 'undefined') {
      // Show user-friendly toast notification
      // In a real app, this would integrate with a toast library
      console.warn('User notification:', getUserFriendlyMessage(apiError));
    }
  }, [showToast, logErrors]);

  const executeWithErrorHandling = useCallback(async <T>(
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    try {
      setLoading(true);
      clearError();
      const result = await apiCall();
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error as ApiError);
      return null;
    }
  }, [setLoading, clearError, handleError]);

  const retry = useCallback(() => {
    if (retryCallback) {
      clearError();
      retryCallback();
    }
  }, [retryCallback, clearError]);

  // Listen for global API errors
  useEffect(() => {
    const errorHandler = (error: ApiError) => {
      handleError(error);
    };

    globalErrorHandler.onError(errorHandler);
    
    // Note: In a real implementation, you'd want to clean up the listener
    // but the current GlobalErrorHandler doesn't provide a way to remove listeners
  }, [handleError]);

  return {
    ...errorState,
    clearError,
    setLoading,
    handleError,
    executeWithErrorHandling,
    retry,
    canRetry: errorState.error?.retryable ?? false,
  };
}

function getUserFriendlyMessage(error: ApiError): string {
  if (error.statusCode) {
    switch (error.statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'You need to log in to access this feature.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 408:
        return 'Request timed out. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Our team has been notified.';
      case 502:
        return 'Service temporarily unavailable. Please try again later.';
      case 503:
        return 'Service is currently under maintenance. Please try again later.';
      case 504:
        return 'Request timed out. Please try again.';
      default:
        if (error.statusCode >= 500) {
          return 'Server error. Please try again later.';
        }
        return 'Something went wrong. Please try again.';
    }
  }

  // Handle specific error types
  if (error.message.includes('network') || error.message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (error.message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  return 'Something went wrong. Please try again.';
}

// Specialized hooks for common API operations
export function useRouteApi() {
  const apiError = useApiError({
    showToast: true,
    logErrors: true,
  });

  const searchRoutes = useCallback(async (origin: string, destination: string) => {
    return apiError.executeWithErrorHandling(async () => {
      const response = await fetch('/api/routes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination }),
      });

      if (!response.ok) {
        throw new ApiError(
          'Failed to search routes',
          '/api/routes/search',
          'POST',
          response.status
        );
      }

      return response.json();
    });
  }, [apiError]);

  const optimizeRoute = useCallback(async (routeId: string) => {
    return apiError.executeWithErrorHandling(async () => {
      const response = await fetch(`/api/routes/${routeId}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new ApiError(
          'Failed to optimize route',
          `/api/routes/${routeId}/optimize`,
          'POST',
          response.status
        );
      }

      return response.json();
    });
  }, [apiError]);

  return {
    ...apiError,
    searchRoutes,
    optimizeRoute,
  };
}

export function useUserApi() {
  const apiError = useApiError({
    showToast: true,
    logErrors: true,
  });

  const updateProfile = useCallback(async (profileData: any) => {
    return apiError.executeWithErrorHandling(async () => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        throw new ApiError(
          'Failed to update profile',
          '/api/user/profile',
          'PUT',
          response.status
        );
      }

      return response.json();
    });
  }, [apiError]);

  const updatePreferences = useCallback(async (preferences: any) => {
    return apiError.executeWithErrorHandling(async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new ApiError(
          'Failed to update preferences',
          '/api/user/preferences',
          'PUT',
          response.status
        );
      }

      return response.json();
    });
  }, [apiError]);

  return {
    ...apiError,
    updateProfile,
    updatePreferences,
  };
}