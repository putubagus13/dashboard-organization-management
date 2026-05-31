"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import SearchInput from "@/components/ui/search-input";
import Pagination from "@/components/ui/pagination";
import { formatCurrency } from "@/lib/utils/format";
import type { Donor } from "@/types";
import { Loader2 } from "lucide-react";

const PAGE_SIZE = 15;

interface DonorForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  total_donated: number;
}

export default function DonorsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Donor[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Donor | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Donor | undefined>();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<DonorForm>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    total_donated: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("donors").select("*", { count: "exact" });
    if (search) q = q.ilike("name", `%${search}%`);
    q = q
      .order("total_donated", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data, count: total } = await q;
    setItems((data as Donor[]) ?? []);
    setCount(total ?? 0);
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openEdit(d: Donor) {
    setEditing(d);
    setForm({
      name: d.name,
      phone: d.phone ?? "",
      email: d.email ?? "",
      address: d.address ?? "",
      notes: d.notes ?? "",
      total_donated: d.total_donated,
    });
    setShowModal(true);
  }

  function openAdd() {
    setEditing(undefined);
    setForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      total_donated: 0,
    });
    setShowModal(true);
  }

  function updateField(field: keyof DonorForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
      total_donated: form.total_donated,
    };
    const { error: err } = editing
      ? await supabase.from("donors").update(payload).eq("id", editing.id)
      : await supabase.from("donors").insert(payload);
    if (err) {
      setFormError(err.message);
      setFormLoading(false);
      return;
    }
    setShowModal(false);
    setFormLoading(false);
    fetchData();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await supabase.from("donors").delete().eq("id", deleteTarget.id);
    setDeleteTarget(undefined);
    setDeleteLoading(false);
    fetchData();
  }

  const fields: {
    key: keyof DonorForm;
    label: string;
    type?: string;
    required?: boolean;
    multiline?: boolean;
  }[] = [
    { key: "name", label: "Nama *", required: true },
    { key: "phone", label: "Telepon", type: "tel" },
    { key: "email", label: "Email", type: "email" },
    { key: "total_donated", label: "Total Donasi (Rp)", type: "currency" },
    { key: "address", label: "Alamat", multiline: true },
    { key: "notes", label: "Catatan", multiline: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Donatur"
        description="Data donatur dan riwayat donasi"
        actions={
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Tambah Donatur
          </button>
        }
      />

      <div className="bento-card p-5 space-y-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Cari donatur..."
        />
        <Table
          data={items}
          loading={loading}
          emptyMessage="Belum ada donatur"
          columns={[
            {
              key: "no",
              header: "No",
              cell: (_, i) => (
                <span className="text-slate-400 text-xs">
                  {(page - 1) * PAGE_SIZE + i + 1}
                </span>
              ),
            },
            {
              key: "name",
              header: "Nama",
              cell: (d) => (
                <div>
                  <p className="font-medium text-slate-900">{d.name}</p>
                  {d.is_member && (
                    <span className="text-xs text-brand-600 font-medium">
                      Anggota
                    </span>
                  )}
                </div>
              ),
            },
            { key: "phone", header: "Telepon", cell: (d) => d.phone ?? "-" },
            { key: "email", header: "Email", cell: (d) => d.email ?? "-" },
            {
              key: "total",
              header: "Total Donasi",
              cell: (d) => (
                <span className="font-semibold text-brand-700">
                  {formatCurrency(d.total_donated)}
                </span>
              ),
            },
            {
              key: "notes",
              header: "Catatan",
              cell: (d) => (
                <span className="text-slate-400 text-xs">{d.notes ?? "-"}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              cell: (d) => (
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(d)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(d)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
        />
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{count} donatur</p>
          <Pagination
            page={page}
            totalPages={Math.ceil(count / PAGE_SIZE)}
            onPageChange={setPage}
          />
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Donatur" : "Tambah Donatur"}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {formError}
            </div>
          )}
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {f.label}
              </label>
              {f.multiline ? (
                <textarea
                  rows={2}
                  value={form[f.key]}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  className="input-base resize-none"
                  required={f.required}
                />
              ) : (
                <input
                  type={f.type ?? "text"}
                  value={form[f.key]}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  className="input-base"
                  required={f.required}
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="btn-primary"
            >
              {formLoading && <Loader2 size={14} className="animate-spin" />}
              {editing ? "Simpan" : "Tambah"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Donatur"
        message={`Hapus donatur "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(undefined)}
        loading={deleteLoading}
      />
    </div>
  );
}
