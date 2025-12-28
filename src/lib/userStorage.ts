// Shared user storage for API routes
// In production, this would be a real database

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  role: 'passenger' | 'operator' | 'admin';
  isActive: boolean;
  preferences: {
    language: string;
    notifications: boolean;
    theme: 'light' | 'dark';
    preferredRoutes: string[];
    accessibilityNeeds: string[];
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

// Global user storage (in production, use a database)
let users: User[] = [
  {
    id: '1',
    phoneNumber: '+919876543210',
    name: 'Test User',
    role: 'passenger',
    isActive: true,
    preferences: {
      language: 'en',
      notifications: true,
      theme: 'light',
      preferredRoutes: [],
      accessibilityNeeds: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  }
];

export const userStorage = {
  // Find user by phone number
  findByPhoneNumber: (phoneNumber: string): User | undefined => {
    return users.find(u => u.phoneNumber === phoneNumber);
  },

  // Find user by ID
  findById: (id: string): User | undefined => {
    return users.find(u => u.id === id);
  },

  // Create new user
  create: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>): User => {
    const newUser: User = {
      ...userData,
      id: (users.length + 1).toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    
    users.push(newUser);
    return newUser;
  },

  // Update user
  update: (id: string, updates: Partial<User>): User | null => {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) return null;

    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return users[userIndex];
  },

  // Update last login
  updateLastLogin: (id: string): User | null => {
    return userStorage.update(id, { lastLoginAt: new Date().toISOString() });
  },

  // Get all users (for admin)
  getAll: (): User[] => {
    return [...users];
  },

  // Check if user exists
  exists: (phoneNumber: string): boolean => {
    return users.some(u => u.phoneNumber === phoneNumber);
  }
};