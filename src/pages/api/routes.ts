import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { origin, destination, limit = '10' } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ 
      success: false, 
      message: 'Origin and destination are required' 
    });
  }

  try {
    // Load Mumbai bus stops data
    const busStopsPath = path.join(process.cwd(), 'public', 'data', 'mumbai-bus-stops.json');
    const busStopsData = JSON.parse(fs.readFileSync(busStopsPath, 'utf8'));

    // Find origin and destination stops
    const originStop = busStopsData.find((stop: any) => stop.name === origin);
    const destinationStop = busStopsData.find((stop: any) => stop.name === destination);

    if (!originStop || !destinationStop) {
      return res.status(404).json({
        success: false,
        message: 'Origin or destination stop not found'
      });
    }

    // Generate realistic routes
    const routes = generateRoutes(busStopsData, originStop, destinationStop, parseInt(limit as string));

    res.status(200).json({
      success: true,
      routes,
      total: routes.length
    });

  } catch (error) {
    console.error('Route generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate routes'
    });
  }
}

function generateRoutes(allStops: any[], origin: any, destination: any, limit: number) {
  const routes = [];
  const routeCount = Math.min(limit, 4); // Generate 2-4 routes

  for (let i = 0; i < routeCount; i++) {
    // Generate intermediate stops
    const intermediateStops = generateIntermediateStops(allStops, origin, destination, i);
    
    // Calculate route metrics
    const totalStops = 2 + intermediateStops.length;
    const estimatedTime = calculateEstimatedTime(totalStops, origin, destination);
    const optimizationScore = Math.floor(Math.random() * 30) + 70; // 70-100%
    
    const route = {
      id: `route_${Date.now()}_${i}`,
      name: generateRouteName(origin.name, destination.name, i),
      description: generateRouteDescription(origin.name, destination.name, i),
      operatorId: 'mumbai-best-001',
      estimatedTravelTime: estimatedTime,
      optimizationScore: optimizationScore,
      stops: [
        {
          id: `stop_${origin.name}`,
          name: origin.name,
          coordinates: { latitude: origin.latitude, longitude: origin.longitude },
          isAccessible: Math.random() > 0.3,
        },
        ...intermediateStops.map((stop: any, idx: number) => ({
          id: `stop_${stop.name}_${idx}`,
          name: stop.name,
          coordinates: { latitude: stop.latitude, longitude: stop.longitude },
          isAccessible: Math.random() > 0.3,
        })),
        {
          id: `stop_${destination.name}`,
          name: destination.name,
          coordinates: { latitude: destination.latitude, longitude: destination.longitude },
          isAccessible: Math.random() > 0.3,
        },
      ],
      isActive: true,
    };

    routes.push(route);
  }

  return routes;
}

function generateIntermediateStops(allStops: any[], origin: any, destination: any, routeIndex: number) {
  // Filter stops that are geographically between origin and destination
  const intermediateStops = allStops.filter((stop: any) => {
    if (stop.name === origin.name || stop.name === destination.name) return false;
    
    // Simple geographic filtering
    const minLat = Math.min(origin.latitude, destination.latitude);
    const maxLat = Math.max(origin.latitude, destination.latitude);
    const minLng = Math.min(origin.longitude, destination.longitude);
    const maxLng = Math.max(origin.longitude, destination.longitude);
    
    return stop.latitude >= minLat - 0.01 && stop.latitude <= maxLat + 0.01 &&
           stop.longitude >= minLng - 0.01 && stop.longitude <= maxLng + 0.01;
  });

  // Select random intermediate stops
  const stopCount = Math.min(routeIndex + 1, 4);
  const selectedStops = [];
  
  for (let i = 0; i < stopCount && i < intermediateStops.length; i++) {
    const randomIndex = Math.floor(Math.random() * intermediateStops.length);
    const stop = intermediateStops[randomIndex];
    if (!selectedStops.find(s => s.name === stop.name)) {
      selectedStops.push(stop);
    }
  }

  return selectedStops;
}

function generateRouteName(origin: string, destination: string, index: number) {
  const routeTypes = ['Express', 'Local', 'Limited', 'Fast'];
  const originShort = origin.split(',')[0].split(' ').slice(0, 2).join(' ');
  const destShort = destination.split(',')[0].split(' ').slice(0, 2).join(' ');
  
  return `${originShort} to ${destShort} ${routeTypes[index % routeTypes.length]}`;
}

function generateRouteDescription(origin: string, destination: string, index: number) {
  const descriptions = [
    `Direct route connecting ${origin.split(',')[0]} to ${destination.split(',')[0]}`,
    `Fast connection between ${origin.split(',')[0]} and ${destination.split(',')[0]} with limited stops`,
    `Scenic route from ${origin.split(',')[0]} to ${destination.split(',')[0]} via major landmarks`,
    `Express service linking ${origin.split(',')[0]} and ${destination.split(',')[0]} business districts`,
  ];
  
  return descriptions[index % descriptions.length];
}

function calculateEstimatedTime(totalStops: number, origin: any, destination: any) {
  const baseTime = 15;
  const stopTime = totalStops * 3;
  
  const latDiff = Math.abs(destination.latitude - origin.latitude);
  const lngDiff = Math.abs(destination.longitude - origin.longitude);
  const distanceFactor = (latDiff + lngDiff) * 1000;
  
  return Math.max(15, Math.floor(baseTime + stopTime + distanceFactor));
}