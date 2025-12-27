import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import authService, { AuthResponse } from '../../services/authService';

// Import the AuthService class for static methods
class AuthService {
  static validatePhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return /^[6-9]\d{9}$/.test(cleaned);
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return /^91[6-9]\d{9}$/.test(cleaned);
    }
    return false;
  }

  static normalizePhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    if (phoneNumber.startsWith('+91') && phoneNumber.length === 13) {
      return phoneNumber;
    }
    return phoneNumber;
  }
}

export interface PhoneRegisterFormProps {
  onSuccess?: (user: any) => void;
  onCancel?: () => void;
  onSwitchToLogin?: () => void;
  initialPhoneNumber?: string;
}

const PhoneRegisterForm: React.FC<PhoneRegisterFormProps> = ({
  onSuccess,
  onCancel,
  onSwitchToLogin,
  initialPhoneNumber = '',
}) => {
  const [formData, setFormData] = useState({
    phoneNumber: initialPhoneNumber,
    name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate phone number
    if (!AuthService.validatePhoneNumber(formData.phoneNumber)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    // Validate name
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return;
    }

    setIsLoading(true);

    try {
      const normalizedPhone = AuthService.normalizePhoneNumber(formData.phoneNumber);
      const response: AuthResponse = await authService.register({
        phoneNumber: normalizedPhone,
        name: formData.name.trim(),
      });

      if (response.success && response.user) {
        onSuccess?.(response.user);
      } else {
        setError(response.message || response.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (field === 'phoneNumber') {
      // Allow only digits and basic formatting
      const cleaned = value.replace(/[^\d\s\-\+\(\)]/g, '');
      setFormData(prev => ({ ...prev, [field]: cleaned }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Create Account</h2>
        <p className="text-neutral-600">Register with your phone number to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="Enter your full name"
            className="block w-full px-3 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            required
            maxLength={50}
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-neutral-700 mb-2">
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-neutral-500 text-sm">+91</span>
            </div>
            <input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleInputChange('phoneNumber')}
              placeholder="Enter 10-digit phone number"
              className="block w-full pl-12 pr-3 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              required
              maxLength={15}
              autoComplete="tel"
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Example: 9876543210
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-3"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            {error.includes('already registered') && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Sign in instead →
                </button>
              </div>
            )}
          </motion.div>
        )}

        <div className="flex space-x-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={isLoading || !formData.phoneNumber.trim() || !formData.name.trim()}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-primary-600 hover:text-primary-700 font-medium"
            disabled={isLoading}
          >
            Sign in here
          </button>
        </p>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-neutral-500">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </motion.div>
  );
};

export { PhoneRegisterForm };