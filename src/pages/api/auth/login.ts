import { NextApiRequest, NextApiResponse } from 'next';

// Mock user database (in production, use a real database)
const users = [
  {
    id: '1',
    phoneNumber: '+919876543210',
    name: 'Test User',
    role: 'passenger',
    isActive: true,
    preferences: {
      language: 'en',
      notifications: true,
      theme: 'light',
      preferredRoutes: [],
      accessibilityNeeds: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  }
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  // Find user by phone number
  const user = users.find(u => u.phoneNumber === phoneNumber);

  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'User not registered. Please register first.' 
    });
  }

  // Generate a simple token (in production, use JWT)
  const token = `token_${user.id}_${Date.now()}`;

  // Update last login
  user.lastLoginAt = new Date().toISOString();

  res.status(200).json({
    success: true,
    user,
    token,
    message: 'Login successful'
  });
}