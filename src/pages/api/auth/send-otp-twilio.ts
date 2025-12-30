import { NextApiRequest, NextApiResponse } from 'next';
import twilio from 'twilio';

// In-memory OTP storage (use Redis in production)
const otpStorage = new Map<string, { otp: string; expiresAt: number }>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ 
      success: false, 
      message: 'Phone number is required' 
    });
  }

  try {
    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 5-minute expiry
    const expiresAt = Date.now() + (5 * 60 * 1000);
    otpStorage.set(phoneNumber, { otp, expiresAt });

    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      console.log(`📱 DEMO MODE - OTP for ${formattedPhone}: ${otp}`);
      return res.status(200).json({
        success: true,
        message: `Demo Mode - OTP: ${otp} (Twilio not configured)`,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      });
    }

    const client = twilio(accountSid, authToken);

    // Send SMS
    const message = await client.messages.create({
      body: `Your CityCircuit verification code is: ${otp}. Valid for 5 minutes.`,
      from: twilioPhone,
      to: formattedPhone
    });

    console.log(`📱 SMS sent via Twilio to ${formattedPhone}, SID: ${message.sid}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully via SMS',
      messageSid: message.sid
    });

  } catch (error: any) {
    console.error('❌ Twilio SMS error:', error);
    
    // Fallback - show OTP in response for development
    const otpData = otpStorage.get(phoneNumber);
    
    res.status(200).json({
      success: true,
      message: `SMS failed - OTP: ${otpData?.otp || 'Error'} (Fallback mode)`,
      otp: process.env.NODE_ENV === 'development' ? otpData?.otp : undefined,
      error: error.message
    });
  }
}

// Export OTP verification function
export async function verifyOTP(phoneNumber: string, inputOTP: string): Promise<{ success: boolean; message: string }> {
  const otpData = otpStorage.get(phoneNumber);
  
  if (!otpData) {
    return { success: false, message: 'OTP not found' };
  }

  if (Date.now() > otpData.expiresAt) {
    otpStorage.delete(phoneNumber);
    return { success: false, message: 'OTP expired' };
  }

  if (otpData.otp === inputOTP) {
    otpStorage.delete(phoneNumber);
    return { success: true, message: 'OTP verified successfully' };
  }

  return { success: false, message: 'Invalid OTP' };
}