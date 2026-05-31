"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2, Settings2, Star, ArrowLeft } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/page-header";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { DuesSetting, MemberStatusType, PointsConfig } from "@/types";
import { Loader2 } from "lucide-react";

export default function DuesSettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<DuesSetting[]>([]);
  const [statuses, setStatuses] = useState<MemberStatusType[]>([]);
  const [points, setPoints] = useState<PointsConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPoints, setEditPoints] = useState(false);
  const [editing, setEditing] = useState<DuesSetting | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<DuesSetting | undefined>();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ status_id: "", amount: 0, effective_from: new Date().toISOString().split("T")[0], notes: "" });
  const [pointsForm, setPointsForm] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: st }, { data: p }] = await Promise.all([
      supabase.from("dues_settings").select("*, status:member_status_types(name,color)").order("created_at", { ascending: false }),
      supabase.from("member_status_types").select("*").order("name"),
      supabase.from("points_config").select("*").order("label"),
    ]);
    setSettings((s as DuesSetting[]) ?? []);
    setStatuses(st ?? []);
    setPoints(p ?? []);
    const pf: Record<string, number> = {};
    (p ?? []).forEach(pc => { pf[pc.id] = pc.points; });
    setPointsForm(pf);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openEdit(s: DuesSetting) {
    setEditing(s);
    setForm({ status_id: s.status_id, amount: s.amount, effective_from: s.effective_from, notes: s.notes ?? "" });
    setShowModal(true);
  }

  function openAdd() {
    setEditing(undefined);
    setForm({ status_id: statuses[0]?.id ?? "", amount: 0, effective_from: new Date().toISOString().split("T")[0], notes: "" });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormLoading(true); setFormError("");
    const payload = { ...form, notes: form.notes || null, is_active: true };
    const { error } = editing
      ? await supabase.from("dues_settings").update(payload).eq("id", editing.id)
      : await supabase.from("dues_settings").insert(payload);
    if (error) { setFormError(error.message); setFormLoading(false); return; }
    setShowModal(false); fetchData(); setFormLoading(false);
  }

  async function handleSavePoints() {
    setFormLoading(true);
    await Promise.all(
      points.map(p => supabase.from("points_config").update({ points: pointsForm[p.id] ?? p.points }).eq("id", p.id))
    );
    setEditPoints(false); fetchData(); setFormLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await supabase.from("dues_settings").delete().eq("id", deleteTarget.id);
    setDeleteTarget(undefined); setDeleteLoading(false); fetchData();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Iuran & Poin"
        description="Atur nominal iuran per status anggota dan konfigurasi poin keaktifan"
        actions={
          <div className="flex gap-2">
            <Link href="/dues" className="btn-secondary"><ArrowLeft size={14} />Kembali</Link>
            <button onClick={openAdd} className="btn-primary"><Plus size={16} />Tambah Iuran</button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dues Settings */}
        <div className="bento-card p-5">
          <h2 className="section-title mb-4">Nominal Iuran per Status</h2>
          <Table
            data={settings}
            loading={loading}
            emptyMessage="Belum ada pengaturan iuran"
            columns={[
              { key: "status", header: "Status Anggota", cell: s => {
                const st = s.status as MemberStatusType | null;
                return st ? <Badge variant="success">{st.name}</Badge> : <span>-</span>;
              }},
              { key: "amount", header: "Nominal", cell: s => <span className="font-bold text-brand-700">{formatCurrency(s.amount)}</span> },
              { key: "from", header: "Berlaku Sejak", cell: s => formatDate(s.effective_from) },
              { key: "active", header: "Aktif", cell: s => <Badge variant={s.is_active ? "success" : "default"} dot size="sm">{s.is_active ? "Ya" : "Tidak"}</Badge> },
              { key: "actions", header: "", cell: s => (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              )},
            ]}
          />
        </div>

        {/* Points Config */}
        <div className="bento-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Konfigurasi Poin Keaktifan</h2>
            {!editPoints
              ? <button onClick={() => setEditPoints(true)} className="btn-secondary text-xs py-1.5"><Settings2 size={13} />Edit Poin</button>
              : <div className="flex gap-2">
                  <button onClick={() => setEditPoints(false)} className="btn-secondary text-xs py-1.5">Batal</button>
                  <button onClick={handleSavePoints} disabled={formLoading} className="btn-primary text-xs py-1.5">
                    {formLoading && <Loader2 size={12} className="animate-spin" />}Simpan
                  </button>
                </div>
            }
          </div>
          <div className="space-y-3">
            {points.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                  <Star size={15} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{p.label}</p>
                  {p.description && <p className="text-xs text-slate-400">{p.description}</p>}
                </div>
                {editPoints
                  ? <input type="number" min="0" value={pointsForm[p.id] ?? p.points}
                      onChange={e => setPointsForm(prev => ({ ...prev, [p.id]: Number(e.target.value) }))}
                      className="w-16 text-sm text-center font-bold rounded-lg border border-brand-300 px-2 py-1 focus:outline-none focus:border-brand-500" />
                  : <span className="text-lg font-display font-bold text-brand-700">{p.points}</span>
                }
                <span className="text-xs text-slate-400 shrink-0">poin</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editing ? "Edit Pengaturan Iuran" : "Tambah Pengaturan Iuran"} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{formError}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status Anggota *</label>
            <select value={form.status_id} onChange={e => setForm(f => ({ ...f, status_id: e.target.value }))} className="input-base" required>
              <option value="">Pilih status...</option>
              {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nominal Iuran (Rp) *</label>
            <input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className="input-base" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Berlaku Sejak *</label>
            <input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} className="input-base" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-base" />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
            <button type="submit" disabled={formLoading} className="btn-primary">
              {formLoading && <Loader2 size={14} className="animate-spin" />}
              {editing ? "Simpan" : "Tambah"}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} title="Hapus Pengaturan Iuran"
        message="Yakin hapus pengaturan iuran ini?"
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(undefined)} loading={deleteLoading} />
    </div>
  );
}
