import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { PhoneLoginForm } from './PhoneLoginForm';
import { PhoneRegisterForm } from './PhoneRegisterForm';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
  initialMode?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSuccess = (user: any) => {
    console.log('🎉 AuthModal: Authentication successful, user:', user);
    onSuccess?.(user);
    // Small delay to ensure state updates before closing
    setTimeout(() => {
      onClose();
    }, 100);
  };

  const handleSwitchToRegister = (phone?: string) => {
    if (phone) {
      setPhoneNumber(phone);
    }
    setMode('register');
  };

  const handleSwitchToLogin = () => {
    setMode('login');
  };

  const handleClose = () => {
    setMode('login');
    setPhoneNumber('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'login' ? 'Sign In' : 'Create Account'}
      size="md"
    >
      {mode === 'login' ? (
        <PhoneLoginForm
          onSuccess={handleSuccess}
          onCancel={handleClose}
          onSwitchToRegister={() => handleSwitchToRegister()}
        />
      ) : (
        <PhoneRegisterForm
          onSuccess={handleSuccess}
          onCancel={handleClose}
          onSwitchToLogin={handleSwitchToLogin}
          initialPhoneNumber={phoneNumber}
        />
      )}
    </Modal>
  );
};

export { AuthModal };