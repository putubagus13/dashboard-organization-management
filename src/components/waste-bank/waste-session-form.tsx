"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { withCreateAudit, withUpdateAudit } from "@/lib/audit";
import { Loader2 } from "lucide-react";
import type { WasteCollectionSession } from "@/types";

interface Props { session?: WasteCollectionSession; onSuccess: () => void; onCancel: () => void; }

export default function WasteSessionForm({ session, onSuccess, onCancel }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: session?.title ?? "",
    session_date: session?.session_date ?? new Date().toISOString().split("T")[0],
    location: session?.location ?? "",
    officer_name: session?.officer_name ?? "",
    notes: session?.notes ?? "",
  });

  function up(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const payload = {
      ...form,
      location: form.location || null,
      officer_name: form.officer_name || null,
      notes: form.notes || null,
      status: "ongoing" as const,
    };
    const { error: err } = session
      ? await supabase.from("waste_collection_sessions").update(await withUpdateAudit(supabase, payload)).eq("id", session.id)
      : await supabase.from("waste_collection_sessions").insert(await withCreateAudit(supabase, payload));
    if (err) { setError(err.message); setLoading(false); return; }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Judul Sesi *</label>
        <input type="text" value={form.title} onChange={e => up("title", e.target.value)} className="input-base" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal *</label>
          <input type="date" value={form.session_date} onChange={e => up("session_date", e.target.value)} className="input-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Petugas</label>
          <input type="text" value={form.officer_name} onChange={e => up("officer_name", e.target.value)} className="input-base" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Lokasi</label>
        <input type="text" value={form.location} onChange={e => up("location", e.target.value)} className="input-base" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
        <textarea rows={2} value={form.notes} onChange={e => up("notes", e.target.value)} className="input-base resize-none" />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Batal</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {session ? "Simpan" : "Buat Sesi"}
        </button>
      </div>
    </form>
  );
}
