import { createClient } from '@/lib/supabase/client';
import type { ApiResult, PaginatedResult, FilterParams } from '@/types';
import type { PostgrestError } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a PostgrestError into our standard ApiResult error shape */
function toError(err: PostgrestError | null): string | null {
  return err ? err.message : null;
}

/** Build a success ApiResult */
export function ok<T>(data: T): ApiResult<T> {
  return { data, error: null, status: 'success' };
}

/** Build an error ApiResult */
export function fail<T>(message: string): ApiResult<T> {
  return { data: null, error: message, status: 'error' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Query helpers (read operations)
// ─────────────────────────────────────────────────────────────────────────────

export interface QueryTableOptions {
  /** Supabase select string, e.g. "*, member:members(full_name)" */
  select?: string;
  /** Filter: eq(column, value) */
  eq?: [string, string | number | boolean | null][];
  /** Filter: is(column, null) — commonly used for deleted_at */
  isNull?: string[];
  /** Filter: ilike(column, pattern) */
  ilike?: [string, string][];
  /** Order column and direction */
  orderBy?: { column: string; ascending?: boolean };
  /** Pagination */
  pagination?: { page: number; pageSize: number };
}

/**
 * Fetch a list of rows from a table with standard filters, ordering, and pagination.
 * Returns PaginatedResult when pagination is provided, otherwise ApiResult<T[]>.
 */
export async function queryTable<T>(table: string, options: QueryTableOptions = {}): Promise<ApiResult<T[]>> {
  const supabase = createClient();
  const { select = '*', eq: eqFilters = [], isNull = [], ilike: ilikeFilters = [], orderBy } = options;

  let query = supabase.from(table).select(select, { count: 'exact' });

  for (const [col, val] of eqFilters) {
    query = query.eq(col, val);
  }
  for (const col of isNull) {
    query = query.is(col, null);
  }
  for (const [col, pattern] of ilikeFilters) {
    query = query.ilike(col, pattern);
  }
  if (orderBy) {
    query = query.order(orderBy.column, {
      ascending: orderBy.ascending ?? true,
    });
  }
  if (options.pagination) {
    const { page, pageSize } = options.pagination;
    query = query.range((page - 1) * pageSize, page * pageSize - 1);
  }

  const { data, error } = await query;
  if (error) return fail<T[]>(error.message);
  return ok<T[]>((data as T[]) ?? []);
}

/**
 * Fetch a paginated list of rows. Returns PaginatedResult<T>.
 */
export async function queryTablePaginated<T>(
  table: string,
  options: QueryTableOptions & { pagination: { page: number; pageSize: number } }
): Promise<PaginatedResult<T>> {
  const supabase = createClient();
  const { select = '*', eq: eqFilters = [], isNull = [], ilike: ilikeFilters = [], orderBy, pagination } = options;

  const { page, pageSize } = pagination;

  let query = supabase.from(table).select(select, { count: 'exact' });

  for (const [col, val] of eqFilters) {
    query = query.eq(col, val);
  }
  for (const col of isNull) {
    query = query.is(col, null);
  }
  for (const [col, pattern] of ilikeFilters) {
    query = query.ilike(col, pattern);
  }
  if (orderBy) {
    query = query.order(orderBy.column, {
      ascending: orderBy.ascending ?? true,
    });
  }
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;
  const total = count ?? 0;

  return {
    data: (data as T[]) ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Fetch a single row by id (or other unique column).
 */
export async function querySingle<T>(
  table: string,
  id: string,
  options: { select?: string; column?: string } = {}
): Promise<ApiResult<T>> {
  const supabase = createClient();
  const { select = '*', column = 'id' } = options;

  const { data, error } = await supabase.from(table).select(select).eq(column, id).single();

  if (error) return fail<T>(error.message);
  return ok<T>(data as T);
}

// ─────────────────────────────────────────────────────────────────────────────
// RPC helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call a Supabase RPC function and return a standard ApiResult.
 */
export async function callRpc<T>(fnName: string, params?: Record<string, unknown>): Promise<ApiResult<T>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(fnName, params);
  if (error) return fail<T>(error.message);
  return ok<T>(data as T);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation helpers (write operations)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insert a row into a table.
 */
export async function insertRow<T>(table: string, values: Record<string, unknown>): Promise<ApiResult<T>> {
  const supabase = createClient();
  const { data, error } = await supabase.from(table).insert(values).select().single();

  if (error) return fail<T>(error.message);
  return ok<T>(data as T);
}

/**
 * Update row(s) in a table.
 */
export async function updateRow<T>(
  table: string,
  values: Record<string, unknown>,
  match: Record<string, unknown>
): Promise<ApiResult<T>> {
  const supabase = createClient();
  let query = supabase.from(table).update(values);

  for (const [col, val] of Object.entries(match)) {
    query = query.eq(col, val);
  }

  const { data, error } = await query.select().single();
  if (error) return fail<T>(error.message);
  return ok<T>(data as T);
}

/**
 * Soft-delete a row by setting deleted_at = NOW().
 */
export async function softDeleteRow(table: string, id: string): Promise<ApiResult<null>> {
  const supabase = createClient();
  const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);

  if (error) return fail<null>(error.message);
  return ok<null>(null);
}
