"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MemberMinimal, FilterParams } from "@/types";

const DEFAULT_PAGE_SIZE = 10;

interface MembersFilter extends FilterParams {
  status_id?: string;
  is_active?: boolean;
}

export function useMembers(filters: MembersFilter) {
  const supabase = createClient();
  const [data, setData] = useState<MemberMinimal[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    search = "",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    status_id,
    is_active,
  } = filters;

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("members")
      .select("id,full_name,member_number,status_id,status:member_status_types(id,name,color)", {
        count: "exact",
      })
      .is("deleted_at", null);
    if (search) q = q.ilike("full_name", `%${search}%`);
    if (status_id) q = q.eq("status_id", status_id);
    if (is_active !== undefined) q = q.eq("is_active", is_active);
    const { data: rows, count: total, error: err } = await q
      .order("full_name")
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (err) {
      setError(err.message);
    } else {
      setData((rows ?? []) as unknown as MemberMinimal[]);
      setCount(total ?? 0);
    }
    setLoading(false);
  }, [search, page, pageSize, status_id, is_active]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, count, loading, error, refetch: fetchData, totalPages: Math.ceil(count / pageSize) };
}

export function useAllActiveMembers() {
  const supabase = createClient();
  const [data, setData] = useState<MemberMinimal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("members")
      .select("id,full_name,member_number,status_id")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("full_name")
      .then(({ data: rows }) => {
        setData((rows ?? []) as unknown as MemberMinimal[]);
        setLoading(false);
      });
  }, []);

  return { data, loading };
}
