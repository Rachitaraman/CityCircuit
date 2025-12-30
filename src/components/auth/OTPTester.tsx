import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { firebaseOtpService } from '../../lib/firebaseOtpService';

interface OTPTestResult {
  success: boolean;
  message: string;
  method?: string;
  timestamp: string;
}

const OTPTester: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<OTPTestResult[]>([]);
  const [step, setStep] = useState<'phone' | 'verify'>('phone');

  const addResult = (result: Omit<OTPTestResult, 'timestamp'>) => {
    setTestResults(prev => [{
      ...result,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
  };

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      addResult({
        success: false,
        message: 'Please enter a phone number'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await firebaseOtpService.sendOTP(phoneNumber);
      
      addResult({
        success: result.success,
        message: result.message,
        method: 'Firebase/Textbelt'
      });

      if (result.success) {
        setStep('verify');
      }
    } catch (error: any) {
      addResult({
        success: false,
        message: error.message || 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      addResult({
        success: false,
        message: 'Please enter the OTP'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await firebaseOtpService.verifyOTP(phoneNumber, otp);
      
      addResult({
        success: result.success,
        message: result.message,
        method: 'Verification'
      });

      if (result.success) {
        setStep('phone');
        setPhoneNumber('');
        setOtp('');
      }
    } catch (error: any) {
      addResult({
        success: false,
        message: error.message || 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('phone');
    setPhoneNumber('');
    setOtp('');
    setTestResults([]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 OTP Service Tester</CardTitle>
          <p className="text-sm text-neutral-600">
            Test OTP sending and verification functionality
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Phone Number
                </label>
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <Button
                    onClick={handleSendOTP}
                    loading={isLoading}
                    disabled={!phoneNumber.trim()}
                  >
                    Send OTP
                  </Button>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Supports Indian (+91) and US (+1) numbers
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Enter OTP for {phoneNumber}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-lg font-mono"
                  />
                  <Button
                    onClick={handleVerifyOTP}
                    loading={isLoading}
                    disabled={!otp.trim()}
                  >
                    Verify
                  </Button>
                </div>
                <div className="flex space-x-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('phone')}
                  >
                    ← Back
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSendOTP}
                    loading={isLoading}
                  >
                    Resend OTP
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              Reset Test
            </Button>
            <div className="text-xs text-neutral-500">
              Check console for detailed logs
            </div>
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          result.success ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="font-medium">
                          {result.method || 'Test'}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{result.message}</p>
                    </div>
                    <span className="text-xs opacity-75">
                      {result.timestamp}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>🔧 Troubleshooting Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium text-neutral-900">If OTP is not received:</h4>
            <ul className="list-disc list-inside text-neutral-600 space-y-1 mt-1">
              <li>Check if Firebase billing is enabled for SMS</li>
              <li>Verify phone number format (+91 for India, +1 for US)</li>
              <li>Look for OTP in browser console (development mode)</li>
              <li>Check spam/promotional SMS folder</li>
              <li>Try with a US number (+1) for Textbelt fallback</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-neutral-900">Current Configuration:</h4>
            <ul className="list-disc list-inside text-neutral-600 space-y-1 mt-1">
              <li>Primary: Firebase Phone Authentication</li>
              <li>Fallback: Textbelt SMS (US/Canada only)</li>
              <li>Development: Console logging for non-US numbers</li>
              <li>reCAPTCHA: Invisible (configured in _app.tsx)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { OTPTester };