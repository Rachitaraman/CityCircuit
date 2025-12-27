// Simple translation utility to replace next-i18next temporarily
export const useTranslation = (namespace?: string) => {
  const t = (key: string, options?: any) => {
    // Simple key-to-text mapping for common translations
    const translations: Record<string, string> = {
      // Admin translations
      'admin.title': 'Admin Dashboard',
      'admin.description': 'Admin dashboard for CityCircuit bus route optimization',
      'admin.dashboard': 'Admin Dashboard',
      'admin.dashboardDesc': 'CityCircuit admin dashboard for managing routes, users, and system configuration',
      'admin.routes': 'Routes',
      'admin.users': 'Users',
      'admin.analytics': 'Analytics',
      'admin.system': 'System',
      'admin.reports': 'Reports',
      
      // Common translations
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.search': 'Search',
      'common.filter': 'Filter',
      'common.export': 'Export',
      'common.import': 'Import',
      
      // Navigation
      'navigation.dashboard': 'Dashboard',
      'navigation.routes': 'Routes',
      'navigation.optimization': 'Optimization',
      'navigation.analytics': 'Analytics',
      'navigation.admin': 'Admin',
      
      // Language
      'language.select': 'Language',
      
      // Chat
      'chat.title': 'AI Assistant',
      'chat.placeholder': 'Type your message...',
      'chat.send': 'Send',
      
      // Routes
      'routes.search': 'Search Routes',
      'routes.from': 'From',
      'routes.to': 'To',
      'routes.findRoutes': 'Find Routes',
      
      // Reports
      'reports.generate': 'Generate Report',
      'reports.period': 'Period',
      'reports.type': 'Report Type',
    };
    
    return translations[key] || key;
  };
  
  return { t };
};