// OTP Service for phone verification with Firebase Phone Auth
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  ConfirmationResult
} from 'firebase/auth';
import { auth } from './firebase';

// Global type declaration for development persistence
declare global {
  var otpStorage: Map<string, OTPData> | undefined;
  var recaptchaVerifier: RecaptchaVerifier | undefined;
}

interface OTPData {
  phoneNumber: string;
  confirmationResult: ConfirmationResult;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP storage for Firebase confirmation results
let otpStorage: Map<string, OTPData>;

if (process.env.NODE_ENV === 'development') {
  // Use global storage in development to persist across hot reloads
  if (!global.otpStorage) {
    global.otpStorage = new Map<string, OTPData>();
  }
  otpStorage = global.otpStorage;
} else {
  // Use regular Map in production
  otpStorage = new Map<string, OTPData>();
}

// Initialize reCAPTCHA verifier for Firebase
const getRecaptchaVerifier = () => {
  if (typeof window === 'undefined') {
    return null; // Server-side, return null
  }

  if (!global.recaptchaVerifier) {
    // Create invisible reCAPTCHA
    global.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: (response: any) => {
        console.log('reCAPTCHA solved');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
        global.recaptchaVerifier = undefined;
      }
    });
  }
  
  return global.recaptchaVerifier;
};

export const otpService = {
  // Clean up expired OTPs
  cleanupExpired: () => {
    const now = Date.now();
    let cleaned = 0;
    for (const [phone, data] of otpStorage.entries()) {
      if (now > data.expiresAt) {
        otpStorage.delete(phone);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired OTPs`);
    }
  },

  // Debug function to see all stored OTPs
  debugStorage: () => {
    console.log('🔍 Current OTP storage:', {
      size: otpStorage.size,
      entries: Array.from(otpStorage.entries()).map(([phone, data]) => ({
        phone,
        expiresAt: new Date(data.expiresAt).toISOString(),
        attempts: data.attempts,
        isExpired: Date.now() > data.expiresAt
      }))
    });
  },

  // Generate and send OTP using Firebase
  sendOTP: async (phoneNumber: string): Promise<{ success: boolean; message: string; otp?: string }> => {
    try {
      // Clean up expired OTPs first
      otpService.cleanupExpired();

      // Format phone number (ensure it starts with country code)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      // Check if we're on server-side (API route)
      if (typeof window === 'undefined') {
        // Server-side: We can't use Firebase Auth directly
        // Return success and let client handle Firebase
        console.log(`📱 Firebase SMS request for ${formattedPhone} (handled client-side)`);
        
        return {
          success: true,
          message: 'Please complete verification on the client'
        };
      }

      // Client-side: Use Firebase Phone Auth
      const recaptchaVerifier = getRecaptchaVerifier();
      
      if (!recaptchaVerifier) {
        throw new Error('reCAPTCHA verifier not available');
      }

      // Send OTP via Firebase
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhone, 
        recaptchaVerifier
      );
      
      // Store confirmation result with 5-minute expiry
      const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
      
      otpStorage.set(phoneNumber, {
        phoneNumber: formattedPhone,
        confirmationResult,
        expiresAt,
        attempts: 0
      });

      console.log(`📱 Firebase SMS sent to ${formattedPhone}`);
      
      return {
        success: true,
        message: 'OTP sent to your phone number via Firebase'
      };
      
    } catch (error: any) {
      console.error('Firebase OTP service error:', error);
      
      // Reset reCAPTCHA on error
      if (global.recaptchaVerifier) {
        global.recaptchaVerifier.clear();
        global.recaptchaVerifier = undefined;
      }
      
      return {
        success: false,
        message: error.message || 'Failed to send OTP'
      };
    }
  },

  // Verify OTP using Firebase
  verifyOTP: async (phoneNumber: string, inputOTP: string): Promise<{ success: boolean; message: string; user?: any }> => {
    try {
      // Clean up expired OTPs first
      otpService.cleanupExpired();
      
      const otpData = otpStorage.get(phoneNumber);
      
      if (!otpData) {
        return {
          success: false,
          message: 'OTP session not found. Please request a new OTP.'
        };
      }

      // Check if OTP expired
      if (Date.now() > otpData.expiresAt) {
        otpStorage.delete(phoneNumber);
        return {
          success: false,
          message: 'OTP expired. Please request a new OTP.'
        };
      }

      // Check attempts
      if (otpData.attempts >= 3) {
        otpStorage.delete(phoneNumber);
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.'
        };
      }

      // Verify OTP with Firebase
      const result = await otpData.confirmationResult.confirm(inputOTP);
      
      // OTP verified successfully
      otpStorage.delete(phoneNumber);
      
      return {
        success: true,
        message: 'OTP verified successfully',
        user: result.user
      };
      
    } catch (error: any) {
      console.error('Firebase OTP verification error:', error);
      
      // Increment attempts on failure
      const otpData = otpStorage.get(phoneNumber);
      if (otpData) {
        otpData.attempts++;
        
        if (otpData.attempts >= 3) {
          otpStorage.delete(phoneNumber);
          return {
            success: false,
            message: 'Too many failed attempts. Please request a new OTP.'
          };
        }
        
        return {
          success: false,
          message: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.`
        };
      }
      
      return {
        success: false,
        message: error.message || 'Failed to verify OTP'
      };
    }
  },

  // Check if OTP exists and is valid
  hasValidOTP: (phoneNumber: string): boolean => {
    const otpData = otpStorage.get(phoneNumber);
    return otpData ? Date.now() <= otpData.expiresAt : false;
  }
};