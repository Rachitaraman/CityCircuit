import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { OTPVerification } from './OTPVerification';
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

export interface PhoneLoginFormProps {
  onSuccess?: (user: any) => void;
  onCancel?: () => void;
  onSwitchToRegister?: () => void;
}

const PhoneLoginForm: React.FC<PhoneLoginFormProps> = ({
  onSuccess,
  onCancel,
  onSwitchToRegister,
}) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate phone number
    if (!AuthService.validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    const normalized = AuthService.normalizePhoneNumber(phoneNumber);
    setNormalizedPhone(normalized);

    try {
      // Send OTP directly for login - we'll check user existence after OTP verification
      const otpResponse = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalized })
      });

      const otpData = await otpResponse.json();

      if (otpData.success) {
        setStep('otp');
        // Show OTP in development
        if (otpData.otp) {
          console.log('🔢 Login OTP:', otpData.otp);
        }
      } else {
        setError(otpData.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerified = async () => {
    try {
      // First check if user exists for login
      const loginResponse: AuthResponse = await authService.login({
        phoneNumber: normalizedPhone,
      });

      if (!loginResponse.success) {
        setError('User not registered. Please register first.');
        setStep('phone');
        return;
      }

      // User exists and OTP verified, complete login
      if (loginResponse.user) {
        onSuccess?.(loginResponse.user);
      } else {
        setError('Login failed');
        setStep('phone');
      }
    } catch (error) {
      console.error('Login completion error:', error);
      setError('Login failed. Please try again.');
      setStep('phone');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only digits and basic formatting
    const cleaned = value.replace(/[^\d\s\-\+\(\)]/g, '');
    setPhoneNumber(cleaned);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  if (step === 'otp') {
    return (
      <OTPVerification
        phoneNumber={normalizedPhone}
        onVerified={handleOTPVerified}
        onBack={() => setStep('phone')}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Welcome Back</h2>
        <p className="text-neutral-600">Enter your phone number to sign in</p>
      </div>

      <form onSubmit={handlePhoneSubmit} className="space-y-4">
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
              value={phoneNumber}
              onChange={handlePhoneChange}
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
            {error.includes('not registered') && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Register with this number →
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
            disabled={isLoading || !phoneNumber.trim()}
            loading={isLoading}
          >
            {isLoading ? 'Sending OTP...' : 'Send OTP'}
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
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-primary-600 hover:text-primary-700 font-medium"
            disabled={isLoading}
          >
            Register here
          </button>
        </p>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-neutral-500">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </motion.div>
  );
};

export { PhoneLoginForm };