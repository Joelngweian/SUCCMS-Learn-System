import React, { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { getBroadcastNewRecord, subscribeToPrivateBroadcast } from '@/lib/realtime';
import { azureAuth, AzureAuthSession, AzureAuthUser, isAzureAuthEnabled } from '@/lib/azureApi';

const AUTH_PROFILE_SELECT =
  'id, full_name, username, role, faculty, programme, avatar_url, cover_url, bio, is_active';

type AuthUser = {
  id: string;
  email?: string;
  aud?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

type AuthSession = {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
  refresh_token: string;
  user: AuthUser;
};

type PublicSignupRole = 'student';

const SUC_EMAIL_DOMAIN = '@sc.edu.my';
const AUTH_PROVIDER_IS_AZURE = isAzureAuthEnabled();

const resolveSignupRoleFromEmail = (email: string): PublicSignupRole | null => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.endsWith(SUC_EMAIL_DOMAIN)) {
    return null;
  }

  const emailPrefix = normalizedEmail.slice(0, -SUC_EMAIL_DOMAIN.length);

  if (
    emailPrefix.startsWith('d') ||
    emailPrefix.startsWith('b') ||
    emailPrefix.startsWith('p')
  ) {
    return 'student';
  }

  return null;
};

// Updated Profile to include all Database Fields
export type UserProfile = {
  id: string;
  full_name: string;
  username?: string | null;
  email: string;
  role: 'student' | 'lecturer' | 'staff' | 'admin';
  faculty?: string | null;
  programme?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  bio?: string | null;
  is_active?: boolean;
};

type EditableUserProfile = Partial<
  Pick<
    UserProfile,
    | 'full_name'
    | 'username'
    | 'faculty'
    | 'programme'
    | 'avatar_url'
    | 'cover_url'
    | 'bio'
  >
>;

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (
    email: string,
    password: string,
    username: string,
    fullName: string,
  ) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  updateProfile: (updates: EditableUserProfile) => Promise<ProfileUpdateResult>;
  refreshProfile: () => Promise<void>; 
}

type AuthActionResult = {
  data: unknown;
  error: { message: string } | null;
};

type ProfileUpdateResult = {
  data?: UserProfile | null;
  error: unknown;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getLoginClientInfo = () => {
  const userAgent = navigator.userAgent;
  const browser =
    userAgent.includes('Edg/')
      ? 'Microsoft Edge'
      : userAgent.includes('Chrome/')
        ? 'Google Chrome'
        : userAgent.includes('Firefox/')
          ? 'Mozilla Firefox'
          : userAgent.includes('Safari/')
            ? 'Safari'
            : 'Other';
  const device =
    /iPad|Tablet/i.test(userAgent)
      ? 'Tablet'
      : /Android|iPhone|Mobile/i.test(userAgent)
        ? 'Mobile'
        : 'Desktop';

  return { browser, device };
};

const toSupabaseCompatibleUser = (azureUser: AzureAuthUser): AuthUser =>
  ({
    id: azureUser.id,
    email: azureUser.email,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {
      full_name: azureUser.fullName,
    },
  });

const toSupabaseCompatibleSession = (azureSession: AzureAuthSession): AuthSession =>
  ({
    access_token: azureSession.accessToken,
    token_type: azureSession.tokenType,
    expires_in: azureSession.expiresInSeconds,
    expires_at: Math.floor(azureSession.expiresAt / 1000),
    refresh_token: '',
    user: toSupabaseCompatibleUser(azureSession.user),
  });

const toUserProfile = (azureUser: AzureAuthUser): UserProfile => ({
  id: azureUser.id,
  full_name: azureUser.fullName || azureUser.email,
  username: null,
  email: azureUser.email,
  role: azureUser.role,
  faculty: azureUser.faculty ?? null,
  programme: azureUser.programme ?? null,
  avatar_url: undefined,
  cover_url: undefined,
  bio: undefined,
  is_active: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.id;

  // Load User Data
  const loadUserAndProfile = useCallback(async (session: AuthSession) => {
    if (!session?.user) {
      setProfile(null);
      setUser(null);
      return;
    }
    setUser(session.user);
    
    // Fetch Profile
    const { data, error } = await supabase
      .from('user_profiles')
      .select(AUTH_PROFILE_SELECT)
      .eq('id', session.user.id)
      .single();

    if (data?.is_active === false) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } else if (data) {
      setProfile({
        ...data,
        email: session.user.email || '',
      } as UserProfile);
    } else {
      console.error("Profile load error:", error);
    }
  }, []);

  const loadAzureUserAndProfile = useCallback(async (azureSession: AzureAuthSession) => {
    const compatibleSession = toSupabaseCompatibleSession(azureSession);
    setSession(compatibleSession);
    setUser(compatibleSession.user);
    setProfile(toUserProfile(azureSession.user));
    await loadUserAndProfile(compatibleSession);
  }, [loadUserAndProfile]);

  useEffect(() => {
    if (AUTH_PROVIDER_IS_AZURE) {
      const restoreSession = async () => {
        try {
          const storedSession = azureAuth.loadSession();
          if (!storedSession) return;

          const user = await azureAuth.me(storedSession.accessToken);
          const nextSession = { ...storedSession, user };
          azureAuth.saveSession(nextSession);
          await loadAzureUserAndProfile(nextSession);
        } catch (error) {
          console.warn('Failed to restore Azure auth session:', error);
          azureAuth.clearSession();
          setSession(null);
          setUser(null);
          setProfile(null);
        } finally {
          setIsLoading(false);
        }
      };

      void restoreSession();
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadUserAndProfile(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadUserAndProfile(session);
      else {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAzureUserAndProfile, loadUserAndProfile]);

  useEffect(() => {
    if (!userId) return;

    return subscribeToPrivateBroadcast({
      topic: `user:${userId}:account`,
      event: 'UPDATE',
      onMessage: async (payload) => {
        if (getBroadcastNewRecord<UserProfile>(payload)?.is_active === false) {
          setSession(null);
          setUser(null);
          setProfile(null);
          await supabase.auth.signOut();
        }
      },
    });
  }, [userId]);

  // --- Auth Functions ---

  const signIn = async (email: string, password: string) => {
    if (AUTH_PROVIDER_IS_AZURE) {
      try {
        const azureSession = await azureAuth.login(email.trim().toLowerCase(), password);
        azureAuth.saveSession(azureSession);
        await loadAzureUserAndProfile(azureSession);
        return { data: azureSession, error: null };
      } catch (error) {
        return {
          data: null,
          error: {
            message: error instanceof Error ? error.message : 'Unable to sign in.',
          },
        };
      }
    }

    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error || !result.data.user) return result;

    const { data: signedInProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_active')
      .eq('id', result.data.user.id)
      .single();

    if (profileError) return { data: result.data, error: profileError };

    if (signedInProfile?.is_active === false) {
      await supabase.auth.signOut();
      return {
        data: null,
        error: {
          message: "This account has been suspended. Please contact an administrator."
        }
      };
    }

    const loginTime = new Date().toISOString();
    const { browser, device } = getLoginClientInfo();
    const [historyResult, profileUpdateResult] = await Promise.all([
      supabase.from('login_history').insert({
        user_id: result.data.user.id,
        browser,
        device,
        login_time: loginTime,
      }),
      supabase
        .from('user_profiles')
        .update({ last_login_at: loginTime })
        .eq('id', result.data.user.id),
    ]);

    if (historyResult.error) {
      console.warn('Failed to record login history:', historyResult.error);
    }

    if (profileUpdateResult.error) {
      console.warn('Failed to update last login time:', profileUpdateResult.error);
    }

    return result;
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    fullName: string,
  ) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim();
      const normalizedFullName = fullName.trim();
      const assignedRole = resolveSignupRoleFromEmail(normalizedEmail);

      if (!normalizedEmail.endsWith(SUC_EMAIL_DOMAIN)) {
        return {
          data: null,
          error: {
            message: "Only SUC email addresses ending in @sc.edu.my can register.",
          },
        };
      }

      if (!assignedRole) {
        return {
          data: null,
          error: {
            message:
              "Only student SUC emails starting with D, B, or P can register.",
          },
        };
      }

      if (!normalizedUsername) {
        return {
          data: null,
          error: { message: "Username is required." },
        };
      }

      if (!normalizedFullName) {
        return {
          data: null,
          error: { message: "Full name is required." },
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedFullName,
            username: normalizedUsername,
          },
        },
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error: unknown) {
      return {
        data: null,
        error: {
          message:
            error instanceof Error ? error.message : "Unable to create account.",
        },
      };
    }
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    setSession(null);
    if (AUTH_PROVIDER_IS_AZURE) {
      azureAuth.clearSession();
      return;
    }
    await supabase.auth.signOut();
  };

  // --- NEW FUNCTIONS ---

  const updateProfile = async (
    updates: EditableUserProfile,
  ): Promise<ProfileUpdateResult> => {
    if (!user) {
      return { data: null, error: { message: "No authenticated user." } };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select(AUTH_PROFILE_SELECT)
      .single();

    const nextProfile = data
      ? {
          ...data,
          email: user.email || '',
        } as UserProfile
      : null;
    if (nextProfile) setProfile(nextProfile);
    return { data: nextProfile, error };
  };

  const refreshProfile = async () => {
    if (AUTH_PROVIDER_IS_AZURE) {
      const storedSession = azureAuth.loadSession();
      if (!storedSession) return;

      const azureUser = await azureAuth.me(storedSession.accessToken);
      const nextSession = { ...storedSession, user: azureUser };
      azureAuth.saveSession(nextSession);
      await loadAzureUserAndProfile(nextSession);
      return;
    }

    if (session) await loadUserAndProfile(session);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, isLoading, signIn, signUp, signOut, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
