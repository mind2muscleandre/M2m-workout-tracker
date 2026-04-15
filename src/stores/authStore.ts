// ============================================
// PT Workout Tracker - Auth Store
// ============================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types/database';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
}

type AuthStore = AuthState & AuthActions;

// ============================================
// Helper: Fetch user profile from users table
// ============================================

const fetchUserProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error.message);
    return null;
  }

  return data;
};

const fetchUserProfileFromAiScreening = async (
  userId: string
): Promise<User | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, name, email, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching AI screening profile:', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.user_id,
    email: data.email ?? '',
    full_name: data.name ?? 'Unknown',
    role: (data.role ?? 'user') as UserRole,
    gym_id: null,
    created_at: new Date().toISOString(),
  };
};

const fetchAnyUserProfile = async (userId: string): Promise<User | null> => {
  const legacyProfile = await fetchUserProfile(userId);
  if (legacyProfile) {
    return legacyProfile;
  }
  return fetchUserProfileFromAiScreening(userId);
};

const isPtRole = (profile: User | null): boolean =>
  profile?.role === 'pt' || profile?.role === 'admin';

// ============================================
// Store
// ============================================

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  // Actions
  signUp: async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => {
    try {
      set({ isLoading: true });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        set({ session: data.session });

        // Fetch the user profile that was created by the database trigger
        if (data.user) {
          const profile = await fetchAnyUserProfile(data.user.id);
          set({
            user: profile,
            isAuthenticated: !!profile && isPtRole(profile),
          });
        }
      }
    } catch (error: any) {
      console.error('Sign up error:', (error as Error).message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session && data.user) {
        const profile = await fetchAnyUserProfile(data.user.id);
        if (!isPtRole(profile)) {
          await supabase.auth.signOut();
          throw new Error('Det här kontot saknar PT-behörighet (pt/admin).');
        }
        set({
          session: data.session,
          user: profile,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Sign in error:', (error as Error).message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      set({
        user: null,
        session: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Sign out error:', (error as Error).message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Check for existing session
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (sessionData.session) {
        const profile = await fetchAnyUserProfile(sessionData.session.user.id);
        if (!isPtRole(profile)) {
          await supabase.auth.signOut();
          set({
            user: null,
            session: null,
            isAuthenticated: false,
          });
          return;
        }
        set({
          session: sessionData.session,
          user: profile,
          isAuthenticated: true,
        });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          set({ session });

          if (session?.user) {
            const profile = await fetchAnyUserProfile(session.user.id);
            if (!isPtRole(profile)) {
              await supabase.auth.signOut();
              return;
            }
            set({
              user: profile,
              isAuthenticated: true,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
            });
          }
        }
      );
    } catch (error) {
      console.error('Initialize auth error:', (error as Error).message);
      set({
        user: null,
        session: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setSession: (session: Session | null) => {
    set({ session, isAuthenticated: !!session });
  },

  setUser: (user: User | null) => {
    set({ user });
  },
}));
