import { NextApiRequest, NextApiResponse } from 'next';
import { userStorage } from '../../lib/userStorage';

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
  const user = userStorage.findById(userId);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  res.status(200).json({
    success: true,
    user,
    message: 'Token valid'
  });
}