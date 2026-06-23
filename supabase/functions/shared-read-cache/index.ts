import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (
  body: Record<string, unknown>,
  status = 200,
  cacheControl = "private, no-store",
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Cache-Control": cacheControl,
      "Content-Type": "application/json",
      "Vary": "Authorization",
    },
  });

type CacheDefinition = {
  staleSeconds: number;
  ttlSeconds: number;
  load: (client: ReturnType<typeof createClient>) => Promise<unknown>;
};

const redisCommand = async (command: Array<string | number>) => {
  const url = Deno.env.get("SHARED_CACHE_REST_URL");
  const token = Deno.env.get("SHARED_CACHE_REST_TOKEN");
  if (!url || !token) return null;

  const response = await fetch(url.replace(/\/$/, ""), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error(`Shared cache returned ${response.status}.`);
  const payload = await response.json();
  return payload?.result ?? null;
};

const readRedis = async (key: string) => {
  try {
    const value = await redisCommand(["GET", `succms:v2:${key}`]);
    return typeof value === "string" ? JSON.parse(value) : null;
  } catch (error) {
    console.warn("Redis cache read failed; using database cache:", error);
    return null;
  }
};

const writeRedis = async (key: string, value: unknown, ttlSeconds: number) => {
  try {
    await redisCommand([
      "SET",
      `succms:v2:${key}`,
      JSON.stringify(value),
      "EX",
      Math.min(ttlSeconds, 30),
    ]);
  } catch (error) {
    console.warn("Redis cache write failed; database cache remains active:", error);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Server configuration is incomplete." }, 500);
    }

    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) return jsonResponse({ error: "Authentication required." }, 401);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } =
      await serviceClient.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return jsonResponse({ error: "Invalid session." }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const key = typeof body?.key === "string" ? body.key : "";

    const definitions: Record<string, CacheDefinition> = {
      "active-course-offerings": {
        staleSeconds: 900,
        ttlSeconds: 300,
        load: async (client) => {
          const { data, error } = await client
            .from("course_offerings")
            .select([
              "id",
              "course_id",
              "academic_term_id",
              "owner_id",
              "section_code",
              "max_capacity",
              "status",
              "created_at",
              "updated_at",
              "courses(id, code, name, description, lecturer_id, credits, max_students, created_at, updated_at, course_code, chinese_name, faculty, programme, course_type, credit_hours, max_capacity, status)",
              "academic_terms(id, code, name, starts_at, ends_at, status, created_at, updated_at)",
            ].join(", "))
            .eq("status", "active");
          if (error) throw error;
          return data || [];
        },
      },
      "active-announcements": {
        staleSeconds: 300,
        ttlSeconds: 60,
        load: async (client) => {
          const { data, error } = await client
            .from("announcements")
            .select("id, title, content, priority, created_at")
            .eq("is_active", true)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order("created_at", { ascending: false })
            .limit(20);
          if (error) throw error;
          return data || [];
        },
      },
    };

    const definition = definitions[key];
    if (!definition) return jsonResponse({ error: "Unsupported cache key." }, 400);

    const redisValue = await readRedis(key);
    if (redisValue !== null) {
      return jsonResponse(
        { data: redisValue, cache: "redis" },
        200,
        "private, max-age=15",
      );
    }

    const { data: cachedRow, error: cacheReadError } = await serviceClient
      .from("shared_cache_entries")
      .select("value, expires_at, stale_until, refreshing_until")
      .eq("cache_key", key)
      .maybeSingle();
    if (cacheReadError) throw cacheReadError;

    if (cachedRow && new Date(cachedRow.expires_at).getTime() > Date.now()) {
      await writeRedis(key, cachedRow.value, definition.ttlSeconds);
      return jsonResponse(
        { data: cachedRow.value, cache: "database" },
        200,
        "private, max-age=15",
      );
    }

    const staleValue = cachedRow?.value ?? null;
    const canServeStale = staleValue !== null
      && new Date(cachedRow?.stale_until || 0).getTime() > Date.now();
    const { data: claimRows, error: claimError } = await serviceClient.rpc(
      "claim_shared_cache_refresh",
      { p_cache_key: key, p_lease_seconds: 20 },
    );
    if (claimError) throw claimError;
    const leaseAcquired = claimRows?.[0]?.lease_acquired === true;

    if (!leaseAcquired) {
      if (canServeStale) {
        return jsonResponse(
          { data: staleValue, cache: "stale" },
          200,
          "private, max-age=5, stale-while-revalidate=30",
        );
      }

      for (const delay of [100, 200, 400, 800, 1200]) {
        await new Promise(resolve => setTimeout(resolve, delay));
        const { data: refreshedRow, error: refreshedError } = await serviceClient
          .from("shared_cache_entries")
          .select("value, expires_at")
          .eq("cache_key", key)
          .maybeSingle();
        if (refreshedError) throw refreshedError;
        if (
          refreshedRow?.value !== null
          && new Date(refreshedRow?.expires_at || 0).getTime() > Date.now()
        ) {
          await writeRedis(key, refreshedRow.value, definition.ttlSeconds);
          return jsonResponse(
            { data: refreshedRow.value, cache: "database" },
            200,
            "private, max-age=15",
          );
        }
      }

      throw new Error(`Shared cache refresh for "${key}" is still in progress.`);
    }

    let value: unknown;
    try {
      value = await definition.load(serviceClient);
    } catch (originError) {
      await serviceClient
        .from("shared_cache_entries")
        .update({ refreshing_until: null })
        .eq("cache_key", key);
      if (canServeStale) {
        return jsonResponse(
          { data: staleValue, cache: "stale" },
          200,
          "private, max-age=5, stale-while-revalidate=30",
        );
      }
      throw originError;
    }
    const expiresAt = new Date(
      Date.now() + definition.ttlSeconds * 1000,
    ).toISOString();
    const staleUntil = new Date(
      Date.now() + (definition.ttlSeconds + definition.staleSeconds) * 1000,
    ).toISOString();
    const { error: cacheWriteError } = await serviceClient
      .from("shared_cache_entries")
      .upsert({
        cache_key: key,
        value,
        expires_at: expiresAt,
        stale_until: staleUntil,
        refreshing_until: null,
        updated_at: new Date().toISOString(),
      });
    if (cacheWriteError) throw cacheWriteError;
    await writeRedis(key, value, definition.ttlSeconds);

    return jsonResponse(
      { data: value, cache: "origin" },
      200,
      "private, max-age=15",
    );
  } catch (error) {
    console.error("shared-read-cache failed:", error);
    return jsonResponse({ error: "Shared data could not be loaded." }, 500);
  }
});
