/**
 * Phone-based Authentication Service
 * Handles registration and login with phone numbers only
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  role: 'passenger' | 'operator' | 'admin';
  isActive: boolean;
  preferences: {
    language: string;
    notifications: boolean;
    theme: 'light' | 'dark';
    preferredRoutes: string[];
    accessibilityNeeds: string[];
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message: string;
  error?: string;
}

export interface RegisterData {
  phoneNumber: string;
  name: string;
}

export interface LoginData {
  phoneNumber: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load token and user from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('auth_user');
      if (userData) {
        try {
          this.user = JSON.parse(userData);
        } catch (error) {
          console.error('Error parsing user data from localStorage:', error);
          this.clearAuth();
        }
      }
    }
  }

  /**
   * Register a new user with phone number and name
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: AuthResponse = await response.json();

      if (result.success && result.user && result.token) {
        this.setAuth(result.user, result.token);
      }

      return result;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Network error occurred during registration',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Login with phone number
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: AuthResponse = await response.json();

      if (result.success && result.user && result.token) {
        this.setAuth(result.user, result.token);
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error occurred during login',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify current token
   */
  async verifyToken(): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: this.token }),
      });

      const result = await response.json();

      if (result.success && result.user) {
        this.user = result.user;
        this.saveUserToStorage(result.user);
        return true;
      } else {
        this.clearAuth();
        return false;
      }
    } catch (error) {
      console.error('Token verification error:', error);
      this.clearAuth();
      return false;
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearAuth();
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.user;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.token && this.user);
  }

  /**
   * Check if user has admin role
   */
  isAdmin(): boolean {
    return this.user?.role === 'admin' || false;
  }

  /**
   * Check if user has operator role
   */
  isOperator(): boolean {
    return this.user?.role === 'operator' || false;
  }

  /**
   * Format phone number for display
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Indian phone numbers (+91)
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    
    // Handle 10-digit numbers (assume Indian)
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    
    // Return as-is if format is unclear
    return phoneNumber;
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check for valid Indian phone number formats
    if (cleaned.length === 10) {
      // 10-digit number starting with 6, 7, 8, or 9
      return /^[6-9]\d{9}$/.test(cleaned);
    }
    
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      // 12-digit number with country code
      return /^91[6-9]\d{9}$/.test(cleaned);
    }
    
    return false;
  }

  /**
   * Normalize phone number to standard format
   */
  static normalizePhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing
    if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    
    // Add + if missing
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    
    // Return as-is if already in correct format
    if (phoneNumber.startsWith('+91') && phoneNumber.length === 13) {
      return phoneNumber;
    }
    
    return phoneNumber;
  }

  /**
   * Set authentication data
   */
  private setAuth(user: User, token: string): void {
    this.user = user;
    this.token = token;
    this.saveToStorage(user, token);
  }

  /**
   * Clear authentication data
   */
  private clearAuth(): void {
    this.user = null;
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }

  /**
   * Save authentication data to localStorage
   */
  private saveToStorage(user: User, token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
  }

  /**
   * Save user data to localStorage
   */
  private saveUserToStorage(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;