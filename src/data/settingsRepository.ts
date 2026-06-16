import { supabase } from "@/lib/supabase";

export async function updateAccountPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function deleteCurrentUserAccount() {
  const { error } = await supabase.rpc("delete_user_account");
  if (error) throw error;
  await supabase.auth.signOut();
}
