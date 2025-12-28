/**
 * Error boundary component for catching and handling React errors
 * Provides fallback UI and error reporting functionality
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { globalErrorHandler, ApiError } from '../../services/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log the error
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Report to error tracking service
    this.reportError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // Convert to ApiError for consistent handling
    const apiError = new ApiError(
      error.message,
      'component',
      'render',
      undefined,
      false // Component errors are typically not retryable
    );

    // Add React-specific context
    (apiError as any).componentStack = errorInfo.componentStack;
    (apiError as any).errorBoundary = true;

    globalErrorHandler.handleError(apiError);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              Something went wrong
            </h2>

            <p className="text-neutral-600 mb-6">
              We&apos;re sorry, but something unexpected happened. Our team has been notified and is working on a fix.
            </p>

            <div className="space-y-3">
              <Button
                onClick={this.handleRetry}
                className="w-full bg-primary-600 hover:bg-primary-700"
              >
                Try Again
              </Button>

              <Button
                onClick={this.handleReload}
                variant="outline"
                className="w-full"
              >
                Reload Page
              </Button>
            </div>

            {this.props.showDetails && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-neutral-500 hover:text-neutral-700">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-neutral-100 rounded text-xs font-mono text-neutral-700 overflow-auto max-h-32">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Specialized error boundaries for different parts of the app
export const RouteErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          Route Error
        </h3>
        <p className="text-neutral-600 mb-4">
          There was an error loading route information. Please try refreshing the page.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh
        </Button>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('Route component error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const MapErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="p-6 text-center bg-neutral-100 rounded-lg">
        <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          Map Unavailable
        </h3>
        <p className="text-neutral-600">
          The map could not be loaded. Please check your internet connection and try again.
        </p>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('Map component error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const AdminErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">
          Admin Panel Error
        </h3>
        <p className="text-neutral-600 mb-6">
          There was an error in the admin panel. This has been reported to the development team.
        </p>
        <div className="space-x-3">
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    }
    showDetails={process.env.NODE_ENV === 'development'}
    onError={(error, errorInfo) => {
      console.error('Admin panel error:', error, errorInfo);
      // In production, this would send to error tracking service
    }}
  >
    {children}
  </ErrorBoundary>
);