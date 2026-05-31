"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, CreditCard, CheckCircle, Clock, Settings } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/page-header";
import StatCard from "@/components/ui/stat-card";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import SearchInput from "@/components/ui/search-input";
import Pagination from "@/components/ui/pagination";
import DuesPaymentForm from "@/components/dues/dues-payment-form";
import { formatCurrency, formatPeriod, formatDate } from "@/lib/utils/format";
import { getDuesStatusColor } from "@/lib/utils/helpers";
import { MONTHS } from "@/constants";
import type { DuesPayment } from "@/types";

const PAGE_SIZE = 15;

export default function DuesPage() {
  const supabase = createClient();
  const now = new Date();
  const [items, setItems] = useState<DuesPayment[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DuesPayment | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<DuesPayment | undefined>();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [summary, setSummary] = useState({ paid: 0, pending: 0, waived: 0, total: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("dues_payments")
      .select("*, member:members(full_name,member_number,status:member_status_types(name,color))", { count: "exact" })
      .eq("period_year", filterYear)
      .eq("period_month", filterMonth);
    if (filterStatus) q = q.eq("status", filterStatus);
    if (search) q = q.ilike("member.full_name", `%${search}%`);
    q = q.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data, count: total } = await q;
    setItems((data as DuesPayment[]) ?? []);
    setCount(total ?? 0);

    // Summary
    const { data: sumData } = await supabase.from("dues_payments")
      .select("status, amount")
      .eq("period_year", filterYear)
      .eq("period_month", filterMonth);
    const s = { paid: 0, pending: 0, waived: 0, total: 0 };
    (sumData ?? []).forEach(d => {
      if (d.status === "paid") { s.paid += d.amount; s.total += d.amount; }
      else if (d.status === "pending") s.pending += d.amount;
      else if (d.status === "waived") s.waived += d.amount;
    });
    setSummary(s);
    setLoading(false);
  }, [search, page, filterYear, filterMonth, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await supabase.from("dues_payments").delete().eq("id", deleteTarget.id);
    setDeleteTarget(undefined); setDeleteLoading(false); fetchData();
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Iuran Anggota"
        description={`Kelola iuran periode ${formatPeriod(filterYear, filterMonth)}`}
        actions={
          <div className="flex gap-2">
            <Link href="/dues/settings" className="btn-secondary"><Settings size={14} />Pengaturan Iuran</Link>
            <button onClick={() => { setEditing(undefined); setShowModal(true); }} className="btn-primary">
              <Plus size={16} />Catat Iuran
            </button>
          </div>
        }
      />

      {/* Period Selector */}
      <div className="bento-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Periode:</span>
          <select value={filterYear} onChange={e => { setFilterYear(Number(e.target.value)); setPage(1); }}
            className="input-base w-28">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterMonth} onChange={e => { setFilterMonth(Number(e.target.value)); setPage(1); }}
            className="input-base w-40">
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="input-base w-36">
            <option value="">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="pending">Belum Bayar</option>
            <option value="waived">Dibebaskan</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Terkumpul" value={formatCurrency(summary.paid)}
          icon={CheckCircle} iconColor="text-brand-600" iconBg="bg-brand-50" />
        <StatCard title="Belum Terbayar" value={formatCurrency(summary.pending)}
          icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard title="Total Tagihan" value={count + " anggota"}
          subtitle={`${items.filter(i => i.status === "paid").length} sudah bayar`}
          icon={CreditCard} iconColor="text-blue-600" iconBg="bg-blue-50" />
      </div>

      {/* Table */}
      <div className="bento-card p-5 space-y-4">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Cari nama anggota..." />
        <Table
          data={items}
          loading={loading}
          emptyMessage="Belum ada data iuran untuk periode ini"
          columns={[
            { key: "member", header: "Anggota", cell: d => (
              <div>
                <p className="font-medium text-slate-900">{(d.member as { full_name: string } | null)?.full_name ?? "-"}</p>
                <p className="text-xs text-slate-400">{(d.member as { member_number: string } | null)?.member_number}</p>
              </div>
            )},
            { key: "status_member", header: "Status Anggota", cell: d => {
              const st = (d.member as { status?: { name: string } } | null)?.status;
              return st ? <Badge variant="success" size="sm">{st.name}</Badge> : <span className="text-slate-400">-</span>;
            }},
            { key: "period", header: "Periode", cell: d => formatPeriod(d.period_year, d.period_month) },
            { key: "amount", header: "Jumlah", cell: d => <span className="font-semibold">{formatCurrency(d.amount)}</span> },
            { key: "payment_date", header: "Tgl Bayar", cell: d => d.status === "paid" ? formatDate(d.payment_date) : "-" },
            { key: "status", header: "Status", cell: d => (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getDuesStatusColor(d.status)}`}>
                {d.status === "paid" ? "Lunas" : d.status === "pending" ? "Belum Bayar" : "Dibebaskan"}
              </span>
            )},
            { key: "notes", header: "Catatan", cell: d => <span className="text-slate-400 text-xs">{d.notes ?? "-"}</span> },
            { key: "actions", header: "", cell: d => (
              <div className="flex gap-1">
                <button onClick={() => { setEditing(d); setShowModal(true); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => setDeleteTarget(d)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            )},
          ]}
        />
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{count} entri</p>
          <Pagination page={page} totalPages={Math.ceil(count / PAGE_SIZE)} onPageChange={setPage} />
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editing ? "Edit Pembayaran Iuran" : "Catat Pembayaran Iuran"} size="md">
        <DuesPaymentForm
          payment={editing}
          defaultYear={filterYear}
          defaultMonth={filterMonth}
          onSuccess={() => { setShowModal(false); fetchData(); }}
          onCancel={() => setShowModal(false)} />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget} title="Hapus Data Iuran"
        message={`Hapus data iuran anggota "${(deleteTarget?.member as { full_name: string } | null)?.full_name}"?`}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(undefined)} loading={deleteLoading} />
    </div>
  );
}
