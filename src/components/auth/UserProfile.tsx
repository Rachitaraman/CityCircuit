/**
 * User profile management component for phone-based authentication
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../services/authService';

// Helper function for formatting phone numbers
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle Indian phone numbers (+91)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  
  // Handle 10-digit numbers (assume Indian)
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  // Return as-is if format is unclear
  return phoneNumber;
};

export interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const UserProfile: React.FC<UserProfileProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    setIsLoading(true);
    logout();
    onClose();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'operator': return 'warning';
      case 'passenger': return 'secondary';
      default: return 'neutral';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysActive = () => {
    const created = new Date(user.createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getLastLoginText = () => {
    const lastLogin = new Date(user.lastLoginAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Profile" size="md">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* User Header */}
        <div className="text-center pb-4 border-b border-neutral-200">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-primary-600 font-bold text-xl">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-neutral-900">{user.name}</h2>
          <p className="text-neutral-600 text-sm">
            {formatPhoneNumber(user.phoneNumber)}
          </p>
          <div className="mt-2">
            <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Account Information */}
        <div>
          <h3 className="text-lg font-medium text-neutral-900 mb-4">Account Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-neutral-700">Phone Number</span>
              <span className="text-sm text-neutral-600">
                {formatPhoneNumber(user.phoneNumber)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-neutral-700">Role</span>
              <span className="text-sm text-neutral-600 capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-neutral-700">Account Status</span>
              <span className={`text-sm ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-neutral-700">Member Since</span>
              <span className="text-sm text-neutral-600">{formatDate(user.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-neutral-700">Last Login</span>
              <span className="text-sm text-neutral-600">{getLastLoginText()}</span>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <h3 className="text-lg font-medium text-neutral-900 mb-4">Preferences</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-neutral-700">Language</span>
              <span className="text-sm text-neutral-600 capitalize">
                {user.preferences?.language === 'en' ? 'English' : user.preferences?.language || 'English'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-neutral-700">Theme</span>
              <span className="text-sm text-neutral-600 capitalize">{user.preferences?.theme || 'light'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-neutral-700">Notifications</span>
              <span className={`text-sm ${user.preferences?.notifications ? 'text-green-600' : 'text-neutral-600'}`}>
                {user.preferences?.notifications ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Account Statistics */}
        <div>
          <h3 className="text-lg font-medium text-neutral-900 mb-4">Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-neutral-50 rounded-lg">
              <p className="text-2xl font-bold text-primary-600">{getDaysActive()}</p>
              <p className="text-xs text-neutral-600">Days Active</p>
            </div>
            <div className="text-center p-4 bg-neutral-50 rounded-lg">
              <p className="text-2xl font-bold text-secondary-600">
                {user.preferences?.preferredRoutes?.length || 0}
              </p>
              <p className="text-xs text-neutral-600">Preferred Routes</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-neutral-200">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="danger"
            onClick={handleLogout}
            disabled={isLoading}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            }
          >
            {isLoading ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </div>
      </motion.div>
    </Modal>
  );
};

export { UserProfile };