# 🚀 CityCircuit Setup Guide

Welcome to CityCircuit! This guide will help you get the bus route optimization system running locally.

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **Google Maps API Key** (optional for full functionality)
- **Gemini AI API Key** (optional for chatbot features)

## 🛠️ Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd city-circuit
npm install
```

The `postinstall` script will automatically set up the development database with sample data.

### 2. Configure Environment Variables

Copy the example environment file and update with your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:

```env
# Google Maps API Key (Get from: https://console.cloud.google.com/apis/credentials)
NEXT_PUBLIC_MAPS_API_KEY=your_google_maps_api_key_here

# Google Gemini AI API Key (Get from: https://makersuite.google.com/app/apikey)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Backend API URL (default for development)
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Start the Development Environment

**Option A: Start everything at once**
```bash
npm run start:all
```

**Option B: Start services separately**
```bash
# Terminal 1: Start the mock backend API
npm run start:backend

# Terminal 2: Start the Next.js frontend
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Mock API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## 👥 Test Accounts

The system comes with pre-configured test accounts:

| Role | Email | Description |
|------|-------|-------------|
| Admin | admin@citycircuit.com | Full system access |
| Operator | operator@citycircuit.com | Route management |
| Passenger | passenger1@example.com | Regular user |

## 🗂️ Sample Data

The development setup includes:

- **3 Bus Routes**: Downtown Express, Suburban Connector, Airport Shuttle
- **10+ Bus Stops**: Covering Mumbai area with realistic coordinates
- **5 Test Users**: Different roles and preferences
- **50 Optimization Results**: Historical data for analytics
- **20 Chat Sessions**: Sample AI conversations
- **Analytics Data**: Performance metrics and usage statistics

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run start:backend` | Start mock API server |
| `npm run start:all` | Start both frontend and backend |
| `npm run setup:dev` | Regenerate sample database |
| `npm run build` | Build for production |
| `npm test` | Run test suite |

## 📊 API Endpoints

The mock API server provides these endpoints:

### Routes
- `GET /api/routes` - List all routes
- `GET /api/routes/:id` - Get specific route
- `POST /api/optimize` - Optimize a route

### Bus Stops
- `GET /api/bus-stops` - List bus stops

### Analytics
- `GET /api/analytics/report` - Get analytics data
- `POST /api/analytics/event` - Track events

### Admin
- `GET /api/admin/stats` - Dashboard statistics

### Chat/AI
- `POST /api/chat` - Chat with AI assistant

## 🌍 Multi-language Support

The app supports multiple languages:
- English (en)
- Spanish (es)
- French (fr)
- German (de)

Language files are located in `public/locales/`.

## 🔐 API Keys Setup

### Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API
4. Create credentials (API Key)
5. Add the key to `.env.local`

### Gemini AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add the key to `.env.local`

## 🚨 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process on port 3000
npx kill-port 3000

# Kill process on port 5000
npx kill-port 5000
```

**Missing dependencies:**
```bash
npm install
```

**Database setup issues:**
```bash
npm run setup:dev
```

**API connection issues:**
- Check that backend is running on port 5000
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`

### Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload
2. **Mock Data**: Modify files in `public/data/` to change sample data
3. **API Testing**: Use tools like Postman or curl to test API endpoints
4. **Browser DevTools**: Check Network tab for API calls
5. **Console Logs**: Backend logs API requests and responses

## 🌐 Web Development

The web application is built with Next.js and runs on port 3001. The backend API runs on port 5000.

### Quick Start
```bash
# Start both servers
npm run dev:all

# Or start individually
npm run dev          # Frontend (port 3001)
npm run start:backend # Backend API (port 5000)
```

### Features
1. **Route Search**: Search between 2,505 real Mumbai bus stops
2. **Real-time Data**: Live route updates and passenger counts
3. **Route Optimization**: AI-powered route optimization
4. **Analytics Dashboard**: System performance and usage analytics
5. **Console Logs**: Backend logs API requests and responses

## 🐳 Docker Support (Optional)

If you prefer Docker:

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🚀 Production Deployment

For production deployment:

1. Set up real databases (PostgreSQL)
2. Deploy ML backend (Flask/Python)
3. Configure production environment variables
4. Build and deploy frontend
5. Set up monitoring and logging

## 📞 Support

If you encounter issues:

1. Check this setup guide
2. Review the troubleshooting section
3. Check the console for error messages
4. Verify API keys and environment variables

## 🎯 Next Steps

Once everything is running:

1. Explore the admin dashboard
2. Test route optimization features
3. Try the chatbot functionality
4. Check analytics and reporting
5. Test mobile responsiveness
6. Run the test suite

Happy coding! 🚌✨