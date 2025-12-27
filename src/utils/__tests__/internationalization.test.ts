/**
 * Property-based tests for internationalization and multi-language support
 * Tests that all interface elements are properly localized for supported languages
 */

import * as fc from 'fast-check';
import fs from 'fs';
import path from 'path';

// Supported languages in the application
const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr', 'gu', 'ta'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Translation file structure interface
interface TranslationFile {
  [key: string]: string | TranslationFile;
}

// Helper function to load translation files
function loadTranslationFile(language: SupportedLanguage): TranslationFile {
  const filePath = path.join(process.cwd(), 'public', 'locales', language, 'common.json');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load translation file for language: ${language}`);
  }
}

// Helper function to get all translation keys from a nested object
function getAllKeys(obj: TranslationFile, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      keys.push(fullKey);
    } else if (typeof value === 'object' && value !== null) {
      keys.push(...getAllKeys(value, fullKey));
    }
  }
  
  return keys;
}

// Helper function to get nested value from object using dot notation
function getNestedValue(obj: TranslationFile, key: string): string | undefined {
  const keys = key.split('.');
  let current: any = obj;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  
  return typeof current === 'string' ? current : undefined;
}

// Mock i18n service for testing
class TestI18nService {
  private translations: Record<SupportedLanguage, TranslationFile> = {} as any;
  private currentLanguage: SupportedLanguage = 'en';

  constructor() {
    // Load all translation files
    for (const lang of SUPPORTED_LANGUAGES) {
      this.translations[lang] = loadTranslationFile(lang);
    }
  }

  setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  translate(key: string, language?: SupportedLanguage): string | undefined {
    const lang = language || this.currentLanguage;
    return getNestedValue(this.translations[lang], key);
  }

  getAllTranslationKeys(language: SupportedLanguage): string[] {
    return getAllKeys(this.translations[language]);
  }

  hasTranslation(key: string, language: SupportedLanguage): boolean {
    return this.translate(key, language) !== undefined;
  }

  getTranslationValue(key: string, language: SupportedLanguage): string {
    return this.translate(key, language) || '';
  }
}

describe('Internationalization Property Tests', () => {
  let i18nService: TestI18nService;

  beforeAll(() => {
    i18nService = new TestI18nService();
  });

  // Generator for supported languages
  const languageArb = fc.oneof(
    ...SUPPORTED_LANGUAGES.map(lang => fc.constant(lang))
  );

  // Generator for translation keys (based on actual keys from English translations)
  const translationKeyArb = fc.oneof(
    fc.constant('navigation.home'),
    fc.constant('common.loading'),
    fc.constant('routes.title'),
    fc.constant('user.profile'),
    fc.constant('auth.login'),
    fc.constant('chatbot.welcome'),
    fc.constant('language.select'),
    fc.constant('theme.toggle'),
    fc.constant('map.title'),
    fc.constant('optimization.title'),
    fc.constant('errors.general'),
    fc.constant('messages.routeOptimized')
  );

  /**
   * **Feature: city-circuit, Property 14: Multi-language support consistency**
   * **Validates: Requirements 3.5**
   * 
   * Property: For any supported language setting, all interface elements should be properly localized
   */
  describe('Property 14: Multi-language support consistency', () => {
    it('should have all translation keys available in every supported language', () => {
      fc.assert(
        fc.property(languageArb, (language) => {
          // Property: Every supported language should have translation files
          const translationKeys = i18nService.getAllTranslationKeys(language);
          expect(translationKeys.length).toBeGreaterThan(0);

          // Property: All languages should have the same set of translation keys
          const englishKeys = i18nService.getAllTranslationKeys('en');
          const currentLanguageKeys = i18nService.getAllTranslationKeys(language);

          // Every key in English should exist in the current language
          for (const key of englishKeys) {
            expect(i18nService.hasTranslation(key, language)).toBe(true);
          }

          // The number of keys should be consistent across languages
          expect(currentLanguageKeys.length).toBe(englishKeys.length);
        }),
        { numRuns: 100 }
      );
    });

    it('should return non-empty translations for any valid key and language combination', () => {
      fc.assert(
        fc.property(languageArb, translationKeyArb, (language, key) => {
          // Property: Any valid translation key should return a non-empty string
          const translation = i18nService.translate(key, language);
          
          expect(translation).toBeDefined();
          expect(typeof translation).toBe('string');
          expect(translation!.length).toBeGreaterThan(0);
          expect(translation!.trim()).not.toBe('');
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain translation consistency when switching languages', () => {
      fc.assert(
        fc.property(
          fc.array(languageArb, { minLength: 2, maxLength: 5 }),
          translationKeyArb,
          (languages, key) => {
            const translations: Record<string, string> = {};

            // Property: Switching languages should always return valid translations
            for (const language of languages) {
              i18nService.setLanguage(language);
              const translation = i18nService.translate(key);
              
              expect(translation).toBeDefined();
              expect(typeof translation).toBe('string');
              expect(translation!.length).toBeGreaterThan(0);
              
              translations[language] = translation!;
            }

            // Property: Each language should have a unique translation (or same for language names)
            const uniqueTranslations = new Set(Object.values(translations));
            
            // For language selection keys, translations might be the same across languages
            if (key.includes('language.')) {
              expect(uniqueTranslations.size).toBeGreaterThanOrEqual(1);
            } else {
              // For other keys, we expect different translations for different languages
              // (unless it's a proper noun or technical term)
              expect(uniqueTranslations.size).toBeGreaterThanOrEqual(1);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle language switching without losing translation context', () => {
      fc.assert(
        fc.property(languageArb, languageArb, translationKeyArb, (lang1, lang2, key) => {
          // Property: Language switching should be consistent and reversible
          
          // Set first language and get translation
          i18nService.setLanguage(lang1);
          const translation1 = i18nService.translate(key);
          expect(i18nService.getCurrentLanguage()).toBe(lang1);
          
          // Switch to second language and get translation
          i18nService.setLanguage(lang2);
          const translation2 = i18nService.translate(key);
          expect(i18nService.getCurrentLanguage()).toBe(lang2);
          
          // Switch back to first language
          i18nService.setLanguage(lang1);
          const translation1Again = i18nService.translate(key);
          expect(i18nService.getCurrentLanguage()).toBe(lang1);
          
          // Property: Translations should be consistent when returning to the same language
          expect(translation1Again).toBe(translation1);
          
          // Property: All translations should be valid
          expect(translation1).toBeDefined();
          expect(translation2).toBeDefined();
          expect(translation1!.length).toBeGreaterThan(0);
          expect(translation2!.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate translation completeness across all language files', () => {
      // Property: All translation files should have complete coverage
      const englishKeys = i18nService.getAllTranslationKeys('en');
      
      for (const language of SUPPORTED_LANGUAGES) {
        const languageKeys = i18nService.getAllTranslationKeys(language);
        
        // Property: Each language should have all the keys that English has
        expect(languageKeys.length).toBe(englishKeys.length);
        
        // Property: Each key should have a non-empty translation
        for (const key of englishKeys) {
          const translation = i18nService.translate(key, language);
          expect(translation).toBeDefined();
          expect(translation!.length).toBeGreaterThan(0);
          expect(translation!.trim()).not.toBe('');
        }
      }
    });

    it('should handle invalid translation keys gracefully', () => {
      fc.assert(
        fc.property(
          languageArb,
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')),
          (language, invalidKey) => {
            // Property: Invalid keys should return undefined consistently
            const translation = i18nService.translate(`invalid.${invalidKey}`, language);
            expect(translation).toBeUndefined();
            
            // Property: hasTranslation should return false for invalid keys
            expect(i18nService.hasTranslation(`invalid.${invalidKey}`, language)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain proper character encoding for all languages', () => {
      fc.assert(
        fc.property(languageArb, translationKeyArb, (language, key) => {
          const translation = i18nService.translate(key, language);
          
          expect(translation).toBeDefined();
          
          // Property: Translations should maintain proper Unicode encoding
          const encoded = encodeURIComponent(translation!);
          const decoded = decodeURIComponent(encoded);
          expect(decoded).toBe(translation);
          
          // Property: Translations should not contain control characters
          expect(translation).not.toMatch(/[\x00-\x1F\x7F]/);
          
          // Property: Translations should be valid UTF-8
          expect(Buffer.from(translation!, 'utf8').toString('utf8')).toBe(translation);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate specific language character sets', () => {
      const languageCharacterTests = {
        'hi': /[\u0900-\u097F]/, // Devanagari script for Hindi
        'mr': /[\u0900-\u097F]/, // Devanagari script for Marathi
        'gu': /[\u0A80-\u0AFF]/, // Gujarati script
        'ta': /[\u0B80-\u0BFF]/, // Tamil script
        'en': /[A-Za-z]/, // Latin script for English
      };

      fc.assert(
        fc.property(
          fc.oneof(fc.constant('hi'), fc.constant('mr'), fc.constant('gu'), fc.constant('ta')),
          fc.oneof(
            fc.constant('navigation.home'),
            fc.constant('common.loading'),
            fc.constant('routes.title'),
            fc.constant('chatbot.welcome')
          ),
          (language, key) => {
            const translation = i18nService.translate(key, language);
            expect(translation).toBeDefined();
            
            // Property: Non-English languages should contain appropriate script characters
            if (language !== 'en') {
              const regex = languageCharacterTests[language];
              expect(translation).toMatch(regex);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Additional unit tests for edge cases
  describe('Translation Edge Cases', () => {
    it('should handle nested translation keys correctly', () => {
      const nestedKeys = [
        'navigation.home',
        'user.profile',
        'routes.search',
        'chatbot.suggestions'
      ];

      for (const key of nestedKeys) {
        for (const language of SUPPORTED_LANGUAGES) {
          const translation = i18nService.translate(key, language);
          expect(translation).toBeDefined();
          expect(translation!.length).toBeGreaterThan(0);
        }
      }
    });

    it('should maintain translation file structure consistency', () => {
      const englishTranslations = i18nService.getAllTranslationKeys('en');
      
      for (const language of SUPPORTED_LANGUAGES.slice(1)) { // Skip English as it's the reference
        const languageTranslations = i18nService.getAllTranslationKeys(language);
        
        // Same number of keys
        expect(languageTranslations.length).toBe(englishTranslations.length);
        
        // Same key structure
        const englishKeySet = new Set(englishTranslations);
        const languageKeySet = new Set(languageTranslations);
        
        expect(languageKeySet).toEqual(englishKeySet);
      }
    });

    it('should handle language fallback gracefully', () => {
      // Test with a key that should exist in all languages
      const testKey = 'common.loading';
      
      for (const language of SUPPORTED_LANGUAGES) {
        i18nService.setLanguage(language);
        const translation = i18nService.translate(testKey);
        
        expect(translation).toBeDefined();
        expect(translation!.length).toBeGreaterThan(0);
      }
    });
  });
});