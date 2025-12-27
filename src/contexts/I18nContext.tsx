import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { useTranslation } from '../utils/translations';
import { useUserPreferences } from '../hooks/useUserPreferences';

export interface I18nContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  t: (key: string, options?: any) => string;
  isRTL: boolean;
  supportedLanguages: Array<{
    code: string;
    name: string;
    nativeName: string;
  }>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமিழ்' },
];

// Languages that use right-to-left text direction
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

export interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const { t } = useTranslation('common');
  const { updatePreferences } = useUserPreferences();

  const isRTL = RTL_LANGUAGES.includes(currentLanguage);

  const changeLanguage = async (language: string): Promise<void> => {
    try {
      // Update user preferences
      await updatePreferences({ language });
      
      // Update current language
      setCurrentLanguage(language);
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  };

  // Apply RTL/LTR direction to document
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage, isRTL]);

  // Apply language-specific CSS classes
  useEffect(() => {
    // Remove all language classes
    SUPPORTED_LANGUAGES.forEach(lang => {
      document.documentElement.classList.remove(`lang-${lang.code}`);
    });
    
    // Add current language class
    document.documentElement.classList.add(`lang-${currentLanguage}`);
  }, [currentLanguage]);

  const contextValue: I18nContextType = {
    currentLanguage,
    changeLanguage,
    t,
    isRTL,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};