'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query/keys';
import type { WasteType, WasteCollector } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Fetchers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWasteTypes() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('waste_types')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as WasteType[];
}

async function fetchWasteCollectors(search: string) {
  const supabase = createClient();
  let q = supabase
    .from('waste_collectors')
    .select('*, member:members(full_name,member_number)')
    .is('deleted_at', null)
    .order('total_weight', { ascending: false });

  if (search) q = q.ilike('name', `%${search}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as WasteCollector[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Public hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useWasteTypes() {
  const result = useQuery({
    queryKey: queryKeys.wasteBank.wasteTypes,
    queryFn: fetchWasteTypes,
  });

  return {
    data: result.data ?? [],
    loading: result.isLoading,
  };
}

export function useWasteCollectors(search = '') {
  const result = useQuery({
    queryKey: queryKeys.wasteBank.collectors(search),
    queryFn: () => fetchWasteCollectors(search),
  });

  return {
    data: result.data ?? [],
    loading: result.isLoading,
  };
}
