import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const recommendationSchema = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["video", "article", "course", "practice", "tool"],
          },
          title: { type: "string" },
          platform: { type: "string" },
          duration: { type: "string" },
          qualityScore: { type: "number", minimum: 1, maximum: 5 },
          relevance: { type: "integer", minimum: 1, maximum: 100 },
          reason: { type: "string" },
          sourceIndex: { type: "integer", minimum: 0, maximum: 19 },
          difficulty: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced", "mixed", "academic", "tool"],
          },
          tags: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: { type: "string" },
          },
          impact: {
            type: "string",
            enum: ["High impact", "Medium impact", "Useful reference"],
          },
        },
        required: [
          "type",
          "title",
          "platform",
          "duration",
          "qualityScore",
          "relevance",
          "reason",
          "sourceIndex",
          "difficulty",
          "tags",
          "impact",
        ],
      },
    },
  },
  required: ["recommendations"],
};

const cleanText = (value: unknown, fallback = "", maxLength = 180) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;

const cleanNumber = (value: unknown, minimum = 0, maximum = 10000) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(maximum, Math.max(minimum, parsed));
};

type GeminiPayload = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { groundingChunks?: GroundingChunk[] };
  }>;
  error?: { message?: string };
};

type GroundingChunk = {
  web?: {
    title?: unknown;
    uri?: unknown;
  };
};

type ResourceSource = {
  sourceIndex?: number;
  title: string;
  url: string;
};

type CourseContextInput = {
  courses?: Array<Record<string, unknown>>;
};

type RecommendationItem = {
  difficulty?: unknown;
  duration?: unknown;
  impact?: unknown;
  platform?: unknown;
  qualityScore?: unknown;
  reason?: unknown;
  relevance?: unknown;
  sourceIndex?: unknown;
  tags?: unknown[];
  title?: unknown;
  type?: unknown;
};

const normalizeCourseContext = (body: unknown) => {
  const request = body as CourseContextInput;
  const courses = Array.isArray(request?.courses) ? request.courses.slice(0, 20) : [];

  return courses.map((course) => ({
    code: cleanText(course?.code, "N/A", 40),
    name: cleanText(course?.name, "Course", 160),
    semester: cleanText(course?.semester, "Current", 80),
    enrolledStudents: cleanNumber(course?.enrolledStudents, 0, 5000),
    assignmentCount: cleanNumber(course?.assignmentCount, 0, 1000),
    materialCount: cleanNumber(course?.materialCount, 0, 10000),
    completionRate: cleanNumber(course?.completionRate, 0, 100),
    pendingGrades: cleanNumber(course?.pendingGrades, 0, 10000),
    averageGrade: cleanText(course?.averageGrade, "Not graded", 20),
    engagement: cleanNumber(course?.engagement, 0, 100),
  }));
};

const createRecommendationId = async (title: string, url: string) => {
  const value = new TextEncoder().encode(`${title.toLowerCase()}|${url.toLowerCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const isSafeResourceUrl = (value: unknown) => {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const readResponsePreview = async (response: Response, maxBytes = 192000) => {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;

      const remainingBytes = maxBytes - totalBytes;
      const chunk =
        value.byteLength > remainingBytes
          ? value.slice(0, remainingBytes)
          : value;
      chunks.push(chunk);
      totalBytes += chunk.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(combined);
};

const isSoft404Page = (html: string, resolvedUrl: string) => {
  if (!html) return false;

  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "";
  const visiblePreview = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);

  const titleSignals = [
    /^\s*404(?:\s|$|[-|:])/i,
    /\b(?:page|resource|content)\s+not\s+found\b/i,
    /\bnot\s+found\s*[-|:]/i,
    /\berror\s*404\b/i,
  ];
  const bodySignals = [
    /\b404\b.{0,180}\b(?:page|resource|content)\s+not\s+found\b/i,
    /\b404\b.{0,180}\b(?:sorry|couldn.?t|cannot|can.?t)\s+find\b/i,
    /\b(?:sorry[,!]?\s*)?we\s+couldn.?t\s+find\s+(?:that|this|the)\s+page\b/i,
    /\bthe\s+page\s+you(?:'re|\s+are)?\s+looking\s+for\s+(?:doesn.?t|does\s+not)\s+exist\b/i,
    /\bthis\s+page\s+(?:doesn.?t\s+exist|could\s+not\s+be\s+found)\b/i,
    /\berror\s*404\b/i,
  ];

  if (titleSignals.some((pattern) => pattern.test(title))) return true;
  if (bodySignals.some((pattern) => pattern.test(visiblePreview))) return true;

  try {
    const pathname = new URL(resolvedUrl).pathname.toLowerCase();
    return /(?:^|\/)(?:404|not-found|page-not-found)(?:\/|$)/.test(pathname);
  } catch {
    return true;
  }
};

const verifyGroundedSource = async (source: { title: string; url: string }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(source.url, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    const resolvedUrl = response.url;

    if (
      response.status < 200 ||
      response.status >= 400 ||
      !isSafeResourceUrl(resolvedUrl)
    ) {
      await response.body?.cancel();
      return null;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      await response.body?.cancel();
      return { ...source, url: resolvedUrl };
    }

    const htmlPreview = await readResponsePreview(response);
    if (isSoft404Page(htmlPreview, resolvedUrl)) return null;

    return { ...source, url: resolvedUrl };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const getResponseText = (payload: unknown) =>
  (payload as GeminiPayload)
    ?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || "")
    .join("")
    .trim() || "";

const callGemini = async (
  apiKey: string,
  requestBody: Record<string, unknown>,
) => {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    },
  );

  const payload = (await response.json()) as GeminiPayload;
  if (!response.ok) {
    throw new Error(
      payload?.error?.message || "Gemini could not generate recommendations.",
    );
  }

  return payload;
};

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
    const { data: userData, error: userError } = await authClient.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profileError || profile?.role !== "lecturer") {
      return jsonResponse({ error: "Lecturer access is required." }, 403);
    }

    const body = await req.json();
    const courses = normalizeCourseContext(body);
    if (courses.length === 0) {
      return jsonResponse({ recommendations: [], model: "gemini-2.5-flash" });
    }

    const searchPrompt = [
      "You are the resource recommendation assistant for a college learning management system.",
      "Use Google Search to find 8 to 12 real, currently accessible external teaching resources for the lecturer's current courses.",
      "Search for specific resource pages, not generic home pages or invented URLs.",
      "Include videos, articles, courses, practice resources, official documentation, or teaching tools.",
      "Use the aggregate course metrics only to improve relevance. Do not recommend grading decisions and do not mention individual students.",
      "Prefer official documentation, universities, established education platforms, professional organizations, and credible teaching tools.",
      "Avoid login-only pages, search-result pages, outdated routes, soft-404 pages, removed pages, example.com, and duplicate websites.",
      "In the answer, briefly explain what each found resource teaches so it can be matched to a course.",
      "",
      `Course context: ${JSON.stringify(courses)}`,
    ].join("\n");

    const searchPayload = await callGemini(geminiApiKey, {
      contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    const searchText = getResponseText(searchPayload);
    const groundingMetadata =
      searchPayload?.candidates?.[0]?.groundingMetadata || {};
    const rawSources = Array.isArray(groundingMetadata?.groundingChunks)
      ? groundingMetadata.groundingChunks
      : [];
    const seenSourceUrls = new Set<string>();
    const sourceCandidates = rawSources
      .map((chunk: GroundingChunk) => ({
        title: cleanText(chunk?.web?.title, "Web resource", 180),
        url: cleanText(chunk?.web?.uri, "", 1200),
      }))
      .filter((source): source is ResourceSource => {
        if (!isSafeResourceUrl(source.url) || seenSourceUrls.has(source.url)) {
          return false;
        }
        seenSourceUrls.add(source.url);
        return true;
      })
      .slice(0, 20);
    const checkedSources = await Promise.all(
      sourceCandidates.map(verifyGroundedSource),
    );
    const verifiedSources = checkedSources.filter(Boolean) as Array<{
      title: string;
      url: string;
    }>;
    const sources = verifiedSources
      .filter(
        (source, index, list) =>
          list.findIndex((candidate) => candidate.url === source.url) === index,
      )
      .map((source, sourceIndex) => ({
        sourceIndex,
        ...source,
      }));

    if (!searchText || sources.length < 3) {
      throw new Error("Gemini Search did not return enough verified web sources.");
    }

    const formattingPrompt = [
      "Create between 3 and 5 teaching-resource recommendations using only the grounded Google Search sources supplied below.",
      "Every recommendation must use a valid sourceIndex from the source list. Never create, alter, or guess a URL.",
      "Do not repeat a sourceIndex.",
      "Keep each reason to one concise sentence connected to the course context.",
      "qualityScore is a 1-5 assessment of source credibility and teaching usefulness, not a claimed website rating.",
      "Return a diverse selection where the available sources allow it.",
      "",
      `Course context: ${JSON.stringify(courses)}`,
      `Grounded search summary: ${searchText}`,
      `Allowed sources: ${JSON.stringify(sources)}`,
    ].join("\n");

    const formattingPayload = await callGemini(geminiApiKey, {
      contents: [{ role: "user", parts: [{ text: formattingPrompt }] }],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: recommendationSchema,
      },
    });

    const responseText = getResponseText(formattingPayload);
    if (!responseText) {
      throw new Error("Gemini returned an empty recommendation response.");
    }

    const parsed = JSON.parse(responseText) as {
      recommendations?: RecommendationItem[];
    };
    const rawRecommendations = Array.isArray(parsed?.recommendations)
      ? parsed.recommendations
      : [];
    const recommendations = [];
    const usedSourceIndexes = new Set<number>();

    for (const item of rawRecommendations.slice(0, 5)) {
      const sourceIndex = Number(item?.sourceIndex);
      const source = sources.find(
        (candidate) => candidate.sourceIndex === sourceIndex,
      );
      if (!source || usedSourceIndexes.has(sourceIndex)) continue;
      usedSourceIndexes.add(sourceIndex);

      const title = cleanText(item?.title, "Teaching resource", 180);
      const url = source.url;
      recommendations.push({
        id: await createRecommendationId(title, url),
        type: cleanText(item?.type, "article", 20),
        title,
        platform: cleanText(item?.platform, "External resource", 100),
        duration: cleanText(item?.duration, "Self-paced", 60),
        qualityScore: cleanNumber(item?.qualityScore, 1, 5),
        relevance: Math.round(cleanNumber(item?.relevance, 1, 100)),
        reason: cleanText(item?.reason, "Relevant to your current courses.", 240),
        url,
        difficulty: cleanText(item?.difficulty, "mixed", 20),
        tags: Array.isArray(item?.tags)
          ? item.tags.slice(0, 4).map((tag: unknown) => cleanText(tag, "", 40)).filter(Boolean)
          : [],
        impact: cleanText(item?.impact, "Useful reference", 30),
      });
    }

    if (recommendations.length === 0) {
      throw new Error("Gemini did not return any valid resource links.");
    }

    return jsonResponse({
      recommendations,
      model: "gemini-2.5-flash",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Gemini lecturer recommendations error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI recommendations could not be generated.",
      },
      500,
    );
  }
});
