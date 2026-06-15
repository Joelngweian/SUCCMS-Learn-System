import { supabase } from "@/lib/supabase";

export type ThemePreference = "light" | "dark" | "system";

export const isThemePreference = (
  value: unknown,
): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

export const loadThemePreference = async (
  userId: string,
): Promise<ThemePreference | null> => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("theme")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return isThemePreference(data?.theme) ? data.theme : null;
};

export const saveThemePreference = async (
  userId: string,
  theme: ThemePreference,
) => {
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, theme }, { onConflict: "user_id" });

  if (error) throw error;
};
