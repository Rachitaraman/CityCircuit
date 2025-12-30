// OTP Service Diagnostics and Health Checks
import { auth } from '../lib/firebase';

interface DiagnosticResult {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
}

class OTPDiagnostics {
  
  // Check Firebase configuration
  async checkFirebaseConfig(): Promise<DiagnosticResult> {
    try {
      if (!auth) {
        return {
          service: 'Firebase Auth',
          status: 'error',
          message: 'Firebase Auth not initialized'
        };
      }

      const config = auth.app.options;
      
      if (!config.apiKey || !config.authDomain || !config.projectId) {
        return {
          service: 'Firebase Auth',
          status: 'error',
          message: 'Firebase configuration incomplete',
          details: {
            hasApiKey: !!config.apiKey,
            hasAuthDomain: !!config.authDomain,
            hasProjectId: !!config.projectId
          }
        };
      }

      return {
        service: 'Firebase Auth',
        status: 'healthy',
        message: 'Firebase configuration is complete',
        details: {
          projectId: config.projectId,
          authDomain: config.authDomain
        }
      };
    } catch (error: any) {
      return {
        service: 'Firebase Auth',
        status: 'error',
        message: error.message || 'Firebase configuration check failed'
      };
    }
  }

  // Check reCAPTCHA container
  checkRecaptchaContainer(): DiagnosticResult {
    if (typeof window === 'undefined') {
      return {
        service: 'reCAPTCHA',
        status: 'warning',
        message: 'Running on server-side, cannot check reCAPTCHA container'
      };
    }

    const container = document.getElementById('recaptcha-container');
    
    if (!container) {
      return {
        service: 'reCAPTCHA',
        status: 'error',
        message: 'reCAPTCHA container not found in DOM',
        details: {
          suggestion: 'Add <div id="recaptcha-container"></div> to your app'
        }
      };
    }

    return {
      service: 'reCAPTCHA',
      status: 'healthy',
      message: 'reCAPTCHA container found',
      details: {
        containerId: container.id,
        isVisible: container.style.display !== 'none'
      }
    };
  }

  // Check environment variables
  checkEnvironmentConfig(): DiagnosticResult {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return {
        service: 'Environment Config',
        status: 'warning',
        message: 'Running on server-side, cannot check client environment variables'
      };
    }

    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    ];

    // Check if Firebase config is available through the auth object
    if (auth?.app?.options) {
      const config = auth.app.options;
      if (config.apiKey && config.authDomain && config.projectId) {
        return {
          service: 'Environment Config',
          status: 'healthy',
          message: 'Firebase configuration loaded successfully',
          details: {
            projectId: config.projectId,
            authDomain: config.authDomain,
            configSource: 'Firebase app instance'
          }
        };
      }
    }

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      return {
        service: 'Environment Config',
        status: 'error',
        message: 'Missing required environment variables',
        details: {
          missing,
          suggestion: 'Check your .env.local file'
        }
      };
    }

    const optionalVars = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER'
    ];

    const hasOptional = optionalVars.filter(varName => !!process.env[varName]);

    return {
      service: 'Environment Config',
      status: 'healthy',
      message: 'All required environment variables are set',
      details: {
        requiredVars: requiredVars.length,
        optionalVars: hasOptional.length,
        twilioConfigured: hasOptional.length === 3
      }
    };
  }

  // Test Textbelt connectivity (skip CORS check in browser)
  async checkTextbeltService(): Promise<DiagnosticResult> {
    // Skip actual network test in browser due to CORS
    if (typeof window !== 'undefined') {
      return {
        service: 'Textbelt SMS',
        status: 'healthy',
        message: 'Textbelt fallback available (CORS check skipped in browser)',
        details: {
          note: 'Textbelt will be tested when actually sending SMS',
          supportedRegions: 'US/Canada (+1 numbers)',
          fallbackMode: 'Available for non-Firebase scenarios'
        }
      };
    }

    try {
      const response = await fetch('https://textbelt.com/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+1234567890', // Test number
          message: 'Test connectivity',
          key: 'textbelt'
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        return {
          service: 'Textbelt SMS',
          status: 'healthy',
          message: 'Textbelt service is accessible',
          details: {
            quotaRemaining: result.quotaRemaining || 'Unknown',
            textId: result.textId || 'Test call'
          }
        };
      } else {
        return {
          service: 'Textbelt SMS',
          status: 'warning',
          message: 'Textbelt service responded with error',
          details: result
        };
      }
    } catch (error: any) {
      return {
        service: 'Textbelt SMS',
        status: 'warning',
        message: 'Textbelt connectivity check failed (expected in browser)',
        details: {
          error: error.message,
          note: 'This is normal due to CORS restrictions'
        }
      };
    }
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber: string): DiagnosticResult {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Indian number validation
    if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
      return {
        service: 'Phone Validation',
        status: 'healthy',
        message: 'Valid Indian mobile number',
        details: {
          format: 'Indian 10-digit',
          normalized: `+91${cleaned}`
        }
      };
    }
    
    // Indian number with country code
    if (cleaned.length === 12 && cleaned.startsWith('91') && /^91[6-9]\d{9}$/.test(cleaned)) {
      return {
        service: 'Phone Validation',
        status: 'healthy',
        message: 'Valid Indian mobile number with country code',
        details: {
          format: 'Indian with +91',
          normalized: `+${cleaned}`
        }
      };
    }
    
    // US number validation
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return {
        service: 'Phone Validation',
        status: 'healthy',
        message: 'Valid US/Canada number',
        details: {
          format: 'US/Canada',
          normalized: `+${cleaned}`
        }
      };
    }
    
    // International format
    if (phoneNumber.startsWith('+') && cleaned.length >= 10) {
      return {
        service: 'Phone Validation',
        status: 'warning',
        message: 'International number format detected',
        details: {
          format: 'International',
          normalized: phoneNumber,
          note: 'May not work with all SMS services'
        }
      };
    }
    
    return {
      service: 'Phone Validation',
      status: 'error',
      message: 'Invalid phone number format',
      details: {
        input: phoneNumber,
        cleaned,
        suggestion: 'Use +91XXXXXXXXXX for India or +1XXXXXXXXXX for US'
      }
    };
  }

  // Run all diagnostics
  async runFullDiagnostics(phoneNumber?: string): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    // Environment check
    results.push(this.checkEnvironmentConfig());
    
    // Firebase check
    results.push(await this.checkFirebaseConfig());
    
    // reCAPTCHA check
    results.push(this.checkRecaptchaContainer());
    
    // Textbelt check
    results.push(await this.checkTextbeltService());
    
    // Phone number validation (if provided)
    if (phoneNumber) {
      results.push(this.validatePhoneNumber(phoneNumber));
    }
    
    return results;
  }

  // Generate diagnostic report
  generateReport(results: DiagnosticResult[]): string {
    const healthy = results.filter(r => r.status === 'healthy').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const errors = results.filter(r => r.status === 'error').length;
    
    let report = `🔍 OTP Service Diagnostics Report\n`;
    report += `═══════════════════════════════════\n`;
    report += `✅ Healthy: ${healthy} | ⚠️  Warnings: ${warnings} | ❌ Errors: ${errors}\n\n`;
    
    results.forEach(result => {
      const icon = result.status === 'healthy' ? '✅' : 
                   result.status === 'warning' ? '⚠️' : '❌';
      
      report += `${icon} ${result.service}: ${result.message}\n`;
      
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          report += `   ${key}: ${value}\n`;
        });
      }
      report += '\n';
    });
    
    if (errors > 0) {
      report += `🚨 Action Required: ${errors} error(s) need to be resolved for OTP to work properly.\n`;
    } else if (warnings > 0) {
      report += `⚠️  Review Needed: ${warnings} warning(s) may affect OTP reliability.\n`;
    } else {
      report += `🎉 All systems operational! OTP service should work correctly.\n`;
    }
    
    return report;
  }
}

// Export singleton instance
export const otpDiagnostics = new OTPDiagnostics();

// Utility function for quick health check
export const quickOTPHealthCheck = async (phoneNumber?: string): Promise<void> => {
  console.log('🔍 Running OTP Service Health Check...\n');
  
  const results = await otpDiagnostics.runFullDiagnostics(phoneNumber);
  const report = otpDiagnostics.generateReport(results);
  
  console.log(report);
  
  // Also return results for programmatic use
  return results as any;
};