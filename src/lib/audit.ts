import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAuditUserId(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function withCreateAudit<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  payload: T
) {
  const userId = await getAuditUserId(supabase);

  return {
    ...payload,
    create_by: userId,
    update_by: userId,
    deleted_at: null,
    deleted_by: null,
  };
}

export async function withUpdateAudit<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  payload: T
) {
  return {
    ...payload,
    update_by: await getAuditUserId(supabase),
  };
}

export async function softDeleteById(
  supabase: SupabaseClient,
  table: string,
  id: string
) {
  return supabase
    .from(table)
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: await getAuditUserId(supabase),
    })
    .eq("id", id)
    .is("deleted_at", null);
}
