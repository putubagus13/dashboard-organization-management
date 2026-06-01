"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WasteType, WasteCollector } from "@/types";

export function useWasteTypes() {
  const supabase = createClient();
  const [data, setData] = useState<WasteType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("waste_types").select("*").eq("is_active", true).is("deleted_at", null).order("name")
      .then(({ data: rows }) => { setData(rows ?? []); setLoading(false); });
  }, []);

  return { data, loading };
}

export function useWasteCollectors(search = "") {
  const supabase = createClient();
  const [data, setData] = useState<WasteCollector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = supabase.from("waste_collectors")
      .select("*, member:members(full_name,member_number)")
      .is("deleted_at", null)
      .order("total_weight", { ascending: false });
    if (search) q = q.ilike("name", `%${search}%`);
    q.then(({ data: rows }) => { setData((rows as WasteCollector[]) ?? []); setLoading(false); });
  }, [search]);

  return { data, loading };
}
