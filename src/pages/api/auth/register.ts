import { NextApiRequest, NextApiResponse } from 'next';

// Mock user database (in production, use a real database)
let users = [
  {
    id: '1',
    phoneNumber: '+919876543210',
    name: 'Test User',
    role: 'passenger' as const,
    isActive: true,
    preferences: {
      language: 'en',
      notifications: true,
      theme: 'light' as const,
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

  const { phoneNumber, name } = req.body;

  if (!phoneNumber || !name) {
    return res.status(400).json({ 
      success: false, 
      message: 'Phone number and name are required' 
    });
  }

  // Check if user already exists
  const existingUser = users.find(u => u.phoneNumber === phoneNumber);
  if (existingUser) {
    return res.status(409).json({ 
      success: false, 
      message: 'User already registered. Please login instead.' 
    });
  }

  // Create new user
  const newUser = {
    id: (users.length + 1).toString(),
    phoneNumber,
    name,
    role: 'passenger' as const,
    isActive: true,
    preferences: {
      language: 'en',
      notifications: true,
      theme: 'light' as const,
      preferredRoutes: [],
      accessibilityNeeds: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  users.push(newUser);

  // Generate a simple token (in production, use JWT)
  const token = `token_${newUser.id}_${Date.now()}`;

  res.status(201).json({
    success: true,
    user: newUser,
    token,
    message: 'Registration successful'
  });
}