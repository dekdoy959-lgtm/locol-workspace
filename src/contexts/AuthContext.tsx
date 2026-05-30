import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ');

const PROVIDER_TOKEN_KEY = 'locol_google_provider_token';
const PROVIDER_TOKEN_EXPIRY_KEY = 'locol_google_provider_token_expiry';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  providerToken: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function persistProviderToken(token: string | null, expiresInSec?: number) {
  if (!token) {
    localStorage.removeItem(PROVIDER_TOKEN_KEY);
    localStorage.removeItem(PROVIDER_TOKEN_EXPIRY_KEY);
    return;
  }
  localStorage.setItem(PROVIDER_TOKEN_KEY, token);
  // Google access tokens last ~3600s. Use provided expiry or default.
  const expiry = Date.now() + (expiresInSec ?? 3600) * 1000;
  localStorage.setItem(PROVIDER_TOKEN_EXPIRY_KEY, String(expiry));
}

function loadProviderToken(): string | null {
  const token = localStorage.getItem(PROVIDER_TOKEN_KEY);
  const expiryStr = localStorage.getItem(PROVIDER_TOKEN_EXPIRY_KEY);
  if (!token || !expiryStr) return null;
  if (Date.now() > Number(expiryStr)) {
    localStorage.removeItem(PROVIDER_TOKEN_KEY);
    localStorage.removeItem(PROVIDER_TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [providerToken, setProviderToken] = useState<string | null>(() => loadProviderToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      // Session from getSession() doesn't always carry provider_token (only on fresh sign-in)
      // — so we fall back to localStorage.
      if (data.session?.provider_token) {
        persistProviderToken(data.session.provider_token);
        setProviderToken(data.session.provider_token);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_IN' && newSession?.provider_token) {
        persistProviderToken(newSession.provider_token);
        setProviderToken(newSession.provider_token);
      }
      if (event === 'SIGNED_OUT') {
        persistProviderToken(null);
        setProviderToken(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: GOOGLE_SCOPES,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    // Wipe ALL local state BEFORE Supabase signs out — prevents PII (contacts,
    // notes, calendar attendees, meeting titles) from being readable on the
    // next user's session on a shared device.
    persistProviderToken(null);
    setProviderToken(null);
    if (typeof window !== 'undefined') {
      try {
        // 1. Persisted React Query cache (24h offline cache)
        window.localStorage.removeItem('LOCOL_QUERY_CACHE');
        // 2. Any orphaned per-query persistence keys
        for (const k of Object.keys(window.localStorage)) {
          if (k.startsWith('LOCOL_QUERY_CACHE') || k.startsWith('locol_google_')) {
            window.localStorage.removeItem(k);
          }
        }
      } catch {
        /* localStorage unavailable in private windows — fine */
      }
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Force a full reload so any in-memory React Query cache is dropped too.
    // (Just navigating to /login keeps the cache alive in the JS heap until
    // a tab close.) This is the cleanest cross-device guarantee.
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        providerToken,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
