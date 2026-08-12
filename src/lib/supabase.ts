/// <reference types="vite/client" />
import { createAzureSupabaseAdapter } from './azureSupabaseAdapter';

type SupabaseLikeResponse<T = any> = {
  data: T | null;
  error: any;
  count?: number | null;
};

type AnyRow = any;
type SingleRow<T> = T extends Array<infer Row> ? Row : T;

type SupabaseLikeBuilder<TData = AnyRow[]> = PromiseLike<SupabaseLikeResponse<TData>> & {
  select: <TSelect = AnyRow[]>(columns?: string, options?: Record<string, unknown>) => SupabaseLikeBuilder<TSelect>;
  insert: (values: unknown, options?: Record<string, unknown>) => SupabaseLikeBuilder<AnyRow[]>;
  update: (values: unknown) => SupabaseLikeBuilder<AnyRow[]>;
  upsert: (values: unknown, options?: Record<string, unknown>) => SupabaseLikeBuilder<AnyRow[]>;
  delete: () => SupabaseLikeBuilder<AnyRow[]>;
  eq: (column: string, value: unknown) => SupabaseLikeBuilder<TData>;
  neq: (column: string, value: unknown) => SupabaseLikeBuilder<TData>;
  gt: (column: string, value: unknown) => SupabaseLikeBuilder<TData>;
  gte: (column: string, value: unknown) => SupabaseLikeBuilder<TData>;
  lt: (column: string, value: unknown) => SupabaseLikeBuilder<TData>;
  lte: (column: string, value: unknown) => SupabaseLikeBuilder<TData>;
  in: (column: string, values: unknown[]) => SupabaseLikeBuilder<TData>;
  is: (column: string, value: unknown) => SupabaseLikeBuilder<TData>;
  not: (column: string, operator: string, value: unknown) => SupabaseLikeBuilder<TData>;
  or: (expression: string) => SupabaseLikeBuilder<TData>;
  ilike: (column: string, value: string) => SupabaseLikeBuilder<TData>;
  contains: (column: string, value: unknown) => SupabaseLikeBuilder<TData>;
  filter: (column: string, operator: string, value: unknown) => SupabaseLikeBuilder<TData>;
  match: (query: Record<string, unknown>) => SupabaseLikeBuilder<TData>;
  order: (column: string, options?: Record<string, unknown>) => SupabaseLikeBuilder<TData>;
  abortSignal: (signal: AbortSignal) => SupabaseLikeBuilder<TData>;
  limit: (value: number) => SupabaseLikeBuilder<TData>;
  range: (from: number, to: number) => SupabaseLikeBuilder<TData>;
  single: <T = SingleRow<TData>>() => Promise<SupabaseLikeResponse<T>>;
  maybeSingle: <T = SingleRow<TData>>() => Promise<SupabaseLikeResponse<T | null>>;
  returns: <T = AnyRow[]>() => SupabaseLikeBuilder<T>;
  upload: (path: string, file: File | Blob, options?: Record<string, unknown>) => Promise<SupabaseLikeResponse>;
  remove: (paths: string[]) => Promise<SupabaseLikeResponse>;
  createSignedUrls: (paths: string[], expiresInSeconds?: number) => Promise<SupabaseLikeResponse>;
  createSignedUrl: (path: string, expiresInSeconds?: number) => Promise<SupabaseLikeResponse>;
  download: (path: string) => Promise<SupabaseLikeResponse<Blob>>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
};

type SupabaseLikeClient = {
  from: (table: string) => SupabaseLikeBuilder;
  rpc: <T = any>(
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<SupabaseLikeResponse<T>>;
  functions: {
    invoke: <T = any>(
      name: string,
      options?: Record<string, unknown>,
    ) => Promise<SupabaseLikeResponse<T>>;
  };
  storage: {
    from: (bucket: string) => SupabaseLikeBuilder;
  };
  auth: {
    getSession: () => Promise<SupabaseLikeResponse<{ session: any }>>;
    onAuthStateChange: (
      callback: (event: string, session: any) => void,
    ) => { data: { subscription: { unsubscribe: () => void } } };
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<SupabaseLikeResponse>;
    signOut: () => Promise<SupabaseLikeResponse>;
    signUp: (credentials: {
      email?: string;
      password?: string;
      options?: { data?: Record<string, string | undefined> };
    }) => Promise<SupabaseLikeResponse>;
    updateUser: (attributes: { password?: string }) => Promise<SupabaseLikeResponse>;
  };
};

// The project now runs through the Azure backend. This export keeps the
// existing Supabase-style call sites working while routing them to Azure APIs.
export const supabase = createAzureSupabaseAdapter() as unknown as SupabaseLikeClient;
