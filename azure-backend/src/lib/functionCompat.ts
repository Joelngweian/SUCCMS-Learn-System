import { createHash } from "crypto";
import type { AuthenticatedUser } from "../types/auth";
import { createAndProcessAiGradingJob } from "./aiGrading";
import { getConfig } from "./config";
import { getPool } from "./db";
import { broadcastTableChanges } from "./realtime";
import { aiGradingRequestSchema } from "./validators";

type FunctionRequest = {
  body?: unknown;
};

type CourseInput = {
  code?: unknown;
  name?: unknown;
};

const trustedResources = [
  {
    id: "db-1",
    title: "Complete Guide to Database Normalization (1NF-3NF)",
    type: "video",
    url: "https://www.youtube.com/watch?v=rBPQ5fg_kiY",
    source: "YouTube"
  },
  {
    id: "db-2",
    title: "SQL Indexing and Performance Tuning",
    type: "article",
    url: "https://use-the-index-luke.com/",
    source: "Use The Index Luke"
  },
  {
    id: "algo-1",
    title: "Data Structures & Algorithms - Full Course",
    type: "video",
    url: "https://www.youtube.com/watch?v=8hly31xKli0",
    source: "freeCodeCamp"
  },
  {
    id: "web-1",
    title: "React Reference",
    type: "article",
    url: "https://react.dev/reference/react",
    source: "React Docs"
  },
  {
    id: "ethics-1",
    title: "ACM Code of Ethics and Professional Conduct",
    type: "article",
    url: "https://www.acm.org/code-of-ethics",
    source: "ACM"
  }
];

export async function invokeCompatFunction(
  name: string,
  request: FunctionRequest,
  user: AuthenticatedUser
) {
  if (name === "shared-read-cache") return readSharedCache(request.body);
  if (name === "admin-user-access") return updateAdminUserAccess(request.body, user);
  if (name === "ai-grading-request") return requestAiGrading(request.body, user);
  if (name === "student-study-recommendations") return generateStudentRecommendations(request.body);
  if (name === "student-study-insights") return generateStudentInsights(request.body);
  if (name === "gemini-lecturer-recommendations") return generateLecturerRecommendations(request.body, user);
  throw new Error(`Function "${name}" is not enabled on Azure.`);
}

async function requestAiGrading(body: unknown, user: AuthenticatedUser) {
  const payload = aiGradingRequestSchema.parse(body);
  return createAndProcessAiGradingJob({
    assignmentId: payload.assignmentId,
    studentId: payload.studentId,
    requester: user
  });
}

async function readSharedCache(body: unknown) {
  const key = getString((body as { key?: unknown })?.key);
  if (key !== "active-course-offerings" && key !== "active-announcements") {
    throw new Error(`Unsupported shared cache key "${key}".`);
  }

  const cached = await getPool().query<{
    value: unknown;
    expires_at: Date;
  }>(
    `
      SELECT value, expires_at
      FROM public.shared_cache_entries
      WHERE cache_key = $1
      LIMIT 1
    `,
    [key]
  );
  const cachedRow = cached.rows[0];
  if (cachedRow && cachedRow.expires_at.getTime() > Date.now()) {
    return { cache: "database", data: cachedRow.value };
  }

  const data = key === "active-announcements"
    ? await loadActiveAnnouncements()
    : await loadActiveCourseOfferings();
  await writeSharedCache(key, data, key === "active-announcements" ? 60 : 300);
  return { cache: "origin", data };
}

async function loadActiveAnnouncements() {
  const result = await getPool().query(
    `
      SELECT id, title, content, priority, created_at
      FROM public.announcements
      WHERE is_active = TRUE
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY created_at DESC
      LIMIT 20
    `
  );
  return result.rows;
}

async function loadActiveCourseOfferings() {
  const result = await getPool().query(
    `
      SELECT
        offering.*,
        row_to_json(course) AS courses,
        row_to_json(term) AS academic_terms
      FROM public.course_offerings offering
      LEFT JOIN public.courses course ON course.id = offering.course_id
      LEFT JOIN public.academic_terms term ON term.id = offering.academic_term_id
      WHERE offering.status = 'active'
      ORDER BY offering.created_at DESC
    `
  );
  return result.rows;
}

async function writeSharedCache(key: string, value: unknown, ttlSeconds: number) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const staleUntil = new Date(Date.now() + (ttlSeconds + 900) * 1000);
  await getPool().query(
    `
      INSERT INTO public.shared_cache_entries
        (cache_key, value, expires_at, stale_until, refreshing_until, updated_at)
      VALUES ($1, $2::jsonb, $3, $4, NULL, now())
      ON CONFLICT (cache_key)
      DO UPDATE SET
        value = EXCLUDED.value,
        expires_at = EXCLUDED.expires_at,
        stale_until = EXCLUDED.stale_until,
        refreshing_until = NULL,
        updated_at = now()
    `,
    [key, JSON.stringify(value), expiresAt, staleUntil]
  );
}

async function updateAdminUserAccess(body: unknown, user: AuthenticatedUser) {
  if (user.role !== "admin") throw new Error("Administrator access is required.");
  const payload = body as { action?: unknown; targetUserId?: unknown };
  const action = getString(payload.action);
  const targetUserId = getString(payload.targetUserId);
  if (!targetUserId || (action !== "suspend" && action !== "restore")) {
    throw new Error("A valid user and action are required.");
  }
  if (targetUserId === user.id) {
    throw new Error("Administrators cannot suspend their own account.");
  }

  const target = await getPool().query<{ role: string }>(
    `SELECT role FROM public.user_profiles WHERE id = $1 LIMIT 1`,
    [targetUserId]
  );
  if (!target.rows[0]) throw new Error("The selected user could not be found.");
  if (target.rows[0].role === "admin") {
    throw new Error("Administrator accounts cannot be suspended here.");
  }

  const isActive = action === "restore";
  const updatedProfile = await getPool().query(
    `UPDATE public.user_profiles SET is_active = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [isActive, targetUserId]
  );
  await getPool().query(
    `
      UPDATE app_auth.users
      SET disabled_at = CASE WHEN $1 THEN NULL ELSE now() END,
          updated_at = now()
      WHERE user_id = $2
    `,
    [isActive, targetUserId]
  );

  void broadcastTableChanges("user_profiles", "UPDATE", updatedProfile.rows);

  return { success: true, action, userId: targetUserId, isActive };
}

async function generateStudentRecommendations(body: unknown) {
  const courses = getCourses(body);
  const prompt = [
    "Return JSON only with a recommendations array for a college LMS student.",
    "Each item needs id, title, type, url, source, reason.",
    "Use real educational resources and keep reasons short.",
    `Courses: ${JSON.stringify(courses)}`
  ].join("\n");
  const generated = await generateJson(prompt).catch(() => null);
  const recommendations = Array.isArray((generated as { recommendations?: unknown[] } | null)?.recommendations)
    ? (generated as { recommendations: unknown[] }).recommendations.slice(0, 5)
    : fallbackStudentRecommendations(courses);
  return { recommendations, model: getConfig().geminiModel, generatedAt: new Date().toISOString() };
}

async function generateStudentInsights(body: unknown) {
  const courses = Array.isArray(body) ? body.slice(0, 12) : getCourses(body);
  const prompt = [
    "Return JSON only with an insights array for a college LMS student.",
    "Each item needs id, type, severity, title, description, confidence, courseCode, actionPlan.",
    "Use only the supplied anonymous course context.",
    `Course context: ${JSON.stringify(courses)}`
  ].join("\n");
  const generated = await generateJson(prompt).catch(() => null);
  return {
    insights: Array.isArray((generated as { insights?: unknown[] } | null)?.insights)
      ? (generated as { insights: unknown[] }).insights.slice(0, 5)
      : [],
    model: getConfig().geminiModel,
    generatedAt: new Date().toISOString()
  };
}

async function generateLecturerRecommendations(body: unknown, user: AuthenticatedUser) {
  if (user.role !== "lecturer" && user.role !== "admin") {
    throw new Error("Lecturer access is required.");
  }
  const courses = getCourses(body);
  const prompt = [
    "Return JSON only with a recommendations array for a lecturer in a college LMS.",
    "Each item needs id, type, title, platform, duration, qualityScore, relevance, reason, url, difficulty, tags, impact.",
    "Recommend real teaching resources for the supplied course metrics.",
    `Courses: ${JSON.stringify(courses)}`
  ].join("\n");
  const generated = await generateJson(prompt).catch(() => null);
  const recommendations = Array.isArray((generated as { recommendations?: unknown[] } | null)?.recommendations)
    ? (generated as { recommendations: unknown[] }).recommendations.slice(0, 5)
    : fallbackLecturerRecommendations(courses);
  return { recommendations, model: getConfig().geminiModel, generatedAt: new Date().toISOString() };
}

async function generateJson(prompt: string) {
  const { GoogleGenAI } = await import("@google/genai");
  const config = getConfig();
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents: prompt
  });
  const text = response.text?.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim() || "{}";
  return JSON.parse(text);
}

function fallbackStudentRecommendations(courses: CourseInput[]) {
  return trustedResources.slice(0, 3).map(resource => ({
    ...resource,
    reason: `Useful for ${courses[0]?.code || courses[0]?.name || "your current courses"}.`
  }));
}

function fallbackLecturerRecommendations(courses: CourseInput[]) {
  return trustedResources.slice(0, 3).map((resource, index) => ({
    id: stableId(`${resource.title}|${resource.url}`),
    type: resource.type,
    title: resource.title,
    platform: resource.source,
    duration: "Self-paced",
    qualityScore: 4,
    relevance: 82 - index * 4,
    reason: `Relevant support material for ${courses[0]?.code || courses[0]?.name || "the selected courses"}.`,
    url: resource.url,
    difficulty: "mixed",
    tags: ["Teaching", "Resource"],
    impact: "Course support"
  }));
}

function getCourses(body: unknown): CourseInput[] {
  const courses = (body as { courses?: unknown })?.courses;
  return Array.isArray(courses) ? courses.slice(0, 20) as CourseInput[] : [];
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stableId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
