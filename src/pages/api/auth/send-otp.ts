import { NextApiRequest, NextApiResponse } from 'next';
import { otpService } from '../../../lib/otpService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  try {
    const result = await otpService.sendOTP(phoneNumber);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        // Include OTP in development for testing (remove in production)
        ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
}