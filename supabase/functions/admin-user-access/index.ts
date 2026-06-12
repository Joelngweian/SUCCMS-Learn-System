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
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { data: adminProfile, error: adminError } = await serviceClient
      .from("user_profiles")
      .select("role, is_active")
      .eq("id", userData.user.id)
      .single();

    if (
      adminError ||
      adminProfile?.role !== "admin" ||
      adminProfile?.is_active === false
    ) {
      return jsonResponse({ error: "Administrator access is required." }, 403);
    }

    const body = await req.json();
    const targetUserId =
      typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
    const action = body?.action;

    if (!targetUserId || !["suspend", "restore"].includes(action)) {
      return jsonResponse({ error: "A valid user and action are required." }, 400);
    }

    if (targetUserId === userData.user.id) {
      return jsonResponse(
        { error: "Administrators cannot suspend their own account." },
        400,
      );
    }

    const { data: targetProfile, error: targetError } = await serviceClient
      .from("user_profiles")
      .select("id, full_name, role, is_active")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return jsonResponse({ error: "The selected user could not be found." }, 404);
    }

    if (targetProfile.role === "admin") {
      return jsonResponse(
        { error: "Administrator accounts cannot be suspended here." },
        400,
      );
    }

    const isSuspending = action === "suspend";
    const { error: authUpdateError } =
      await serviceClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: isSuspending ? "876000h" : "none",
      });

    if (authUpdateError) throw authUpdateError;

    const { error: profileUpdateError } = await serviceClient
      .from("user_profiles")
      .update({ is_active: !isSuspending })
      .eq("id", targetUserId);

    if (profileUpdateError) {
      await serviceClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: isSuspending ? "none" : "876000h",
      });
      throw profileUpdateError;
    }

    return jsonResponse({
      success: true,
      action,
      userId: targetUserId,
      isActive: !isSuspending,
    });
  } catch (error) {
    console.error("Admin user access error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "The account status could not be updated.",
      },
      500,
    );
  }
});
