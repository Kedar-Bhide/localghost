import { useState, useEffect, useContext, createContext, ReactNode, useCallback } from 'react';

// ===== INLINED TYPES AND FUNCTIONS =====
// This eliminates dependency on external lib files for Vercel compatibility

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'traveler' | 'local';
  profile_picture_url?: string;
  bio?: string;
  onboarding_completed: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData extends LoginData {
  full_name: string;
  role: 'traveler' | 'local';
}

export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public response?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token management
const TokenManager = {
  setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  },

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  },

  removeToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  },
};

// API Client
class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = TokenManager.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new ApiError(response.status, errorData.message || `HTTP ${response.status}`, errorData);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Network error');
    }
  }

  async authenticatedRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const authHeaders = this.getAuthHeaders();
    return this.request<T>(endpoint, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    });
  }
}

const api = new ApiClient();

// Auth API
const AuthAPI = {
  async signup(data: SignupData): Promise<AuthResponse> {
    return api.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: LoginData): Promise<AuthResponse> {
    return api.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logout(): Promise<{ message: string }> {
    return api.authenticatedRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  async getCurrentUser(): Promise<{ user: User }> {
    return api.authenticatedRequest<{ user: User }>('/auth/me');
  },

  async refreshUserData(): Promise<{ user: User }> {
    return this.getCurrentUser();
  },

  async refreshToken(): Promise<AuthResponse> {
    return api.authenticatedRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
    });
  },
};

// ===== AUTH CONTEXT =====

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, full_name: string, role: 'traveler' | 'local') => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = TokenManager.getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await AuthAPI.getCurrentUser();
      setUser(response.user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      TokenManager.removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await AuthAPI.login({ email, password });
      TokenManager.setToken(response.access_token);
      setUser(response.user);
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Login failed';
      setError(errorMessage);
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, full_name: string, role: 'traveler' | 'local') => {
    setIsLoading(true);
    try {
      const response = await AuthAPI.signup({ email, password, full_name, role });
      TokenManager.setToken(response.access_token);
      setUser(response.user);
    } catch (error) {
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await AuthAPI.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      TokenManager.removeToken();
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    signup,
    logout,
    refreshUser,
    setUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}