// OTP Service for phone verification with Twilio SMS
import twilio from 'twilio';

interface OTPData {
  phoneNumber: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP storage (use Redis in production)
const otpStorage = new Map<string, OTPData>();

// Initialize Twilio client only when needed and valid
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  // Only create client if we have valid credentials (not placeholder values)
  if (accountSid && authToken && 
      accountSid !== 'your-twilio-account-sid' && 
      authToken !== 'your-twilio-auth-token' &&
      accountSid.startsWith('AC')) {
    return twilio(accountSid, authToken);
  }
  
  return null;
};

export const otpService = {
  // Generate and send OTP
  sendOTP: async (phoneNumber: string): Promise<{ success: boolean; message: string; otp?: string }> => {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP with 5-minute expiry
      const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
      
      otpStorage.set(phoneNumber, {
        phoneNumber,
        otp,
        expiresAt,
        attempts: 0
      });

      // Send SMS via Twilio (production) or console (development)
      const twilioClient = getTwilioClient();
      if (twilioClient && process.env.TWILIO_PHONE_NUMBER && process.env.NODE_ENV === 'production') {
        try {
          await twilioClient.messages.create({
            body: `Your CityCircuit verification code is: ${otp}. Valid for 5 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
          });
          
          console.log(`📱 SMS sent to ${phoneNumber}`);
          
          return {
            success: true,
            message: 'OTP sent to your phone number'
          };
        } catch (twilioError) {
          console.error('Twilio SMS error:', twilioError);
          
          // Fallback to console in case of SMS failure
          console.log(`📱 SMS FAILED - OTP for ${phoneNumber}: ${otp}`);
          
          return {
            success: true,
            message: 'OTP sent (SMS service temporarily unavailable - check console)',
            otp // Include OTP for development fallback
          };
        }
      } else {
        // Development mode - show OTP in console
        console.log(`📱 DEV MODE - OTP for ${phoneNumber}: ${otp}`);
        
        return {
          success: true,
          message: 'OTP sent successfully (development mode)',
          otp // Include OTP for development
        };
      }
    } catch (error) {
      console.error('OTP service error:', error);
      return {
        success: false,
        message: 'Failed to send OTP'
      };
    }
  },

  // Verify OTP
  verifyOTP: (phoneNumber: string, inputOTP: string): { success: boolean; message: string } => {
    const otpData = otpStorage.get(phoneNumber);
    
    if (!otpData) {
      return {
        success: false,
        message: 'OTP not found. Please request a new OTP.'
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

    // Verify OTP
    if (otpData.otp !== inputOTP) {
      otpData.attempts++;
      return {
        success: false,
        message: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.`
      };
    }

    // OTP verified successfully
    otpStorage.delete(phoneNumber);
    return {
      success: true,
      message: 'OTP verified successfully'
    };
  },

  // Check if OTP exists and is valid
  hasValidOTP: (phoneNumber: string): boolean => {
    const otpData = otpStorage.get(phoneNumber);
    return otpData ? Date.now() <= otpData.expiresAt : false;
  }
};