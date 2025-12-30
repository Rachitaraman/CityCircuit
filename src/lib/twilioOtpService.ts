// Direct Twilio SMS OTP Service
import twilio from 'twilio';

interface TwilioOTPResponse {
  success: boolean;
  message: string;
  otp?: string;
}

class TwilioOtpService {
  private otpStorage = new Map<string, { otp: string; expiresAt: number; attempts: number }>();
  private twilioClient: twilio.Twilio | null = null;

  constructor() {
    // Initialize Twilio client if credentials are available
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      console.log('🔧 Twilio client initialized');
    } else {
      console.warn('⚠️ Twilio credentials not found');
    }
  }

  // Send OTP via Twilio SMS
  async sendOTP(phoneNumber: string): Promise<TwilioOTPResponse> {
    try {
      // Validate phone number format
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      if (!this.isValidPhoneNumber(formattedPhone)) {
        return {
          success: false,
          message: 'Invalid phone number format'
        };
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP with 5-minute expiry
      const expiresAt = Date.now() + (5 * 60 * 1000);
      this.otpStorage.set(phoneNumber, { otp, expiresAt, attempts: 0 });

      // Send SMS via Twilio if available
      if (this.twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const message = await this.twilioClient.messages.create({
            body: `Your CityCircuit verification code is: ${otp}. Valid for 5 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
          });
          
          console.log(`📱 SMS sent via Twilio to ${formattedPhone}, SID: ${message.sid}`);
          
          return {
            success: true,
            message: 'OTP sent successfully via SMS'
          };
        } catch (twilioError: any) {
          console.error('❌ Twilio SMS error:', twilioError);
          
          // Fall back to console logging
          console.log(`📱 FALLBACK - OTP for ${formattedPhone}: ${otp}`);
          
          return {
            success: true,
            message: `SMS failed, OTP: ${otp} (check console)`,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
          };
        }
      } else {
        // No Twilio configured - console mode
        console.log(`📱 CONSOLE MODE - OTP for ${formattedPhone}: ${otp}`);
        
        return {
          success: true,
          message: `OTP: ${otp} (Twilio not configured)`,
          otp: process.env.NODE_ENV === 'development' ? otp : undefined
        };
      }
    } catch (error: any) {
      console.error('❌ OTP service error:', error);
      return {
        success: false,
        message: 'Failed to send OTP'
      };
    }
  }

  // Verify OTP
  async verifyOTP(phoneNumber: string, inputOTP: string): Promise<{ success: boolean; message: string }> {
    try {
      const otpData = this.otpStorage.get(phoneNumber);
      
      if (!otpData) {
        return {
          success: false,
          message: 'OTP not found. Please request a new OTP.'
        };
      }

      // Check if expired
      if (Date.now() > otpData.expiresAt) {
        this.otpStorage.delete(phoneNumber);
        return {
          success: false,
          message: 'OTP expired. Please request a new OTP.'
        };
      }

      // Check attempts
      if (otpData.attempts >= 3) {
        this.otpStorage.delete(phoneNumber);
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.'
        };
      }

      // Verify OTP
      if (otpData.otp === inputOTP) {
        this.otpStorage.delete(phoneNumber);
        return {
          success: true,
          message: 'OTP verified successfully'
        };
      } else {
        otpData.attempts++;
        return {
          success: false,
          message: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.`
        };
      }
    } catch (error: any) {
      console.error('❌ OTP verification error:', error);
      return {
        success: false,
        message: 'Failed to verify OTP'
      };
    }
  }

  // Validate phone number
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Indian numbers: +91XXXXXXXXXX
    if (phoneNumber.match(/^\+91[6-9]\d{9}$/)) {
      return true;
    }
    // US numbers: +1XXXXXXXXXX
    if (phoneNumber.match(/^\+1[2-9]\d{9}$/)) {
      return true;
    }
    return false;
  }

  // Clean up expired OTPs
  cleanupExpired(): void {
    const now = Date.now();
    for (const [phone, data] of this.otpStorage.entries()) {
      if (now > data.expiresAt) {
        this.otpStorage.delete(phone);
      }
    }
  }
}

// Export singleton instance
export const twilioOtpService = new TwilioOtpService();