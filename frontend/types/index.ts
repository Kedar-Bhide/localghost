// Core user types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'traveler' | 'local';
  profile_picture_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  message: string;
  error?: boolean;
}

// Authentication types
export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData extends LoginData {
  full_name: string;
  role: 'traveler' | 'local';
}

export interface AuthResponse {
  user: User;
  access_token: string;
  expires_at: string;
}