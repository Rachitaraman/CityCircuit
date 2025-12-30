import React, { useState } from 'react';
import { NextPage } from 'next';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

const TwilioTestPage: NextPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');

  const sendOTP = async () => {
    if (!phoneNumber.trim()) {
      setMessage('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/send-otp-twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(result.message);
        setStep('verify');
      } else {
        setMessage(`Error: ${result.message}`);
      }
    } catch (error) {
      setMessage('Network error occurred');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp.trim()) {
      setMessage('Please enter the OTP');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp })
      });

      const result = await response.json();
      setMessage(result.message);
      
      if (result.success) {
        setStep('phone');
        setPhoneNumber('');
        setOtp('');
      }
    } catch (error) {
      setMessage('Verification failed');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-8">
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">
              🚫 Access Denied
            </h1>
            <p className="text-neutral-600">
              This testing page is only available in development mode.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>📱 Twilio SMS Test</CardTitle>
            <p className="text-sm text-neutral-600">
              Test direct SMS delivery via Twilio
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'phone' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Include country code (+91 for India)
                  </p>
                </div>
                
                <Button
                  onClick={sendOTP}
                  loading={isLoading}
                  disabled={!phoneNumber.trim()}
                  className="w-full"
                >
                  Send SMS via Twilio
                </Button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enter OTP sent to {phoneNumber}
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-lg font-mono"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={verifyOTP}
                    loading={isLoading}
                    disabled={!otp.trim()}
                    className="flex-1"
                  >
                    Verify OTP
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setStep('phone')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                </div>
              </>
            )}

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes('Error') || message.includes('failed')
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}>
                {message}
              </div>
            )}

            <div className="text-xs text-neutral-500 space-y-1">
              <p><strong>Twilio Status:</strong> {process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Not configured'}</p>
              <p><strong>Phone:</strong> {process.env.TWILIO_PHONE_NUMBER || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <strong>Option 1: Enable Firebase Billing (Recommended)</strong>
              <ol className="list-decimal list-inside text-neutral-600 mt-1 space-y-1">
                <li>Go to Firebase Console</li>
                <li>Enable Blaze (Pay as you go) plan</li>
                <li>Enable Phone Authentication</li>
                <li>SMS will work automatically</li>
              </ol>
            </div>
            
            <div>
              <strong>Option 2: Use Twilio (Alternative)</strong>
              <ol className="list-decimal list-inside text-neutral-600 mt-1 space-y-1">
                <li>Get Twilio credentials from console.twilio.com</li>
                <li>Update .env.local with real credentials</li>
                <li>Buy a phone number in Twilio</li>
                <li>Test with this page</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TwilioTestPage;