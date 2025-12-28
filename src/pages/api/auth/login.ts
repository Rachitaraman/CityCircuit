import { NextApiRequest, NextApiResponse } from 'next';
import { userStorage } from '../../lib/userStorage';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  // Find user by phone number
  const user = userStorage.findByPhoneNumber(phoneNumber);

  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'User not registered. Please register first.' 
    });
  }

  // Update last login
  userStorage.updateLastLogin(user.id);

  // Generate a simple token (in production, use JWT)
  const token = `token_${user.id}_${Date.now()}`;

  res.status(200).json({
    success: true,
    user,
    token,
    message: 'Login successful'
  });
}