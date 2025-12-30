import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  try {
    // For Firebase Phone Auth, the actual SMS sending happens on the client-side
    // This API route just validates the request and returns success
    // The client will handle Firebase Phone Auth directly
    
    console.log(`📱 OTP request for ${phoneNumber} - will be handled by Firebase on client`);
    
    res.status(200).json({
      success: true,
      message: 'Ready to send OTP via Firebase',
      useFirebase: true // Signal to client to use Firebase
    });
    
  } catch (error) {
    console.error('Send OTP API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process OTP request'
    });
  }
}