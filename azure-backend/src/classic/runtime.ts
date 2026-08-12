import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import { options } from "../lib/http";

type HeaderValue = string | string[] | undefined;

export type ClassicRequest = {
  body?: unknown;
  method?: string;
  headers?: Record<string, HeaderValue>;
  rawBody?: Buffer | string;
  url?: string;
};

export type ClassicContext = {
  log?: ((...args: unknown[]) => void) & {
    error?: (...args: unknown[]) => void;
  };
  res?: {
    status?: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
};

export function getJsonBody(request: ClassicRequest) {
  if (request.body !== undefined) {
    return typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  }

  if (request.rawBody) {
    const rawBody = Buffer.isBuffer(request.rawBody)
      ? request.rawBody.toString("utf8")
      : request.rawBody;
    return rawBody ? JSON.parse(rawBody) : {};
  }

  return {};
}

export function toAuthRequest(request: ClassicRequest): HttpRequest {
  const headers = request.headers || {};

  return {
    headers: {
      get(name: string) {
        const headerName = Object.keys(headers).find(
          key => key.toLowerCase() === name.toLowerCase()
        );
        if (!headerName) return null;
        const value = headers[headerName];
        if (Array.isArray(value)) return value.join(",");
        return value || null;
      }
    }
  } as HttpRequest;
}

export function send(context: ClassicContext, response: HttpResponseInit) {
  context.res = {
    status: response.status || 200,
    headers: normalizeHeaders(response.headers),
    body: response.jsonBody ?? response.body
  };
}

export function handleOptions(context: ClassicContext, request: ClassicRequest) {
  if (request.method?.toUpperCase() !== "OPTIONS") return false;
  send(context, options());
  return true;
}

export function logError(context: ClassicContext, error: unknown) {
  if (typeof context.log?.error === "function") {
    context.log.error(error);
    return;
  }

  if (typeof context.log === "function") {
    context.log(error);
  }
}

export function getRequestOrigin(request: ClassicRequest) {
  if (request.url) {
    try {
      return new URL(request.url).origin;
    } catch {
      // Fall through to forwarded headers.
    }
  }

  const headers = request.headers || {};
  const getHeader = (name: string) => {
    const headerName = Object.keys(headers).find(
      key => key.toLowerCase() === name.toLowerCase()
    );
    const value = headerName ? headers[headerName] : undefined;
    return Array.isArray(value) ? value[0] : value;
  };
  const host = getHeader("x-forwarded-host") || getHeader("host");
  const proto = getHeader("x-forwarded-proto") || "https";

  if (!host) {
    throw new Error("request_host_missing");
  }

  return `${proto}://${host}`;
}

export function isJsonParseError(error: unknown) {
  return error instanceof SyntaxError;
}

function normalizeHeaders(headers: HttpResponseInit["headers"]) {
  if (!headers) return {};

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([key, value]) => [key, String(value)]));
  }

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, String(value)])
  );
}
