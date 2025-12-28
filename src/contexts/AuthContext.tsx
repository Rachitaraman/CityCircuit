/**
 * Authentication context for managing user session state across the application
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, User } from '../services/authService';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phoneNumber: string) => Promise<{ success: boolean; message: string; error?: string }>;
  register: (phoneNumber: string, name: string) => Promise<{ success: boolean; message: string; error?: string }>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  hasRole: (role: 'passenger' | 'operator' | 'admin') => boolean;
  hasAnyRole: (roles: ('passenger' | 'operator' | 'admin')[]) => boolean;
  isAdmin: () => boolean;
  isOperator: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing session
        const currentUser = authService.getCurrentUser();
        if (currentUser && authService.getToken()) {
          // Verify token is still valid
          const isValid = await authService.verifyToken();
          if (isValid) {
            setUser(authService.getCurrentUser());
          } else {
            // Token is invalid, clear auth
            authService.logout();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        authService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = async (phoneNumber: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ phoneNumber });
      if (response.success && response.user) {
        console.log('🔐 Login successful, updating user state:', response.user);
        setUser(response.user);
        // Force a small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.log('❌ Login failed:', response.message);
      }
      return {
        success: response.success,
        message: response.message,
        error: response.error,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (phoneNumber: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await authService.register({ phoneNumber, name });
      if (response.success && response.user) {
        console.log('📝 Registration successful, updating user state:', response.user);
        setUser(response.user);
        // Force a small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.log('❌ Registration failed:', response.message);
      }
      return {
        success: response.success,
        message: response.message,
        error: response.error,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshAuth = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      const token = authService.getToken();
      
      console.log('🔄 Refreshing auth state:', { hasUser: !!currentUser, hasToken: !!token });
      
      if (currentUser && token) {
        // Verify token is still valid
        const isValid = await authService.verifyToken();
        if (isValid) {
          console.log('✅ Auth refresh successful, setting user:', currentUser);
          setUser(currentUser);
        } else {
          console.log('❌ Token invalid during refresh, clearing auth');
          authService.logout();
          setUser(null);
        }
      } else {
        console.log('❌ No user or token found during refresh');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Auth refresh failed:', error);
      authService.logout();
      setUser(null);
    }
  };

  const hasRole = (role: 'passenger' | 'operator' | 'admin'): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: ('passenger' | 'operator' | 'admin')[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const isAdmin = (): boolean => {
    return authService.isAdmin();
  };

  const isOperator = (): boolean => {
    return authService.isOperator();
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user && !!authService.getToken(),
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshAuth,
    hasRole,
    hasAnyRole,
    isAdmin,
    isOperator,
  };

  // Debug log for authentication state
  useEffect(() => {
    console.log('🔍 Auth state changed:', {
      user: user?.name || 'none',
      isAuthenticated: !!user && !!authService.getToken(),
      hasToken: !!authService.getToken(),
      isLoading
    });
  }, [user, isLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use authentication context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook for role-based access control
 */
export const useRoleAccess = (allowedRoles: ('passenger' | 'operator' | 'admin')[]) => {
  const { user, hasAnyRole } = useAuth();
  
  return {
    hasAccess: hasAnyRole(allowedRoles),
    user,
    userRole: user?.role,
  };
};