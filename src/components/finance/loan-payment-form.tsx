"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { Loan } from "@/types";

interface Props { loan?: Loan; onSuccess: ()=>void; onCancel: ()=>void; }

export default function LoanPaymentForm({ loan, onSuccess, onCancel }: Props) {
  const supabase = createClient();
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loan) return;
    if (amount <= 0) { setError("Jumlah harus lebih dari 0"); return; }
    setLoading(true); setError("");
    const {error:err} = await supabase.from("loan_payments").insert({
      loan_id: loan.id, amount, payment_date: date, notes: notes || null,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    onSuccess();
  }

  if (!loan) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <div className="rounded-xl bg-slate-50 p-4 space-y-1">
        <p className="text-sm font-semibold text-slate-900">{loan.borrower_name}</p>
        <p className="text-xs text-slate-500">No: {loan.loan_number}</p>
        <p className="text-sm">Sisa: <span className="font-bold text-red-600">{formatCurrency(loan.remaining_amount ?? 0)}</span></p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Jumlah Pembayaran (Rp) *</label>
        <input type="number" min="1" max={loan.remaining_amount ?? undefined} value={amount} onChange={e => setAmount(Number(e.target.value))} className="input-base" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Bayar *</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-base" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input-base" />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Batal</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 size={14} className="animate-spin"/>}Catat Pembayaran
        </button>
      </div>
    </form>
  );
}
