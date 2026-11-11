// context/AuthContext.js
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  canLoginAs,
  establishSession,
  clearBrowserAuth,
  AUTH_CONFLICT_MESSAGE,
} from '@/lib/clientAuthSession';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/check', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      clearBrowserAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (formData) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const incomingUserId = data.user?.userId || data.user?._id;
      const gate = canLoginAs(incomingUserId);
      if (!gate.ok) {
        throw new Error(gate.message || AUTH_CONFLICT_MESSAGE);
      }

      establishSession({
        token: data.token,
        userId: incomingUserId,
        role: data.user?.role || data.user?.user_type || 'user',
        source: 'store',
      });
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    clearBrowserAuth();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Do not auto-fetch on mount — Header already owns storefront auth via
  // HeaderContext + /api/auth/check. Call checkAuthStatus() when needed.
  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      loading, 
      login, 
      logout, 
      checkAuthStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);