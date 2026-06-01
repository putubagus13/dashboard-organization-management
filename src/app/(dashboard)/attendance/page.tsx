'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { softDeleteById } from '@/lib/audit';
import { Plus, Pencil, Trash2, CalendarCheck, Users, CheckSquare, ClipboardList, CheckCircle } from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
import StatCard from '@/components/ui/stat-card';
import Table from '@/components/ui/table';
import Badge from '@/components/ui/badge';
import Modal from '@/components/ui/modal';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import Pagination from '@/components/ui/pagination';
import MeetingForm from '@/components/attendance/meeting-form';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/format';
import { getMeetingStatusColor } from '@/lib/utils/helpers';
import type { Meeting } from '@/types';
import ComplateMeetingForm from '@/components/attendance/complate-meeting-form';

const PAGE_SIZE = 10;

export default function AttendancePage() {
  const supabase = createClient();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Meeting | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Meeting | undefined>();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [complateOpenModal, setComplateOpenModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, count: total } = await supabase
      .from('meetings')
      .select('*, attendance(count)', { count: 'exact' })
      .is('deleted_at', null)
      .order('meeting_date', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    setMeetings((data as Meeting[]) ?? []);
    setCount(total ?? 0);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await softDeleteById(supabase, 'meetings', deleteTarget.id);
    setDeleteTarget(undefined);
    setDeleteLoading(false);
    fetchData();
  }

  const today = new Date().toISOString().split('T')[0];
  const upcoming = meetings.filter((m) => m.meeting_date >= today && m.status !== 'cancelled').length;
  const completed = meetings.filter((m) => m.status === 'completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absensi Rapat"
        description="Jadwal rapat dan rekap kehadiran anggota"
        actions={
          <button
            onClick={() => {
              setEditing(undefined);
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} />
            Buat Rapat
          </button>
        }
      />
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          title="Total Rapat"
          value={count}
          icon={CalendarCheck}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Mendatang"
          value={upcoming}
          icon={ClipboardList}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Selesai"
          value={completed}
          icon={CheckSquare}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
      </div>
      <div className="bento-card p-5 space-y-4">
        <Table
          data={meetings}
          loading={loading}
          emptyMessage="Belum ada rapat terjadwal"
          columns={[
            {
              key: 'title',
              header: 'Judul Rapat',
              cell: (m) => (
                <div>
                  <p className="font-medium text-slate-900">{m.title}</p>
                  {m.location && <p className="text-xs text-slate-400">{m.location}</p>}
                </div>
              ),
            },
            {
              key: 'type',
              header: 'Tipe',
              cell: (m) => (
                <Badge variant="info" size="sm">
                  {m.type === 'regular'
                    ? 'Rutin'
                    : m.type === 'annual'
                    ? 'Tahunan'
                    : m.type === 'extraordinary'
                    ? 'LB'
                    : 'Khusus'}
                </Badge>
              ),
            },
            {
              key: 'date',
              header: 'Tanggal',
              cell: (m) => formatDate(m.meeting_date),
            },
            {
              key: 'time',
              header: 'Waktu',
              cell: (m) => (m.start_time ? `${m.start_time}${m.end_time ? ' - ' + m.end_time : ''}` : '-'),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (m) => (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getMeetingStatusColor(m.status)}`}>
                  {m.status === 'scheduled'
                    ? 'Terjadwal'
                    : m.status === 'ongoing'
                    ? 'Berlangsung'
                    : m.status === 'completed'
                    ? 'Selesai'
                    : 'Dibatalkan'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: '',
              cell: (m) => (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(m);
                      setComplateOpenModal(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50"
                    title="Catat Pembayaran"
                  >
                    <CheckCircle size={14} />
                  </button>
                  <Link
                    href={`/attendance/${m.id}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 inline-flex"
                    title="Kelola Absensi"
                  >
                    <Users size={14} />
                  </Link>
                  <button
                    onClick={() => {
                      setEditing(m);
                      setShowModal(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(m)}
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
          <p className="text-sm text-slate-500">{count} rapat</p>
          <Pagination page={page} totalPages={Math.ceil(count / PAGE_SIZE)} onPageChange={setPage} />
        </div>
      </div>
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Rapat' : 'Buat Rapat Baru'}
        size="md"
      >
        <MeetingForm
          meeting={editing}
          onSuccess={() => {
            setShowModal(false);
            fetchData();
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      {/**Modal Update Status dan Notulensi */}
      <Modal
        open={complateOpenModal}
        onClose={() => setComplateOpenModal(false)}
        title="Update Status dan Notulensi"
        size="md"
      >
        <ComplateMeetingForm
          meeting={editing}
          onSuccess={() => {
            setComplateOpenModal(false);
            fetchData();
          }}
          onCancel={() => setComplateOpenModal(false)}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Rapat"
        message={`Hapus rapat "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(undefined)}
        loading={deleteLoading}
      />
    </div>
  );
}
