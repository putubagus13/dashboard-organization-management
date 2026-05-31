"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import type { Meeting, MeetingFormData } from "@/types";
import { MEETING_TYPE_OPTIONS } from "@/constants";

interface Props { meeting?: Meeting; onSuccess: ()=>void; onCancel: ()=>void; }

export default function MeetingForm({ meeting, onSuccess, onCancel }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<MeetingFormData>({
    title: meeting?.title ?? "",
    description: meeting?.description ?? "",
    meeting_date: meeting?.meeting_date ?? new Date().toISOString().split("T")[0],
    start_time: meeting?.start_time ?? "",
    end_time: meeting?.end_time ?? "",
    location: meeting?.location ?? "",
    type: meeting?.type ?? "regular",
    agenda: meeting?.agenda ?? "",
  });

  function up<K extends keyof MeetingFormData>(k: K, v: MeetingFormData[K]) { setForm(f=>({...f,[k]:v})); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const payload = {...form, description:form.description||null, start_time:form.start_time||null, end_time:form.end_time||null, location:form.location||null, agenda:form.agenda||null};
    const {error:err} = meeting
      ? await supabase.from("meetings").update(payload).eq("id",meeting.id)
      : await supabase.from("meetings").insert(payload);
    if (err) { setError(err.message); setLoading(false); return; }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Judul Rapat *</label>
          <input type="text" value={form.title} onChange={e=>up("title",e.target.value)} className="input-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipe Rapat</label>
          <select value={form.type} onChange={e=>up("type",e.target.value as MeetingFormData["type"])} className="input-base">
            {MEETING_TYPE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal *</label>
          <input type="date" value={form.meeting_date} onChange={e=>up("meeting_date",e.target.value)} className="input-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Mulai</label>
          <input type="time" value={form.start_time??""} onChange={e=>up("start_time",e.target.value||undefined)} className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Selesai</label>
          <input type="time" value={form.end_time??""} onChange={e=>up("end_time",e.target.value||undefined)} className="input-base" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Lokasi</label>
          <input type="text" value={form.location??""} onChange={e=>up("location",e.target.value||undefined)} className="input-base" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Deskripsi</label>
          <textarea rows={2} value={form.description??""} onChange={e=>up("description",e.target.value||undefined)} className="input-base resize-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Agenda</label>
          <textarea rows={3} value={form.agenda??""} onChange={e=>up("agenda",e.target.value||undefined)} className="input-base resize-none" placeholder="Daftar agenda rapat..." />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Batal</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 size={14} className="animate-spin"/>}
          {meeting ? "Simpan" : "Buat Rapat"}
        </button>
      </div>
    </form>
  );
}
