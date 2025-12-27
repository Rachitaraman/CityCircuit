/**
 * Comprehensive error handling and retry mechanisms for API calls
 * Implements circuit breaker patterns, exponential backoff, and error logging
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time to wait before attempting recovery (ms)
  monitoringPeriod: number; // Time window for monitoring failures (ms)
}

export interface ApiErrorDetails {
  endpoint: string;
  method: string;
  statusCode?: number;
  message: string;
  timestamp: Date;
  retryAttempt?: number;
  circuitState?: CircuitState;
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export class ApiError extends Error {
  public readonly statusCode?: number;
  public readonly endpoint: string;
  public readonly method: string;
  public readonly retryable: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    endpoint: string,
    method: string,
    statusCode?: number,
    retryable: boolean = true
  ) {
    super(message);
    this.name = 'ApiError';
    this.endpoint = endpoint;
    this.method = method;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.timestamp = new Date();
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(endpoint: string) {
    super(`Circuit breaker is open for endpoint: ${endpoint}`);
    this.name = 'CircuitBreakerOpenError';
  }
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;

  constructor(
    private endpoint: string,
    private config: CircuitBreakerConfig
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeout) {
        throw new CircuitBreakerOpenError(this.endpoint);
      }
      // Transition to half-open to test if service has recovered
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      // Require multiple successes before closing circuit
      if (this.successCount >= 3) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

export class ApiClient {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  };
  private defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
  };

  constructor(
    private baseURL: string,
    private defaultHeaders: Record<string, string> = {}
  ) {}

  async request<T>(
    endpoint: string,
    options: RequestInit & {
      retryConfig?: Partial<RetryConfig>;
      circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
      skipRetry?: boolean;
      skipCircuitBreaker?: boolean;
    } = {}
  ): Promise<T> {
    const {
      retryConfig,
      circuitBreakerConfig,
      skipRetry = false,
      skipCircuitBreaker = false,
      ...fetchOptions
    } = options;

    const finalRetryConfig = { ...this.defaultRetryConfig, ...retryConfig };
    const finalCircuitBreakerConfig = { ...this.defaultCircuitBreakerConfig, ...circuitBreakerConfig };

    const url = `${this.baseURL}${endpoint}`;
    const method = fetchOptions.method || 'GET';

    // Get or create circuit breaker for this endpoint
    const circuitBreakerKey = `${method}:${endpoint}`;
    if (!skipCircuitBreaker && !this.circuitBreakers.has(circuitBreakerKey)) {
      this.circuitBreakers.set(
        circuitBreakerKey,
        new CircuitBreaker(endpoint, finalCircuitBreakerConfig)
      );
    }

    const circuitBreaker = this.circuitBreakers.get(circuitBreakerKey);

    const executeRequest = async (): Promise<T> => {
      const requestOptions: RequestInit = {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
          ...fetchOptions.headers,
        },
      };

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorMessage = await this.extractErrorMessage(response);
        const isRetryable = this.isRetryableError(response.status);
        
        throw new ApiError(
          errorMessage,
          endpoint,
          method,
          response.status,
          isRetryable
        );
      }

      // Handle different content types
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else if (contentType?.includes('text/')) {
        return await response.text() as unknown as T;
      } else {
        return await response.blob() as unknown as T;
      }
    };

    const operation = skipRetry
      ? executeRequest
      : () => this.executeWithRetry(executeRequest, finalRetryConfig, endpoint, method);

    if (skipCircuitBreaker || !circuitBreaker) {
      return await operation();
    }

    return await circuitBreaker.execute(operation);
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    endpoint: string,
    method: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 0) {
          this.logApiEvent({
            endpoint,
            method,
            message: `Request succeeded after ${attempt} retries`,
            timestamp: new Date(),
            retryAttempt: attempt,
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry if it's not a retryable error
        if (error instanceof ApiError && !error.retryable) {
          throw error;
        }

        // Don't retry if it's a circuit breaker error
        if (error instanceof CircuitBreakerOpenError) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config);
        
        this.logApiEvent({
          endpoint,
          method,
          message: `Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`,
          timestamp: new Date(),
          retryAttempt: attempt + 1,
        });

        await this.sleep(delay);
      }
    }

    // Log final failure
    this.logApiEvent({
      endpoint,
      method,
      message: `Request failed after ${config.maxRetries} retries: ${lastError.message}`,
      timestamp: new Date(),
      retryAttempt: config.maxRetries,
    });

    throw lastError;
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    delay = Math.min(delay, config.maxDelay);

    if (config.jitter) {
      // Add random jitter (±25% of the delay)
      const jitterRange = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    return Math.max(delay, 0);
  }

  private isRetryableError(statusCode: number): boolean {
    // Retry on server errors and specific client errors
    return (
      statusCode >= 500 || // Server errors
      statusCode === 408 || // Request Timeout
      statusCode === 429 || // Too Many Requests
      statusCode === 502 || // Bad Gateway
      statusCode === 503 || // Service Unavailable
      statusCode === 504    // Gateway Timeout
    );
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        return errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      } else {
        const text = await response.text();
        return text || `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }

  private logApiEvent(details: ApiErrorDetails): void {
    // In production, this would send to a logging service
    console.warn('API Event:', {
      timestamp: details.timestamp.toISOString(),
      endpoint: details.endpoint,
      method: details.method,
      message: details.message,
      retryAttempt: details.retryAttempt,
      circuitState: details.circuitState,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility methods for monitoring and management
  getCircuitBreakerStatus(endpoint: string, method: string = 'GET'): {
    state: CircuitState;
    failureCount: number;
  } | null {
    const key = `${method}:${endpoint}`;
    const circuitBreaker = this.circuitBreakers.get(key);
    
    if (!circuitBreaker) {
      return null;
    }

    return {
      state: circuitBreaker.getState(),
      failureCount: circuitBreaker.getFailureCount(),
    };
  }

  resetCircuitBreaker(endpoint: string, method: string = 'GET'): void {
    const key = `${method}:${endpoint}`;
    this.circuitBreakers.delete(key);
  }

  getAllCircuitBreakerStatuses(): Record<string, { state: CircuitState; failureCount: number }> {
    const statuses: Record<string, { state: CircuitState; failureCount: number }> = {};
    
    for (const [key, circuitBreaker] of this.circuitBreakers.entries()) {
      statuses[key] = {
        state: circuitBreaker.getState(),
        failureCount: circuitBreaker.getFailureCount(),
      };
    }

    return statuses;
  }
}

// Specialized API clients for different services
export class RouteOptimizationApiClient extends ApiClient {
  constructor(baseURL: string, apiKey?: string) {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    super(baseURL, headers);
  }

  async optimizeRoute(routeData: any): Promise<any> {
    return this.request('/api/optimize', {
      method: 'POST',
      body: JSON.stringify(routeData),
      retryConfig: {
        maxRetries: 5, // Route optimization is critical, retry more
        baseDelay: 2000,
        maxDelay: 60000,
      },
    });
  }

  async getRoutes(filters?: any): Promise<any> {
    const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return this.request(`/api/routes${queryParams}`, {
      method: 'GET',
      retryConfig: {
        maxRetries: 2, // Read operations need fewer retries
        baseDelay: 500,
      },
    });
  }
}

export class ExternalMapsApiClient extends ApiClient {
  constructor(baseURL: string, apiKey: string) {
    super(baseURL, {
      'Authorization': `Bearer ${apiKey}`,
    });
  }

  async getDirections(origin: string, destination: string): Promise<any> {
    return this.request('/directions', {
      method: 'GET',
      body: JSON.stringify({ origin, destination }),
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
      },
      circuitBreakerConfig: {
        failureThreshold: 3, // External APIs are less reliable
        recoveryTimeout: 30000, // Shorter recovery time
      },
    });
  }

  async geocode(address: string): Promise<any> {
    return this.request('/geocode', {
      method: 'GET',
      body: JSON.stringify({ address }),
      retryConfig: {
        maxRetries: 2,
        baseDelay: 500,
      },
    });
  }
}

// Global error handler for unhandled API errors
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorCallbacks: ((error: ApiError) => void)[] = [];

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  onError(callback: (error: ApiError) => void): void {
    this.errorCallbacks.push(callback);
  }

  handleError(error: ApiError): void {
    // Log the error
    console.error('Global API Error:', {
      endpoint: error.endpoint,
      method: error.method,
      statusCode: error.statusCode,
      message: error.message,
      timestamp: error.timestamp.toISOString(),
      retryable: error.retryable,
    });

    // Notify all registered callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });

    // Send to analytics service if available
    if (typeof window !== 'undefined' && (window as any).analyticsService) {
      (window as any).analyticsService.trackError(error, {
        endpoint: error.endpoint,
        method: error.method,
        statusCode: error.statusCode,
      });
    }
  }
}

// Utility function to wrap existing fetch calls with error handling
export function withErrorHandling<T>(
  apiCall: () => Promise<T>,
  context: { endpoint: string; method: string }
): Promise<T> {
  return apiCall().catch(error => {
    if (error instanceof ApiError) {
      GlobalErrorHandler.getInstance().handleError(error);
      throw error;
    }

    // Convert generic errors to ApiError
    const apiError = new ApiError(
      error.message || 'Unknown API error',
      context.endpoint,
      context.method
    );
    
    GlobalErrorHandler.getInstance().handleError(apiError);
    throw apiError;
  });
}

// Export singleton instances for common use cases
export const routeApiClient = new RouteOptimizationApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
);

export const mapsApiClient = new ExternalMapsApiClient(
  'https://maps.googleapis.com/maps/api',
  process.env.NEXT_PUBLIC_MAPS_API_KEY || ''
);

export const globalErrorHandler = GlobalErrorHandler.getInstance();