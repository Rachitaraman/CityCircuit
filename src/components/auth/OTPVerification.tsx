import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { firebaseOtpService } from '../../lib/firebaseOtpService';

export interface OTPVerificationProps {
  phoneNumber: string;
  onVerified: () => void;
  onBack: () => void;
  onResend?: () => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  phoneNumber,
  onVerified,
  onBack,
  onResend
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const otpToVerify = otpCode || otp.join('');
    
    if (otpToVerify.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Use Firebase OTP service directly
      const result = await firebaseOtpService.verifyOTP(phoneNumber, otpToVerify);

      if (result.success) {
        console.log('📱 Firebase OTP verified successfully');
        onVerified();
      } else {
        setError(result.message);
        // Clear OTP on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      // Use Firebase OTP service directly
      const result = await firebaseOtpService.sendOTP(phoneNumber);

      if (result.success) {
        setTimeLeft(300); // Reset timer
        setCanResend(false);
        setError('');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        
        console.log('📱 Firebase OTP resent successfully');
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Verify Phone Number</h2>
        <p className="text-neutral-600">
          Enter the 6-digit code sent to
        </p>
        <p className="font-medium text-neutral-900">{phoneNumber}</p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center space-x-3 mb-6">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={el => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={e => handleOtpChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            className="w-12 h-12 text-center text-xl font-bold border-2 border-neutral-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
            disabled={isVerifying}
          />
        ))}
      </div>

      {/* Timer */}
      <div className="text-center mb-4">
        {timeLeft > 0 ? (
          <p className="text-sm text-neutral-600">
            Code expires in <span className="font-medium text-primary-600">{formatTime(timeLeft)}</span>
          </p>
        ) : (
          <p className="text-sm text-red-600">Code expired</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4"
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Buttons */}
      <div className="space-y-3">
        <Button
          onClick={() => handleVerify()}
          variant="primary"
          size="lg"
          fullWidth
          disabled={isVerifying || otp.some(digit => digit === '')}
          loading={isVerifying}
        >
          {isVerifying ? 'Verifying...' : 'Verify OTP'}
        </Button>

        <div className="flex space-x-3">
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={isVerifying}
          >
            Back
          </Button>
          
          <Button
            onClick={handleResend}
            variant="ghost"
            size="lg"
            className="flex-1"
            disabled={!canResend || isVerifying}
          >
            {canResend ? 'Resend OTP' : `Resend (${formatTime(timeLeft)})`}
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-neutral-500">
          Didn&apos;t receive the code? Check your SMS or try resending.
        </p>
      </div>
    </motion.div>
  );
};

export { OTPVerification };