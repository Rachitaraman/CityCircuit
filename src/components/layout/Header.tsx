import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { AuthModal } from '../auth/AuthModal';
import { UserProfile } from '../auth/UserProfile';
import { useAuth } from '../../contexts/AuthContext';

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

export interface HeaderProps {
  onMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, isAuthenticated, logout, refreshAuth } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'danger';
      case 'operator':
        return 'warning';
      case 'passenger':
        return 'secondary';
      default:
        return 'neutral';
    }
  };

  const handleAuthSuccess = async (user: any) => {
    console.log('🔐 Header: Authentication successful, refreshing context:', user);
    setIsAuthModalOpen(false);
    
    // Refresh AuthContext to pick up the new user
    await refreshAuth();
  };

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
  };

  return (
    <>
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center">
              <button
                onClick={onMenuToggle}
                className="md:hidden p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Open menu"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="flex items-center ml-4 md:ml-0">
                <Link href="/">
                  <motion.div
                    className="flex items-center cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Image
                      src="/images/citycircuit-logo.svg"
                      alt="CityCircuit"
                      width={160}
                      height={48}
                      className="h-10"
                      style={{ width: 'auto', height: '2.5rem' }}
                      priority
                    />
                  </motion.div>
                </Link>
              </div>
            </div>

            {/* Navigation Links - Desktop */}
            <nav className="hidden md:flex space-x-8">
              <Link
                href="/dashboard"
                className="text-neutral-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/routes"
                className="text-neutral-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Routes
              </Link>
              <Link
                href="/optimization"
                className="text-neutral-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Optimization
              </Link>
              <Link
                href="/analytics"
                className="text-neutral-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Analytics
              </Link>
            </nav>

            {/* User Menu and Language Switcher */}
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <div className="hidden sm:block">
                <LanguageSwitcher variant="dropdown" showLabels={false} />
              </div>

              {isAuthenticated && user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="hidden sm:block text-left">
                        <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                            {user.role}
                          </Badge>
                          <span className="text-xs text-neutral-500">
                            {formatPhoneNumber(user.phoneNumber)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileOpen && (
                    <motion.div
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => {
                          setIsUserProfileOpen(true);
                          setIsProfileOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
                      >
                        Profile
                      </button>
                      <Link
                        href="/preferences"
                        className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
                      >
                        Preferences
                      </Link>
                      <div className="px-4 py-2 sm:hidden">
                        <LanguageSwitcher variant="dropdown" showLabels={true} />
                      </div>
                      <hr className="my-1 border-neutral-200" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Logout
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    Sign In / Register
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* User Profile Modal */}
      {user && (
        <UserProfile
          isOpen={isUserProfileOpen}
          onClose={() => setIsUserProfileOpen(false)}
          user={user}
        />
      )}
    </>
  );
};

export { Header };