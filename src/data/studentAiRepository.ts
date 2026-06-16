import { supabase } from "@/lib/supabase";

export async function fetchStudentStudyRecommendations(
  courses: unknown[],
): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke(
    "student-study-recommendations",
    {
      body: { courses },
    },
  );

  if (error) throw error;
  return data;
}

export async function fetchStudentStudyInsights(
  courses: unknown[],
): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke(
    "student-study-insights",
    {
      body: { courses },
    },
  );

  if (error) throw error;
  return data;
}
