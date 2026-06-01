"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { softDeleteById } from "@/lib/audit";
import { Plus, Pencil, Trash2, Users, UserCheck, UserMinus, Download, RefreshCw } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import StatCard from "@/components/ui/stat-card";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import SearchInput from "@/components/ui/search-input";
import Pagination from "@/components/ui/pagination";
import MemberForm from "@/components/members/member-form";
import { formatDate, formatDateShort } from "@/lib/utils/format";
import type { Member } from "@/types";

const PAGE_SIZE = 10;

export default function MembersPage() {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Member | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Member | undefined>();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statuses, setStatuses] = useState<{id:string;name:string}[]>([]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("members")
      .select("*, status:member_status_types(id,name,color)", { count: "exact" })
      .is("deleted_at", null);
    if (search) query = query.ilike("full_name", `%${search}%`);
    if (filterStatus) query = query.eq("status_id", filterStatus);
    if (filterActive !== "") query = query.eq("is_active", filterActive === "true");
    query = query.order("full_name").range((page-1)*PAGE_SIZE, page*PAGE_SIZE-1);
    const { data, count: total } = await query;
    setMembers((data as Member[]) ?? []);
    setCount(total ?? 0);
    setLoading(false);
  }, [search, page, filterStatus, filterActive]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => {
    supabase.from("member_status_types").select("id,name").is("deleted_at", null).then(({ data }) => setStatuses(data ?? []));
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await softDeleteById(supabase, "members", deleteTarget.id);
    setDeleteTarget(undefined); setDeleteLoading(false); fetchMembers();
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader title="Manajemen Anggota" description={`Total ${count} anggota terdaftar`}
        actions={
          <button onClick={() => { setEditing(undefined); setShowModal(true); }} className="btn-primary">
            <Plus size={16} />Tambah Anggota
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Anggota" value={count} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Anggota Aktif" value={members.filter(m => m.is_active).length} icon={UserCheck} iconColor="text-brand-600" iconBg="bg-brand-50" />
        <StatCard title="Tidak Aktif" value={members.filter(m => !m.is_active).length} icon={UserMinus} iconColor="text-slate-600" iconBg="bg-slate-100" />
      </div>

      <div className="bento-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Cari nama anggota..." className="flex-1" />
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input-base w-full sm:w-44">
            <option value="">Semua Status</option>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterActive} onChange={e => { setFilterActive(e.target.value as "" | "true" | "false"); setPage(1); }} className="input-base w-full sm:w-36">
            <option value="">Semua</option>
            <option value="true">Aktif</option>
            <option value="false">Non-aktif</option>
          </select>
          <button onClick={fetchMembers} className="btn-secondary shrink-0"><RefreshCw size={14} /></button>
        </div>

        <Table
          data={members}
          loading={loading}
          emptyMessage="Tidak ada anggota ditemukan"
          columns={[
            { key: "no", header: "No. Anggota", cell: m => <span className="font-mono text-xs font-semibold text-slate-500">{m.member_number ?? "-"}</span> },
            { key: "name", header: "Nama", cell: m => (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand-700">{m.full_name.split(" ").map((n: string)=>n[0]).join("").slice(0,2).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{m.full_name}</p>
                  <p className="text-xs text-slate-400">{m.phone ?? m.email ?? "-"}</p>
                </div>
              </div>
            )},
            { key: "gender", header: "L/P", cell: m => m.gender === "L" ? "Laki-laki" : m.gender === "P" ? "Perempuan" : "-" },
            { key: "status", header: "Status", cell: m => m.status
              ? <Badge variant="success" dot>{m.status.name}</Badge>
              : <Badge variant="default">-</Badge>
            },
            { key: "role", header: "Jabatan", cell: m => <span className="capitalize">{m.role.replace("_"," ")}</span> },
            { key: "join", header: "Bergabung", cell: m => formatDateShort(m.join_date) },
            { key: "points", header: "Poin", cell: m => <span className="font-semibold text-brand-700">{m.activity_points}</span> },
            { key: "active", header: "Status", cell: m => (
              <Badge variant={m.is_active ? "success" : "default"} dot>{m.is_active ? "Aktif" : "Non-aktif"}</Badge>
            )},
            { key: "actions", header: "", cell: m => (
              <div className="flex gap-1">
                <button onClick={() => { setEditing(m); setShowModal(true); }} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            )},
          ]}
        />

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {count > 0 ? `Menampilkan ${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE, count)} dari ${count}` : "Tidak ada data"}
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editing ? "Edit Anggota" : "Tambah Anggota Baru"}
        description={editing ? `Edit data ${editing.full_name}` : "Isi data anggota baru"} size="lg">
        <MemberForm member={editing} onSuccess={() => { setShowModal(false); fetchMembers(); }} onCancel={() => setShowModal(false)} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Anggota"
        message={`Apakah Anda yakin ingin menghapus anggota "${deleteTarget?.full_name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(undefined)} loading={deleteLoading} />
    </div>
  );
}
