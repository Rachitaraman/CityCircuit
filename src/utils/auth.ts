/**
 * Authentication utilities for JWT token management and user session handling
 */

import jwt from 'jsonwebtoken';
import { User, UserRole } from '../types';

// JWT configuration
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(user: User): string {
  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as AuthTokenPayload;
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
}

/**
 * Extract user info from token
 */
export function getUserFromToken(token: string): AuthTokenPayload | null {
  if (isTokenExpired(token)) return null;
  return verifyToken(token);
}

/**
 * Mock authentication service - in production, this would call your backend API
 */
export class AuthService {
  private static readonly STORAGE_KEY = 'citycircuit_auth_token';
  private static readonly USER_KEY = 'citycircuit_user';

  /**
   * Authenticate user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Mock authentication - in production, this would be an API call
      const mockUsers: User[] = [
        {
          id: 'user_001',
          email: 'operator@citycircuit.com',
          phoneNumber: '+91-9876543210',
          name: 'Bus Operator',
          role: 'operator',
          isAdmin: false,
          isActive: true,
          profile: {
            name: 'Bus Operator',
            organization: 'Mumbai Transport Authority',
            preferences: {
              language: 'en',
              theme: 'light',
              notifications: true,
              mapStyle: 'default',
              preferredRoutes: [],
              accessibilityNeeds: [],
              preferredRoutes: [],
            accessibilityNeeds: [],
          },
          },
          preferences: {
            language: 'en',
            theme: 'light',
            notifications: true,
            mapStyle: 'default',
            preferredRoutes: [],
            accessibilityNeeds: [],
          },
          createdAt: new Date('2024-01-01'),
          lastLoginAt: new Date(),
        },
        {
          id: 'user_002',
          email: 'passenger@citycircuit.com',
          phoneNumber: '+91-9876543211',
          name: 'Regular Passenger',
          role: 'passenger',
          isAdmin: false,
          isActive: true,
          profile: {
            name: 'Regular Passenger',
            preferences: {
              language: 'en',
              theme: 'light',
              notifications: true,
              mapStyle: 'default',
              preferredRoutes: [],
              accessibilityNeeds: [],
            },
          },
          preferences: {
            language: 'en',
            theme: 'light',
            notifications: true,
            mapStyle: 'default',
            preferredRoutes: [],
            accessibilityNeeds: [],
          },
          createdAt: new Date('2024-01-01'),
          lastLoginAt: new Date(),
        },
        {
          id: 'user_003',
          email: 'admin@citycircuit.com',
          phoneNumber: '+91-9876543212',
          name: 'System Administrator',
          role: 'admin',
          isAdmin: true,
          isActive: true,
          profile: {
            name: 'System Administrator',
            organization: 'CityCircuit Tech',
            preferences: {
              language: 'en',
              theme: 'dark',
              notifications: true,
              mapStyle: 'satellite',
              preferredRoutes: [],
              accessibilityNeeds: [],
            },
          },
          preferences: {
            language: 'en',
            theme: 'dark',
            notifications: true,
            mapStyle: 'satellite',
            preferredRoutes: [],
            accessibilityNeeds: [],
          },
          createdAt: new Date('2024-01-01'),
          lastLoginAt: new Date(),
        },
      ];

      // Simple mock authentication
      const user = mockUsers.find(u => u.email === credentials.email);
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // In production, you would verify the password hash
      if (credentials.password !== 'password123') {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Update last login time
      user.lastLoginAt = new Date();

      // Generate token
      const token = generateToken(user);

      // Store in localStorage (in production, consider httpOnly cookies)
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }

      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  /**
   * Logout user and clear session
   */
  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  /**
   * Get current authenticated user
   */
  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;

    try {
      const token = localStorage.getItem(this.STORAGE_KEY);
      const userStr = localStorage.getItem(this.USER_KEY);

      if (!token || !userStr) return null;

      if (isTokenExpired(token)) {
        this.logout();
        return null;
      }

      return JSON.parse(userStr) as User;
    } catch {
      this.logout();
      return null;
    }
  }

  /**
   * Get current auth token
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem(this.STORAGE_KEY);
    if (!token || isTokenExpired(token)) {
      this.logout();
      return null;
    }

    return token;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Check if user has specific role
   */
  static hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(roles: UserRole[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(preferences: Partial<User['profile']['preferences']>): Promise<boolean> {
    try {
      const user = this.getCurrentUser();
      if (!user) return false;

      // Update user preferences
      user.profile.preferences = {
        ...user.profile.preferences,
        ...preferences,
      };

      // Store updated user
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }

      // In production, this would sync with the backend API
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Refresh token if needed
   */
  static async refreshTokenIfNeeded(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = jwt.decode(token) as AuthTokenPayload;
      if (!decoded || !decoded.exp) return false;

      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - currentTime;

      // Refresh if token expires in less than 1 hour
      if (timeUntilExpiry < 3600) {
        const user = this.getCurrentUser();
        if (user) {
          const newToken = generateToken(user);
          if (typeof window !== 'undefined') {
            localStorage.setItem(this.STORAGE_KEY, newToken);
          }
          return true;
        }
      }

      return true;
    } catch {
      this.logout();
      return false;
    }
  }
}