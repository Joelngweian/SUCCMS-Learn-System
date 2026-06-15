import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useTheme } from "next-themes";
import type { Database } from "@/lib/database.types";
import { getNotifyMessage, notify } from "@/lib/notify";

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

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const pendingTheme = useRef<string | null>(null);

  const applyUiSettings = (config: SettingsConfig) => {
    const root = document.documentElement;

    root.classList.toggle("high-contrast", config.high_contrast);
    root.classList.toggle("large-text", config.large_text);
    root.classList.toggle("reduce-motion", config.reduce_motion);
    root.classList.toggle("compact-mode", config.compact_mode);
    root.classList.toggle("animations-disabled", !config.animations_enabled);
  };

  const saveSettingsToDb = useCallback(async (config: SettingsConfig) => {
    if (!userId) return;

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
    } catch (error: unknown) {
      console.error("Failed to save settings:", error);
      setSaveStatus("error");
      const msg = getNotifyMessage(error, "Settings could not be saved.");
      setErrorMessage(msg);
      notify.error(error, "Settings could not be saved.");
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
        setTheme(normalizedSettings.theme);
        applyUiSettings(normalizedSettings);
        setSaveStatus("saved");
        setLastSavedAt(updated_at);
      } else {
        // No settings found, upsert defaults
        setSettings(DEFAULT_SETTINGS);
        setDbSettings(DEFAULT_SETTINGS);
        setTheme(DEFAULT_SETTINGS.theme);
        applyUiSettings(DEFAULT_SETTINGS);
        await saveSettingsToDb(DEFAULT_SETTINGS);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [saveSettingsToDb, setTheme, userId]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // Sync theme from next-themes if it changed externally (e.g., top-right button)
  useEffect(() => {
    if (!theme || !["light", "dark", "system"].includes(theme)) return;

    if (pendingTheme.current === theme) {
      // next-themes has caught up with our local change
      pendingTheme.current = null;
      return;
    }

    if (!pendingTheme.current && settings.theme !== theme) {
      // Theme changed externally, sync our local state without triggering auto-save
      setSettings((prev) => ({ ...prev, theme: theme as SettingsConfig["theme"] }));
      setDbSettings((prev) => ({ ...prev, theme: theme as SettingsConfig["theme"] }));
    }
  }, [theme, settings.theme]);
  // Check if changes exist
  useEffect(() => {
    const isDifferent = JSON.stringify(settings) !== JSON.stringify(dbSettings);
    setHasChanges(isDifferent);
    
    // Auto-save logic: save immediately
    if (isDifferent && !isLoading) {
      void saveSettingsToDb(settingsRef.current);
    }
  }, [settings, dbSettings, isLoading, saveSettingsToDb]);

  const updateSetting = useCallback(<K extends keyof SettingsConfig>(
    key: K, 
    value: SettingsConfig[K]
  ) => {
    if (key === 'theme') {
      pendingTheme.current = value as string;
      setTheme(value as string);
    }
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      applyUiSettings(next);
      setSaveStatus("idle");
      return next;
    });
  }, [setTheme]);

  const resetToDefaults = async () => {
    setSettings(DEFAULT_SETTINGS);
    setTheme(DEFAULT_SETTINGS.theme);
    applyUiSettings(DEFAULT_SETTINGS);
    await saveSettingsToDb(DEFAULT_SETTINGS);
    notify.success("Reset to default settings.");
  };

  // Prevent accidental closure if unsaved (though auto-save makes this less critical, it's good UX)
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
