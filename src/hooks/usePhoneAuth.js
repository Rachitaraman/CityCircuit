import { useState } from 'react';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export const usePhoneAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationId, setVerificationId] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Initialize reCAPTCHA verifier
  const setupRecaptcha = (containerId = 'recaptcha-container') => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response) => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });
    }
    return window.recaptchaVerifier;
  };

  // Send OTP to phone number
  const sendOTP = async (phoneNumber) => {
    try {
      setLoading(true);
      setError(null);

      // Format phone number (ensure it starts with country code)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      // Setup reCAPTCHA
      const recaptchaVerifier = setupRecaptcha();
      
      // Send OTP
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhone, 
        recaptchaVerifier
      );
      
      setConfirmationResult(confirmationResult);
      setVerificationId(confirmationResult.verificationId);
      
      return {
        success: true,
        message: 'OTP sent successfully!',
        verificationId: confirmationResult.verificationId
      };
      
    } catch (error) {
      console.error('Error sending OTP:', error);
      setError(error.message);
      
      // Reset reCAPTCHA on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      
      return {
        success: false,
        message: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async (otp) => {
    try {
      setLoading(true);
      setError(null);

      if (!confirmationResult) {
        throw new Error('No confirmation result found. Please request OTP first.');
      }

      // Verify the OTP
      const result = await confirmationResult.confirm(otp);
      
      return {
        success: true,
        user: result.user,
        message: 'Phone number verified successfully!'
      };
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError(error.message);
      
      return {
        success: false,
        message: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Reset state
  const reset = () => {
    setError(null);
    setVerificationId(null);
    setConfirmationResult(null);
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  };

  return {
    loading,
    error,
    verificationId,
    sendOTP,
    verifyOTP,
    reset
  };
};