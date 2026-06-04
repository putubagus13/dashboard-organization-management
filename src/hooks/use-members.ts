'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query/keys';
import type { MemberMinimal, FilterParams } from '@/types';

const DEFAULT_PAGE_SIZE = 10;

interface MembersFilter extends FilterParams {
  status_id?: string;
  is_active?: boolean;
}

async function fetchMembers(filters: MembersFilter) {
  const supabase = createClient();
  const { search = '', page = 1, pageSize = DEFAULT_PAGE_SIZE, status_id, is_active } = filters;

  let q = supabase
    .from('members')
    .select('id,full_name,member_number,status_id,status:member_status_types(id,name,color)', { count: 'exact' })
    .is('deleted_at', null);

  if (search) q = q.ilike('full_name', `%${search}%`);
  if (status_id) q = q.eq('status_id', status_id);
  if (is_active !== undefined) q = q.eq('is_active', is_active);

  const { data, count, error } = await q.order('full_name').range((page - 1) * pageSize, page * pageSize - 1);

  if (error) throw new Error(error.message);

  return {
    data: (data ?? []) as unknown as MemberMinimal[],
    count: count ?? 0,
  };
}

async function fetchAllActiveMembers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('members')
    .select('id,full_name,member_number,status_id')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('full_name');

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MemberMinimal[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Public hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useMembers(filters: MembersFilter) {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;

  const result = useQuery({
    queryKey: queryKeys.members.list(filters as Record<string, unknown>),
    queryFn: () => fetchMembers(filters),
  });

  const count = result.data?.count ?? 0;

  return {
    data: result.data?.data ?? [],
    count,
    loading: result.isLoading,
    error: result.error?.message ?? null,
    refetch: result.refetch,
    totalPages: Math.ceil(count / pageSize),
  };
}

export function useAllActiveMembers() {
  const result = useQuery({
    queryKey: queryKeys.members.allActive,
    queryFn: fetchAllActiveMembers,
  });

  return {
    data: result.data ?? [],
    loading: result.isLoading,
  };
}
