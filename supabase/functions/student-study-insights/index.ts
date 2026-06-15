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

const insightSchema = {
  type: "object",
  properties: {
    insights: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["strength", "weakness"],
          },
          title: { type: "string" },
          description: { type: "string" },
          confidence: {
            type: "integer",
            minimum: 55,
            maximum: 95,
          },
          courseCode: { type: "string" },
          actionPlan: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: { type: "string" },
          },
        },
        required: [
          "type",
          "title",
          "description",
          "confidence",
          "courseCode",
          "actionPlan",
        ],
      },
    },
  },
  required: ["insights"],
};

const cleanText = (value: unknown, fallback = "", maxLength = 500) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;

const cleanNumber = (value: unknown, minimum = 0, maximum = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, parsed));
};

const normalizeContext = (body: any) => {
  const courses = Array.isArray(body?.courses) ? body.courses.slice(0, 12) : [];

  return courses
    .map((course: any) => ({
      code: cleanText(course?.code, "N/A", 30),
      name: cleanText(course?.name, "Course", 160),
      grades: Array.isArray(course?.grades)
        ? course.grades.slice(0, 8).map((grade: any) => ({
            percentage: cleanNumber(grade?.percentage),
            gradedAt: cleanText(grade?.gradedAt, "", 60),
            assignmentTitle: cleanText(
              grade?.assignmentTitle,
              "Assessment",
              180,
            ),
            rubric: cleanText(grade?.rubric, "", 1200),
            feedback: cleanText(grade?.feedback, "", 1000),
          }))
        : [],
      attendance: Array.isArray(course?.attendance)
        ? course.attendance.slice(0, 12).map((record: any) => ({
            status: cleanText(record?.status, "unknown", 20),
            classDate: cleanText(record?.classDate, "", 30),
          }))
        : [],
      assignments: Array.isArray(course?.assignments)
        ? course.assignments.slice(0, 12).map((assignment: any) => ({
            title: cleanText(assignment?.title, "Assignment", 180),
            dueDate: cleanText(assignment?.dueDate, "", 60),
            submitted: Boolean(assignment?.submitted),
            isLate: Boolean(assignment?.isLate),
          }))
        : [],
    }))
    .filter((course: any) => course.grades.length > 0);
};

const getResponseText = (payload: any) =>
  payload?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text || "")
    .join("")
    .trim() || "";

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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const model =
      cleanText(
        Deno.env.get("STUDENT_INSIGHTS_MODEL"),
        "gemini-2.5-flash",
        80,
      ) || "gemini-2.5-flash";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment is not configured.");
    }
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const authHeader = req.headers.get("Authorization") || "";
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } =
      await authClient.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("role, is_active")
      .eq("id", userData.user.id)
      .single();

    if (
      profileError ||
      profile?.role !== "student" ||
      profile?.is_active === false
    ) {
      return jsonResponse({ error: "Active student access is required." }, 403);
    }

    const context = normalizeContext(await req.json());
    if (context.length === 0) {
      return jsonResponse({ insights: [], model });
    }

    const prompt = [
      "You are an academic study-insight assistant for a college learning management system.",
      "Analyze only the supplied anonymous evidence.",
      "Return 1 to 4 concise insights identifying genuine academic strengths or weaknesses.",
      "Use grades as the primary evidence. Use rubric and lecturer feedback to identify the specific skill or topic.",
      "Attendance and assignment status may support an explanation, but do not diagnose motivation, ability, health, or personal circumstances.",
      "Do not predict exam results and do not claim a pattern from only one result.",
      "A strength normally needs either two supporting results or one result with explicit positive lecturer feedback.",
      "A weakness must name an actionable academic area supported by a low result, repeated decline, rubric evidence, or explicit lecturer feedback.",
      "Descriptions must be one or two sentences. Each action-plan step must be specific and practical.",
      "Confidence must reflect evidence quantity: keep it below 70 when evidence is limited.",
      "",
      `Anonymous study evidence: ${JSON.stringify(context)}`,
    ].join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: insightSchema,
          },
        }),
      },
    );
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload?.error?.message || "Gemini could not generate study insights.",
      );
    }

    const responseText = getResponseText(payload);
    if (!responseText) {
      throw new Error("Gemini returned an empty study insight response.");
    }

    const parsed = JSON.parse(responseText);
    const insights = Array.isArray(parsed?.insights)
      ? parsed.insights.slice(0, 4).map((insight: any, index: number) => ({
          id: `gemini-${insight.type}-${index}`,
          type: insight.type === "strength" ? "strength" : "weakness",
          title: cleanText(insight.title, "Study insight", 90),
          description: cleanText(insight.description, "", 260),
          confidence: cleanNumber(insight.confidence, 55, 95),
          courseCode: cleanText(insight.courseCode, "", 30),
          actionPlan: Array.isArray(insight.actionPlan)
            ? insight.actionPlan
                .slice(0, 4)
                .map((step: unknown) => cleanText(step, "", 180))
                .filter(Boolean)
            : [],
        }))
      : [];

    return jsonResponse({
      insights,
      model,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Student study insights error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Study insights could not be generated.",
      },
      500,
    );
  }
});

