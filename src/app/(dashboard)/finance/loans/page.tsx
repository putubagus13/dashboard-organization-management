'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Pencil, Trash2, Banknote, CreditCard, CheckCircle, Clock, Download } from 'lucide-react';
import { exportToExcel, type ExportColumn } from '@/lib/utils/export-excel';
import PageHeader from '@/components/layout/page-header';
import StatCard from '@/components/ui/stat-card';
import Table from '@/components/ui/table';
import Badge from '@/components/ui/badge';
import Modal from '@/components/ui/modal';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import SearchInput from '@/components/ui/search-input';
import Pagination from '@/components/ui/pagination';
import LoanForm from '@/components/finance/loan-form';
import LoanPaymentForm from '@/components/finance/loan-payment-form';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { getLoanStatusColor, calculateLoanProgress } from '@/lib/utils/helpers';
import type { Loan } from '@/types';

const PAGE_SIZE = 10;

export default function LoansPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Loan[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [editing, setEditing] = useState<Loan | undefined>();
  const [payTarget, setPayTarget] = useState<Loan | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Loan | undefined>();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('loans')
      .select('*, member:members(full_name,member_number), account:cash_accounts(name)', { count: 'exact' })
      .is('deleted_at', null);
    if (search) q = q.ilike('borrower_name', `%${search}%`);
    if (filterStatus) q = q.eq('status', filterStatus);
    q = q.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data, count: total } = await q;
    setItems((data as Loan[]) ?? []);
    setCount(total ?? 0);
    setLoading(false);
  }, [search, page, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await supabase.rpc('soft_delete_loan_with_transactions', { p_loan_id: deleteTarget.id });
    setDeleteTarget(undefined);
    setDeleteLoading(false);
    fetchData();
  }

  const active = items.filter((l) => l.status === 'active');
  const totalActive = active.reduce((s, l) => s + (l.principal_amount ?? 0), 0);
  const totalRemaining = active.reduce((s, l) => s + (l.remaining_amount ?? 0), 0);

  function handleExport() {
    const cols: ExportColumn<Loan>[] = [
      { header: 'No. Pinjaman', accessor: (l) => l.loan_number ?? '-' },
      { header: 'Peminjam', accessor: (l) => l.borrower_name },
      { header: 'Pokok', accessor: (l) => l.principal_amount },
      { header: 'Sisa', accessor: (l) => l.remaining_amount ?? 0 },
      { header: 'Total Bayar', accessor: (l) => l.total_paid },
      { header: 'Bunga (%)', accessor: (l) => l.interest_rate },
      { header: 'Tanggal Pinjaman', accessor: (l) => l.loan_date },
      { header: 'Jatuh Tempo', accessor: (l) => l.due_date ?? '-' },
      { header: 'Status', accessor: (l) => (l.status === 'active' ? 'Aktif' : l.status === 'paid' ? 'Lunas' : l.status === 'overdue' ? 'Jatuh Tempo' : 'Dibatalkan') },
      { header: 'Tujuan', accessor: (l) => l.purpose ?? '-' },
      { header: 'Catatan', accessor: (l) => l.notes ?? '-' },
    ];
    exportToExcel('data-pinjaman', 'Pinjaman', cols, items);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pinjaman"
        description="Kelola pinjaman anggota dan masyarakat"
        actions={
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-secondary">
              <Download size={14} />
              Export Excel
            </button>
            <button
              onClick={() => {
                setEditing(undefined);
                setShowModal(true);
              }}
              className="btn-primary"
            >
              <Plus size={16} />
              Catat Pinjaman
            </button>
          </div>
        }
      />
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          title="Pinjaman Aktif"
          value={active.length}
          icon={Banknote}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Total Pokok"
          value={formatCurrency(totalActive)}
          icon={CreditCard}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Sisa Tagihan"
          value={formatCurrency(totalRemaining)}
          icon={Clock}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>
      <div className="bento-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Cari nama peminjam..."
            className="flex-1"
          />
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="input-base w-full sm:w-44"
          >
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="paid">Lunas</option>
            <option value="overdue">Jatuh Tempo</option>
          </select>
        </div>
        <Table
          data={items}
          loading={loading}
          emptyMessage="Tidak ada data pinjaman"
          columns={[
            {
              key: 'no',
              header: 'No. Pinjaman',
              cell: (l) => <span className="font-mono text-xs font-semibold text-slate-500">{l.loan_number}</span>,
            },
            {
              key: 'borrower',
              header: 'Peminjam',
              cell: (l) => (
                <div>
                  <p className="font-medium text-slate-900">{l.borrower_name}</p>
                  {l.member && (
                    <p className="text-xs text-slate-400">{(l.member as { member_number: string }).member_number}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'amount',
              header: 'Pokok',
              cell: (l) => formatCurrency(l.principal_amount),
            },
            {
              key: 'remaining',
              header: 'Sisa',
              cell: (l) => (
                <span
                  className={
                    l.remaining_amount && l.remaining_amount > 0
                      ? 'text-red-600 font-semibold'
                      : 'text-green-600 font-semibold'
                  }
                >
                  {formatCurrency(l.remaining_amount ?? 0)}
                </span>
              ),
            },
            {
              key: 'progress',
              header: 'Progress',
              cell: (l) => {
                const pct = calculateLoanProgress(l.total_paid, l.principal_amount);
                return (
                  <div className="w-24">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-brand-600 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'due',
              header: 'Jatuh Tempo',
              cell: (l) => (l.due_date ? formatDate(l.due_date) : '-'),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (l) => (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getLoanStatusColor(l.status)}`}>
                  {l.status === 'active'
                    ? 'Aktif'
                    : l.status === 'paid'
                    ? 'Lunas'
                    : l.status === 'overdue'
                    ? 'Jatuh Tempo'
                    : 'Dibatalkan'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: '',
              cell: (l) => (
                <div className="flex gap-1">
                  {l.status === 'active' && (
                    <button
                      onClick={() => {
                        setPayTarget(l);
                        setShowPayModal(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50"
                      title="Catat Pembayaran"
                    >
                      <CheckCircle size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditing(l);
                      setShowModal(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(l)}
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
          <p className="text-sm text-slate-500">{count} pinjaman</p>
          <Pagination page={page} totalPages={Math.ceil(count / PAGE_SIZE)} onPageChange={setPage} />
        </div>
      </div>
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Pinjaman' : 'Catat Pinjaman Baru'}
        size="md"
      >
        <LoanForm
          loan={editing}
          onSuccess={() => {
            setShowModal(false);
            fetchData();
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Catat Pembayaran Pinjaman" size="sm">
        <LoanPaymentForm
          loan={payTarget}
          onSuccess={() => {
            setShowPayModal(false);
            fetchData();
          }}
          onCancel={() => setShowPayModal(false)}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Pinjaman"
        message={`Hapus pinjaman "${deleteTarget?.borrower_name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(undefined)}
        loading={deleteLoading}
      />
    </div>
  );
}
