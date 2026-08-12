import { azureApiFetch, azureAuth } from "./azureApi";
import { normalizeStoragePathForBucket, toAzureStorageDomain } from "./storagePath";

type QueryFilter = {
  column: string;
  operator: string;
  value: unknown;
};

type QueryOrder = {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
};

type QueryPayload = {
  table: string;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  select?: string;
  values?: unknown;
  filters: QueryFilter[];
  orders: QueryOrder[];
  limit?: number;
  range?: { from: number; to: number };
  single?: "single" | "maybeSingle";
  count?: "exact" | null;
  head?: boolean;
  options?: Record<string, unknown>;
};

type SupabaseLikeResponse<T = unknown> = {
  data: T | null;
  error: Error | null;
  count?: number | null;
};

const asErrorResponse = (error: unknown): SupabaseLikeResponse => ({
  data: null,
  error: error instanceof Error ? error : new Error(String(error)),
});

const asOkResponse = <T>(data: T, count?: number | null): SupabaseLikeResponse<T> => ({
  data,
  error: null,
  ...(count === undefined ? {} : { count }),
});

class AzureQueryBuilder implements PromiseLike<SupabaseLikeResponse> {
  private payload: QueryPayload;

  constructor(table: string) {
    this.payload = {
      table,
      action: "select",
      filters: [],
      orders: [],
    };
  }

  select(columns = "*", options: Record<string, unknown> = {}) {
    this.payload.select = columns;
    this.payload.count = options.count as QueryPayload["count"];
    this.payload.head = Boolean(options.head);
    return this;
  }

  insert(values: unknown, options: Record<string, unknown> = {}) {
    this.payload.action = "insert";
    this.payload.values = values;
    this.payload.options = options;
    return this;
  }

  update(values: unknown) {
    this.payload.action = "update";
    this.payload.values = values;
    return this;
  }

  upsert(values: unknown, options: Record<string, unknown> = {}) {
    this.payload.action = "upsert";
    this.payload.values = values;
    this.payload.options = options;
    return this;
  }

  delete() {
    this.payload.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    return this.filter(column, "eq", value);
  }

  neq(column: string, value: unknown) {
    return this.filter(column, "neq", value);
  }

  gt(column: string, value: unknown) {
    return this.filter(column, "gt", value);
  }

  gte(column: string, value: unknown) {
    return this.filter(column, "gte", value);
  }

  lt(column: string, value: unknown) {
    return this.filter(column, "lt", value);
  }

  lte(column: string, value: unknown) {
    return this.filter(column, "lte", value);
  }

  in(column: string, values: unknown[]) {
    return this.filter(column, "in", values);
  }

  is(column: string, value: unknown) {
    return this.filter(column, "is", value);
  }

  not(column: string, operator: string, value: unknown) {
    return this.filter(column, `not.${operator}`, value);
  }

  or(expression: string) {
    return this.filter("_or", "raw", expression);
  }

  ilike(column: string, value: string) {
    return this.filter(column, "ilike", value);
  }

  contains(column: string, value: unknown) {
    return this.filter(column, "contains", value);
  }

  filter(column: string, operator: string, value: unknown) {
    this.payload.filters.push({ column, operator, value });
    return this;
  }

  match(query: Record<string, unknown>) {
    Object.entries(query).forEach(([column, value]) => {
      this.eq(column, value);
    });
    return this;
  }

  order(column: string, options: Omit<QueryOrder, "column"> = {}) {
    this.payload.orders.push({ column, ...options });
    return this;
  }

  abortSignal() {
    return this;
  }

  limit(value: number) {
    this.payload.limit = value;
    return this;
  }

  range(from: number, to: number) {
    this.payload.range = { from, to };
    return this;
  }

  single() {
    this.payload.single = "single";
    return this.execute();
  }

  maybeSingle() {
    this.payload.single = "maybeSingle";
    return this.execute();
  }

  returns() {
    return this;
  }

  then<TResult1 = SupabaseLikeResponse, TResult2 = never>(
    onfulfilled?: ((value: SupabaseLikeResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private execute() {
    return azureApiFetch<{ data: unknown; count?: number | null }>("/api/db/query", {
      method: "POST",
      body: JSON.stringify(this.payload),
    })
      .then((result) => asOkResponse(result.data, result.count))
      .catch(asErrorResponse);
  }
}

class AzureStorageBucket {
  constructor(private readonly bucket: string) {}

  upload(path: string, file: File | Blob, options: Record<string, unknown> = {}) {
    const contentType = String(
      options.contentType
        || (file instanceof File ? file.type : "")
        || "application/octet-stream",
    );

    return azureApiFetch<{ url: string; path: string }>("/api/storage/upload-url", {
      method: "POST",
        body: JSON.stringify({
          domain: toAzureStorageDomain(this.bucket),
          fileName: path,
          contentType,
      }),
    })
      .then(async (upload) => {
        const uploadUrl = (upload as { uploadUrl?: string; url?: string }).uploadUrl || upload.url;
        const blobName = (upload as { blobName?: string; path?: string }).blobName || upload.path;
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "x-ms-blob-type": "BlockBlob",
            "content-type": contentType,
          },
          body: file,
        });
        if (!response.ok) {
          throw new Error(`Azure Blob upload failed with status ${response.status}.`);
        }
        return asOkResponse({ path: blobName });
      })
      .catch(asErrorResponse);
  }

  remove(paths: string[]) {
    const normalizedPaths = paths
      .map(path => normalizeStoragePathForBucket(path, this.bucket))
      .filter((path): path is string => Boolean(path));
    return azureApiFetch<{ deleted: number }>("/api/storage/delete", {
      method: "POST",
      body: JSON.stringify({ paths: normalizedPaths }),
    })
      .then((data) => asOkResponse(data))
      .catch(asErrorResponse);
  }

  createSignedUrls(paths: string[], expiresInSeconds = 300) {
    const normalizedPaths = paths
      .map(path => normalizeStoragePathForBucket(path, this.bucket))
      .filter((path): path is string => Boolean(path));
    return azureApiFetch<{ urls: Array<{ path: string; signedUrl: string }> }>("/api/storage/read-urls", {
      method: "POST",
      body: JSON.stringify({ paths: normalizedPaths, expiresInSeconds }),
    })
      .then((data) => asOkResponse(data.urls))
      .catch(asErrorResponse);
  }

  createSignedUrl(path: string, expiresInSeconds = 300) {
    const normalizedPath = normalizeStoragePathForBucket(path, this.bucket) || path;
    return azureApiFetch<{ url: string }>("/api/storage/read-url", {
      method: "POST",
      body: JSON.stringify({ path: normalizedPath, expiresInSeconds }),
    })
      .then((data) => asOkResponse({ signedUrl: data.url }))
      .catch(asErrorResponse);
  }

  download(path: string) {
    return this.createSignedUrl(path, 300).then(async ({ data, error }: SupabaseLikeResponse<{ signedUrl: string }>) => {
      if (error || !data?.signedUrl) return { data: null, error };
      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        return asErrorResponse(new Error(`Azure Blob download failed with status ${response.status}.`));
      }
      return asOkResponse(await response.blob());
    });
  }

  getPublicUrl(path: string) {
    const normalizedPath = normalizeStoragePathForBucket(path, this.bucket) || path;
    const encodedPath = encodeURIComponent(normalizedPath);
    return {
      data: {
        publicUrl: `${import.meta.env.VITE_AZURE_API_URL?.replace(/\/+$/, "") || ""}/api/storage/public?path=${encodedPath}`,
      },
    };
  }
}

export function createAzureSupabaseAdapter() {
  return {
    from(table: string) {
      return new AzureQueryBuilder(table);
    },
    rpc(name: string, args: Record<string, unknown> = {}) {
      return azureApiFetch<{ data: unknown }>("/api/db/rpc", {
        method: "POST",
        body: JSON.stringify({ name, args }),
      })
        .then((result) => asOkResponse(result.data))
        .catch(asErrorResponse);
    },
    functions: {
      invoke(name: string, options: Record<string, unknown> = {}) {
        return azureApiFetch<unknown>(`/api/functions/${encodeURIComponent(name)}`, {
          method: "POST",
          body: JSON.stringify(options.body || {}),
        })
          .then((data) => asOkResponse(data))
          .catch(asErrorResponse);
      },
    },
    storage: {
      from(bucket: string) {
        return new AzureStorageBucket(bucket);
      },
    },
    auth: {
      async getSession() {
        const session = azureAuth.loadSession();
        return asOkResponse({ session });
      },
      onAuthStateChange() {
        return {
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        };
      },
      async signInWithPassword(credentials: { email: string; password: string }) {
        try {
          const session = await azureAuth.login(credentials.email, credentials.password);
          azureAuth.saveSession(session);
          return asOkResponse({ session, user: session.user });
        } catch (error) {
          return asErrorResponse(error);
        }
      },
      async signOut() {
        azureAuth.clearSession();
        return asOkResponse(null);
      },
      async signUp(credentials: {
        email?: string;
        password?: string;
        options?: { data?: { username?: string; full_name?: string; fullName?: string } };
      }) {
        try {
          if (!credentials.email || !credentials.password) {
            return asErrorResponse(new Error("Email and password are required."));
          }

          const signupResult = await azureAuth.signup(
            credentials.email,
            credentials.password,
            credentials.options?.data?.username || "",
            credentials.options?.data?.full_name || credentials.options?.data?.fullName || "",
          );

          return asOkResponse({
            session: null,
            user: null,
            ...signupResult,
          });
        } catch (error) {
          return asErrorResponse(error);
        }
      },
      async updateUser(attributes: { password?: string }) {
        try {
          if (!attributes.password) {
            return asErrorResponse(new Error("Password is required."));
          }
          await azureApiFetch("/api/auth/password", {
            method: "POST",
            body: JSON.stringify({ password: attributes.password }),
          });
          return asOkResponse({ user: azureAuth.loadSession()?.user || null });
        } catch (error) {
          return asErrorResponse(error);
        }
      },
    },
  };
}
