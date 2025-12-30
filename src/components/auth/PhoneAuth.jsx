import { useState } from 'react';
import { usePhoneAuth } from '../../hooks/usePhoneAuth';

const PhoneAuth = ({ onSuccess, onError }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  
  const { loading, error, verificationId, sendOTP, verifyOTP, reset } = usePhoneAuth();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber || phoneNumber.length < 10) {
      onError?.('Please enter a valid phone number');
      return;
    }

    const result = await sendOTP(phoneNumber);
    
    if (result.success) {
      setStep('otp');
      onSuccess?.('OTP sent successfully!');
    } else {
      onError?.(result.message);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      onError?.('Please enter a valid 6-digit OTP');
      return;
    }

    const result = await verifyOTP(otp);
    
    if (result.success) {
      onSuccess?.('Phone number verified successfully!', result.user);
    } else {
      onError?.(result.message);
    }
  };

  const handleReset = () => {
    reset();
    setStep('phone');
    setPhoneNumber('');
    setOtp('');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Phone Verification</h2>
      
      {step === 'phone' ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                +91
              </span>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 10-digit mobile number"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                maxLength="10"
                required
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              We'll send you a verification code via SMS
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading || phoneNumber.length !== 10}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit OTP"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              maxLength="6"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter the code sent to +91{phoneNumber}
            </p>
          </div>
          
          <div className="space-y-2">
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            
            <button
              type="button"
              onClick={handleReset}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Change Phone Number
            </button>
          </div>
        </form>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default PhoneAuth;