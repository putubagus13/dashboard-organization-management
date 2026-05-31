"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import type { CashTransaction, TransactionFormData, CashAccount, TransactionCategory } from "@/types";

interface Props { transaction?: CashTransaction; onSuccess: ()=>void; onCancel: ()=>void; }

export default function TransactionForm({ transaction, onSuccess, onCancel }: Props) {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<TransactionFormData>({
    account_id: transaction?.account_id ?? "",
    type: transaction?.type ?? "income",
    category_id: transaction?.category_id ?? "",
    amount: transaction?.amount ?? 0,
    description: transaction?.description ?? "",
    reference_no: transaction?.reference_no ?? "",
    transaction_date: transaction?.transaction_date ?? new Date().toISOString().split("T")[0],
    notes: transaction?.notes ?? "",
  });

  useEffect(() => {
    Promise.all([
      supabase.from("cash_accounts").select("*").eq("is_active",true).order("name"),
      supabase.from("transaction_categories").select("*").eq("is_active",true).order("name"),
    ]).then(([{data:acc},{data:cat}]) => {
      setAccounts(acc ?? []); setCategories(cat ?? []);
      if (!transaction && acc?.[0]) setForm(f => ({...f, account_id: acc[0].id}));
    });
  }, []);

  const filteredCats = categories.filter(c => c.type === form.type || c.type === undefined);

  function update<K extends keyof TransactionFormData>(key: K, val: TransactionFormData[K]) {
    setForm(f => ({...f, [key]: val}));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const payload = { ...form, category_id: form.category_id || null, reference_no: form.reference_no || null, notes: form.notes || null };
    const { error: err } = transaction
      ? await supabase.from("cash_transactions").update(payload).eq("id", transaction.id)
      : await supabase.from("cash_transactions").insert(payload);
    if (err) { setError(err.message); setLoading(false); return; }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipe *</label>
          <select value={form.type} onChange={e => update("type", e.target.value as "income"|"expense")} className="input-base" required>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Rekening *</label>
          <select value={form.account_id} onChange={e => update("account_id", e.target.value)} className="input-base" required>
            <option value="">Pilih rekening...</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategori</label>
          <select value={form.category_id ?? ""} onChange={e => update("category_id", e.target.value || undefined)} className="input-base">
            <option value="">Pilih kategori...</option>
            {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal *</label>
          <input type="date" value={form.transaction_date} onChange={e => update("transaction_date", e.target.value)} className="input-base" required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Jumlah (Rp) *</label>
          <input type="number" min="1" value={form.amount} onChange={e => update("amount", Number(e.target.value))} className="input-base" required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Keterangan *</label>
          <input type="text" value={form.description} onChange={e => update("description", e.target.value)} className="input-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">No. Referensi</label>
          <input type="text" value={form.reference_no ?? ""} onChange={e => update("reference_no", e.target.value || undefined)} className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
          <input type="text" value={form.notes ?? ""} onChange={e => update("notes", e.target.value || undefined)} className="input-base" />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Batal</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 size={14} className="animate-spin"/>}
          {transaction ? "Simpan" : "Tambah"}
        </button>
      </div>
    </form>
  );
}
