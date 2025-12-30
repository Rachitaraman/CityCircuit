import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../utils/translations';
import { User } from '../../types'; // Use types User interface
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';

type UserRole = 'operator' | 'passenger' | 'admin';

interface UserManagementProps {
  className?: string;
}

interface UserFormData {
  phoneNumber: string;
  role: UserRole;
  name: string;
  organization?: string;
  isActive: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({ className = '' }) => {
  const { t } = useTranslation('common');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');

  const [formData, setFormData] = useState<UserFormData>({
    phoneNumber: '',
    role: 'passenger',
    name: '',
    isActive: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock API call - in production this would be a real API
      const mockUsers: User[] = [
        {
          id: 'user-001',
          phoneNumber: '+919876543210',
          name: 'System Administrator',
          role: 'admin',
          isActive: true,
          preferences: {
            language: 'en',
            notifications: true,
            theme: 'dark',
            preferredRoutes: [],
            accessibilityNeeds: [],
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-25T00:00:00Z',
          lastLoginAt: '2024-01-25T00:00:00Z',
        },
        {
          id: 'user-002',
          phoneNumber: '+919876543211',
          name: 'Mumbai Transport Operator',
          role: 'operator',
          isActive: true,
          preferences: {
            language: 'hi',
            notifications: true,
            theme: 'light',
            preferredRoutes: [],
            accessibilityNeeds: [],
          },
          createdAt: '2024-01-05T00:00:00Z',
          updatedAt: '2024-01-24T00:00:00Z',
          lastLoginAt: '2024-01-24T00:00:00Z',
        },
        {
          id: 'user-003',
          phoneNumber: '+919876543212',
          name: 'Rajesh Kumar',
          role: 'passenger',
          isActive: true,
          preferences: {
            language: 'hi',
            notifications: true,
            theme: 'light',
            preferredRoutes: [],
            accessibilityNeeds: [],
          },
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-25T00:00:00Z',
          lastLoginAt: '2024-01-25T00:00:00Z',
        },
        {
          id: 'user-004',
          phoneNumber: '+919876543213',
          name: 'Priya Sharma',
          role: 'passenger',
          isActive: true,
          preferences: {
            language: 'en',
            notifications: false,
            theme: 'light',
            preferredRoutes: [],
            accessibilityNeeds: [],
          },
          createdAt: '2024-01-12T00:00:00Z',
          updatedAt: '2024-01-23T00:00:00Z',
          lastLoginAt: '2024-01-23T00:00:00Z',
        },
      ];

      setUsers(mockUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      // Validate form data
      if (!formData.phoneNumber.trim()) {
        setError('Phone number is required');
        return;
      }

      if (!formData.name.trim()) {
        setError('Name is required');
        return;
      }

      // Check if phone number already exists
      if (users.some(user => user.phoneNumber.toLowerCase() === formData.phoneNumber.toLowerCase())) {
        setError('User with this phone number already exists');
        return;
      }

      // Mock API call to create user
      const newUser: User = {
        id: `user-${Date.now()}`,
        phoneNumber: formData.phoneNumber,
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive,
        preferences: {
          language: 'en',
          notifications: true,
          theme: 'light',
          preferredRoutes: [],
          accessibilityNeeds: [],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      setUsers(prev => [...prev, newUser]);
      setShowCreateForm(false);
      resetForm();
      setError(null);
    } catch (err) {
      console.error('Failed to create user:', err);
      setError('Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      // Mock API call to update user
      const updatedUser: User = {
        ...editingUser,
        phoneNumber: formData.phoneNumber,
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive,
        updatedAt: new Date().toISOString(),
      };

      setUsers(prev => prev.map(user => 
        user.id === editingUser.id ? updatedUser : user
      ));

      setEditingUser(null);
      resetForm();
      setError(null);
    } catch (err) {
      console.error('Failed to update user:', err);
      setError('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('admin.confirmDeleteUser') || 'Are you sure you want to delete this user?')) {
      return;
    }

    try {
      // Mock API call to delete user
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Failed to delete user');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      phoneNumber: user.phoneNumber,
      role: user.role,
      name: user.name,
      isActive: user.isActive,
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      phoneNumber: '',
      role: 'passenger',
      name: '',
      isActive: true,
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesFilter;
  });

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'operator':
        return 'bg-blue-100 text-blue-800';
      case 'passenger':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return t('admin.roleAdmin') || 'Administrator';
      case 'operator':
        return t('admin.roleOperator') || 'Operator';
      case 'passenger':
        return t('admin.rolePassenger') || 'Passenger';
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">
            {t('admin.userManagement') || 'User Management'}
          </h2>
          <p className="text-neutral-600">
            {t('admin.userManagementDesc') || 'Manage user accounts and permissions'}
          </p>
        </div>
        <Button
          onClick={() => {
            setShowCreateForm(true);
            setEditingUser(null);
            resetForm();
          }}
          className="bg-primary-600 hover:bg-primary-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('admin.createUser') || 'Create User'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('admin.searchUsers') || 'Search users...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as 'all' | UserRole)}
          className="px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">{t('admin.allRoles') || 'All Roles'}</option>
          <option value="admin">{t('admin.roleAdmin') || 'Administrator'}</option>
          <option value="operator">{t('admin.roleOperator') || 'Operator'}</option>
          <option value="passenger">{t('admin.rolePassenger') || 'Passenger'}</option>
        </select>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            {editingUser ? 
              (t('admin.editUser') || 'Edit User') : 
              (t('admin.createNewUser') || 'Create New User')
            }
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter phone number"
                disabled={!!editingUser} // Don't allow phone number changes for existing users
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('admin.role') || 'Role'}
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="passenger">{t('admin.rolePassenger') || 'Passenger'}</option>
                <option value="operator">{t('admin.roleOperator') || 'Operator'}</option>
                <option value="admin">{t('admin.roleAdmin') || 'Administrator'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('user.name') || 'Full Name'}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('admin.namePlaceholder') || 'Enter full name'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('user.organization') || 'Organization'}
              </label>
              <input
                type="text"
                value={formData.organization || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('admin.organizationPlaceholder') || 'Enter organization (optional)'}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateForm(false);
                setEditingUser(null);
                resetForm();
                setError(null);
              }}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={editingUser ? handleUpdateUser : handleCreateUser}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {editingUser ? 
                (t('common.update') || 'Update') : 
                (t('common.create') || 'Create')
              }
            </Button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-900">
            {t('admin.usersList') || 'Users List'} ({filteredUsers.length})
          </h3>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="w-12 h-12 mx-auto text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <p className="text-neutral-500">
              {searchTerm ? 
                (t('admin.noUsersFound') || 'No users found matching your search') :
                (t('admin.noUsers') || 'No users available')
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {filteredUsers.map(user => (
              <div key={user.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-medium text-neutral-900">{user.name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </div>
                      <p className="text-neutral-600">{user.phoneNumber}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-neutral-500">
                        <span>{t('admin.joined') || 'Joined'}: {new Date(user.createdAt).toLocaleDateString()}</span>
                        <span>{t('admin.lastLogin') || 'Last login'}: {new Date(user.lastLoginAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    {user.role !== 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { UserManagement };