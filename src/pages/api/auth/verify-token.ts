import { NextApiRequest, NextApiResponse } from 'next';
import { userStorage } from '../../../lib/userStorage';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔐 Verify token API called:', { method: req.method, body: req.body });
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { token } = req.body;
  console.log('🔐 Token received:', token ? `${token.substring(0, 20)}...` : 'null');

  if (!token) {
    console.log('❌ No token provided');
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  // Simple token validation (in production, use proper JWT validation)
  if (!token.startsWith('token_')) {
    console.log('❌ Invalid token format');
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  // Extract user ID from token
  const userId = token.split('_')[1];
  console.log('🔐 Extracted user ID:', userId);
  
  const user = userStorage.findById(userId);
  console.log('🔐 User found:', user ? `${user.name} (${user.phoneNumber})` : 'null');

  if (!user) {
    console.log('❌ User not found for token');
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  console.log('✅ Token verification successful');
  res.status(200).json({
    success: true,
    user,
    message: 'Token valid'
  });
}