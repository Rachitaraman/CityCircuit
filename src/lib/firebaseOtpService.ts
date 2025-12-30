// Client-side SMS OTP Service with Textbelt fallback
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  ConfirmationResult
} from 'firebase/auth';
import { auth } from './firebase';

interface OTPSession {
  phoneNumber: string;
  confirmationResult?: ConfirmationResult;
  otp?: string; // For Textbelt
  expiresAt: number;
  attempts: number;
  method: 'firebase' | 'textbelt';
}

class FirebaseOtpService {
  private otpSessions = new Map<string, OTPSession>();
  private recaptchaVerifier: RecaptchaVerifier | null = null;

  // Send SMS via Textbelt (free alternative)
  private async sendViaTextbelt(phoneNumber: string): Promise<{ success: boolean; message: string; otp?: string }> {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const response = await fetch('https://textbelt.com/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          message: `Your CityCircuit verification code is: ${otp}. Valid for 5 minutes.`,
          key: 'textbelt' // Free key
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Store session
        const expiresAt = Date.now() + (5 * 60 * 1000);
        this.otpSessions.set(phoneNumber, {
          phoneNumber,
          otp,
          expiresAt,
          attempts: 0,
          method: 'textbelt'
        });

        return {
          success: true,
          message: 'OTP sent via SMS',
          otp: process.env.NODE_ENV === 'development' ? otp : undefined
        };
      } else {
        throw new Error(result.error || 'SMS sending failed');
      }
    } catch (error: any) {
      console.error('Textbelt error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send SMS'
      };
    }
  }

  // Initialize reCAPTCHA verifier
  private getRecaptchaVerifier(): RecaptchaVerifier {
    if (!this.recaptchaVerifier) {
      this.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          this.recaptchaVerifier = null;
        }
      });
    }
    return this.recaptchaVerifier;
  }

  // Clean up expired sessions
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [phone, session] of this.otpSessions.entries()) {
      if (now > session.expiresAt) {
        this.otpSessions.delete(phone);
      }
    }
  }

  // Send OTP via Firebase or Textbelt fallback
  async sendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      this.cleanupExpired();

      // Format phone number
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      // Try Firebase first
      try {
        const recaptchaVerifier = this.getRecaptchaVerifier();
        const confirmationResult = await signInWithPhoneNumber(
          auth, 
          formattedPhone, 
          recaptchaVerifier
        );
        
        // Store Firebase session
        const expiresAt = Date.now() + (5 * 60 * 1000);
        this.otpSessions.set(phoneNumber, {
          phoneNumber: formattedPhone,
          confirmationResult,
          expiresAt,
          attempts: 0,
          method: 'firebase'
        });

        console.log(`📱 Firebase SMS sent to ${formattedPhone}`);
        
        return {
          success: true,
          message: 'OTP sent to your phone number'
        };
        
      } catch (firebaseError: any) {
        console.log('Firebase failed, trying Textbelt...', firebaseError.message);
        
        // Reset reCAPTCHA
        if (this.recaptchaVerifier) {
          this.recaptchaVerifier.clear();
          this.recaptchaVerifier = null;
        }
        
        // Fallback to Textbelt for US/Canada numbers
        if (formattedPhone.startsWith('+1')) {
          return await this.sendViaTextbelt(formattedPhone);
        } else {
          // For non-US numbers, show development OTP
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          
          const expiresAt = Date.now() + (5 * 60 * 1000);
          this.otpSessions.set(phoneNumber, {
            phoneNumber: formattedPhone,
            otp,
            expiresAt,
            attempts: 0,
            method: 'textbelt'
          });

          console.log(`📱 DEV MODE - OTP for ${formattedPhone}: ${otp}`);
          
          return {
            success: true,
            message: `Development Mode: Your OTP is ${otp} (Firebase billing not enabled)`
          };
        }
      }
      
    } catch (error: any) {
      console.error('OTP service error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send OTP'
      };
    }
  }

  // Verify OTP
  async verifyOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      this.cleanupExpired();
      
      const session = this.otpSessions.get(phoneNumber);
      
      if (!session) {
        return {
          success: false,
          message: 'OTP session not found. Please request a new OTP.'
        };
      }

      // Check if expired
      if (Date.now() > session.expiresAt) {
        this.otpSessions.delete(phoneNumber);
        return {
          success: false,
          message: 'OTP expired. Please request a new OTP.'
        };
      }

      // Check attempts
      if (session.attempts >= 3) {
        this.otpSessions.delete(phoneNumber);
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.'
        };
      }

      if (session.method === 'firebase' && session.confirmationResult) {
        // Verify with Firebase
        const result = await session.confirmationResult.confirm(otp);
        
        // Success - clean up session
        this.otpSessions.delete(phoneNumber);
        
        return {
          success: true,
          message: 'OTP verified successfully',
          user: result.user
        };
        
      } else if (session.method === 'textbelt' && session.otp) {
        // Verify with stored OTP
        if (session.otp === otp) {
          this.otpSessions.delete(phoneNumber);
          
          return {
            success: true,
            message: 'OTP verified successfully',
            user: { phoneNumber: session.phoneNumber, uid: `textbelt_${Date.now()}` }
          };
        } else {
          session.attempts++;
          
          if (session.attempts >= 3) {
            this.otpSessions.delete(phoneNumber);
            return {
              success: false,
              message: 'Too many failed attempts. Please request a new OTP.'
            };
          }
          
          return {
            success: false,
            message: `Invalid OTP. ${3 - session.attempts} attempts remaining.`
          };
        }
      }
      
      return {
        success: false,
        message: 'Invalid session. Please try again.'
      };
      
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      // Increment attempts
      const session = this.otpSessions.get(phoneNumber);
      if (session) {
        session.attempts++;
        
        if (session.attempts >= 3) {
          this.otpSessions.delete(phoneNumber);
          return {
            success: false,
            message: 'Too many failed attempts. Please request a new OTP.'
          };
        }
        
        return {
          success: false,
          message: `Invalid OTP. ${3 - session.attempts} attempts remaining.`
        };
      }
      
      return {
        success: false,
        message: 'Invalid OTP. Please try again.'
      };
    }
  }

  // Check if session exists
  hasValidSession(phoneNumber: string): boolean {
    const session = this.otpSessions.get(phoneNumber);
    return session ? Date.now() <= session.expiresAt : false;
  }
}

// Export singleton instance
export const firebaseOtpService = new FirebaseOtpService();