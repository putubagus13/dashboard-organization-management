'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import type { Meeting, ComplateMeetingFormData } from '@/types';
import { MEETING_STATUS_OPTIONS, MEETING_TYPE_OPTIONS } from '@/constants';

interface Props {
  meeting?: Meeting;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ComplateMeetingForm({ meeting, onSuccess, onCancel }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ComplateMeetingFormData>({
    status: meeting?.status ?? 'completed',
    notes: meeting?.notes ?? '',
  });

  console.log('meeting', meeting);

  function up<K extends keyof ComplateMeetingFormData>(k: K, v: ComplateMeetingFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const payload = {
      status: form.status || null,
      notes: form.notes || null,
    };
    const { error: err } = meeting
      ? await supabase.from('meetings').update(payload).eq('id', meeting.id)
      : await supabase.from('meetings').insert(payload);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Status*</label>
          <select
            value={form.status}
            onChange={(e) => up('status', e.target.value as ComplateMeetingFormData['status'])}
            className="input-base"
            required
          >
            {MEETING_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan*</label>
          <textarea
            required
            rows={2}
            value={form.notes ?? ''}
            onChange={(e) => up('notes', e.target.value || '')}
            className="input-base min-h-40"
          />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Batal
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 size={14} className="animate-spin" />}
          Simpan
        </button>
      </div>
    </form>
  );
}
