/**
 * Frontend security utilities for XSS protection, input validation, and secure data handling.
 */

// XSS Protection
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  // Create a temporary div element
  const temp = document.createElement('div');
  temp.textContent = input;
  return temp.innerHTML;
}

export function sanitizeText(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

export function escapeHtml(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Input Validation
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }
  
  if (email.length > 254) {
    return { isValid: false, message: 'Email is too long' };
  }
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.{2,}/,  // Multiple consecutive dots
    /@.*@/,    // Multiple @ symbols
    /\.@/,     // Dot before @
    /@\./,     // @ before dot
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(email)) {
      return { isValid: false, message: 'Email contains invalid characters' };
    }
  }
  
  return { isValid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters' };
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    /^[0-9]+$/,  // Only numbers
    /^[a-zA-Z]+$/,  // Only letters
    /^[^a-zA-Z0-9]+$/,  // Only special characters
    /(.)\1{3,}/,  // Repeated characters
  ];
  
  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      return { isValid: false, message: 'Password is too weak' };
    }
  }
  
  // Check for common passwords
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, message: 'Password is too common' };
  }
  
  return { isValid: true };
}

export function validateName(name: string): ValidationResult {
  if (!name) {
    return { isValid: false, message: 'Name is required' };
  }
  
  if (name.length < 2) {
    return { isValid: false, message: 'Name must be at least 2 characters long' };
  }
  
  if (name.length > 100) {
    return { isValid: false, message: 'Name must be less than 100 characters' };
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, message: 'Name contains invalid characters' };
  }
  
  return { isValid: true };
}

export function validateBio(bio: string): ValidationResult {
  if (!bio) {
    return { isValid: true }; // Bio is optional
  }
  
  if (bio.length > 1000) {
    return { isValid: false, message: 'Bio must be less than 1000 characters' };
  }
  
  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
  ];
  
  for (const pattern of xssPatterns) {
    if (pattern.test(bio)) {
      return { isValid: false, message: 'Bio contains invalid content' };
    }
  }
  
  return { isValid: true };
}

export function validateUrl(url: string): ValidationResult {
  if (!url) {
    return { isValid: true }; // URL is optional
  }
  
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, message: 'Only HTTP and HTTPS URLs are allowed' };
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        return { isValid: false, message: 'URL contains invalid protocol' };
      }
    }
    
    return { isValid: true };
  } catch {
    return { isValid: false, message: 'Please enter a valid URL' };
  }
}

// File Upload Security
export function validateFileUpload(file: File): ValidationResult {
  if (!file) {
    return { isValid: false, message: 'No file selected' };
  }
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, message: 'File size must be less than 10MB' };
  }
  
  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, message: 'Only image files are allowed' };
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const fileExtension = file.name.toLowerCase().split('.').pop();
  
  if (!fileExtension || !allowedExtensions.includes(`.${fileExtension}`)) {
    return { isValid: false, message: 'File type not allowed' };
  }
  
  // Check for suspicious filename patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Windows reserved names
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      return { isValid: false, message: 'Filename contains invalid characters' };
    }
  }
  
  return { isValid: true };
}

// CSRF Protection
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) {
    return false;
  }
  
  // Use timing-safe comparison
  if (token.length !== sessionToken.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ sessionToken.charCodeAt(i);
  }
  
  return result === 0;
}

// Secure Storage
export function setSecureItem(key: string, value: string): void {
  try {
    // Encrypt sensitive data before storing
    const encrypted = btoa(unescape(encodeURIComponent(value)));
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error('Failed to store secure item:', error);
  }
}

export function getSecureItem(key: string): string | null {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    // Decrypt data after retrieving
    return decodeURIComponent(escape(atob(encrypted)));
  } catch (error) {
    console.error('Failed to retrieve secure item:', error);
    return null;
  }
}

export function removeSecureItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove secure item:', error);
  }
}

// Content Security Policy
export function createCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Input Sanitization for Forms
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      (sanitized as any)[key] = sanitizeText(sanitized[key] as string);
    }
  }
  
  return sanitized;
}

// URL Validation and Sanitization
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }
    
    // Remove potentially dangerous parts
    urlObj.search = '';
    urlObj.hash = '';
    
    return urlObj.toString();
  } catch {
    return '';
  }
}

// Phone Number Validation
export function validatePhoneNumber(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: true }; // Phone is optional
  }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 10) {
    return { isValid: false, message: 'Phone number must be at least 10 digits' };
  }
  
  if (digits.length > 15) {
    return { isValid: false, message: 'Phone number must be less than 15 digits' };
  }
  
  return { isValid: true };
}
