"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { withCreateAudit, withUpdateAudit } from "@/lib/audit";
import { Loader2 } from "lucide-react";
import type { Loan, LoanFormData, CashAccount } from "@/types";

interface Props { loan?: Loan; onSuccess: ()=>void; onCancel: ()=>void; }

export default function LoanForm({ loan, onSuccess, onCancel }: Props) {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<LoanFormData>({
    borrower_name: loan?.borrower_name ?? "",
    member_id: loan?.member_id ?? undefined,
    account_id: loan?.account_id ?? "",
    principal_amount: loan?.principal_amount ?? 0,
    interest_rate: loan?.interest_rate ?? 0,
    loan_date: loan?.loan_date ?? new Date().toISOString().split("T")[0],
    due_date: loan?.due_date ?? "",
    purpose: loan?.purpose ?? "",
    collateral: loan?.collateral ?? "",
    notes: loan?.notes ?? "",
  });

  useEffect(() => {
    supabase.from("cash_accounts").select("*").eq("is_active",true).is("deleted_at", null).order("name").then(({data}) => {
      setAccounts(data ?? []);
      if (!loan && data?.[0]) setForm(f => ({...f, account_id: data[0].id}));
    });
  }, []);

  function up<K extends keyof LoanFormData>(k: K, v: LoanFormData[K]) { setForm(f => ({...f,[k]:v})); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const payload = {...form, due_date: form.due_date || null, purpose: form.purpose || null, collateral: form.collateral || null, notes: form.notes || null, member_id: form.member_id || null};
    const {error:err} = loan
      ? await supabase.from("loans").update(await withUpdateAudit(supabase, payload)).eq("id",loan.id)
      : await supabase.from("loans").insert(await withCreateAudit(supabase, payload));
    if (err) { setError(err.message); setLoading(false); return; }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Peminjam *</label>
          <input type="text" value={form.borrower_name} onChange={e => up("borrower_name",e.target.value)} className="input-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Rekening *</label>
          <select value={form.account_id} onChange={e => up("account_id",e.target.value)} className="input-base" required>
            <option value="">Pilih rekening...</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Jumlah Pinjaman (Rp) *</label>
          <input type="number" min="1" value={form.principal_amount} onChange={e => up("principal_amount",Number(e.target.value))} className="input-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Bunga (%)</label>
          <input type="number" min="0" step="0.1" value={form.interest_rate ?? 0} onChange={e => up("interest_rate",Number(e.target.value))} className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Pinjam *</label>
          <input type="date" value={form.loan_date} onChange={e => up("loan_date",e.target.value)} className="input-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Jatuh Tempo</label>
          <input type="date" value={form.due_date ?? ""} onChange={e => up("due_date",e.target.value || undefined)} className="input-base" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tujuan Pinjaman</label>
          <input type="text" value={form.purpose ?? ""} onChange={e => up("purpose",e.target.value || undefined)} className="input-base" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Jaminan</label>
          <input type="text" value={form.collateral ?? ""} onChange={e => up("collateral",e.target.value || undefined)} className="input-base" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
          <textarea rows={2} value={form.notes ?? ""} onChange={e => up("notes",e.target.value || undefined)} className="input-base resize-none" />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Batal</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 size={14} className="animate-spin"/>}
          {loan ? "Simpan" : "Catat Pinjaman"}
        </button>
      </div>
    </form>
  );
}
