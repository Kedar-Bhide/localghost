import { useState, useCallback, useRef } from 'react';
import { validateEmail, validatePassword, validateName, validateBio, validateUrl, validatePhoneNumber, sanitizeFormData } from '../utils/security';

interface ValidationRules {
  [key: string]: {
    required?: boolean;
    validator: (value: any) => { isValid: boolean; message?: string };
    sanitize?: boolean;
  };
}

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

interface UseSecureFormOptions<T> {
  initialValues: T;
  validationRules: ValidationRules;
  onSubmit: (values: T) => Promise<void> | void;
}

export function useSecureForm<T extends Record<string, any>>({
  initialValues,
  validationRules,
  onSubmit,
}: UseSecureFormOptions<T>) {
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: false,
  });

  const csrfTokenRef = useRef<string | null>(null);

  // Generate CSRF token on mount
  if (!csrfTokenRef.current) {
    csrfTokenRef.current = generateCSRFToken();
  }

  const validateField = useCallback((name: keyof T, value: any): string | null => {
    const rule = validationRules[name as string];
    if (!rule) return null;

    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${String(name)} is required`;
    }

    if (value && rule.validator) {
      const result = rule.validator(value);
      if (!result.isValid) {
        return result.message || `${String(name)} is invalid`;
      }
    }

    return null;
  }, [validationRules]);

  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const fieldName in validationRules) {
      const error = validateField(fieldName as keyof T, formState.values[fieldName]);
      if (error) {
        errors[fieldName as keyof T] = error;
        isValid = false;
      }
    }

    setFormState(prev => ({ ...prev, errors, isValid }));
    return isValid;
  }, [formState.values, validateField, validationRules]);

  const setValue = useCallback((name: keyof T, value: any) => {
    const rule = validationRules[name as string];
    let sanitizedValue = value;

    // Sanitize value if rule specifies
    if (rule?.sanitize && typeof value === 'string') {
      sanitizedValue = sanitizeText(value);
    }

    setFormState(prev => {
      const newValues = { ...prev.values, [name]: sanitizedValue };
      const error = validateField(name, sanitizedValue);
      const newErrors = { ...prev.errors };
      
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }

      return {
        ...prev,
        values: newValues,
        errors: newErrors,
        touched: { ...prev.touched, [name]: true },
      };
    });
  }, [validateField, validationRules]);

  const setTouched = useCallback((name: keyof T, touched: boolean = true) => {
    setFormState(prev => ({
      ...prev,
      touched: { ...prev.touched, [name]: touched },
    }));
  }, []);

  const setError = useCallback((name: keyof T, error: string | null) => {
    setFormState(prev => {
      const newErrors = { ...prev.errors };
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }
      return { ...prev, errors: newErrors };
    });
  }, []);

  const clearErrors = useCallback(() => {
    setFormState(prev => ({ ...prev, errors: {} }));
  }, []);

  const reset = useCallback(() => {
    setFormState({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: false,
    });
  }, [initialValues]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Mark all fields as touched
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    for (const fieldName in validationRules) {
      allTouched[fieldName as keyof T] = true;
    }

    setFormState(prev => ({ ...prev, touched: allTouched }));

    // Validate form
    if (!validateForm()) {
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Sanitize all form data
      const sanitizedValues = sanitizeFormData(formState.values);
      
      // Add CSRF token to form data
      const formDataWithCSRF = {
        ...sanitizedValues,
        _csrf_token: csrfTokenRef.current,
      };

      await onSubmit(formDataWithCSRF as T);
    } catch (error) {
      console.error('Form submission error:', error);
      // Error handling is done by the parent component
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [formState.values, validateForm, onSubmit]);

  const getFieldProps = useCallback((name: keyof T) => {
    return {
      value: formState.values[name] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setValue(name, e.target.value);
      },
      onBlur: () => setTouched(name),
      error: formState.touched[name] ? formState.errors[name] : undefined,
    };
  }, [formState.values, formState.errors, formState.touched, setValue, setTouched]);

  return {
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    isSubmitting: formState.isSubmitting,
    isValid: formState.isValid,
    setValue,
    setTouched,
    setError,
    clearErrors,
    reset,
    handleSubmit,
    getFieldProps,
    validateField,
    validateForm,
    csrfToken: csrfTokenRef.current,
  };
}

// Predefined validation rules for common fields
export const commonValidationRules = {
  email: {
    required: true,
    validator: validateEmail,
    sanitize: true,
  },
  password: {
    required: true,
    validator: validatePassword,
    sanitize: false, // Don't sanitize passwords
  },
  fullName: {
    required: true,
    validator: validateName,
    sanitize: true,
  },
  bio: {
    required: false,
    validator: validateBio,
    sanitize: true,
  },
  website: {
    required: false,
    validator: validateUrl,
    sanitize: true,
  },
  phone: {
    required: false,
    validator: validatePhoneNumber,
    sanitize: true,
  },
};

// Helper function to generate CSRF token
function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Helper function to sanitize text
function sanitizeText(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}
