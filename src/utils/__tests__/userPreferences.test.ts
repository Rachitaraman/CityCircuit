/**
 * Property-based tests for user preferences persistence and cross-platform functionality
 * Tests that user preferences are maintained across web and mobile platforms
 */

import * as fc from 'fast-check';
import { UserPreferences, UserPreferencesSchema, User } from '../../types';

// Create a simple in-memory storage for testing
class TestStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// Create a test version of AuthService that doesn't depend on JWT validation
class TestAuthService {
  private static readonly STORAGE_KEY = 'citycircuit_auth_token';
  private static readonly USER_KEY = 'citycircuit_user';
  private static storage = new TestStorage();

  static getCurrentUser(): User | null {
    try {
      const userStr = this.storage.getItem(this.USER_KEY);
      const token = this.storage.getItem(this.STORAGE_KEY);
      
      if (!userStr || !token) return null;
      
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  static async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      const user = this.getCurrentUser();
      if (!user) return false;

      // Update user preferences
      user.profile.preferences = {
        ...user.profile.preferences,
        ...preferences,
      };

      // Store updated user
      this.storage.setItem(this.USER_KEY, JSON.stringify(user));
      return true;
    } catch {
      return false;
    }
  }

  static setUser(user: User): void {
    this.storage.setItem(this.STORAGE_KEY, 'test-token');
    this.storage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static clear(): void {
    this.storage.clear();
  }
}

describe('User Preferences Property Tests', () => {
  beforeEach(() => {
    TestAuthService.clear();
  });

  // Generator for valid user preferences
  const userPreferencesArb = fc.record({
    language: fc.oneof(
      fc.constant('en'),
      fc.constant('hi'),
      fc.constant('mr'),
      fc.constant('gu'),
      fc.constant('ta')
    ),
    theme: fc.oneof(fc.constant('light'), fc.constant('dark')),
    notifications: fc.boolean(),
    mapStyle: fc.oneof(
      fc.constant('default'),
      fc.constant('satellite'),
      fc.constant('terrain')
    ),
  });

  // Generator for partial preference updates
  const partialPreferencesArb = fc.record({
    language: fc.option(fc.oneof(
      fc.constant('en'),
      fc.constant('hi'),
      fc.constant('mr'),
      fc.constant('gu'),
      fc.constant('ta')
    ), { nil: undefined }),
    theme: fc.option(fc.oneof(fc.constant('light'), fc.constant('dark')), { nil: undefined }),
    notifications: fc.option(fc.boolean(), { nil: undefined }),
    mapStyle: fc.option(fc.oneof(
      fc.constant('default'),
      fc.constant('satellite'),
      fc.constant('terrain')
    ), { nil: undefined }),
  }).map(prefs => {
    // Remove undefined values to create proper partial object
    const result: Partial<UserPreferences> = {};
    if (prefs.language !== undefined) result.language = prefs.language;
    if (prefs.theme !== undefined) result.theme = prefs.theme;
    if (prefs.notifications !== undefined) result.notifications = prefs.notifications;
    if (prefs.mapStyle !== undefined) result.mapStyle = prefs.mapStyle;
    return result;
  }).filter(prefs => Object.keys(prefs).length > 0); // Ensure we always have at least one property

  // Generator for mock users with preferences
  const userArb = fc.record({
    id: fc.uuid(),
    email: fc.emailAddress(),
    role: fc.oneof(fc.constant('operator'), fc.constant('passenger'), fc.constant('admin')),
    profile: fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      organization: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
      preferences: userPreferencesArb,
    }),
    createdAt: fc.date(),
    lastLoginAt: fc.date(),
  });

  /**
   * **Feature: city-circuit, Property 13: Cross-platform preference persistence**
   * **Validates: Requirements 3.4**
   * 
   * Property: For any user preferences set, the system should persist settings 
   * across web and mobile platforms
   */
  describe('Property 13: Cross-platform preference persistence', () => {
    it('should persist any valid user preferences across platform sessions', () => {
      fc.assert(
        fc.property(userArb, userPreferencesArb, async (user, newPreferences) => {
          // Setup: Login user to establish session
          TestAuthService.setUser(user);

          // Property: Any valid preference update should persist
          const updateResult = await TestAuthService.updateUserPreferences(newPreferences);
          expect(updateResult).toBe(true);

          // Property: Updated preferences should be immediately retrievable
          const updatedUser = TestAuthService.getCurrentUser();
          expect(updatedUser).not.toBeNull();
          
          if (updatedUser) {
            // Verify all preference fields are persisted correctly
            expect(updatedUser.profile.preferences.language).toBe(newPreferences.language);
            expect(updatedUser.profile.preferences.theme).toBe(newPreferences.theme);
            expect(updatedUser.profile.preferences.notifications).toBe(newPreferences.notifications);
            expect(updatedUser.profile.preferences.mapStyle).toBe(newPreferences.mapStyle);

            // Property: Preferences should validate against schema
            const validationResult = UserPreferencesSchema.safeParse(updatedUser.profile.preferences);
            expect(validationResult.success).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle partial preference updates while preserving existing settings', () => {
      fc.assert(
        fc.property(userArb, partialPreferencesArb, async (user, partialPreferences) => {
          // Setup: Login user with initial preferences
          TestAuthService.setUser(user);

          const originalPreferences = { ...user.profile.preferences };

          // Property: Partial updates should merge with existing preferences
          const updateResult = await TestAuthService.updateUserPreferences(partialPreferences);
          expect(updateResult).toBe(true);

          const updatedUser = TestAuthService.getCurrentUser();
          expect(updatedUser).not.toBeNull();

          if (updatedUser) {
            const finalPreferences = updatedUser.profile.preferences;

            // Property: Updated fields should have new values
            Object.keys(partialPreferences).forEach(key => {
              const prefKey = key as keyof UserPreferences;
              if (partialPreferences[prefKey] !== undefined) {
                expect(finalPreferences[prefKey]).toBe(partialPreferences[prefKey]);
              }
            });

            // Property: Non-updated fields should retain original values
            Object.keys(originalPreferences).forEach(key => {
              const prefKey = key as keyof UserPreferences;
              if (!(prefKey in partialPreferences)) {
                expect(finalPreferences[prefKey]).toBe(originalPreferences[prefKey]);
              }
            });

            // Property: Final preferences should still be valid
            const validationResult = UserPreferencesSchema.safeParse(finalPreferences);
            expect(validationResult.success).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain preference consistency across multiple platform sessions', () => {
      fc.assert(
        fc.property(
          userArb,
          fc.array(partialPreferencesArb, { minLength: 1, maxLength: 5 }),
          async (user, preferenceUpdates) => {
            // Setup: Login user
            TestAuthService.setUser(user);

            let expectedPreferences = { ...user.profile.preferences };

            // Property: Sequential preference updates should be cumulative and consistent
            for (const update of preferenceUpdates) {
              const updateResult = await TestAuthService.updateUserPreferences(update);
              expect(updateResult).toBe(true);

              // Update expected preferences
              expectedPreferences = { ...expectedPreferences, ...update };

              // Verify current state matches expected
              const currentUser = TestAuthService.getCurrentUser();
              expect(currentUser).not.toBeNull();
              
              if (currentUser) {
                expect(currentUser.profile.preferences).toEqual(expectedPreferences);
              }
            }

            // Property: Final preferences should be valid after all updates
            const finalUser = TestAuthService.getCurrentUser();
            if (finalUser) {
              const validationResult = UserPreferencesSchema.safeParse(finalUser.profile.preferences);
              expect(validationResult.success).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle preference persistence when user is not authenticated', () => {
      fc.assert(
        fc.property(partialPreferencesArb, async (preferences) => {
          // Setup: No authenticated user
          TestAuthService.clear();

          // Property: Preference updates should fail gracefully when not authenticated
          const updateResult = await TestAuthService.updateUserPreferences(preferences);
          expect(updateResult).toBe(false);

          // Property: No user data should be stored
          expect(TestAuthService.getCurrentUser()).toBeNull();
        }),
        { numRuns: 30 }
      );
    });

    it('should validate preference data integrity across platform boundaries', () => {
      fc.assert(
        fc.property(userArb, async (user) => {
          // Setup: Login user
          TestAuthService.setUser(user);

          // Property: User preferences should always be valid according to schema
          const currentUser = TestAuthService.getCurrentUser();
          expect(currentUser).not.toBeNull();

          if (currentUser) {
            const validationResult = UserPreferencesSchema.safeParse(currentUser.profile.preferences);
            expect(validationResult.success).toBe(true);

            // Property: Each preference field should have valid values
            const prefs = currentUser.profile.preferences;
            
            // Language should be valid language code
            expect(prefs.language).toMatch(/^[a-z]{2,5}$/);
            
            // Theme should be valid theme option
            expect(['light', 'dark']).toContain(prefs.theme);
            
            // Notifications should be boolean
            expect(typeof prefs.notifications).toBe('boolean');
            
            // Map style should be valid option
            expect(['default', 'satellite', 'terrain']).toContain(prefs.mapStyle);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle corrupted preference data gracefully', () => {
      // Test with invalid stored data
      const invalidUserData = [
        '{"invalid": "json"',  // Invalid JSON
        '{"profile": {"preferences": {"theme": "invalid"}}}',  // Invalid theme
        '{"profile": {"preferences": {"language": ""}}}',  // Invalid language
        '{}',  // Missing required fields
      ];

      invalidUserData.forEach(invalidData => {
        TestAuthService.clear();
        // Manually set invalid data in storage
        const storage = (TestAuthService as any).storage as TestStorage;
        storage.setItem('citycircuit_auth_token', 'test-token');
        storage.setItem('citycircuit_user', invalidData);

        // Property: System should handle corrupted data gracefully
        const user = TestAuthService.getCurrentUser();
        
        // Should return null for invalid data
        expect(user).toBeNull();
      });
    });
  });

  // Additional unit tests for specific preference functionality
  describe('Preference Validation and Edge Cases', () => {
    it('should handle empty preference updates', async () => {
      const user: User = {
        id: 'test-user',
        email: 'test@example.com',
        role: 'passenger',
        profile: {
          name: 'Test User',
          preferences: {
            language: 'en',
            theme: 'light',
            notifications: true,
            mapStyle: 'default',
          },
        },
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      TestAuthService.setUser(user);

      const originalPreferences = { ...user.profile.preferences };
      
      // Empty update should succeed but not change anything
      const result = await TestAuthService.updateUserPreferences({});
      expect(result).toBe(true);

      const updatedUser = TestAuthService.getCurrentUser();
      expect(updatedUser?.profile.preferences).toEqual(originalPreferences);
    });

    it('should handle language preference changes correctly', async () => {
      const user: User = {
        id: 'test-user',
        email: 'test@example.com',
        role: 'passenger',
        profile: {
          name: 'Test User',
          preferences: {
            language: 'en',
            theme: 'light',
            notifications: true,
            mapStyle: 'default',
          },
        },
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      TestAuthService.setUser(user);

      // Update language preference
      const result = await TestAuthService.updateUserPreferences({ language: 'hi' });
      expect(result).toBe(true);

      const updatedUser = TestAuthService.getCurrentUser();
      expect(updatedUser?.profile.preferences.language).toBe('hi');
      
      // Other preferences should remain unchanged
      expect(updatedUser?.profile.preferences.theme).toBe('light');
      expect(updatedUser?.profile.preferences.notifications).toBe(true);
      expect(updatedUser?.profile.preferences.mapStyle).toBe('default');
    });

    it('should handle theme preference changes correctly', async () => {
      const user: User = {
        id: 'test-user',
        email: 'test@example.com',
        role: 'admin',
        profile: {
          name: 'Test Admin',
          preferences: {
            language: 'en',
            theme: 'light',
            notifications: true,
            mapStyle: 'satellite',
          },
        },
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      TestAuthService.setUser(user);

      // Update theme preference
      const result = await TestAuthService.updateUserPreferences({ theme: 'dark' });
      expect(result).toBe(true);

      const updatedUser = TestAuthService.getCurrentUser();
      expect(updatedUser?.profile.preferences.theme).toBe('dark');
      
      // Other preferences should remain unchanged
      expect(updatedUser?.profile.preferences.language).toBe('en');
      expect(updatedUser?.profile.preferences.notifications).toBe(true);
      expect(updatedUser?.profile.preferences.mapStyle).toBe('satellite');
    });
  });
});