import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase';
import { api, setAuthToken } from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  canClaimInitialAdmin: boolean;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  registerWithEmail: (name: string, email: string, password: string, phone?: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  claimInitialAdmin: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [canClaimInitialAdmin, setCanClaimInitialAdmin] = useState(false);

  const checkAdminSetup = useCallback(async () => {
    try {
      const res = await api.get<{ canClaimInitialAdmin: boolean }>('/auth/admin-status');
      setCanClaimInitialAdmin(res.data.canClaimInitialAdmin);
    } catch {
      setCanClaimInitialAdmin(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<{ user: User }>('/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
      setAuthToken(null);
    }
  }, []);

  useEffect(() => {
    checkAdminSetup();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          setAuthToken(token);
          const res = await api.get<{ user: User }>('/auth/me');
          setUser(res.data.user);
          await api.post('/cart/merge').catch(() => {});
        } catch {
          setUser(null);
          setAuthToken(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [checkAdminSetup]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: User; token: string }>('/auth/login', {
      email,
      password,
    });
    setAuthToken(res.data.token);
    setUser(res.data.user);
    await api.post('/cart/merge').catch(() => {});
    return res.data.user;
  }, []);

  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      const res = await api.post<{ user: User; token: string }>('/auth/register', {
        name,
        email,
        password,
        phone,
      });
      setAuthToken(res.data.token);
      setUser(res.data.user);
      await api.post('/cart/merge').catch(() => {});
      return res.data.user;
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await credential.user.getIdToken();
    setAuthToken(idToken);
    const res = await api.get<{ user: User }>('/auth/me');
    setUser(res.data.user);
    await api.post('/cart/merge').catch(() => {});
    return res.data.user;
  }, []);

  const claimInitialAdmin = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api.post<{ user: User; token: string }>('/auth/claim-admin', {
        name,
        email,
        password,
      });
      setAuthToken(res.data.token);
      setUser(res.data.user);
      setCanClaimInitialAdmin(false);
      return res.data.user;
    },
    []
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    await firebaseSignOut(auth).catch(() => {});
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        canClaimInitialAdmin,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        claimInitialAdmin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
