'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withCreateAudit, withUpdateAudit } from '@/lib/audit';
import { Loader2 } from 'lucide-react';
import type { Member, MemberFormData, MemberStatusType } from '@/types';
import { GENDER_OPTIONS, MEMBER_ROLE_OPTIONS } from '@/constants';

interface MemberFormProps {
  member?: Member;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MemberForm({ member, onSuccess, onCancel }: MemberFormProps) {
  const supabase = createClient();
  const [statuses, setStatuses] = useState<MemberStatusType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<MemberFormData>({
    full_name: member?.full_name ?? '',
    date_of_birth: member?.date_of_birth ?? '',
    gender: member?.gender ?? undefined,
    address: member?.address ?? '',
    rt_rw: member?.rt_rw ?? '',
    phone: member?.phone ?? '',
    email: member?.email ?? '',
    status_id: member?.status_id ?? '',
    role: member?.role ?? 'anggota',
    join_date: member?.join_date ?? new Date().toISOString().split('T')[0],
    is_active: member?.is_active ?? true,
    nik: member?.nik ?? '',
    occupation: member?.occupation ?? '',
    notes: member?.notes ?? '',
  });

  useEffect(() => {
    supabase
      .from('member_status_types')
      .select('*')
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => setStatuses(data ?? []));
  }, []);

  function update<K extends keyof MemberFormData>(key: K, value: MemberFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const payload = {
      ...form,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      status_id: form.status_id || null,
    };
    const { error: err } = member
      ? await supabase
          .from('members')
          .update(await withUpdateAudit(supabase, payload))
          .eq('id', member.id)
      : await supabase.from('members').insert(await withCreateAudit(supabase, payload));
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap *</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className="input-base"
            required
          />
        </div>
        {/* <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">NIK</label>
          <input type="text" value={form.nik ?? ""} onChange={e => update("nik", e.target.value)} className="input-base" maxLength={16} />
        </div> */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Lahir</label>
          <input
            type="date"
            value={form.date_of_birth ?? ''}
            onChange={(e) => update('date_of_birth', e.target.value)}
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Jenis Kelamin</label>
          <select
            value={form.gender ?? ''}
            onChange={(e) => update('gender', (e.target.value as 'L' | 'P' | undefined) || undefined)}
            className="input-base"
          >
            <option value="">Pilih...</option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Pekerjaan</label>
          <input
            type="text"
            value={form.occupation ?? ''}
            onChange={(e) => update('occupation', e.target.value)}
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">No. Telepon</label>
          <input
            type="tel"
            value={form.phone ?? ''}
            onChange={(e) => update('phone', e.target.value)}
            className="input-base"
          />
        </div>
        {/* <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input type="email" value={form.email ?? ""} onChange={e => update("email", e.target.value)} className="input-base" />
        </div> */}
        {/* <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Alamat</label>
          <textarea rows={2} value={form.address ?? ""} onChange={e => update("address", e.target.value)} className="input-base resize-none" />
        </div> */}
        {/* <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">RT/RW</label>
          <input type="text" value={form.rt_rw ?? ""} onChange={e => update("rt_rw", e.target.value)} className="input-base" placeholder="001/002" />
        </div> */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Bergabung</label>
          <input
            type="date"
            value={form.join_date ?? ''}
            onChange={(e) => update('join_date', e.target.value)}
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Status Anggota</label>
          <select
            value={form.status_id ?? ''}
            onChange={(e) => update('status_id', e.target.value || undefined)}
            className="input-base"
          >
            <option value="">Pilih Status...</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Jabatan</label>
          <select
            value={form.role ?? 'anggota'}
            onChange={(e) => update('role', e.target.value as MemberFormData['role'])}
            className="input-base"
          >
            {MEMBER_ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
          <textarea
            rows={2}
            value={form.notes ?? ''}
            onChange={(e) => update('notes', e.target.value)}
            className="input-base resize-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => update('is_active', e.target.checked)}
            className="w-4 h-4 accent-brand-600 rounded"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
            Anggota Aktif
          </label>
        </div>
      </div>
      <div className="flex gap-3 pt-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Batal
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {member ? 'Simpan Perubahan' : 'Tambah Anggota'}
        </button>
      </div>
    </form>
  );
}
