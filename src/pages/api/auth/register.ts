import { NextApiRequest, NextApiResponse } from 'next';
import { userStorage } from '../../lib/userStorage';

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
  if (userStorage.exists(phoneNumber)) {
    return res.status(409).json({ 
      success: false, 
      message: 'User already registered. Please login instead.' 
    });
  }

  // Create new user
  const newUser = userStorage.create({
    phoneNumber,
    name,
    role: 'passenger',
    isActive: true,
    preferences: {
      language: 'en',
      notifications: true,
      theme: 'light',
      preferredRoutes: [],
      accessibilityNeeds: []
    }
  });

  // Generate a simple token (in production, use JWT)
  const token = `token_${newUser.id}_${Date.now()}`;

  res.status(201).json({
    success: true,
    user: newUser,
    token,
    message: 'Registration successful'
  });
}