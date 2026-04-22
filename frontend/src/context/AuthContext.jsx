import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const requestSignupOtp = async (name, email, password) => {
    const { data } = await api.post('/auth/request-signup-otp', { name, email, password });
    return data;
  };

  const register = async ({ name, email, password, avatarUrl, profile, code }) => {
    const payload = { name, email, password, code };
    if (avatarUrl) payload.avatarUrl = avatarUrl;
    if (profile) payload.profile = profile;

    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    // Clear saved chat history for this user
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const uid = currentUser?._id || currentUser?.id;
      if (uid) localStorage.removeItem(`healthy_chat_${uid}`);
      if (uid) localStorage.removeItem(`healthy_premium_checkout_${uid}`);
      // fallback: clear any healthy_chat_ keys
      Object.keys(localStorage)
        .filter(k => k.startsWith('healthy_chat_') || k.startsWith('healthy_premium_checkout_'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const startPremiumCheckout = async () => {
    if (user?.isPremium) {
      return { alreadyPremium: true, user };
    }

    const { data } = await api.post('/auth/premium/checkout');
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  const confirmPremiumCheckout = async (checkoutSessionId) => {
    const { data } = await api.post(`/auth/premium/checkout/${checkoutSessionId}/confirm`);
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        requestSignupOtp,
        register,
        logout,
        updateUser,
        startPremiumCheckout,
        confirmPremiumCheckout,
        upgradeToPremiun: startPremiumCheckout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
