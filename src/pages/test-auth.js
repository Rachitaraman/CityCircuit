import { useState } from 'react';
import PhoneAuth from '../components/auth/PhoneAuth';

export default function TestAuth() {
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);

  const handleSuccess = (msg, userData) => {
    setMessage(msg);
    if (userData) {
      setUser(userData);
      console.log('Authenticated user:', userData);
    }
  };

  const handleError = (error) => {
    setMessage(error);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Firebase Phone Auth Test</h1>
          <p className="mt-2 text-gray-600">Test your Firebase phone authentication</p>
        </div>
        
        {!user ? (
          <PhoneAuth onSuccess={handleSuccess} onError={handleError} />
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Successful!</h2>
            <p className="text-gray-600 mb-4">Phone: {user.phoneNumber}</p>
            <p className="text-gray-600 mb-4">User ID: {user.uid}</p>
            <button
              onClick={() => {
                setUser(null);
                setMessage('');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Again
            </button>
          </div>
        )}
        
        {message && (
          <div className={`mt-4 p-4 rounded-lg ${
            message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}