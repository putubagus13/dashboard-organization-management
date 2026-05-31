import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import PageHeader from "@/components/layout/page-header";
import StatCard from "@/components/ui/stat-card";
import { Recycle, Scale, Banknote, Users, PackageSearch, Trophy } from "lucide-react";
import { formatCurrency, formatWeight, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import Badge from "@/components/ui/badge";

export const metadata: Metadata = { title: "Bank Sampah" };

export default async function WasteBankPage() {
  const supabase = await createClient();
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [
    { data: sessions },
    { data: monthSessions },
    { data: topCollectors },
    { data: wasteTypes },
    { count: totalCollectors },
  ] = await Promise.all([
    supabase.from("waste_collection_sessions")
      .select("id,title,session_date,status,total_weight,total_earnings,officer_name,location")
      .order("session_date", { ascending: false }).limit(6),
    supabase.from("waste_collection_sessions")
      .select("total_weight,total_earnings")
      .gte("session_date", firstDay),
    supabase.from("waste_collectors")
      .select("id,name,rt_rw,total_weight,total_earnings,is_member")
      .order("total_weight", { ascending: false }).limit(8),
    supabase.from("waste_types")
      .select("id,name,price_per_kg,color")
      .eq("is_active", true).order("price_per_kg", { ascending: false }),
    supabase.from("waste_collectors").select("*", { count: "exact", head: true }),
  ]);

  const monthWeight = (monthSessions ?? []).reduce((s, x) => s + (x.total_weight ?? 0), 0);
  const monthEarnings = (monthSessions ?? []).reduce((s, x) => s + (x.total_earnings ?? 0), 0);

  const statusColor = (s: string) =>
    s === "completed" ? "success" : s === "ongoing" ? "warning" : "default";
  const statusLabel = (s: string) =>
    s === "completed" ? "Selesai" : s === "ongoing" ? "Berlangsung" : "Dibatalkan";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Sampah"
        description="Pencatatan pengumpulan sampah plastik dari masyarakat"
        actions={
          <div className="flex gap-2">
            <Link href="/waste-bank/collections" className="btn-secondary">
              <PackageSearch size={14} /> Kelola Pengumpulan
            </Link>
            <Link href="/waste-bank/leaderboard" className="btn-primary">
              <Trophy size={14} /> Leaderboard
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Berat Bulan Ini" value={formatWeight(monthWeight)}
          icon={Scale} iconColor="text-brand-600" iconBg="bg-brand-50" />
        <StatCard title="Pendapatan Bulan Ini" value={formatCurrency(monthEarnings)}
          icon={Banknote} iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard title="Sesi Bulan Ini" value={monthSessions?.length ?? 0}
          icon={Recycle} iconColor="text-teal-600" iconBg="bg-teal-50" />
        <StatCard title="Total Pengepul" value={totalCollectors ?? 0}
          icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Sessions */}
        <div className="lg:col-span-2 bento-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Sesi Pengumpulan Terbaru</h2>
            <Link href="/waste-bank/collections" className="text-sm text-brand-700 hover:underline font-medium">
              Lihat semua
            </Link>
          </div>
          <div className="space-y-2">
            {(sessions ?? []).map(s => (
              <div key={s.id}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                  <Recycle size={16} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-900 text-sm">{s.title}</p>
                    <Badge variant={statusColor(s.status)} size="sm">{statusLabel(s.status)}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(s.session_date)}
                    {s.location && ` · ${s.location}`}
                    {s.officer_name && ` · Petugas: ${s.officer_name}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-800">{formatWeight(s.total_weight)}</p>
                  <p className="text-xs text-brand-600 font-medium">{formatCurrency(s.total_earnings)}</p>
                </div>
              </div>
            ))}
            {(!sessions || sessions.length === 0) && (
              <p className="text-center text-slate-400 text-sm py-8">Belum ada sesi pengumpulan</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Harga Sampah */}
          <div className="bento-card p-5">
            <h2 className="section-title mb-3">Harga Sampah / kg</h2>
            <div className="space-y-2">
              {(wasteTypes ?? []).map(wt => (
                <div key={wt.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: wt.color }} />
                  <span className="text-sm text-slate-700 flex-1">{wt.name}</span>
                  <span className="text-sm font-bold text-brand-700">{formatCurrency(wt.price_per_kg)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Collectors */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Top Pengepul</h2>
              <Link href="/waste-bank/leaderboard" className="text-sm text-brand-700 hover:underline">Semua</Link>
            </div>
            <div className="space-y-2">
              {(topCollectors ?? []).map((c, i) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 
                    ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.rt_rw ?? ""} {c.is_member ? "· Anggota" : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-700">{formatWeight(c.total_weight)}</p>
                    <p className="text-xs text-brand-600">{formatCurrency(c.total_earnings)}</p>
                  </div>
                </div>
              ))}
              {(!topCollectors || topCollectors.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-2">Belum ada data</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
