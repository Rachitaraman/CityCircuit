import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Generate realistic stats
  const stats = {
    activeRoutes: Math.floor(Math.random() * 50) + 150, // 150-200
    totalUsers: Math.floor(Math.random() * 1000) + 5000, // 5000-6000
    dailyPassengers: Math.floor(Math.random() * 500000) + 2000000, // 2M-2.5M
    avgOptimization: Math.floor(Math.random() * 15) + 80, // 80-95%
    systemUptime: '99.9%',
    lastUpdated: new Date().toISOString()
  };

  res.status(200).json(stats);
}