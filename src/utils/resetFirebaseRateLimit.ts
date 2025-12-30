// Firebase Rate Limit Reset Utility
import { auth } from '../lib/firebase';

export const resetFirebaseRateLimit = async () => {
  try {
    // Clear any existing reCAPTCHA verifier
    if (global.recaptchaVerifier) {
      global.recaptchaVerifier.clear();
      global.recaptchaVerifier = undefined;
    }

    // Sign out to clear any cached state
    if (auth.currentUser) {
      await auth.signOut();
    }

    // Clear any cached Firebase state
    if (typeof window !== 'undefined') {
      // Clear localStorage Firebase keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('firebase:')) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage Firebase keys
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('firebase:')) {
          sessionStorage.removeItem(key);
        }
      });
    }

    console.log('🔄 Firebase state cleared - rate limit should reset');
    
    return {
      success: true,
      message: 'Firebase state cleared. Wait 5 minutes then try again.'
    };
  } catch (error: any) {
    console.error('❌ Error clearing Firebase state:', error);
    return {
      success: false,
      message: error.message || 'Failed to clear Firebase state'
    };
  }
};

// Quick reset function for development
export const quickReset = () => {
  if (typeof window !== 'undefined') {
    // Reload the page to clear all state
    window.location.reload();
  }
};