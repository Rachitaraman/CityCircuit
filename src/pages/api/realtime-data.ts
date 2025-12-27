import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Generate mock real-time data
  const realTimeData = {
    timestamp: new Date().toISOString(),
    activeRoutes: Math.floor(Math.random() * 50) + 150,
    livePassengers: Math.floor(Math.random() * 10000) + 50000,
    systemAlerts: [
      {
        id: 'alert_1',
        type: 'info',
        message: 'Route optimization completed for Zone A',
        timestamp: new Date().toISOString()
      },
      {
        id: 'alert_2', 
        type: 'warning',
        message: 'High traffic detected on Western Express Highway',
        timestamp: new Date().toISOString()
      }
    ],
    routeUpdates: [
      {
        routeId: 'route_001',
        status: 'active',
        passengerCount: Math.floor(Math.random() * 100) + 20,
        delay: Math.floor(Math.random() * 10) // minutes
      }
    ]
  };

  res.status(200).json({
    success: true,
    data: realTimeData,
    isConnected: true
  });
}