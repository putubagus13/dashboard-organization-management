'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query/keys';
import type { CashAccount, CashTransaction, Loan } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Fetchers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCashAccounts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cash_accounts')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as CashAccount[];
}

async function fetchTransactions(filters: { type?: string; account_id?: string; page?: number }) {
  const supabase = createClient();
  const { type, account_id, page = 1 } = filters;
  const PAGE_SIZE = 15;

  let q = supabase
    .from('cash_transactions')
    .select('*, account:cash_accounts(name), category:transaction_categories(name,color)', { count: 'exact' })
    .is('deleted_at', null);

  if (type) q = q.eq('type', type);
  if (account_id) q = q.eq('account_id', account_id);

  const { data, count, error } = await q
    .order('transaction_date', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (error) throw new Error(error.message);

  return {
    data: (data ?? []) as CashTransaction[],
    count: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  };
}

async function fetchActiveLoans() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('loans')
    .select('*, member:members(full_name,member_number)')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('due_date');

  if (error) throw new Error(error.message);
  return (data ?? []) as Loan[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Public hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useCashAccounts() {
  const result = useQuery({
    queryKey: queryKeys.finance.accounts,
    queryFn: fetchCashAccounts,
  });

  const totalBalance = (result.data ?? []).reduce((s, a) => s + a.balance, 0);

  return {
    data: result.data ?? [],
    loading: result.isLoading,
    totalBalance,
  };
}

export function useTransactions(filters: { type?: string; account_id?: string; page?: number } = {}) {
  const result = useQuery({
    queryKey: queryKeys.finance.transactions.list(filters as Record<string, unknown>),
    queryFn: () => fetchTransactions(filters),
  });

  return {
    data: result.data?.data ?? [],
    count: result.data?.count ?? 0,
    loading: result.isLoading,
    refetch: result.refetch,
    totalPages: result.data?.totalPages ?? 0,
  };
}

export function useActiveLoans() {
  const result = useQuery({
    queryKey: queryKeys.finance.loans.active,
    queryFn: fetchActiveLoans,
  });

  return {
    data: result.data ?? [],
    loading: result.isLoading,
  };
}
