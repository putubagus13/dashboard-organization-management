"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CashAccount, CashTransaction, Loan } from "@/types";

export function useCashAccounts() {
  const supabase = createClient();
  const [data, setData] = useState<CashAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("cash_accounts").select("*").eq("is_active", true).order("name")
      .then(({ data: rows }) => { setData(rows ?? []); setLoading(false); });
  }, []);

  const totalBalance = data.reduce((s, a) => s + a.balance, 0);
  return { data, loading, totalBalance };
}

export function useTransactions(filters: { type?: string; account_id?: string; page?: number } = {}) {
  const supabase = createClient();
  const [data, setData] = useState<CashTransaction[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { type, account_id, page = 1 } = filters;
  const PAGE_SIZE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("cash_transactions")
      .select("*, account:cash_accounts(name), category:transaction_categories(name,color)", { count: "exact" });
    if (type) q = q.eq("type", type);
    if (account_id) q = q.eq("account_id", account_id);
    const { data: rows, count: total } = await q
      .order("transaction_date", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    setData((rows as CashTransaction[]) ?? []); setCount(total ?? 0); setLoading(false);
  }, [type, account_id, page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, count, loading, refetch: fetchData, totalPages: Math.ceil(count / PAGE_SIZE) };
}

export function useActiveLoans() {
  const supabase = createClient();
  const [data, setData] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("loans")
      .select("*, member:members(full_name,member_number)")
      .eq("status", "active")
      .order("due_date")
      .then(({ data: rows }) => { setData((rows as Loan[]) ?? []); setLoading(false); });
  }, []);

  return { data, loading };
}
