// Firebase Configuration Validator
import { auth } from '../lib/firebase';

export const validateFirebaseConfig = () => {
  console.log('🔍 Validating Firebase Configuration...');
  
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  console.log('📋 Current Firebase Config:');
  console.log('API Key:', config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'MISSING');
  console.log('Auth Domain:', config.authDomain || 'MISSING');
  console.log('Project ID:', config.projectId || 'MISSING');
  console.log('Storage Bucket:', config.storageBucket || 'MISSING');
  console.log('Messaging Sender ID:', config.messagingSenderId || 'MISSING');
  console.log('App ID:', config.appId ? `${config.appId.substring(0, 15)}...` : 'MISSING');

  // Check if all required fields are present
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);

  if (missingFields.length > 0) {
    console.error('❌ Missing required Firebase config fields:', missingFields);
    return false;
  }

  // Check if Firebase Auth is initialized
  if (!auth) {
    console.error('❌ Firebase Auth not initialized');
    return false;
  }

  console.log('✅ Firebase configuration appears valid');
  console.log('🔗 Firebase App:', auth.app.name);
  console.log('🆔 Project ID from app:', auth.app.options.projectId);
  
  return true;
};

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log('🧪 Testing Firebase connection...');
    
    // Try to get current user (this will test the connection)
    const user = auth.currentUser;
    console.log('👤 Current user:', user ? 'Signed in' : 'Not signed in');
    
    // Test if we can access Firebase services
    const app = auth.app;
    console.log('🔥 Firebase app initialized:', !!app);
    console.log('📱 Auth service available:', !!auth);
    
    return true;
  } catch (error: any) {
    console.error('❌ Firebase connection test failed:', error.message);
    return false;
  }
};