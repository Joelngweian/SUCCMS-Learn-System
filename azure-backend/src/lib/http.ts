import type { HttpResponseInit } from "@azure/functions";
import type { ApiEnvelope, ApiErrorCode } from "../types/api";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey"
};

export function json<T>(status: number, body: ApiEnvelope<T>): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8"
    }
  };
}

export function options(): HttpResponseInit {
  return {
    status: 204,
    headers: corsHeaders
  };
}

export function ok<T>(data: T): HttpResponseInit {
  return json(200, { ok: true, data });
}

export function accepted<T>(data: T): HttpResponseInit {
  return json(202, { ok: true, data });
}

export function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown
): HttpResponseInit {
  return json(status, {
    ok: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details })
    }
  });
}

export function badRequest(message: string, details?: unknown): HttpResponseInit {
  return fail(400, "bad_request", message, details);
}

export function unauthorized(message = "Authentication is required."): HttpResponseInit {
  return fail(401, "unauthorized", message);
}

export function forbidden(message = "This action is not allowed."): HttpResponseInit {
  return fail(403, "forbidden", message);
}

export function notImplemented(message: string): HttpResponseInit {
  return fail(501, "not_implemented", message);
}

export function internalError(message = "The request could not be completed."): HttpResponseInit {
  return fail(500, "internal_error", message);
}
