import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken]     = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
    } catch (error) {
      const status = error.response?.status;
      // Only logout on explicit 401 (invalid/expired token).
      // Do NOT logout on network errors, 500s, or any other issue —
      // that causes the "login then immediately logged out" bug.
      if (status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } else {
        console.error('Could not load user profile:', error.message);
        // Keep the token — the backend may just be temporarily unavailable
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const { token, user } = response;

      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);

      toast.success('Login successful!');

      if (user.user_type === 'admin')       navigate('/admin');
      else if (user.user_type === 'seller') navigate('/seller');
      else                                  navigate('/');

      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.error || 'Login failed';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  // Used by GoogleCallback after OAuth redirect
  const loginWithToken = (jwtToken, userData) => {
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
    toast.success(`Welcome, ${userData.name}! 🎉`);
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      const { token, user } = response;

      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);

      toast.success('Registration successful!');

      if (user.user_type === 'admin')       navigate('/admin');
      else if (user.user_type === 'seller') navigate('/seller');
      else                                  navigate('/buyer');

      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.error || 'Registration failed';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
    toast.info('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.error || 'Update failed');
      return { success: false };
    }
  };

  const value = {
    user, token, loading,
    login, loginWithToken, register, logout, updateProfile,
    isAuthenticated: !!user,
    isAdmin:  user?.user_type === 'admin',
    isSeller: user?.user_type === 'seller',
    isBuyer:  user?.user_type === 'buyer',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
