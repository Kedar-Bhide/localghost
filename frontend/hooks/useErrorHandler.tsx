import { useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';

interface ErrorInfo {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

interface UseErrorHandlerReturn {
  error: ErrorInfo | null;
  isError: boolean;
  handleError: (error: any) => void;
  clearError: () => void;
  handleAsyncError: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorInfo | null>(null);

  const handleError = useCallback((error: any) => {
    console.error('Error caught by useErrorHandler:', error);

    let errorInfo: ErrorInfo;

    if (error?.response?.data?.error) {
      // API error response
      const apiError = error.response.data.error;
      errorInfo = {
        message: apiError.message || 'An error occurred',
        code: apiError.code,
        statusCode: apiError.status_code,
        details: apiError.details,
      };
    } else if (error?.response?.status) {
      // HTTP error without structured response
      errorInfo = {
        message: getHttpErrorMessage(error.response.status),
        statusCode: error.response.status,
      };
    } else if (error?.message) {
      // JavaScript error
      errorInfo = {
        message: error.message,
      };
    } else {
      // Unknown error
      errorInfo = {
        message: 'An unexpected error occurred',
      };
    }

    setError(errorInfo);

    // Show toast notification
    toast.error(errorInfo.message, {
      duration: 5000,
      position: 'top-right',
    });

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Here you would typically send to Sentry, LogRocket, etc.
      console.error('Production error:', errorInfo);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleAsyncError = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [handleError]);

  return {
    error,
    isError: error !== null,
    handleError,
    clearError,
    handleAsyncError,
  };
}

function getHttpErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad request. Please check your input and try again.';
    case 401:
      return 'You are not authorized. Please log in and try again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'There was a conflict with the current state.';
    case 422:
      return 'The data you provided is invalid.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Internal server error. Please try again later.';
    case 502:
      return 'Service temporarily unavailable. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
}

// Hook for handling form validation errors
export function useFormErrorHandler() {
  const { error, isError, handleError, clearError } = useErrorHandler();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleValidationError = useCallback((error: any) => {
    if (error?.response?.data?.error?.details?.validation_errors) {
      const validationErrors = error.response.data.error.details.validation_errors;
      const fieldErrorsMap: Record<string, string> = {};
      
      validationErrors.forEach((err: any) => {
        fieldErrorsMap[err.field] = err.message;
      });
      
      setFieldErrors(fieldErrorsMap);
    } else {
      handleError(error);
    }
  }, [handleError]);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  return {
    error,
    isError,
    fieldErrors,
    handleError: handleValidationError,
    clearError,
    clearFieldError,
    clearAllFieldErrors,
  };
}
