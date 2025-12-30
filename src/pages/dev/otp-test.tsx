import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { OTPTester } from '../../components/auth/OTPTester';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { otpDiagnostics, quickOTPHealthCheck } from '../../utils/otpDiagnostics';
import { resetFirebaseRateLimit, quickReset } from '../../utils/resetFirebaseRateLimit';
import { validateFirebaseConfig, testFirebaseConnection } from '../../utils/validateFirebaseConfig';

interface DiagnosticResult {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
}

const OTPTestPage: NextPage = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const results = await otpDiagnostics.runFullDiagnostics();
      setDiagnostics(results);
      setShowDiagnostics(true);
      
      // Also log to console
      await quickOTPHealthCheck();
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  useEffect(() => {
    // Run diagnostics on page load
    runDiagnostics();
  }, []);

  const handleReset = async () => {
    const result = await resetFirebaseRateLimit();
    setResetMessage(result.message);
    
    // Clear message after 5 seconds
    setTimeout(() => setResetMessage(''), 5000);
  };

  const handleValidateFirebase = async () => {
    console.log('🔍 Running Firebase validation...');
    validateFirebaseConfig();
    await testFirebaseConnection();
    setResetMessage('Firebase validation complete - check console for details');
    setTimeout(() => setResetMessage(''), 5000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-700 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-neutral-700 bg-neutral-50 border-neutral-200';
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            🧪 OTP Service Testing & Diagnostics
          </h1>
          <p className="text-neutral-600">
            Development tools for testing and troubleshooting OTP functionality
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Diagnostics Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>🔍 System Diagnostics</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleValidateFirebase}
                    >
                      Validate Firebase
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleReset}
                    >
                      Reset Rate Limit
                    </Button>
                    <Button
                      size="sm"
                      onClick={runDiagnostics}
                      loading={isRunningDiagnostics}
                    >
                      Run Check
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {resetMessage && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                    {resetMessage}
                  </div>
                )}
                {showDiagnostics && diagnostics.length > 0 ? (
                  <div className="space-y-3">
                    {diagnostics.map((result, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
                      >
                        <div className="flex items-start space-x-2">
                          <span className="text-lg">
                            {getStatusIcon(result.status)}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium">
                              {result.service}
                            </div>
                            <div className="text-sm mt-1">
                              {result.message}
                            </div>
                            {result.details && (
                              <details className="mt-2">
                                <summary className="text-xs cursor-pointer hover:underline">
                                  View Details
                                </summary>
                                <pre className="text-xs mt-1 p-2 bg-black/5 rounded overflow-x-auto">
                                  {JSON.stringify(result.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <strong>💡 Quick Fix Guide:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>If Firebase errors: Check .env.local configuration</li>
                          <li>If reCAPTCHA errors: Ensure container exists in _app.tsx</li>
                          <li>If phone validation fails: Use +91XXXXXXXXXX format</li>
                          <li>Check browser console for detailed error logs</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    Click "Run Check" to diagnose OTP service health
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📋 Current Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <strong>Firebase Project:</strong>
                  <div className="text-neutral-600">
                    {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not configured'}
                  </div>
                </div>
                
                <div>
                  <strong>Environment:</strong>
                  <div className="text-neutral-600">
                    {process.env.NODE_ENV || 'Unknown'}
                  </div>
                </div>
                
                <div>
                  <strong>OTP Methods:</strong>
                  <ul className="text-neutral-600 list-disc list-inside">
                    <li>Firebase Phone Auth (Primary)</li>
                    <li>Textbelt SMS (US/Canada fallback)</li>
                    <li>Console logging (Development)</li>
                  </ul>
                </div>

                <div>
                  <strong>Supported Regions:</strong>
                  <ul className="text-neutral-600 list-disc list-inside">
                    <li>India (+91) - Firebase/Console</li>
                    <li>US/Canada (+1) - Firebase/Textbelt</li>
                    <li>Other regions - Firebase only</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* OTP Tester Panel */}
          <div>
            <OTPTester />
          </div>
        </div>

        <div className="mt-8 text-center">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                🚀 Next Steps
              </h3>
              <div className="text-sm text-neutral-600 space-y-2">
                <p>
                  <strong>For Production:</strong> Enable Firebase billing and configure phone authentication
                </p>
                <p>
                  <strong>For Development:</strong> Use console logging or test with US numbers
                </p>
                <p>
                  <strong>For Testing:</strong> Use the OTP tester above to verify functionality
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OTPTestPage;