import { NextApiRequest, NextApiResponse } from 'next';

// Mock user database
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

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  // Simple token validation (in production, use proper JWT validation)
  if (!token.startsWith('token_')) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  // Extract user ID from token
  const userId = token.split('_')[1];
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  res.status(200).json({
    success: true,
    user,
    message: 'Token valid'
  });
}