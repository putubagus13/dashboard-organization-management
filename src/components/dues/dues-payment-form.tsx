"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { MONTHS } from "@/constants";
import { formatCurrency } from "@/lib/utils/format";
import type { DuesPayment, DuesPaymentFormData, DuesSetting, MemberStatusType } from "@/types";

interface MemberOption {
  id: string;
  full_name: string;
  member_number: string | null;
  status_id: string | null;
}

interface DuesSettingWithStatus extends DuesSetting {
  status: MemberStatusType | null;
}

interface Props {
  payment?: DuesPayment;
  defaultYear: number;
  defaultMonth: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DuesPaymentForm({ payment, defaultYear, defaultMonth, onSuccess, onCancel }: Props) {
  const supabase = createClient();
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [duesSettings, setDuesSettings] = useState<DuesSettingWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const now = new Date();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const [form, setForm] = useState<DuesPaymentFormData>({
    member_id: payment?.member_id ?? "",
    period_year: payment?.period_year ?? defaultYear,
    period_month: payment?.period_month ?? defaultMonth,
    amount: payment?.amount ?? 0,
    payment_date: payment?.payment_date ?? new Date().toISOString().split("T")[0],
    notes: payment?.notes ?? "",
  });
  const [status, setStatus] = useState<"paid" | "pending" | "waived">(
    payment?.status ?? "paid"
  );

  useEffect(() => {
    Promise.all([
      supabase
        .from("members")
        .select("id,full_name,member_number,status_id")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("dues_settings")
        .select("*, status:member_status_types(id,name,color)")
        .eq("is_active", true),
    ]).then(([{ data: m }, { data: d }]) => {
      setMembers((m ?? []) as MemberOption[]);
      setDuesSettings((d ?? []) as unknown as DuesSettingWithStatus[]);
    });
  }, []);

  function handleMemberChange(memberId: string) {
    setForm((f) => ({ ...f, member_id: memberId }));
    const member = members.find((m) => m.id === memberId);
    if (member?.status_id) {
      const setting = duesSettings.find((d) => d.status_id === member.status_id);
      if (setting) setForm((f) => ({ ...f, member_id: memberId, amount: setting.amount }));
    }
  }

  function up<K extends keyof DuesPaymentFormData>(k: K, v: DuesPaymentFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const payload = { ...form, status, notes: form.notes || null };
    const { error: err } = payment
      ? await supabase.from("dues_payments").update(payload).eq("id", payment.id)
      : await supabase.from("dues_payments").upsert(payload, {
          onConflict: "member_id,period_year,period_month",
        });
    if (err) { setError(err.message); setLoading(false); return; }
    onSuccess();
  }

  const selectedMember = members.find((m) => m.id === form.member_id);
  const applicableSetting = duesSettings.find(
    (d) => d.status_id === selectedMember?.status_id
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Anggota *</label>
        <select
          value={form.member_id}
          onChange={(e) => handleMemberChange(e.target.value)}
          className="input-base"
          required>
          <option value="">Pilih anggota...</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name} ({m.member_number})
            </option>
          ))}
        </select>
        {applicableSetting && (
          <p className="text-xs text-brand-600 mt-1">
            Iuran standar: <strong>{formatCurrency(applicableSetting.amount)}</strong>
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tahun *</label>
          <select value={form.period_year} onChange={(e) => up("period_year", Number(e.target.value))} className="input-base">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Bulan *</label>
          <select value={form.period_month} onChange={(e) => up("period_month", Number(e.target.value))} className="input-base">
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Jumlah (Rp) *</label>
          <input type="number" min="0" value={form.amount}
            onChange={(e) => up("amount", Number(e.target.value))}
            className="input-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Status *</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as "paid" | "pending" | "waived")} className="input-base">
            <option value="paid">Lunas</option>
            <option value="pending">Belum Bayar</option>
            <option value="waived">Dibebaskan</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Bayar</label>
        <input type="date" value={form.payment_date} onChange={(e) => up("payment_date", e.target.value)} className="input-base" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
        <input type="text" value={form.notes ?? ""} onChange={(e) => up("notes", e.target.value || undefined)} className="input-base" />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Batal</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {payment ? "Simpan" : "Catat Iuran"}
        </button>
      </div>
    </form>
  );
}
