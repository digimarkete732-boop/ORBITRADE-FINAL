import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('orbital_token'));

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('orbital_token');
      if (storedToken) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await api.get('/api/auth/me');
          setUser(response.data);
          setToken(storedToken);
        } catch (error) {
          console.error('Auth init error:', error);
          localStorage.removeItem('orbital_token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('orbital_token', access_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    
    return userData;
  };

  const register = async (email, password, full_name) => {
    const response = await api.post('/api/auth/register', { email, password, full_name });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('orbital_token', access_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('orbital_token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.is_admin || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
