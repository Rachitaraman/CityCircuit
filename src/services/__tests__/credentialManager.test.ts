/**
 * Property-based tests for secure credential management
 * Property 27: Credential security
 * Validates: Requirements 6.5 - Secure credential management and API key protection
 */

import * as fc from 'fast-check';
import {
  SecureCredentialManager,
  DevelopmentCredentialManager,
  ProductionCredentialManager,
  CredentialConfig,
  CredentialRotationResult,
  getCredentialManager,
  getApiKey,
  setApiKey,
  rotateApiKey,
} from '../credentialManager';

// Mock localStorage for testing
const mockLocalStorage = {
  store: new Map<string, string>(),
  getItem: jest.fn((key: string) => mockLocalStorage.store.get(key) || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage.store.set(key, value);
  }),
  removeItem: jest.fn((key: string) => {
    mockLocalStorage.store.delete(key);
  }),
  clear: jest.fn(() => {
    mockLocalStorage.store.clear();
  }),
};

beforeEach(() => {
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
  
  // Clear localStorage mock
  mockLocalStorage.store.clear();
  jest.clearAllMocks();
  
  // Mock console methods to reduce noise
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Property 27: Credential security', () => {
  /**
   * Property: Encrypted credentials cannot be read without decryption key
   * Tests that encrypted credentials are not readable in their stored form
   */
  test('encrypted credentials are not readable without decryption key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }), // credential value
        fc.string({ minLength: 1, maxLength: 50 }), // credential name
        fc.string({ minLength: 32, maxLength: 64 }), // master key
        async (credentialValue, credentialName, masterKey) => {
          const manager = new SecureCredentialManager(masterKey);
          
          // Store encrypted credential
          manager.setCredential(credentialName, credentialValue, { encrypt: true });
          
          // Get the raw stored data from localStorage
          const storedData = mockLocalStorage.getItem('secure_credentials');
          expect(storedData).toBeDefined();
          expect(storedData).not.toContain(credentialValue); // Original value should not be visible
          
          // Retrieved credential should match original
          const retrieved = manager.getCredential(credentialName);
          expect(retrieved).toBe(credentialValue);
          
          // Different manager with different key should not be able to decrypt
          const differentManager = new SecureCredentialManager(masterKey + '_different');
          const failedRetrieval = differentManager.getCredential(credentialName);
          expect(failedRetrieval).toBeNull(); // Should fail to decrypt
          
          manager.cleanup();
          differentManager.cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Credential rotation generates different values
   * Tests that credential rotation always produces new, different values
   */
  test('credential rotation generates different values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }), // original credential
        fc.string({ minLength: 1, maxLength: 50 }), // credential name
        async (originalCredential, credentialName) => {
          const manager = new SecureCredentialManager();
          
          // Store original credential
          manager.setCredential(credentialName, originalCredential, { encrypt: true });
          
          // Rotate credential
          const rotationResult = await manager.rotateCredential(credentialName);
          
          expect(rotationResult.success).toBe(true);
          expect(rotationResult.oldCredential).toBe(originalCredential);
          expect(rotationResult.newCredential).toBeDefined();
          expect(rotationResult.newCredential).not.toBe(originalCredential);
          expect(rotationResult.rotatedAt).toBeInstanceOf(Date);
          
          // Retrieved credential should be the new one
          const retrieved = manager.getCredential(credentialName);
          expect(retrieved).toBe(rotationResult.newCredential);
          expect(retrieved).not.toBe(originalCredential);
          
          manager.cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Expired credentials are not accessible
   * Tests that credentials past their expiration date cannot be retrieved
   */
  test('expired credentials are not accessible', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }), // credential value
        fc.string({ minLength: 1, maxLength: 50 }), // credential name
        fc.integer({ min: 1, max: 10 }), // expiry seconds
        async (credentialValue, credentialName, expirySeconds) => {
          const manager = new SecureCredentialManager();
          
          // Set credential with short expiry
          const expiresAt = new Date();
          expiresAt.setSeconds(expiresAt.getSeconds() + expirySeconds);
          
          manager.setCredential(credentialName, credentialValue, {
            encrypt: true,
            expiresAt,
          });
          
          // Should be accessible immediately
          expect(manager.hasCredential(credentialName)).toBe(true);
          expect(manager.getCredential(credentialName)).toBe(credentialValue);
          
          // Mock time passage beyond expiry
          const originalDate = Date;
          const futureDate = new Date();
          futureDate.setSeconds(futureDate.getSeconds() + expirySeconds + 1);
          
          global.Date = jest.fn(() => futureDate) as any;
          global.Date.now = jest.fn(() => futureDate.getTime());
          
          // Should not be accessible after expiry
          expect(manager.hasCredential(credentialName)).toBe(false);
          expect(manager.getCredential(credentialName)).toBeNull();
          
          // Restore original Date
          global.Date = originalDate;
          manager.cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Credential export/import preserves data integrity
   * Tests that credentials can be exported and imported without data loss
   */
  test('credential export/import preserves data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            value: fc.string({ minLength: 8, maxLength: 100 }),
            encrypt: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ), // credentials to test
        async (credentialSpecs) => {
          const manager1 = new SecureCredentialManager();
          const manager2 = new SecureCredentialManager();
          
          // Store credentials in first manager
          const uniqueSpecs = credentialSpecs.filter((spec, index, arr) => 
            arr.findIndex(s => s.name === spec.name) === index
          );
          
          for (const spec of uniqueSpecs) {
            manager1.setCredential(spec.name, spec.value, { encrypt: spec.encrypt });
          }
          
          // Export credentials
          const exportedData = manager1.exportCredentials();
          expect(exportedData).toBeDefined();
          expect(typeof exportedData).toBe('string');
          expect(exportedData.length).toBeGreaterThan(0);
          
          // Import into second manager
          const importResult = manager2.importCredentials(exportedData);
          expect(importResult.success).toBe(true);
          expect(importResult.imported).toBe(uniqueSpecs.length);
          expect(importResult.errors.length).toBe(0);
          
          // Verify all credentials are accessible in second manager
          for (const spec of uniqueSpecs) {
            expect(manager2.hasCredential(spec.name)).toBe(true);
            expect(manager2.getCredential(spec.name)).toBe(spec.value);
          }
          
          manager1.cleanup();
          manager2.cleanup();
        }
      ),
      { numRuns: 50 } // Fewer runs due to complexity
    );
  });

  /**
   * Property: Credential metadata is preserved and updatable
   * Tests that credential metadata can be stored and updated without affecting the credential value
   */
  test('credential metadata is preserved and updatable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }), // credential value
        fc.string({ minLength: 1, maxLength: 50 }), // credential name
        fc.record({
          source: fc.string({ minLength: 1, maxLength: 20 }),
          version: fc.integer({ min: 1, max: 100 }),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 5 }),
        }), // initial metadata
        fc.record({
          lastUsed: fc.date(),
          accessCount: fc.integer({ min: 0, max: 1000 }),
        }), // updated metadata
        async (credentialValue, credentialName, initialMetadata, updatedMetadata) => {
          const manager = new SecureCredentialManager();
          
          // Store credential with initial metadata
          manager.setCredential(credentialName, credentialValue, {
            encrypt: true,
            metadata: initialMetadata,
          });
          
          // Verify initial metadata
          const retrievedMetadata = manager.getCredentialMetadata(credentialName);
          expect(retrievedMetadata).toEqual(initialMetadata);
          
          // Update metadata
          const updateSuccess = manager.updateCredentialMetadata(credentialName, updatedMetadata);
          expect(updateSuccess).toBe(true);
          
          // Verify updated metadata
          const finalMetadata = manager.getCredentialMetadata(credentialName);
          expect(finalMetadata).toEqual({ ...initialMetadata, ...updatedMetadata });
          
          // Verify credential value is unchanged
          expect(manager.getCredential(credentialName)).toBe(credentialValue);
          
          manager.cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple managers with same key can access same credentials
   * Tests that credential sharing works correctly with the same master key
   */
  test('multiple managers with same key can access same credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 32, maxLength: 64 }), // master key
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            value: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 5 }
        ), // credentials
        async (masterKey, credentialSpecs) => {
          const manager1 = new SecureCredentialManager(masterKey);
          const manager2 = new SecureCredentialManager(masterKey);
          
          // Store credentials in first manager
          const uniqueSpecs = credentialSpecs.filter((spec, index, arr) => 
            arr.findIndex(s => s.name === spec.name) === index
          );
          
          for (const spec of uniqueSpecs) {
            manager1.setCredential(spec.name, spec.value, { encrypt: true });
          }
          
          // Second manager should be able to access the same credentials
          for (const spec of uniqueSpecs) {
            expect(manager2.hasCredential(spec.name)).toBe(true);
            expect(manager2.getCredential(spec.name)).toBe(spec.value);
          }
          
          manager1.cleanup();
          manager2.cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Credential removal is complete and secure
   * Tests that removed credentials cannot be accessed and are properly cleaned up
   */
  test('credential removal is complete and secure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            value: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          { minLength: 2, maxLength: 10 }
        ), // credentials
        fc.integer({ min: 0, max: 9 }), // index of credential to remove
        async (credentialSpecs, removeIndex) => {
          const manager = new SecureCredentialManager();
          
          // Store all credentials
          const uniqueSpecs = credentialSpecs.filter((spec, index, arr) => 
            arr.findIndex(s => s.name === spec.name) === index
          );
          
          if (uniqueSpecs.length === 0) return; // Skip if no unique specs
          
          for (const spec of uniqueSpecs) {
            manager.setCredential(spec.name, spec.value, { encrypt: true });
          }
          
          // Remove one credential
          const specToRemove = uniqueSpecs[removeIndex % uniqueSpecs.length];
          const removeSuccess = manager.removeCredential(specToRemove.name);
          expect(removeSuccess).toBe(true);
          
          // Removed credential should not be accessible
          expect(manager.hasCredential(specToRemove.name)).toBe(false);
          expect(manager.getCredential(specToRemove.name)).toBeNull();
          expect(manager.getCredentialMetadata(specToRemove.name)).toBeNull();
          
          // Other credentials should still be accessible
          for (const spec of uniqueSpecs) {
            if (spec.name !== specToRemove.name) {
              expect(manager.hasCredential(spec.name)).toBe(true);
              expect(manager.getCredential(spec.name)).toBe(spec.value);
            }
          }
          
          // Removing non-existent credential should return false
          const removeFakeSuccess = manager.removeCredential('non-existent-credential');
          expect(removeFakeSuccess).toBe(false);
          
          manager.cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Environment-specific managers enforce security policies
   * Tests that production and development managers have appropriate security settings
   */
  test('environment-specific managers enforce security policies', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 32, maxLength: 64 }), // master key for production
        async (masterKey) => {
          // Mock environment variables
          const originalEnv = process.env;
          process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            MAPS_API_KEY: 'prod_maps_key_12345',
            API_KEY: 'prod_api_key_67890',
          };
          
          const prodManager = new ProductionCredentialManager(masterKey);
          
          // Production credentials should be encrypted
          const credentials = prodManager.listCredentials();
          for (const cred of credentials) {
            expect(cred.encrypted).toBe(true);
            expect(cred.environment).toBe('production');
          }
          
          // Switch to development
          process.env.NODE_ENV = 'development';
          const devManager = new DevelopmentCredentialManager();
          
          // Development credentials may not be encrypted
          const devCredentials = devManager.listCredentials();
          for (const cred of devCredentials) {
            expect(cred.environment).toBe('development');
          }
          
          // Restore environment
          process.env = originalEnv;
          
          prodManager.cleanup();
          devManager.cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Rotation callbacks are called with correct parameters
   * Tests that credential rotation callbacks receive the old and new credential values
   */
  test('rotation callbacks are called with correct parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }), // original credential
        fc.string({ minLength: 8, maxLength: 100 }), // new credential
        fc.string({ minLength: 1, maxLength: 50 }), // credential name
        async (originalCredential, newCredential, credentialName) => {
          const manager = new SecureCredentialManager();
          let callbackCalled = false;
          let receivedOldCred: string | undefined;
          let receivedNewCred: string | undefined;
          
          // Register rotation callback
          manager.onCredentialRotation(credentialName, async (oldCred, newCred) => {
            callbackCalled = true;
            receivedOldCred = oldCred;
            receivedNewCred = newCred;
            return true; // Indicate success
          });
          
          // Store original credential
          manager.setCredential(credentialName, originalCredential, { encrypt: true });
          
          // Rotate with specific new credential
          const rotationResult = await manager.rotateCredential(credentialName, newCredential);
          
          expect(rotationResult.success).toBe(true);
          expect(callbackCalled).toBe(true);
          expect(receivedOldCred).toBe(originalCredential);
          expect(receivedNewCred).toBe(newCredential);
          
          // Verify the credential was actually updated
          expect(manager.getCredential(credentialName)).toBe(newCredential);
          
          manager.cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Credential security edge cases', () => {
  test('handles corrupted encrypted data gracefully', () => {
    const manager = new SecureCredentialManager();
    
    // Manually corrupt the localStorage data
    mockLocalStorage.setItem('secure_credentials', 'corrupted_data_not_base64');
    
    // Should not crash when loading corrupted data
    expect(() => {
      const newManager = new SecureCredentialManager();
      newManager.cleanup();
    }).not.toThrow();
    
    manager.cleanup();
  });

  test('handles missing localStorage gracefully', () => {
    // Remove localStorage
    delete (window as any).localStorage;
    
    const manager = new SecureCredentialManager();
    
    // Should still work without localStorage
    manager.setCredential('test', 'value', { encrypt: true });
    expect(manager.getCredential('test')).toBe('value');
    
    manager.cleanup();
    
    // Restore localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  test('handles rotation callback failures', async () => {
    const manager = new SecureCredentialManager();
    
    // Register failing callback
    manager.onCredentialRotation('test-cred', async () => {
      throw new Error('Callback failed');
    });
    
    manager.setCredential('test-cred', 'original-value', { encrypt: true });
    
    const result = await manager.rotateCredential('test-cred');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Callback failed');
    
    // Original credential should still be accessible
    expect(manager.getCredential('test-cred')).toBe('original-value');
    
    manager.cleanup();
  });

  test('handles invalid import data', () => {
    const manager = new SecureCredentialManager();
    
    // Try to import invalid data
    const result = manager.importCredentials('invalid_encrypted_data');
    expect(result.success).toBe(false);
    expect(result.imported).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    
    manager.cleanup();
  });

  test('singleton manager works correctly', () => {
    // Mock environment for testing
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const manager1 = getCredentialManager();
    const manager2 = getCredentialManager();
    
    // Should be the same instance
    expect(manager1).toBe(manager2);
    
    // Utility functions should work
    setApiKey('test-key', 'test-value');
    expect(getApiKey('test-key')).toBe('test-value');
    
    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });
});