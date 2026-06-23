import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const cleanIdentifier = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, 80) : "";

const hasRubric = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment is not configured.");
    }

    const authHeader = req.headers.get("Authorization") || "";
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } =
      await authClient.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const assignmentId = cleanIdentifier(body?.assignmentId);
    const studentId = cleanIdentifier(body?.studentId);

    if (!assignmentId || !studentId) {
      return jsonResponse(
        { error: "Assignment and student identifiers are required." },
        400,
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("role, is_active")
      .eq("id", userData.user.id)
      .single();

    if (
      profileError ||
      !["lecturer", "admin"].includes(profile?.role) ||
      profile?.is_active === false
    ) {
      return jsonResponse({ error: "Lecturer access is required." }, 403);
    }

    const { data: assignment, error: assignmentError } = await serviceClient
      .from("assignments")
      .select("id, course_id, rubric")
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return jsonResponse({ error: "Assignment not found." }, 404);
    }

    if (!hasRubric(assignment.rubric)) {
      return jsonResponse(
        { error: "Add a grading rubric before using AI grading." },
        400,
      );
    }

    if (profile.role !== "admin") {
      const { data: instructor } = await serviceClient
        .from("course_instructors")
        .select("user_id")
        .eq("course_id", assignment.course_id)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!instructor) {
        return jsonResponse(
          { error: "You are not an instructor for this course." },
          403,
        );
      }
    }

    const { data: submission, error: submissionError } = await serviceClient
      .from("assignment_submissions")
      .select("id, submission_text, files")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (submissionError || !submission) {
      return jsonResponse(
        { error: "The student has not submitted this assignment." },
        404,
      );
    }

    const hasSubmissionText =
      typeof submission.submission_text === "string" &&
      submission.submission_text.trim().length > 0;
    const hasSubmissionFiles =
      Array.isArray(submission.files) && submission.files.length > 0;

    if (!hasSubmissionText && !hasSubmissionFiles) {
      return jsonResponse(
        { error: "This submission has no readable text or attached files." },
        400,
      );
    }

    const findActiveJob = () =>
      serviceClient
        .from("ai_grading_jobs")
        .select("id, status, created_at")
        .eq("assignment_id", assignmentId)
        .eq("student_id", studentId)
        .in("status", ["queued", "processing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    let { data: activeJob, error: activeJobError } = await findActiveJob();
    if (activeJobError) throw activeJobError;

    if (!activeJob) {
      const { data: insertedJob, error: insertError } = await serviceClient
        .from("ai_grading_jobs")
        .insert({
          assignment_id: assignmentId,
          student_id: studentId,
          requested_by: userData.user.id,
        })
        .select("id, status, created_at")
        .single();

      if (insertError?.code === "23505") {
        const duplicateResult = await findActiveJob();
        if (duplicateResult.error) throw duplicateResult.error;
        activeJob = duplicateResult.data;
      } else if (insertError) {
        throw insertError;
      } else {
        activeJob = insertedJob;
      }
    }

    if (!activeJob) {
      throw new Error("The AI grading job could not be created.");
    }

    const kickWorker = async () => {
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/ai-grade-assignment`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              apikey: serviceRoleKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ batchSize: 1 }),
          },
        );

        if (!response.ok) {
          console.error("Could not start AI grading worker", {
            status: response.status,
            body: await response.text(),
          });
        }
      } catch (error) {
        console.error("Could not start AI grading worker", error);
      }
    };

    EdgeRuntime.waitUntil(kickWorker());

    return jsonResponse(
      {
        jobId: activeJob.id,
        status: activeJob.status,
      },
      202,
    );
  } catch (error) {
    console.error("AI grading request error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "The AI grading job could not be created.",
      },
      500,
    );
  }
});
