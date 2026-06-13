import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { strFromU8, unzipSync } from "npm:fflate@0.8.2";

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

const gradingSchema = {
  type: "object",
  properties: {
    suggestedScore: { type: "number", minimum: 0 },
    feedback: { type: "string" },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    criteria: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          score: { type: "number", minimum: 0 },
          maxScore: { type: "number", minimum: 0 },
          reason: { type: "string" },
        },
        required: ["name", "score", "maxScore", "reason"],
      },
    },
    warnings: {
      type: "array",
      maxItems: 4,
      items: { type: "string" },
    },
  },
  required: ["suggestedScore", "feedback", "confidence", "criteria", "warnings"],
};

type StoredFile = {
  name: string;
  path: string;
  type?: string;
  size?: number;
};

const MAX_FILES = 8;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 14 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 180000;
const MAX_EMBEDDED_IMAGES = 12;
const MAX_EMBEDDED_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_EMBEDDED_IMAGE_TOTAL_BYTES = 10 * 1024 * 1024;

const MODERN_OFFICE_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const LEGACY_OFFICE_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.ms-powerpoint",
  "application/vnd.ms-excel",
]);

const cleanText = (value: unknown, fallback = "", maxLength = 12000) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;

const cleanNumber = (value: unknown, minimum: number, maximum: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, parsed));
};

const getResponseText = (payload: any) =>
  payload?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text || "")
    .join("")
    .trim() || "";

const parseGeminiJson = (payload: any) => {
  const responseText = getResponseText(payload);
  if (!responseText) {
    throw new Error("EMPTY_GRADING_RESPONSE");
  }

  const normalizedText = responseText
    .replace(/^\uFEFF/, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const firstBrace = normalizedText.indexOf("{");
  const lastBrace = normalizedText.lastIndexOf("}");
  const jsonText =
    firstBrace >= 0 && lastBrace > firstBrace
      ? normalizedText.slice(firstBrace, lastBrace + 1)
      : normalizedText;

  try {
    return JSON.parse(jsonText);
  } catch {
    const finishReason = payload?.candidates?.[0]?.finishReason || "";
    console.error("Invalid Gemini grading JSON", {
      finishReason,
      responseLength: responseText.length,
    });
    throw new Error("INVALID_GRADING_RESPONSE");
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
};

const decodeXmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const extractXmlText = (xml: string) =>
  decodeXmlEntities(
    xml
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<\/(?:w:p|a:p|row|si)>/g, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const extractOfficeText = (
  fileName: string,
  mimeType: string,
  buffer: ArrayBuffer,
) => {
  const archive = unzipSync(new Uint8Array(buffer));
  const extension = fileName.toLowerCase().split(".").pop();

  if (
    extension === "docx" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const documentXml = archive["word/document.xml"];
    if (!documentXml) throw new Error(`"${fileName}" is not a readable Word document.`);
    return extractXmlText(strFromU8(documentXml));
  }

  if (
    extension === "pptx" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    const slides = Object.keys(archive)
      .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      .sort((left, right) => {
        const leftNumber = Number(left.match(/slide(\d+)\.xml$/)?.[1] || 0);
        const rightNumber = Number(right.match(/slide(\d+)\.xml$/)?.[1] || 0);
        return leftNumber - rightNumber;
      })
      .map((path, index) => {
        const text = extractXmlText(strFromU8(archive[path]));
        return text ? `Slide ${index + 1}\n${text}` : "";
      })
      .filter(Boolean);

    if (slides.length === 0) {
      throw new Error(`"${fileName}" has no readable PowerPoint slides.`);
    }
    return slides.join("\n\n");
  }

  if (
    extension === "xlsx" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    const sharedStringsXml = archive["xl/sharedStrings.xml"];
    const sharedStrings = sharedStringsXml
      ? (strFromU8(sharedStringsXml).match(/<si[\s\S]*?<\/si>/g) || []).map(
          extractXmlText,
        )
      : [];
    const sheets = Object.keys(archive)
      .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path))
      .sort()
      .map((path, index) => {
        const xml = strFromU8(archive[path]);
        const cells = (xml.match(/<c\b[\s\S]*?<\/c>/g) || [])
          .map((cell) => {
            const reference = cell.match(/\br="([^"]+)"/)?.[1] || "";
            const cellType = cell.match(/\bt="([^"]+)"/)?.[1] || "";
            const rawValue = cell.match(/<v>([\s\S]*?)<\/v>/)?.[1] || "";
            const inlineValue = cell.match(/<is>([\s\S]*?)<\/is>/)?.[1] || "";
            const value =
              cellType === "s"
                ? sharedStrings[Number(rawValue)] || rawValue
                : inlineValue
                  ? extractXmlText(inlineValue)
                  : decodeXmlEntities(rawValue);
            return value ? `${reference}: ${value}` : "";
          })
          .filter(Boolean);
        return cells.length > 0 ? `Sheet ${index + 1}\n${cells.join("\n")}` : "";
      })
      .filter(Boolean);

    if (sheets.length === 0) {
      throw new Error(`"${fileName}" has no readable spreadsheet cells.`);
    }
    return sheets.join("\n\n");
  }

  return "";
};

const getEmbeddedImageMimeType = (path: string) => {
  const extension = path.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return mimeTypes[extension || ""] || "";
};

const extractOfficeImages = (
  fileName: string,
  mimeType: string,
  buffer: ArrayBuffer,
) => {
  const archive = unzipSync(new Uint8Array(buffer));
  const extension = fileName.toLowerCase().split(".").pop();
  let mediaPrefix = "";

  if (
    extension === "docx" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    mediaPrefix = "word/media/";
  } else if (
    extension === "pptx" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    mediaPrefix = "ppt/media/";
  } else if (
    extension === "xlsx" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    mediaPrefix = "xl/media/";
  }

  if (!mediaPrefix) return [];

  let totalBytes = 0;
  return Object.keys(archive)
    .filter((path) => path.startsWith(mediaPrefix))
    .sort()
    .map((path) => ({
      name: path.slice(mediaPrefix.length),
      mimeType: getEmbeddedImageMimeType(path),
      bytes: archive[path],
    }))
    .filter((image) => image.mimeType && image.bytes.byteLength > 0)
    .filter((image) => {
      if (image.bytes.byteLength > MAX_EMBEDDED_IMAGE_BYTES) return false;
      if (
        totalBytes + image.bytes.byteLength >
        MAX_EMBEDDED_IMAGE_TOTAL_BYTES
      ) {
        return false;
      }
      totalBytes += image.bytes.byteLength;
      return true;
    })
    .slice(0, MAX_EMBEDDED_IMAGES);
};

const inferMimeType = (name: string, configuredType = "") => {
  const normalizedConfiguredType = configuredType
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (
    normalizedConfiguredType &&
    normalizedConfiguredType !== "application/octet-stream"
  ) {
    return normalizedConfiguredType;
  }

  const extension = name.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    md: "text/markdown",
    html: "text/html",
    htm: "text/html",
    xml: "application/xml",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };

  return mimeTypes[extension || ""] || "application/octet-stream";
};

const normalizeFiles = (value: unknown): StoredFile[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((file: any) => ({
      name: cleanText(file?.name, "Attached file", 240),
      path: cleanText(file?.path || file?.url, "", 1800),
      type: cleanText(file?.type, "", 160),
      size: Number(file?.size) || undefined,
    }))
    .filter((file) => file.path)
    .slice(0, MAX_FILES);
};

const parseRubric = (value: unknown) => {
  const rubric = cleanText(value, "", 50000);
  if (!rubric) return { text: "", files: [] as StoredFile[] };

  try {
    const parsed = JSON.parse(rubric);
    if (Array.isArray(parsed)) {
      return { text: "", files: normalizeFiles(parsed) };
    }
  } catch {
    // A plain-text rubric is valid.
  }

  return { text: rubric, files: [] as StoredFile[] };
};

const resolveFileUrl = async (
  file: StoredFile,
  supabaseUrl: string,
  serviceClient: any,
) => {
  if (/^https?:\/\//i.test(file.path)) {
    const parsed = new URL(file.path);
    const projectHost = new URL(supabaseUrl).host;

    if (
      parsed.host !== projectHost ||
      !parsed.pathname.includes("/storage/v1/object/")
    ) {
      throw new Error(`File "${file.name}" is not stored in this Supabase project.`);
    }

    return parsed.toString();
  }

  const normalizedPath = file.path.replace(/^\/+/, "");
  const { data, error } = await serviceClient.storage
    .from("course_content")
    .createSignedUrl(normalizedPath, 300);

  if (error || !data?.signedUrl) {
    throw new Error(`Could not access "${file.name}".`);
  }

  return data.signedUrl;
};

const loadFileParts = async (
  files: StoredFile[],
  label: string,
  supabaseUrl: string,
  serviceClient: any,
) => {
  const parts: Array<Record<string, unknown>> = [];
  let totalBytes = 0;
  let totalExtractedChars = 0;

  for (const file of files.slice(0, MAX_FILES)) {
    const url = await resolveFileUrl(file, supabaseUrl, serviceClient);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Could not download "${file.name}".`);
    }

    const contentLength = Number(response.headers.get("content-length") || file.size || 0);
    if (contentLength > MAX_FILE_BYTES) {
      throw new Error(`"${file.name}" is larger than the 8 MB AI grading limit.`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_FILE_BYTES) {
      throw new Error(`"${file.name}" is larger than the 8 MB AI grading limit.`);
    }

    totalBytes += buffer.byteLength;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error("The grading files exceed the 14 MB combined limit.");
    }

    const mimeType = inferMimeType(
      file.name,
      file.type || response.headers.get("content-type") || "",
    );

    if (mimeType === "application/octet-stream") {
      throw new Error(
        `"${file.name}" uses a file type that Gemini cannot grade safely.`,
      );
    }

    const lowerName = file.name.toLowerCase();
    const isModernOfficeFile =
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".pptx") ||
      lowerName.endsWith(".xlsx") ||
      MODERN_OFFICE_MIME_TYPES.has(mimeType);
    const isLegacyOfficeFile =
      lowerName.endsWith(".doc") ||
      lowerName.endsWith(".ppt") ||
      lowerName.endsWith(".xls") ||
      LEGACY_OFFICE_MIME_TYPES.has(mimeType);
    const isTextFile =
      mimeType.startsWith("text/") ||
      ["application/json", "application/xml"].includes(mimeType);

    if (isLegacyOfficeFile) {
      throw new Error(
        `"${file.name}" uses an older Office format. Save it as DOCX, PPTX, XLSX, or PDF before AI grading.`,
      );
    }

    if (isModernOfficeFile || isTextFile) {
      const extractedText = isModernOfficeFile
        ? extractOfficeText(file.name, mimeType, buffer)
        : new TextDecoder().decode(buffer);
      const remainingChars = MAX_EXTRACTED_CHARS - totalExtractedChars;
      if (remainingChars <= 0) {
        throw new Error("The readable text in the grading files is too large.");
      }
      const limitedText = extractedText.trim().slice(0, remainingChars);
      totalExtractedChars += limitedText.length;
      parts.push({
        text: `${label}: ${file.name}\n${limitedText || "[No readable text found]"}`,
      });
      if (isModernOfficeFile) {
        const embeddedImages = extractOfficeImages(
          file.name,
          mimeType,
          buffer,
        );
        embeddedImages.forEach((image, index) => {
          parts.push({
            text: `${label}: embedded image ${index + 1} from ${file.name} (${image.name})`,
          });
          parts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: bytesToBase64(image.bytes),
            },
          });
        });
      }
    } else if (mimeType === "application/pdf" || mimeType.startsWith("image/")) {
      parts.push({ text: `${label}: ${file.name}` });
      parts.push({
        inlineData: {
          mimeType,
          data: arrayBufferToBase64(buffer),
        },
      });
    } else {
      throw new Error(
        `"${file.name}" is not a supported AI grading file type.`,
      );
    }
  }

  return parts;
};

const callGemini = async (
  apiKey: string,
  model: string,
  requestBody: Record<string, unknown>,
) => {
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
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Gemini could not grade the submission.");
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
    const model = Deno.env.get("AI_GRADING_MODEL") || "gemini-2.5-flash";

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

    const body = await req.json();
    const assignmentId = cleanText(body?.assignmentId, "", 80);
    const studentId = cleanText(body?.studentId, "", 80);

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
      .select("id, course_id, title, description, max_score, rubric")
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return jsonResponse({ error: "Assignment not found." }, 404);
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
      .select("id, student_id, submission_text, files, submitted_at")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (submissionError || !submission) {
      return jsonResponse({ error: "The student has not submitted this assignment." }, 404);
    }

    const rubric = parseRubric(assignment.rubric);
    if (!rubric.text && rubric.files.length === 0) {
      return jsonResponse(
        { error: "Add a grading rubric before using AI grading." },
        400,
      );
    }

    const submissionFiles = normalizeFiles(submission.files);
    const submissionText = cleanText(submission.submission_text, "", 40000);
    if (!submissionText && submissionFiles.length === 0) {
      return jsonResponse(
        { error: "This submission has no readable text or attached files." },
        400,
      );
    }

    const maxScore = cleanNumber(assignment.max_score ?? 100, 1, 100000);
    const promptParts: Array<Record<string, unknown>> = [
      {
        text: [
          "You are an assessment assistant for a college lecturer.",
          "Evaluate the student's submitted work strictly against the lecturer-provided rubric and assignment instructions.",
          "Return a suggested grade only. The lecturer will review and decide the final grade.",
          "Do not reward content that is not present in the submission.",
          "If a file is unreadable, incomplete, suspicious, or the rubric is ambiguous, explain that in warnings and lower confidence.",
          "The suggestedScore and all criterion scores must be within their stated maximum values.",
          "Write constructive, specific feedback that cites strengths and improvements visible in the work.",
          "Write the main feedback as one concise paragraph below 120 words.",
          "Mention only the most important strengths and improvements.",
          "Keep each rubric criterion reason below 25 words and return no more than 6 criteria.",
          "Keep every warning below 20 words and return no more than 4 warnings.",
          "",
          `Assignment title: ${cleanText(assignment.title, "Assignment", 300)}`,
          `Assignment instructions: ${cleanText(assignment.description, "No additional instructions.", 12000)}`,
          `Maximum score: ${maxScore}`,
          rubric.text ? `Rubric text: ${rubric.text}` : "Rubric is supplied as attached file(s).",
          submissionText ? `Student submission text: ${submissionText}` : "Student work is supplied as attached file(s).",
        ].join("\n"),
      },
    ];

    promptParts.push(
      ...(await loadFileParts(
        rubric.files,
        "Lecturer rubric file",
        supabaseUrl,
        serviceClient,
      )),
    );
    promptParts.push(
      ...(await loadFileParts(
        submissionFiles,
        "Student submission file",
        supabaseUrl,
        serviceClient,
      )),
    );

    let parsed: any = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const attemptParts =
        attempt === 0
          ? promptParts
          : [
              ...promptParts,
              {
                text: [
                  "Return a shorter grading response.",
                  "Use at most 100 words for feedback, at most 5 rubric criteria, and one short sentence per reason.",
                  "Return complete valid JSON only.",
                ].join("\n"),
              },
            ];
      const payload = await callGemini(geminiApiKey, model, {
        contents: [{ role: "user", parts: attemptParts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: attempt === 0 ? 8192 : 4096,
          responseMimeType: "application/json",
          responseSchema: gradingSchema,
        },
      });

      try {
        parsed = parseGeminiJson(payload);
        break;
      } catch (error) {
        if (
          attempt === 0 &&
          error instanceof Error &&
          ["EMPTY_GRADING_RESPONSE", "INVALID_GRADING_RESPONSE"].includes(
            error.message,
          )
        ) {
          continue;
        }
        throw new Error(
          "Gemini returned incomplete grading data. Please click Try Again.",
        );
      }
    }

    if (!parsed) {
      throw new Error(
        "Gemini returned incomplete grading data. Please click Try Again.",
      );
    }

    const suggestedScore = cleanNumber(parsed?.suggestedScore, 0, maxScore);
    const criteria = Array.isArray(parsed?.criteria)
      ? parsed.criteria.slice(0, 6).map((criterion: any) => {
          const criterionMax = cleanNumber(criterion?.maxScore, 0, maxScore);
          return {
            name: cleanText(criterion?.name, "Criterion", 160),
            score: cleanNumber(criterion?.score, 0, criterionMax),
            maxScore: criterionMax,
            reason: cleanText(criterion?.reason, "", 360),
          };
        })
      : [];

    return jsonResponse({
      suggestedScore,
      maxScore,
      feedback: cleanText(parsed?.feedback, "No feedback was generated.", 1800),
      confidence: Math.round(cleanNumber(parsed?.confidence, 0, 100)),
      criteria,
      warnings: Array.isArray(parsed?.warnings)
        ? parsed.warnings
            .slice(0, 4)
            .map((warning: unknown) => cleanText(warning, "", 240))
            .filter(Boolean)
        : [],
      model,
    });
  } catch (error) {
    console.error("AI grading error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "The assignment could not be graded.",
      },
      500,
    );
  }
});
