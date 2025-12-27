import React from 'react';
import { Select } from './Select';

export interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'buttons';
  showLabels?: boolean;
}

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
];

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  variant = 'dropdown',
  showLabels = true,
}) => {
  const [currentLanguage, setCurrentLanguage] = React.useState('en');

  const handleLanguageChange = (languageCode: string) => {
    setCurrentLanguage(languageCode);
    // TODO: Implement actual language switching logic
    console.log('Language changed to:', languageCode);
  };

  const selectedLanguage = LANGUAGES.find(lang => lang.code === currentLanguage) || LANGUAGES[0];

  if (variant === 'buttons') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLabels && (
          <span className="text-sm font-medium text-neutral-700 mr-2">
            Language:
          </span>
        )}
        <div className="flex items-center gap-1">
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                ${currentLanguage === language.code
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }
              `}
              title={language.name}
            >
              {language.nativeName}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabels && (
        <span className="text-sm font-medium text-neutral-700">
          Language:
        </span>
      )}
      <Select
        value={currentLanguage}
        onChange={(e) => handleLanguageChange(e.target.value)}
        options={LANGUAGES.map(lang => ({
          value: lang.code,
          label: lang.nativeName,
        }))}
        className="min-w-[120px]"
      />
    </div>
  );
};

export { LanguageSwitcher };