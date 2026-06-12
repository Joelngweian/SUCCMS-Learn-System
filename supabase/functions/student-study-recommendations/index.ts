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

const trustedResources = [
  {
    title: "MDN Learn Web Development",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
  },
  {
    title: "React Reference",
    url: "https://react.dev/reference/react",
  },
  {
    title: "PostgreSQL Tutorial",
    url: "https://www.postgresql.org/docs/current/tutorial.html",
  },
  {
    title: "Khan Academy Computing",
    url: "https://www.khanacademy.org/computing",
  },
  {
    title: "Microsoft Learn Training",
    url: "https://learn.microsoft.com/en-us/training/",
  },
  {
    title: "freeCodeCamp Data Structures and Algorithms Course",
    url: "https://www.youtube.com/watch?v=8hly31xKli0",
  },
  {
    title: "Use The Index, Luke",
    url: "https://use-the-index-luke.com/",
  },
  {
    title: "ACM Code of Ethics and Professional Conduct",
    url: "https://www.acm.org/code-of-ethics",
  },
  {
    title: "Information Technology and Moral Values",
    url: "https://plato.stanford.edu/entries/it-moral-values/",
  },
  {
    title: "UNESCO Recommendation on the Ethics of Artificial Intelligence",
    url: "https://www.unesco.org/en/articles/recommendation-ethics-artificial-intelligence",
  },
];

const recommendationSchema = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          type: {
            type: "string",
            enum: ["video", "article", "course", "practice", "tool"],
          },
          platform: { type: "string" },
          reason: { type: "string" },
          sourceIndex: { type: "integer", minimum: 0, maximum: 29 },
        },
        required: ["title", "type", "platform", "reason", "sourceIndex"],
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

const normalizeCourseContext = (body: any) => {
  const courses = Array.isArray(body?.courses) ? body.courses.slice(0, 12) : [];

  return courses.map((course: any) => ({
    code: cleanText(course?.code, "N/A", 40),
    name: cleanText(course?.name, "Course", 160),
    progress: cleanNumber(course?.progress, 0, 100),
    completedAssignments: cleanNumber(course?.completedAssignments, 0, 1000),
    pendingAssignments: cleanNumber(course?.pendingAssignments, 0, 1000),
    grade: cleanText(course?.grade, "Not graded", 20),
    nextAssignment: course?.nextAssignment
      ? {
          title: cleanText(course.nextAssignment.title, "Upcoming assignment", 180),
          dueDate: cleanText(course.nextAssignment.dueDate, "", 60),
        }
      : null,
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
        value.byteLength > remainingBytes ? value.slice(0, remainingBytes) : value;
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
  const signals = [
    /\b404\b.{0,180}\b(?:page|resource|content)\s+not\s+found\b/i,
    /\b404\b.{0,180}\b(?:sorry|couldn.?t|cannot|can.?t)\s+find\b/i,
    /\b(?:page|resource|content)\s+not\s+found\b/i,
    /\bwe\s+couldn.?t\s+find\s+(?:that|this|the)\s+page\b/i,
    /\bthis\s+page\s+(?:doesn.?t\s+exist|could\s+not\s+be\s+found)\b/i,
  ];

  if (/^\s*404(?:\s|$|[-|:])/i.test(title)) return true;
  if (signals.some((pattern) => pattern.test(`${title} ${visiblePreview}`))) return true;

  try {
    const pathname = new URL(resolvedUrl).pathname.toLowerCase();
    return /(?:^|\/)(?:404|not-found|page-not-found)(?:\/|$)/.test(pathname);
  } catch {
    return true;
  }
};

const verifyResource = async (source: { title: string; url: string }) => {
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

const getResponseText = (payload: any) =>
  payload?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text || "")
    .join("")
    .trim() || "";

const callGemini = async (
  apiKey: string,
  preferredModel: string,
  requestBody: Record<string, unknown>,
) => {
  const models = Array.from(
    new Set([preferredModel, "gemini-2.5-flash"].filter(Boolean)),
  );
  let lastError = "Gemini could not generate study recommendations.";

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(requestBody),
        },
      );
      const payload = await response.json();

      if (response.ok) {
        return { payload, model };
      }

      lastError =
        payload?.error?.message ||
        `Gemini model ${model} could not generate study recommendations.`;
      console.warn(`Gemini model ${model} failed:`, lastError);
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : `Gemini model ${model} could not be reached.`;
      console.warn(`Gemini model ${model} could not be reached:`, error);
    }
  }

  throw new Error(lastError);
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
    const model =
      cleanText(
        Deno.env.get("STUDENT_RECOMMENDATION_MODEL"),
        "gemini-3.5-flash",
        80,
      ) || "gemini-3.5-flash";

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

    const body = await req.json();
    const courses = normalizeCourseContext(body);
    if (courses.length === 0) {
      return jsonResponse({ recommendations: [], model });
    }

    const searchPrompt = [
      "You are the study-resource discovery assistant for a college learning management system.",
      "Use Google Search to find 8 to 12 real and currently accessible learning resources that match the student's current course needs.",
      "Prioritize courses with low progress, low grades, pending assignments, or an upcoming assignment.",
      "Find specific pages or videos, not generic search pages, home pages, or invented URLs.",
      "Prefer official documentation, universities, established education platforms, professional organizations, and respected educators.",
      "Include a useful mix of tutorials, videos, guided courses, reference articles, and practice resources.",
      "Avoid login-only pages, removed pages, soft-404 pages, duplicate resources, and content unrelated to the supplied courses.",
      "Do not make assumptions about the student's identity and do not mention private personal information.",
      "",
      `Anonymous learning context: ${JSON.stringify(courses)}`,
    ].join("\n");

    const searchResult = await callGemini(geminiApiKey, model, {
      contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });
    const searchPayload = searchResult.payload;
    const resolvedModel = searchResult.model;

    const searchText = getResponseText(searchPayload);
    const groundingMetadata =
      searchPayload?.candidates?.[0]?.groundingMetadata || {};
    const rawSources = Array.isArray(groundingMetadata?.groundingChunks)
      ? groundingMetadata.groundingChunks
      : [];
    const discoveredSources = rawSources
      .map((chunk: any) => ({
        title: cleanText(chunk?.web?.title, "Learning resource", 180),
        url: cleanText(chunk?.web?.uri, "", 1200),
      }))
      .filter((source: any) => isSafeResourceUrl(source.url));
    const uniqueCandidates = [...trustedResources, ...discoveredSources].filter(
      (source, index, sources) =>
        sources.findIndex((candidate) => candidate.url === source.url) === index,
    ).slice(0, 30);
    const checkedSources = await Promise.all(uniqueCandidates.map(verifyResource));
    let sources = checkedSources
      .filter(Boolean)
      .filter(
        (source, index, list) =>
          list.findIndex((candidate) => candidate?.url === source?.url) === index,
      )
      .map((source: any, sourceIndex: number) => ({
        sourceIndex,
        title: source.title,
        url: source.url,
      }));

    if (sources.length === 0) {
      sources = trustedResources.map((source, sourceIndex) => ({
        sourceIndex,
        ...source,
      }));
    }

    if (!searchText) {
      throw new Error("Gemini Search did not return learning-resource context.");
    }

    const formattingPrompt = [
      "Select up to 3 study recommendations using only the allowed sources supplied below.",
      "Every recommendation must use a sourceIndex from the list. Never invent, rewrite, or guess a URL.",
      "Do not repeat a sourceIndex.",
      "Prioritize the student's clearest current learning needs and keep the selection diverse.",
      "The reason must be one concise sentence that explains which course or learning need the resource supports.",
      "Use platform for the source organization or website name.",
      "",
      `Anonymous learning context: ${JSON.stringify(courses)}`,
      `Grounded search summary: ${searchText}`,
      `Allowed sources: ${JSON.stringify(sources)}`,
    ].join("\n");

    const formattingResult = await callGemini(geminiApiKey, resolvedModel, {
      contents: [{ role: "user", parts: [{ text: formattingPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: recommendationSchema,
      },
    });
    const formattingPayload = formattingResult.payload;
    const responseText = getResponseText(formattingPayload);
    if (!responseText) {
      throw new Error("Gemini returned an empty study recommendation response.");
    }

    const parsed = JSON.parse(responseText);
    const rawRecommendations = Array.isArray(parsed?.recommendations)
      ? parsed.recommendations
      : [];
    const recommendations = [];
    const usedSourceIndexes = new Set<number>();

    for (const item of rawRecommendations.slice(0, 3)) {
      const sourceIndex = Number(item?.sourceIndex);
      const source = sources.find(
        (candidate: any) => candidate.sourceIndex === sourceIndex,
      );
      if (!source || usedSourceIndexes.has(sourceIndex)) continue;
      usedSourceIndexes.add(sourceIndex);

      const title = cleanText(item?.title, source.title, 180);
      recommendations.push({
        id: await createRecommendationId(title, source.url),
        title,
        type: cleanText(item?.type, "article", 20),
        url: source.url,
        source: cleanText(item?.platform, source.title, 100),
        reason: cleanText(
          item?.reason,
          "Recommended for one of your current courses.",
          240,
        ),
      });
    }

    if (recommendations.length === 0) {
      throw new Error("Gemini did not select any valid learning resources.");
    }

    return jsonResponse({
      recommendations,
      model: formattingResult.model,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Student study recommendations error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Study recommendations could not be generated.",
      },
      500,
    );
  }
});
