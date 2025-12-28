import { NextApiRequest, NextApiResponse } from 'next';
import { userStorage } from '../../../lib/userStorage';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('📝 Register API called:', { method: req.method, body: req.body });
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { phoneNumber, name } = req.body;
  console.log('📝 Registration data:', { phoneNumber, name });

  if (!phoneNumber || !name) {
    console.log('❌ Missing registration data');
    return res.status(400).json({ 
      success: false, 
      message: 'Phone number and name are required' 
    });
  }

  // Check if user already exists
  const userExists = userStorage.exists(phoneNumber);
  console.log('📝 User exists check:', { phoneNumber, exists: userExists });
  
  if (userExists) {
    console.log('❌ User already exists');
    return res.status(409).json({ 
      success: false, 
      message: 'User already registered. Please login instead.' 
    });
  }

  // Create new user
  console.log('✅ Creating new user...');
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
  console.log('✅ User created successfully:', { userId: newUser.id, name: newUser.name });

  res.status(201).json({
    success: true,
    user: newUser,
    token,
    message: 'Registration successful'
  });
}