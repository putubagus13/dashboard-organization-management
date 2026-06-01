'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Scale, Banknote, Users, Medal } from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
import StatCard from '@/components/ui/stat-card';
import Badge from '@/components/ui/badge';
import SearchInput from '@/components/ui/search-input';
import { formatCurrency, formatWeight } from '@/lib/utils/format';
import type { WasteCollector } from '@/types';

type Period = 'all' | 'month' | 'year';

interface AggRow {
  id: string;
  name: string;
  rt_rw: string | null;
  is_member: boolean;
  member: { full_name: string } | null;
  weight: number;
  earnings: number;
}

export default function WasteLeaderboardPage() {
  const supabase = createClient();
  const [collectors, setCollectors] = useState<WasteCollector[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');
  const [totals, setTotals] = useState({ weight: 0, earnings: 0, collectors: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const yearStart = `${now.getFullYear()}-01-01`;

    if (period === 'all') {
      let q = supabase
        .from('waste_collectors')
        .select('*, member:members(full_name,member_number)')
        .is('deleted_at', null)
        .order('total_weight', { ascending: false });
      if (search) q = q.ilike('name', `%${search}%`);
      const { data } = await q;
      const list = (data ?? []) as WasteCollector[];
      setCollectors(list as unknown as WasteCollector[]);

      setTotals({
        weight: list.reduce((s, c) => s + c.total_weight, 0),
        earnings: list.reduce((s, c) => s + c.total_earnings, 0),
        collectors: list.length,
      });
    } else {
      const startDate = period === 'month' ? monthStart : yearStart;
      const { data } = await supabase
        .from('waste_collections')
        .select('collector_id,total_weight,total_earnings,collector:waste_collectors(id,name,rt_rw,is_member)')
        .is('deleted_at', null)
        .gte('collected_date', startDate);

      const agg: Record<string, AggRow> = {};
      (data ?? []).forEach((d) => {
        const c = d.collector as unknown as {
          id: string;
          name: string;
          rt_rw: string | null;
          is_member: boolean;
        } | null;
        if (!c) return;
        if (!agg[d.collector_id]) {
          agg[d.collector_id] = {
            id: c.id,
            name: c.name,
            rt_rw: c.rt_rw,
            is_member: c.is_member,
            member: null,
            weight: 0,
            earnings: 0,
          };
        }
        agg[d.collector_id].weight += d.total_weight ?? 0;
        agg[d.collector_id].earnings += d.total_earnings ?? 0;
      });

      const list = Object.values(agg)
        .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.weight - a.weight)
        .map((c) => ({
          id: c.id,
          name: c.name,
          rt_rw: c.rt_rw,
          is_member: c.is_member,
          member: c.member,
          total_weight: c.weight,
          total_earnings: c.earnings,
          address: null,
          phone: null,
          kk_number: null,
          member_id: null,
          notes: null,
          created_at: '',
          updated_at: '',
        }));

      setCollectors(list as unknown as WasteCollector[]);
      setTotals({
        weight: list.reduce((s, c) => s + c.total_weight, 0),
        earnings: list.reduce((s, c) => s + c.total_earnings, 0),
        collectors: list.length,
      });
    }
    setLoading(false);
  }, [search, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const medalStyle = (i: number): string => {
    const styles = [
      'bg-amber-400 text-white shadow-amber-200',
      'bg-slate-300 text-slate-700 shadow-slate-200',
      'bg-amber-700 text-white shadow-amber-300',
    ];
    return styles[i] ?? 'bg-slate-100 text-slate-500';
  };

  const podium = collectors.slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader title="Leaderboard Bank Sampah" description="Ranking pengepul sampah terbaik" />

      {/* Period Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {(['all', 'month', 'year'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              period === p ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {p === 'all' ? 'Semua Waktu' : p === 'month' ? 'Bulan Ini' : 'Tahun Ini'}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          title="Total Berat"
          value={formatWeight(totals.weight)}
          icon={Scale}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          title="Total Nilai"
          value={formatCurrency(totals.earnings)}
          icon={Banknote}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          title="Total Pengepul"
          value={totals.collectors}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Podium */}
      {!loading && podium.length >= 1 && (
        <div className="bento-card p-6">
          <h2 className="section-title text-center mb-6">🏆 Top 3 Pengepul</h2>
          <div className="flex items-end justify-center gap-6 max-w-lg mx-auto">
            {/* 2nd */}
            {podium[1] && (
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-14 h-14 rounded-2xl bg-slate-200 flex items-center justify-center font-display font-bold text-xl text-slate-600">
                  {podium[1].name.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-slate-800 text-center leading-tight max-w-full truncate">
                  {podium[1].name}
                </p>
                <p className="text-xs font-semibold text-slate-500">{formatWeight(podium[1].total_weight)}</p>
                <div className="w-full bg-slate-200 rounded-t-xl h-20 flex items-end justify-center pb-3">
                  <Medal size={24} className="text-slate-400" />
                </div>
              </div>
            )}
            {/* 1st */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <Trophy size={28} className="text-amber-500" />
              <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center font-display font-bold text-2xl text-white shadow-lg shadow-amber-200">
                {podium[0].name.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-bold text-slate-900 text-center leading-tight max-w-full truncate">
                {podium[0].name}
              </p>
              <p className="text-xs font-bold text-amber-600">{formatWeight(podium[0].total_weight)}</p>
              <p className="text-xs text-slate-500">{formatCurrency(podium[0].total_earnings)}</p>
              <div className="w-full bg-amber-400 rounded-t-xl h-28 flex items-end justify-center pb-3">
                <span className="text-white font-display font-bold text-3xl">1</span>
              </div>
            </div>
            {/* 3rd */}
            {podium[2] && (
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-14 h-14 rounded-2xl bg-amber-700 flex items-center justify-center font-display font-bold text-xl text-white">
                  {podium[2].name.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-slate-800 text-center leading-tight max-w-full truncate">
                  {podium[2].name}
                </p>
                <p className="text-xs font-semibold text-slate-500">{formatWeight(podium[2].total_weight)}</p>
                <div className="w-full bg-amber-700/50 rounded-t-xl h-14 flex items-end justify-center pb-2">
                  <span className="text-amber-900 font-display font-bold text-lg">3</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full List */}
      <div className="bento-card p-5 space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari nama pengepul..." />
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {collectors.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all
                  ${
                    i === 0
                      ? 'border-amber-300 bg-amber-50'
                      : i === 1
                      ? 'border-slate-300 bg-slate-50/60'
                      : i === 2
                      ? 'border-amber-800/20 bg-orange-50/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${medalStyle(
                    i
                  )}`}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    {c.is_member && (
                      <Badge variant="info" size="sm">
                        Anggota
                      </Badge>
                    )}
                    {c.rt_rw && <span className="text-xs text-slate-400">RT/RW {c.rt_rw}</span>}
                  </div>
                  {c.member && (
                    <p className="text-xs text-slate-400 mt-0.5">{(c.member as { full_name: string }).full_name}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-slate-900">{formatWeight(c.total_weight)}</p>
                  <p className="text-sm text-brand-600 font-semibold">{formatCurrency(c.total_earnings)}</p>
                </div>
              </div>
            ))}
            {collectors.length === 0 && (
              <div className="text-center py-12">
                <Trophy size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-400 text-sm">Belum ada data pengepul</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
