import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";

type LoginHistoryRow = Database["public"]["Tables"]["login_history"]["Row"];

export function useLoginHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<LoginHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("login_history")
        .select("*")
        .eq("user_id", user.id)
        .order("login_time", { ascending: false })
        .limit(10);
        
      if (error) throw error;
      if (data) setHistory(data);
    } catch (e) {
      console.error("Failed to fetch login history:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    isLoading,
    refresh: fetchHistory
  };
}
