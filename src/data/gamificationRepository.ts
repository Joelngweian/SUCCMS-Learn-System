import { supabase } from "@/lib/supabase";

export async function loadGamificationRpcData() {
  const [leaderboardResult, xpProgressResult, benchmarkResult] =
    await Promise.all([
      supabase.rpc("get_weekly_xp_leaderboard", { p_limit: 50 }),
      supabase.rpc("get_my_xp_progress"),
      supabase.rpc("get_assignment_peer_benchmarks"),
    ]);

  return {
    assignmentBenchmarkError: benchmarkResult.error,
    assignmentBenchmarkRows: benchmarkResult.data || [],
    leaderboardError: leaderboardResult.error,
    leaderboardRows: leaderboardResult.data || [],
    xpProgressError: xpProgressResult.error,
    xpProgressRow: xpProgressResult.data?.[0] || null,
  };
}
