import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/ThemeProvider";
import type { Database } from "@/lib/database.types";
import { getNotifyMessage, notify } from "@/lib/notify";
import {
  isThemePreference,
  type ThemePreference,
} from "@/lib/themePreference";

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];
export type SettingsConfig = Omit<UserSettings, "user_id" | "created_at" | "updated_at">;
type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEFAULT_SETTINGS: SettingsConfig = {
  theme: "system",
  compact_mode: false,
  animations_enabled: true,
  email_notifications: true,
  assignment_reminders: true,
  forum_replies: true,
  grade_updates: true,
  course_announcements: true,
  achievement_alerts: false,
  sound_enabled: false,
  profile_visibility: "everyone",
  show_online_status: true,
  show_progress: true,
  show_leaderboard: true,
  language: "en",
  timezone: "auto",
  date_format: "mdy",
  high_contrast: false,
  large_text: false,
  reduce_motion: false,
  push_notifications: false,
  sms_notifications: false,
  weekly_summary: false,
  marketing_emails: false,
};

const normalizeSettings = (config: Partial<SettingsConfig>): SettingsConfig => {
  const normalized = { ...DEFAULT_SETTINGS };

  (Object.keys(DEFAULT_SETTINGS) as Array<keyof SettingsConfig>).forEach((key) => {
    const value = config[key];
    if (value !== undefined && value !== null) {
      normalized[key] = value as never;
    }
  });

  return normalized;
};

export function useSettings() {
  const { user } = useAuth();
  const userId = user?.id;
  const { theme, setTheme } = useTheme();
  
  const [settings, setSettings] = useState<SettingsConfig>(DEFAULT_SETTINGS);
  const [dbSettings, setDbSettings] = useState<SettingsConfig>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingThemePreview = useRef<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyUiSettings = (config: SettingsConfig) => {
    const root = document.documentElement;

    root.classList.toggle("high-contrast", config.high_contrast);
    root.classList.toggle("large-text", config.large_text);
    root.classList.toggle("reduce-motion", config.reduce_motion);
    root.classList.toggle("compact-mode", config.compact_mode);
    root.classList.toggle("animations-disabled", !config.animations_enabled);
  };

  const saveSettingsToDb = useCallback(async (config: SettingsConfig) => {
    if (!userId) return false;

    setIsSaving(true);
    setSaveStatus("saving");
    try {
      const normalizedConfig = normalizeSettings(config);
      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: userId, ...normalizedConfig }, { onConflict: "user_id" });
        
      if (error) throw error;
      
      setDbSettings(normalizedConfig);
      setSaveStatus("saved");
      setErrorMessage(null);
      setLastSavedAt(new Date().toISOString());
      return true;
    } catch (error: unknown) {
      console.error("Failed to save settings:", error);
      setSaveStatus("error");
      const msg = getNotifyMessage(error, "Settings could not be saved.");
      setErrorMessage(msg);
      notify.error(error, "Settings could not be saved.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [userId]);

  const fetchSettings = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching settings:", error);
        const msg = getNotifyMessage(error, "Settings could not be loaded.");
        notify.error(error, "Settings could not be loaded.");
        setErrorMessage(msg);
        setSaveStatus("error");
        // Don't attempt to insert defaults when we can't even read the table
        return;
      }
      
      if (data) {
        // Exclude DB metadata from comparison
        const { user_id, created_at, updated_at, ...rest } = data;
        const normalizedSettings = normalizeSettings(rest);
        setSettings(normalizedSettings);
        setDbSettings(normalizedSettings);
        applyUiSettings(normalizedSettings);
        setSaveStatus("saved");
        setLastSavedAt(updated_at);
      } else {
        // No settings found, upsert defaults
        setSettings(DEFAULT_SETTINGS);
        setDbSettings(DEFAULT_SETTINGS);
        applyUiSettings(DEFAULT_SETTINGS);
        await saveSettingsToDb(DEFAULT_SETTINGS);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [saveSettingsToDb, userId]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // Keep the Settings selection synchronized with changes from the top bar.
  useEffect(() => {
    if (isLoading || !isThemePreference(theme)) return;

    if (pendingThemePreview.current === theme) {
      pendingThemePreview.current = null;
      return;
    }

    setSettings((previous) =>
      previous.theme === theme ? previous : { ...previous, theme },
    );
    setDbSettings((previous) =>
      previous.theme === theme ? previous : { ...previous, theme },
    );
  }, [isLoading, theme]);

  // Check if changes exist
  useEffect(() => {
    const isDifferent = JSON.stringify(settings) !== JSON.stringify(dbSettings);
    setHasChanges(isDifferent);
  }, [settings, dbSettings]);

  useEffect(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }

    if (isLoading || isSaving || !hasChanges || !userId) return;

    autosaveTimer.current = setTimeout(() => {
      autosaveTimer.current = null;
      void saveSettingsToDb(settings);
    }, 600);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = null;
      }
    };
  }, [
    hasChanges,
    isLoading,
    isSaving,
    saveSettingsToDb,
    settings,
    userId,
  ]);

  const updateSetting = useCallback(<K extends keyof SettingsConfig>(
    key: K, 
    value: SettingsConfig[K]
  ) => {
    if (key === 'theme') {
      pendingThemePreview.current = value as string;
      setTheme(value as ThemePreference);
    }
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      applyUiSettings(next);
      setSaveStatus("idle");
      return next;
    });
  }, [setTheme]);

  const resetToDefaults = () => {
    pendingThemePreview.current = DEFAULT_SETTINGS.theme;
    setSettings(DEFAULT_SETTINGS);
    setTheme(DEFAULT_SETTINGS.theme as ThemePreference);
    applyUiSettings(DEFAULT_SETTINGS);
    setSaveStatus("idle");
    notify.success("Default settings applied.");
  };

  // Warn if the tab closes during the short autosave window.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  return {
    settings,
    isLoading,
    isSaving,
    hasChanges,
    saveStatus,
    lastSavedAt,
    errorMessage,
    updateSetting,
    resetToDefaults,
  };
}
