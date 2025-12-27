/**
 * Property-based tests for internationalization (i18n) functionality
 * Tests multi-language support consistency and language switching
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import * as fc from 'fast-check';
import { I18nProvider, useI18n, SUPPORTED_LANGUAGES } from '../I18nContext';
import { useTranslation } from 'next-i18next';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock next-i18next
jest.mock('next-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock useUserPreferences
jest.mock('../../hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    updatePreferences: jest.fn().mockResolvedValue(true),
  }),
}));

describe('Internationalization Property Tests', () => {
  const mockPush = jest.fn();
  const mockT = jest.fn((key: string) => key);

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      locale: 'en',
      push: mockPush,
      pathname: '/',
      asPath: '/',
      query: {},
    });

    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
    });

    mockPush.mockClear();
    mockT.mockClear();
  });

  // Generator for supported language codes
  const supportedLanguageArb = fc.oneof(
    ...SUPPORTED_LANGUAGES.map(lang => fc.constant(lang.code))
  );

  // Generator for translation keys (common patterns)
  const translationKeyArb = fc.oneof(
    fc.constant('navigation.home'),
    fc.constant('navigation.routes'),
    fc.constant('common.loading'),
    fc.constant('common.error'),
    fc.constant('routes.title'),
    fc.constant('auth.login'),
    fc.constant('user.profile'),
    fc.string({ minLength: 3, maxLength: 50 }).map(s => `test.${s}`)
  );

  /**
   * **Feature: city-circuit, Property 14: Multi-language support consistency**
   * **Validates: Requirements 3.5**
   * 
   * Property: For any supported language, the system should provide consistent
   * multi-language support and maintain interface functionality
   */
  describe('Property 14: Multi-language support consistency', () => {
    // Test component that uses i18n context
    const TestComponent: React.FC = () => {
      const { currentLanguage, changeLanguage, supportedLanguages, isRTL } = useI18n();
      
      return (
        <div>
          <div data-testid="current-language">{currentLanguage}</div>
          <div data-testid="is-rtl">{isRTL.toString()}</div>
          <div data-testid="supported-count">{supportedLanguages.length}</div>
          {supportedLanguages.map(lang => (
            <button
              key={lang.code}
              data-testid={`lang-button-${lang.code}`}
              onClick={() => changeLanguage(lang.code)}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>
      );
    };

    it('should maintain consistent language support across all supported locales', () => {
      fc.assert(
        fc.property(supportedLanguageArb, (languageCode) => {
          // Mock router with the test language
          (useRouter as jest.Mock).mockReturnValue({
            locale: languageCode,
            push: mockPush,
            pathname: '/',
            asPath: '/',
            query: {},
          });

          render(
            <I18nProvider>
              <TestComponent />
            </I18nProvider>
          );

          // Property: Current language should match router locale
          expect(screen.getByTestId('current-language')).toHaveTextContent(languageCode);

          // Property: All supported languages should be available
          expect(screen.getByTestId('supported-count')).toHaveTextContent(
            SUPPORTED_LANGUAGES.length.toString()
          );

          // Property: Each supported language should have a button
          SUPPORTED_LANGUAGES.forEach(lang => {
            expect(screen.getByTestId(`lang-button-${lang.code}`)).toBeInTheDocument();
            expect(screen.getByTestId(`lang-button-${lang.code}`)).toHaveTextContent(lang.nativeName);
          });

          // Property: RTL detection should be consistent
          const isRTL = screen.getByTestId('is-rtl').textContent === 'true';
          // Currently no RTL languages in our supported set, so should always be false
          expect(isRTL).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('should handle language switching for any valid language combination', () => {
      fc.assert(
        fc.property(
          supportedLanguageArb,
          supportedLanguageArb,
          async (fromLanguage, toLanguage) => {
            // Setup initial language
            (useRouter as jest.Mock).mockReturnValue({
              locale: fromLanguage,
              push: mockPush,
              pathname: '/',
              asPath: '/',
              query: {},
            });

            render(
              <I18nProvider>
                <TestComponent />
              </I18nProvider>
            );

            // Property: Initial language should be set correctly
            expect(screen.getByTestId('current-language')).toHaveTextContent(fromLanguage);

            // Property: Language switching should trigger router navigation
            const targetButton = screen.getByTestId(`lang-button-${toLanguage}`);
            fireEvent.click(targetButton);

            await waitFor(() => {
              expect(mockPush).toHaveBeenCalledWith(
                { pathname: '/', query: {} },
                '/',
                { locale: toLanguage }
              );
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain translation function consistency across languages', () => {
      fc.assert(
        fc.property(
          supportedLanguageArb,
          fc.array(translationKeyArb, { minLength: 1, maxLength: 10 }),
          (languageCode, translationKeys) => {
            // Mock router with test language
            (useRouter as jest.Mock).mockReturnValue({
              locale: languageCode,
              push: mockPush,
              pathname: '/',
              asPath: '/',
              query: {},
            });

            // Mock translation function to return the key (simulating translation)
            const mockTranslate = jest.fn((key: string) => `${languageCode}:${key}`);
            (useTranslation as jest.Mock).mockReturnValue({
              t: mockTranslate,
            });

            const TestTranslationComponent: React.FC = () => {
              const { t } = useI18n();
              return (
                <div>
                  {translationKeys.map((key, index) => (
                    <div key={index} data-testid={`translation-${index}`}>
                      {t(key)}
                    </div>
                  ))}
                </div>
              );
            };

            render(
              <I18nProvider>
                <TestTranslationComponent />
              </I18nProvider>
            );

            // Property: Translation function should be called for each key
            translationKeys.forEach((key, index) => {
              expect(mockTranslate).toHaveBeenCalledWith(key, undefined);
              
              // Property: Translated content should be rendered
              const translationElement = screen.getByTestId(`translation-${index}`);
              expect(translationElement).toHaveTextContent(`${languageCode}:${key}`);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should apply correct document attributes for any language', () => {
      fc.assert(
        fc.property(supportedLanguageArb, (languageCode) => {
          // Mock router with test language
          (useRouter as jest.Mock).mockReturnValue({
            locale: languageCode,
            push: mockPush,
            pathname: '/',
            asPath: '/',
            query: {},
          });

          render(
            <I18nProvider>
              <TestComponent />
            </I18nProvider>
          );

          // Property: Document language should be set correctly
          expect(document.documentElement.lang).toBe(languageCode);

          // Property: Document direction should be set (LTR for our supported languages)
          expect(document.documentElement.dir).toBe('ltr');

          // Property: Language-specific CSS class should be applied
          expect(document.documentElement.classList.contains(`lang-${languageCode}`)).toBe(true);

          // Property: Other language classes should be removed
          SUPPORTED_LANGUAGES.forEach(lang => {
            if (lang.code !== languageCode) {
              expect(document.documentElement.classList.contains(`lang-${lang.code}`)).toBe(false);
            }
          });
        }),
        { numRuns: 50 }
      );
    });

    it('should handle invalid language codes gracefully', () => {
      const invalidLanguageCodes = ['xx', 'invalid', '', '123', 'en-INVALID'];

      invalidLanguageCodes.forEach(invalidCode => {
        // Mock router with invalid language (should fallback to default)
        (useRouter as jest.Mock).mockReturnValue({
          locale: invalidCode,
          push: mockPush,
          pathname: '/',
          asPath: '/',
          query: {},
        });

        render(
          <I18nProvider>
            <TestComponent />
          </I18nProvider>
        );

        // Property: Should handle invalid language gracefully
        const currentLanguage = screen.getByTestId('current-language').textContent;
        
        // Should either use the invalid code as-is or fallback to a valid one
        // The system should not crash
        expect(currentLanguage).toBeDefined();
        expect(typeof currentLanguage).toBe('string');
      });
    });

    it('should maintain language consistency during component re-renders', () => {
      fc.assert(
        fc.property(supportedLanguageArb, (languageCode) => {
          // Mock router with test language
          (useRouter as jest.Mock).mockReturnValue({
            locale: languageCode,
            push: mockPush,
            pathname: '/',
            asPath: '/',
            query: {},
          });

          const { rerender } = render(
            <I18nProvider>
              <TestComponent />
            </I18nProvider>
          );

          const initialLanguage = screen.getByTestId('current-language').textContent;

          // Property: Language should remain consistent after re-render
          rerender(
            <I18nProvider>
              <TestComponent />
            </I18nProvider>
          );

          expect(screen.getByTestId('current-language')).toHaveTextContent(initialLanguage || '');

          // Property: Supported languages should remain consistent
          expect(screen.getByTestId('supported-count')).toHaveTextContent(
            SUPPORTED_LANGUAGES.length.toString()
          );
        }),
        { numRuns: 30 }
      );
    });
  });

  // Additional unit tests for specific i18n functionality
  describe('Language Switching Edge Cases', () => {
    it('should handle rapid language switching', async () => {
      (useRouter as jest.Mock).mockReturnValue({
        locale: 'en',
        push: mockPush,
        pathname: '/',
        asPath: '/',
        query: {},
      });

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      // Rapidly switch between languages
      const languages = ['hi', 'mr', 'gu', 'ta', 'en'];
      
      for (const lang of languages) {
        const button = screen.getByTestId(`lang-button-${lang}`);
        fireEvent.click(button);
      }

      // Should have called push for each language
      expect(mockPush).toHaveBeenCalledTimes(languages.length);
    });

    it('should handle missing translation gracefully', () => {
      (useRouter as jest.Mock).mockReturnValue({
        locale: 'en',
        push: mockPush,
        pathname: '/',
        asPath: '/',
        query: {},
      });

      // Mock translation function that returns undefined for missing keys
      const mockTranslate = jest.fn((key: string) => {
        if (key === 'missing.key') return undefined;
        return key;
      });

      (useTranslation as jest.Mock).mockReturnValue({
        t: mockTranslate,
      });

      const TestMissingTranslation: React.FC = () => {
        const { t } = useI18n();
        return <div data-testid="missing-translation">{t('missing.key') || 'fallback'}</div>;
      };

      render(
        <I18nProvider>
          <TestMissingTranslation />
        </I18nProvider>
      );

      // Should handle missing translation gracefully
      expect(screen.getByTestId('missing-translation')).toHaveTextContent('fallback');
    });
  });
});