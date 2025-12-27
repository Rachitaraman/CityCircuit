import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { UserPreferences } from '../types';
import { AuthService } from '../utils/auth';

export interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing user preferences with automatic synchronization
 * across language, theme, and other settings
 */
export function useUserPreferences(): UseUserPreferencesReturn {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial preferences
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const user = AuthService.getCurrentUser();
        if (user) {
          setPreferences(user.profile.preferences);
        } else {
          // Set default preferences for non-authenticated users
          setPreferences({
            language: router.locale || 'en',
            theme: 'light',
            notifications: true,
            mapStyle: 'default',
          });
        }
        setError(null);
      } catch (err) {
        setError('Failed to load user preferences');
        console.error('Error loading preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [router.locale]);

  // Sync language preference with router locale
  useEffect(() => {
    if (preferences && preferences.language !== router.locale) {
      updatePreferences({ language: router.locale || 'en' });
    }
  }, [router.locale, preferences]);

  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Update preferences in auth service
      const success = await AuthService.updateUserPreferences(newPreferences);
      
      if (success) {
        // Update local state
        setPreferences(prev => prev ? { ...prev, ...newPreferences } : null);

        // Handle language change
        if (newPreferences.language && newPreferences.language !== router.locale) {
          const { pathname, asPath, query } = router;
          await router.push({ pathname, query }, asPath, { locale: newPreferences.language });
        }

        // Handle theme change
        if (newPreferences.theme) {
          document.documentElement.setAttribute('data-theme', newPreferences.theme);
          
          // Update CSS classes for theme
          if (newPreferences.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }

        return true;
      } else {
        setError('Failed to update preferences');
        return false;
      }
    } catch (err) {
      setError('Error updating preferences');
      console.error('Error updating preferences:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Apply theme on mount
  useEffect(() => {
    if (preferences?.theme) {
      document.documentElement.setAttribute('data-theme', preferences.theme);
      
      if (preferences.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [preferences?.theme]);

  return {
    preferences,
    updatePreferences,
    isLoading,
    error,
  };
}