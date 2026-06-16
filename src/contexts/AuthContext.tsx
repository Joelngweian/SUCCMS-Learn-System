import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase.ts';

const AUTH_PROFILE_SELECT =
  'id, full_name, username, role, faculty, programme, avatar_url, cover_url, bio, is_active';

type PublicSignupRole = 'student' | 'lecturer' | 'staff';

const SUC_EMAIL_DOMAIN = '@sc.edu.my';

const resolveSignupRoleFromEmail = (email: string): PublicSignupRole | null => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.endsWith(SUC_EMAIL_DOMAIN)) {
    return null;
  }

  const emailPrefix = normalizedEmail.slice(0, -SUC_EMAIL_DOMAIN.length);

  if (emailPrefix.startsWith('st')) return 'staff';
  if (emailPrefix.startsWith('lc')) return 'lecturer';
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
  role: 'student' | 'lecturer' | 'admin';
  faculty?: string;   
  programme?: string; 
  avatar_url?: string; // <--- Added this
  cover_url?: string;  // <--- Added this
  bio?: string;        // <--- Added this
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
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.id;

  // Load User Data
  const loadUserAndProfile = async (session: Session) => {
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
  };

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`account-status:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`,
        },
        async (payload) => {
          if ((payload.new as UserProfile).is_active === false) {
            setSession(null);
            setUser(null);
            setProfile(null);
            await supabase.auth.signOut();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // --- Auth Functions ---

  const signIn = async (email: string, password: string) => {
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
              "We could not identify your account type from this SUC email. Staff emails must start with ST, lecturer emails with LC, and student emails with D, B, or P.",
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
