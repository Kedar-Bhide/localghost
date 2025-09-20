import { useState, useEffect, useContext, createContext, ReactNode, useCallback } from 'react';
import { User, AuthAPI, TokenManager } from '@/lib/auth';
import { ApiError } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, full_name: string, role: 'traveler' | 'local') => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
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
    try {
      const token = TokenManager.getToken();
      if (token) {
        const response = await AuthAPI.getCurrentUser();
        setUser(response.user);
      }
    } catch (error) {
      // Token is invalid, remove it and logout
      TokenManager.removeToken();
      setUser(null);
    }
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = TokenManager.getToken();
        if (token) {
          const response = await AuthAPI.getCurrentUser();
          setUser(response.user);
        }
      } catch (error) {
        // Token is invalid, remove it
        TokenManager.removeToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await AuthAPI.login({ email, password });
      
      TokenManager.setToken(response.access_token);
      setUser(response.user);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred during login');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, full_name: string, role: 'traveler' | 'local') => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await AuthAPI.signup({ email, password, full_name, role });
      
      TokenManager.setToken(response.access_token);
      setUser(response.user);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred during signup');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AuthAPI.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      TokenManager.removeToken();
      setUser(null);
      setError(null);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshUser,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}