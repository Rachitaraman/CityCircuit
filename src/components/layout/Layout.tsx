import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

export interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  showSidebar = true,
}) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleMenuToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  // Convert user to the format expected by Header/Sidebar
  const layoutUser = user ? {
    name: user.name || 'User', // Fixed: user.name instead of user.profile.name with fallback
    role: user.role || 'passenger',
    avatar: undefined, // Could be added to user profile later
  } : undefined;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header
        user={layoutUser}
        onLogout={logout}
        onMenuToggle={handleMenuToggle}
      />
      
      <div className="flex">
        {showSidebar && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={handleSidebarClose}
            user={layoutUser}
          />
        )}
        
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export { Layout };