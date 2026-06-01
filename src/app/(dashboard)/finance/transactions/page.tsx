"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { softDeleteById } from "@/lib/audit";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Pencil,
  Trash2,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import SearchInput from "@/components/ui/search-input";
import Pagination from "@/components/ui/pagination";
import TransactionForm from "@/components/finance/transaction-form";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getTransactionTypeColor } from "@/lib/utils/helpers";
import type { CashTransaction } from "@/types";

const PAGE_SIZE = 15;

export default function TransactionsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<CashTransaction[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CashTransaction | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<
    CashTransaction | undefined
  >();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("cash_transactions")
      .select(
        "*, account:cash_accounts(name), category:transaction_categories(name,color)",
        { count: "exact" }
      )
      .is("deleted_at", null);
    if (search) q = q.ilike("description", `%${search}%`);
    if (filterType) q = q.eq("type", filterType);
    q = q
      .order("transaction_date", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data, count: total } = await q;
    setItems((data as CashTransaction[]) ?? []);
    setCount(total ?? 0);
    setLoading(false);
  }, [search, page, filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await softDeleteById(supabase, "cash_transactions", deleteTarget.id);
    setDeleteTarget(undefined);
    setDeleteLoading(false);
    fetchData();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaksi Keuangan"
        description="Catatan seluruh pemasukan dan pengeluaran"
        actions={
          <button
            onClick={() => {
              setEditing(undefined);
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} />
            Tambah Transaksi
          </button>
        }
      />
      <div className="bento-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Cari transaksi..."
            className="flex-1"
          />
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="input-base w-full sm:w-40"
          >
            <option value="">Semua Tipe</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </div>
        <Table
          data={items}
          loading={loading}
          emptyMessage="Tidak ada transaksi"
          columns={[
            {
              key: "date",
              header: "Tanggal",
              cell: (t) => formatDate(t.transaction_date),
            },
            {
              key: "desc",
              header: "Keterangan",
              cell: (t) => (
                <div>
                  <p className="font-medium text-slate-900">{t.description}</p>
                  {t.reference_no && (
                    <p className="text-xs text-slate-400">
                      Ref: {t.reference_no}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: "cat",
              header: "Kategori",
              cell: (t) =>
                t.category ? (
                  <Badge variant="info" size="sm">
                    {(t.category as { name: string }).name}
                  </Badge>
                ) : (
                  "-"
                ),
            },
            {
              key: "account",
              header: "Rekening",
              cell: (t) => (t.account as { name: string } | null)?.name ?? "-",
            },
            {
              key: "type",
              header: "Tipe",
              cell: (t) => (
                <Badge
                  variant={
                    t.type === "income"
                      ? "success"
                      : t.type === "expense"
                      ? "danger"
                      : "info"
                  }
                  dot
                  size="sm"
                >
                  {t.type === "income"
                    ? "Pemasukan"
                    : t.type === "expense"
                    ? "Pengeluaran"
                    : "Transfer"}
                </Badge>
              ),
            },
            {
              key: "amount",
              header: "Jumlah",
              cell: (t) => (
                <span
                  className={`font-semibold ${getTransactionTypeColor(t.type)}`}
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </span>
              ),
            },
            {
              key: "verified",
              header: "Status",
              cell: (t) => (
                <Badge
                  variant={t.is_verified ? "success" : "warning"}
                  size="sm"
                >
                  {t.is_verified ? "Verified" : "Pending"}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "",
              cell: (t) => (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(t);
                      setShowModal(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
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
          <p className="text-sm text-slate-500">{count} transaksi</p>
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
        title={editing ? "Edit Transaksi" : "Tambah Transaksi"}
        size="md"
      >
        <TransactionForm
          transaction={editing}
          onSuccess={() => {
            setShowModal(false);
            fetchData();
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Transaksi"
        message={`Hapus transaksi "${deleteTarget?.description}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(undefined)}
        loading={deleteLoading}
      />
    </div>
  );
}
