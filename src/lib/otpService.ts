// OTP Service for phone verification
// In production, integrate with SMS service like Twilio, AWS SNS, etc.

interface OTPData {
  phoneNumber: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP storage (use Redis in production)
const otpStorage = new Map<string, OTPData>();

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

      // In production, send SMS here
      console.log(`📱 OTP for ${phoneNumber}: ${otp}`);
      
      return {
        success: true,
        message: 'OTP sent successfully',
        otp // Remove this in production!
      };
    } catch (error) {
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