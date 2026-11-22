// Status login seluruh aplikasi. Token JWT disimpan di SecureStore (Keychain di iPhone),
// bukan di AsyncStorage, supaya tidak tersimpan sebagai teks biasa.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Api, setAuthToken, setUnauthorizedHandler } from '../services/ApiService';

const TOKEN_KEY = 'nobarilmu.token';
const AuthContext = createContext(null);

// status: 'loading' (cek token tersimpan) | 'signedOut' | 'signedIn' | 'error' (server tidak terjangkau saat start)
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, error: null });

  const signOut = useCallback(async () => {
    setAuthToken(null);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // abaikan: yang penting token di memori sudah hilang
    }
    setState({ status: 'signedOut', user: null, error: null });
  }, []);

  const bootstrap = useCallback(async () => {
    setState({ status: 'loading', user: null, error: null });
    let token = null;
    try {
      token = await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      token = null;
    }
    if (!token) {
      setState({ status: 'signedOut', user: null, error: null });
      return;
    }
    setAuthToken(token);
    try {
      const { data } = await Api.me();
      setState({ status: 'signedIn', user: data, error: null });
    } catch (err) {
      if (err.status === 401) {
        await signOut(); // token kedaluwarsa
      } else {
        // server mati / tidak ada internet: token tetap disimpan, tampilkan tombol coba lagi
        setState({ status: 'error', user: null, error: err.message });
      }
    }
  }, [signOut]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    bootstrap();
  }, [bootstrap, signOut]);

  const completeAuth = useCallback(async ({ token, user }) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setAuthToken(token);
    setState({ status: 'signedIn', user, error: null });
  }, []);

  const signIn = useCallback(async (email, password) => completeAuth(await Api.login(email.trim(), password)), [completeAuth]);
  const register = useCallback(
    async (name, email, password) => completeAuth(await Api.register(name.trim(), email.trim(), password)),
    [completeAuth]
  );
  const updateUser = useCallback((user) => setState((s) => ({ ...s, user })), []);

  const value = useMemo(
    () => ({ ...state, signIn, register, signOut, updateUser, retry: bootstrap }),
    [state, signIn, register, signOut, updateUser, bootstrap]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
