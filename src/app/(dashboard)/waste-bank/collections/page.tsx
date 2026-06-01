'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { softDeleteById, withUpdateAudit } from '@/lib/audit';
import { Plus, Pencil, Trash2, Recycle, CheckCircle, Clock, Eye } from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
import StatCard from '@/components/ui/stat-card';
import Table from '@/components/ui/table';
import Badge from '@/components/ui/badge';
import Modal from '@/components/ui/modal';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import SearchInput from '@/components/ui/search-input';
import Pagination from '@/components/ui/pagination';
import WasteSessionForm from '@/components/waste-bank/waste-session-form';
import WasteCollectionForm from '@/components/waste-bank/waste-collection-form';
import WasteCollectionDetail from '@/components/waste-bank/waste-collection-detail';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils/format';
import type { WasteCollectionSession } from '@/types';

const PAGE_SIZE = 10;

export default function WasteCollectionsPage() {
  const supabase = createClient();
  const [sessions, setSessions] = useState<WasteCollectionSession[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingSession, setEditingSession] = useState<WasteCollectionSession | undefined>();
  const [activeSession, setActiveSession] = useState<WasteCollectionSession | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<WasteCollectionSession | undefined>();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('waste_collection_sessions').select('*', { count: 'exact' }).is('deleted_at', null);
    if (search) q = q.ilike('title', `%${search}%`);
    if (filterStatus) q = q.eq('status', filterStatus);
    q = q.order('session_date', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data, count: total } = await q;
    setSessions((data as WasteCollectionSession[]) ?? []);
    setCount(total ?? 0);
    setLoading(false);
  }, [search, page, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await softDeleteById(supabase, 'waste_collection_sessions', deleteTarget.id);
    setDeleteTarget(undefined);
    setDeleteLoading(false);
    fetchData();
  }

  async function handleCompleteSession(s: WasteCollectionSession) {
    await supabase
      .from('waste_collection_sessions')
      .update(await withUpdateAudit(supabase, { status: 'completed' }))
      .eq('id', s.id);
    fetchData();
  }

  const ongoing = sessions.filter((s) => s.status === 'ongoing').length;
  const completed = sessions.filter((s) => s.status === 'completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengumpulan Sampah"
        description="Kelola sesi dan catatan pengumpulan sampah plastik"
        actions={
          <button
            onClick={() => {
              setEditingSession(undefined);
              setShowSessionModal(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} /> Buat Sesi
          </button>
        }
      />

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard title="Total Sesi" value={count} icon={Recycle} iconColor="text-brand-600" iconBg="bg-brand-50" />
        <StatCard title="Berlangsung" value={ongoing} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard
          title="Selesai"
          value={completed}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBg="bg-green-50"
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
            placeholder="Cari sesi..."
            className="flex-1"
          />
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="input-base w-full sm:w-40"
          >
            <option value="">Semua Status</option>
            <option value="ongoing">Berlangsung</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>

        <Table
          data={sessions}
          loading={loading}
          emptyMessage="Belum ada sesi pengumpulan"
          columns={[
            {
              key: 'title',
              header: 'Judul Sesi',
              cell: (s) => (
                <div>
                  <p className="font-medium text-slate-900">{s.title}</p>
                  {s.location && <p className="text-xs text-slate-400">{s.location}</p>}
                </div>
              ),
            },
            { key: 'date', header: 'Tanggal', cell: (s) => formatDate(s.session_date) },
            { key: 'officer', header: 'Petugas', cell: (s) => s.officer_name ?? '-' },
            {
              key: 'weight',
              header: 'Total Berat',
              cell: (s) => <span className="font-semibold text-slate-800">{formatWeight(s.total_weight)}</span>,
            },
            {
              key: 'earnings',
              header: 'Total Nilai',
              cell: (s) => <span className="font-semibold text-brand-700">{formatCurrency(s.total_earnings)}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              cell: (s) => (
                <Badge
                  variant={s.status === 'completed' ? 'success' : s.status === 'ongoing' ? 'warning' : 'default'}
                  dot
                  size="sm"
                >
                  {s.status === 'completed' ? 'Selesai' : s.status === 'ongoing' ? 'Berlangsung' : 'Dibatalkan'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              cell: (s) => (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setActiveSession(s);
                      setShowDetailModal(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                    title="Detail"
                  >
                    <Eye size={14} />
                  </button>
                  {s.status === 'ongoing' && (
                    <>
                      <button
                        onClick={() => {
                          setActiveSession(s);
                          setShowCollectModal(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                        title="Catat Sampah"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => handleCompleteSession(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50"
                        title="Selesaikan"
                      >
                        <CheckCircle size={14} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setEditingSession(s);
                      setShowSessionModal(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
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
          <p className="text-sm text-slate-500">{count} sesi</p>
          <Pagination page={page} totalPages={Math.ceil(count / PAGE_SIZE)} onPageChange={setPage} />
        </div>
      </div>

      {/* Session Form Modal */}
      <Modal
        open={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        title={editingSession ? 'Edit Sesi' : 'Buat Sesi Pengumpulan'}
        size="md"
      >
        <WasteSessionForm
          session={editingSession}
          onSuccess={() => {
            setShowSessionModal(false);
            fetchData();
          }}
          onCancel={() => setShowSessionModal(false)}
        />
      </Modal>

      {/* Collection Form Modal */}
      <Modal
        open={showCollectModal}
        onClose={() => setShowCollectModal(false)}
        title="Catat Pengumpulan Sampah"
        size="lg"
      >
        <WasteCollectionForm
          session={activeSession}
          onSuccess={() => {
            setShowCollectModal(false);
            fetchData();
          }}
          onCancel={() => setShowCollectModal(false)}
        />
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Detail Sesi: ${activeSession?.title}`}
        size="xl"
      >
        <WasteCollectionDetail
          session={activeSession}
          onAddCollection={() => {
            setShowDetailModal(false);
            setShowCollectModal(true);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Sesi"
        message={`Hapus sesi "${deleteTarget?.title}"? Semua data pengumpulan dalam sesi ini juga akan terhapus.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(undefined)}
        loading={deleteLoading}
      />
    </div>
  );
}
