import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ErrorAlertProps {
  title?: string;
  message: string;
  details?: string;
  onDismiss?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
}

const variantClasses = {
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-400',
    title: 'text-red-800',
    message: 'text-red-700',
    details: 'text-red-600',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-400',
    title: 'text-yellow-800',
    message: 'text-yellow-700',
    details: 'text-yellow-600',
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-400',
    title: 'text-blue-800',
    message: 'text-blue-700',
    details: 'text-blue-600',
  },
};

export default function ErrorAlert({
  title = 'Error',
  message,
  details,
  onDismiss,
  className = '',
  variant = 'error',
}: ErrorAlertProps) {
  const classes = variantClasses[variant];

  return (
    <div className={`rounded-md border p-4 ${classes.container} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {variant === 'error' && (
            <svg
              className={`h-5 w-5 ${classes.icon}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {variant === 'warning' && (
            <svg
              className={`h-5 w-5 ${classes.icon}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.725-1.36 3.49 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {variant === 'info' && (
            <svg
              className={`h-5 w-5 ${classes.icon}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${classes.title}`}>
            {title}
          </h3>
          <div className={`mt-2 text-sm ${classes.message}`}>
            <p>{message}</p>
            {details && (
              <details className="mt-2">
                <summary className="cursor-pointer hover:underline">
                  Show details
                </summary>
                <pre className={`mt-2 text-xs ${classes.details} whitespace-pre-wrap`}>
                  {details}
                </pre>
              </details>
            )}
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 ${classes.icon} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600`}
              >
                <span className="sr-only">Dismiss</span>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Predefined error alerts for common use cases
export function NetworkErrorAlert({ onRetry, onDismiss }: { onRetry?: () => void; onDismiss?: () => void }) {
  return (
    <ErrorAlert
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onDismiss={onDismiss}
    />
  );
}

export function ValidationErrorAlert({ errors, onDismiss }: { errors: string[]; onDismiss?: () => void }) {
  return (
    <ErrorAlert
      title="Validation Error"
      message="Please correct the following errors:"
      details={errors.join('\n')}
      onDismiss={onDismiss}
    />
  );
}

export function ServerErrorAlert({ onRetry, onDismiss }: { onRetry?: () => void; onDismiss?: () => void }) {
  return (
    <ErrorAlert
      title="Server Error"
      message="Something went wrong on our end. Please try again later."
      onDismiss={onDismiss}
    />
  );
}
