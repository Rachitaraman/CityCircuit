/**
 * Secure credential management system
 * Handles API key encryption, secure storage, and credential rotation
 */

import CryptoJS from 'crypto-js';

export interface CredentialConfig {
  name: string;
  value: string;
  encrypted: boolean;
  expiresAt?: Date;
  rotationIntervalDays?: number;
  environment: 'development' | 'staging' | 'production';
  lastRotated?: Date;
  metadata?: Record<string, any>;
}

export interface EncryptionConfig {
  algorithm: string;
  keyDerivationIterations: number;
  saltLength: number;
  ivLength: number;
}

export interface CredentialRotationResult {
  success: boolean;
  oldCredential?: string;
  newCredential?: string;
  rotatedAt: Date;
  nextRotationDue?: Date;
  error?: string;
}

export class SecureCredentialManager {
  private credentials: Map<string, CredentialConfig> = new Map();
  private encryptionKey: string;
  private rotationCallbacks: Map<string, (oldCred: string, newCred: string) => Promise<boolean>> = new Map();
  private rotationIntervals: Map<string, NodeJS.Timeout> = new Map();

  private readonly encryptionConfig: EncryptionConfig = {
    algorithm: 'AES-256-GCM',
    keyDerivationIterations: 100000,
    saltLength: 32,
    ivLength: 16,
  };

  constructor(masterKey?: string) {
    // Generate or use provided master key
    this.encryptionKey = masterKey || this.generateMasterKey();
    
    // Load credentials from secure storage
    this.loadCredentialsFromStorage();
    
    // Set up automatic rotation checks
    this.initializeRotationScheduler();
  }

  /**
   * Store a credential securely
   */
  setCredential(
    name: string,
    value: string,
    options: {
      encrypt?: boolean;
      expiresAt?: Date;
      rotationIntervalDays?: number;
      environment?: 'development' | 'staging' | 'production';
      metadata?: Record<string, any>;
    } = {}
  ): void {
    const {
      encrypt = true,
      expiresAt,
      rotationIntervalDays,
      environment = process.env.NODE_ENV as any || 'development',
      metadata = {},
    } = options;

    const credential: CredentialConfig = {
      name,
      value: encrypt ? this.encryptValue(value) : value,
      encrypted: encrypt,
      expiresAt,
      rotationIntervalDays,
      environment,
      lastRotated: new Date(),
      metadata,
    };

    this.credentials.set(name, credential);
    this.saveCredentialsToStorage();

    // Set up automatic rotation if configured
    if (rotationIntervalDays && rotationIntervalDays > 0) {
      this.scheduleRotation(name, rotationIntervalDays);
    }

    // Log credential storage (without sensitive data)
    console.log(`Credential '${name}' stored securely for ${environment} environment`);
  }

  /**
   * Retrieve a credential
   */
  getCredential(name: string): string | null {
    const credential = this.credentials.get(name);
    
    if (!credential) {
      return null;
    }

    // Check if credential has expired
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      console.warn(`Credential '${name}' has expired`);
      this.credentials.delete(name);
      this.saveCredentialsToStorage();
      return null;
    }

    // Decrypt if necessary
    if (credential.encrypted) {
      try {
        return this.decryptValue(credential.value);
      } catch (error) {
        console.error(`Failed to decrypt credential '${name}':`, error);
        return null;
      }
    }

    return credential.value;
  }

  /**
   * Check if a credential exists and is valid
   */
  hasCredential(name: string): boolean {
    const credential = this.credentials.get(name);
    
    if (!credential) {
      return false;
    }

    // Check expiration
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Remove a credential
   */
  removeCredential(name: string): boolean {
    const existed = this.credentials.has(name);
    
    if (existed) {
      this.credentials.delete(name);
      this.saveCredentialsToStorage();
      
      // Clear rotation schedule
      const interval = this.rotationIntervals.get(name);
      if (interval) {
        clearInterval(interval);
        this.rotationIntervals.delete(name);
      }
      
      console.log(`Credential '${name}' removed`);
    }

    return existed;
  }

  /**
   * List all credential names (without values)
   */
  listCredentials(): Array<{
    name: string;
    encrypted: boolean;
    expiresAt?: Date;
    environment: string;
    lastRotated?: Date;
    nextRotationDue?: Date;
  }> {
    return Array.from(this.credentials.values()).map(cred => ({
      name: cred.name,
      encrypted: cred.encrypted,
      expiresAt: cred.expiresAt,
      environment: cred.environment,
      lastRotated: cred.lastRotated,
      nextRotationDue: this.calculateNextRotationDate(cred),
    }));
  }

  /**
   * Register a callback for credential rotation
   */
  onCredentialRotation(
    credentialName: string,
    callback: (oldCredential: string, newCredential: string) => Promise<boolean>
  ): void {
    this.rotationCallbacks.set(credentialName, callback);
  }

  /**
   * Manually rotate a credential
   */
  async rotateCredential(
    name: string,
    newValue?: string
  ): Promise<CredentialRotationResult> {
    const credential = this.credentials.get(name);
    
    if (!credential) {
      return {
        success: false,
        rotatedAt: new Date(),
        error: `Credential '${name}' not found`,
      };
    }

    try {
      const oldValue = credential.encrypted 
        ? this.decryptValue(credential.value)
        : credential.value;

      // Generate new credential if not provided
      const newCredentialValue = newValue || this.generateApiKey();

      // Call rotation callback if registered
      const callback = this.rotationCallbacks.get(name);
      if (callback) {
        const callbackSuccess = await callback(oldValue, newCredentialValue);
        if (!callbackSuccess) {
          return {
            success: false,
            rotatedAt: new Date(),
            error: 'Rotation callback failed',
          };
        }
      }

      // Update credential
      const updatedCredential: CredentialConfig = {
        ...credential,
        value: credential.encrypted 
          ? this.encryptValue(newCredentialValue)
          : newCredentialValue,
        lastRotated: new Date(),
      };

      this.credentials.set(name, updatedCredential);
      this.saveCredentialsToStorage();

      // Reschedule next rotation
      if (credential.rotationIntervalDays) {
        this.scheduleRotation(name, credential.rotationIntervalDays);
      }

      console.log(`Credential '${name}' rotated successfully`);

      return {
        success: true,
        oldCredential: oldValue,
        newCredential: newCredentialValue,
        rotatedAt: new Date(),
        nextRotationDue: this.calculateNextRotationDate(updatedCredential),
      };
    } catch (error) {
      console.error(`Failed to rotate credential '${name}':`, error);
      
      return {
        success: false,
        rotatedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get credential metadata
   */
  getCredentialMetadata(name: string): Record<string, any> | null {
    const credential = this.credentials.get(name);
    return credential?.metadata || null;
  }

  /**
   * Update credential metadata
   */
  updateCredentialMetadata(name: string, metadata: Record<string, any>): boolean {
    const credential = this.credentials.get(name);
    
    if (!credential) {
      return false;
    }

    credential.metadata = { ...credential.metadata, ...metadata };
    this.credentials.set(name, credential);
    this.saveCredentialsToStorage();
    
    return true;
  }

  /**
   * Export credentials for backup (encrypted)
   */
  exportCredentials(): string {
    const exportData = {
      credentials: Array.from(this.credentials.entries()),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    // Encrypt the entire export
    return this.encryptValue(JSON.stringify(exportData));
  }

  /**
   * Import credentials from backup
   */
  importCredentials(encryptedData: string): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const decryptedData = this.decryptValue(encryptedData);
      const exportData = JSON.parse(decryptedData);

      if (!exportData.credentials || !Array.isArray(exportData.credentials)) {
        throw new Error('Invalid export format');
      }

      for (const [name, credential] of exportData.credentials) {
        try {
          this.credentials.set(name, credential as CredentialConfig);
          imported++;
        } catch (error) {
          errors.push(`Failed to import credential '${name}': ${error}`);
        }
      }

      this.saveCredentialsToStorage();
      console.log(`Imported ${imported} credentials with ${errors.length} errors`);

      return { success: true, imported, errors };
    } catch (error) {
      errors.push(`Failed to decrypt or parse import data: ${error}`);
      return { success: false, imported: 0, errors };
    }
  }

  /**
   * Clear all credentials (use with caution)
   */
  clearAllCredentials(): void {
    // Clear rotation intervals
    for (const interval of this.rotationIntervals.values()) {
      clearInterval(interval);
    }
    this.rotationIntervals.clear();

    // Clear credentials
    this.credentials.clear();
    this.saveCredentialsToStorage();
    
    console.warn('All credentials cleared');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all rotation intervals
    for (const interval of this.rotationIntervals.values()) {
      clearInterval(interval);
    }
    this.rotationIntervals.clear();
  }

  // Private methods

  private generateMasterKey(): string {
    // In production, this should come from a secure key management service
    const envKey = process.env.CREDENTIAL_MASTER_KEY;
    if (envKey) {
      return envKey;
    }

    // Generate a random key for development
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  private encryptValue(value: string): string {
    try {
      // Generate random salt and IV
      const salt = CryptoJS.lib.WordArray.random(this.encryptionConfig.saltLength);
      const iv = CryptoJS.lib.WordArray.random(this.encryptionConfig.ivLength);

      // Derive key from master key and salt
      const key = CryptoJS.PBKDF2(
        this.encryptionKey,
        salt,
        {
          keySize: 256/32,
          iterations: this.encryptionConfig.keyDerivationIterations,
        }
      );

      // Encrypt the value
      const encrypted = CryptoJS.AES.encrypt(value, key, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding,
      });

      // Combine salt, IV, and encrypted data
      const combined = salt.concat(iv).concat(encrypted.ciphertext);
      return combined.toString(CryptoJS.enc.Base64);
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  private decryptValue(encryptedValue: string): string {
    try {
      // Parse the combined data
      const combined = CryptoJS.enc.Base64.parse(encryptedValue);
      
      // Extract salt, IV, and ciphertext
      const salt = CryptoJS.lib.WordArray.create(
        combined.words.slice(0, this.encryptionConfig.saltLength/4)
      );
      const iv = CryptoJS.lib.WordArray.create(
        combined.words.slice(
          this.encryptionConfig.saltLength/4,
          (this.encryptionConfig.saltLength + this.encryptionConfig.ivLength)/4
        )
      );
      const ciphertext = CryptoJS.lib.WordArray.create(
        combined.words.slice((this.encryptionConfig.saltLength + this.encryptionConfig.ivLength)/4)
      );

      // Derive key from master key and salt
      const key = CryptoJS.PBKDF2(
        this.encryptionKey,
        salt,
        {
          keySize: 256/32,
          iterations: this.encryptionConfig.keyDerivationIterations,
        }
      );

      // Decrypt the value
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertext } as any,
        key,
        {
          iv: iv,
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.NoPadding,
        }
      );

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  private generateApiKey(): string {
    // Generate a secure random API key
    const randomBytes = CryptoJS.lib.WordArray.random(32);
    return `ak_${randomBytes.toString(CryptoJS.enc.Hex)}`;
  }

  private loadCredentialsFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('secure_credentials');
        if (stored) {
          const decrypted = this.decryptValue(stored);
          const credentialData = JSON.parse(decrypted);
          
          for (const [name, credential] of credentialData) {
            this.credentials.set(name, credential);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load credentials from storage:', error);
    }
  }

  private saveCredentialsToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const credentialData = Array.from(this.credentials.entries());
        const encrypted = this.encryptValue(JSON.stringify(credentialData));
        localStorage.setItem('secure_credentials', encrypted);
      }
    } catch (error) {
      console.warn('Failed to save credentials to storage:', error);
    }
  }

  private initializeRotationScheduler(): void {
    // Check for credentials that need rotation every hour
    setInterval(() => {
      this.checkAndRotateExpiredCredentials();
    }, 60 * 60 * 1000); // 1 hour
  }

  private scheduleRotation(credentialName: string, intervalDays: number): void {
    // Clear existing interval
    const existingInterval = this.rotationIntervals.get(credentialName);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Schedule new rotation
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    const interval = setInterval(async () => {
      console.log(`Auto-rotating credential '${credentialName}'`);
      await this.rotateCredential(credentialName);
    }, intervalMs);

    this.rotationIntervals.set(credentialName, interval);
  }

  private calculateNextRotationDate(credential: CredentialConfig): Date | undefined {
    if (!credential.rotationIntervalDays || !credential.lastRotated) {
      return undefined;
    }

    const nextRotation = new Date(credential.lastRotated);
    nextRotation.setDate(nextRotation.getDate() + credential.rotationIntervalDays);
    return nextRotation;
  }

  private async checkAndRotateExpiredCredentials(): void {
    const now = new Date();
    
    for (const [name, credential] of this.credentials.entries()) {
      const nextRotation = this.calculateNextRotationDate(credential);
      
      if (nextRotation && nextRotation <= now) {
        console.log(`Credential '${name}' is due for rotation`);
        await this.rotateCredential(name);
      }
    }
  }
}

// Environment-specific credential managers
export class DevelopmentCredentialManager extends SecureCredentialManager {
  constructor() {
    super();
    
    // Set up development credentials
    this.setCredential('maps_api_key', process.env.NEXT_PUBLIC_MAPS_API_KEY || 'dev_maps_key', {
      encrypt: false, // Don't encrypt in development for easier debugging
      environment: 'development',
    });
    
    this.setCredential('api_key', process.env.NEXT_PUBLIC_API_KEY || 'dev_api_key', {
      encrypt: false,
      environment: 'development',
    });
  }
}

export class ProductionCredentialManager extends SecureCredentialManager {
  constructor(masterKey: string) {
    super(masterKey);
    
    // Set up production credentials with encryption and rotation
    if (process.env.MAPS_API_KEY) {
      this.setCredential('maps_api_key', process.env.MAPS_API_KEY, {
        encrypt: true,
        environment: 'production',
        rotationIntervalDays: 90, // Rotate every 3 months
      });
    }
    
    if (process.env.API_KEY) {
      this.setCredential('api_key', process.env.API_KEY, {
        encrypt: true,
        environment: 'production',
        rotationIntervalDays: 30, // Rotate monthly
      });
    }
  }
}

// Singleton instances
let credentialManager: SecureCredentialManager;

export function getCredentialManager(): SecureCredentialManager {
  if (!credentialManager) {
    if (process.env.NODE_ENV === 'production') {
      const masterKey = process.env.CREDENTIAL_MASTER_KEY;
      if (!masterKey) {
        throw new Error('CREDENTIAL_MASTER_KEY environment variable is required in production');
      }
      credentialManager = new ProductionCredentialManager(masterKey);
    } else {
      credentialManager = new DevelopmentCredentialManager();
    }
  }
  
  return credentialManager;
}

// Utility functions for common credential operations
export function getApiKey(name: string): string | null {
  return getCredentialManager().getCredential(name);
}

export function setApiKey(name: string, value: string, options?: any): void {
  getCredentialManager().setCredential(name, value, options);
}

export function rotateApiKey(name: string): Promise<CredentialRotationResult> {
  return getCredentialManager().rotateCredential(name);
}