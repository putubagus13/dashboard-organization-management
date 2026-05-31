import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Users, Wallet, TrendingUp, TrendingDown, CalendarCheck, CreditCard, Recycle, Banknote, Activity } from "lucide-react";
import StatCard from "@/components/ui/stat-card";
import PageHeader from "@/components/layout/page-header";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const firstDay = `${year}-${String(month).padStart(2,"0")}-01`;

  const [
    { count: totalMembers }, { count: activeMembers }, { count: newMembers },
    { data: accounts }, { data: incomeData }, { data: expenseData },
    { count: activeLoans }, { count: upcomingMeetings }, { data: duePaid },
    { count: duePending }, { data: wasteSessions },
  ] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("members").select("*", { count: "exact", head: true }).gte("created_at", firstDay),
    supabase.from("cash_accounts").select("balance").eq("is_active", true),
    supabase.from("cash_transactions").select("amount").eq("type", "income").gte("transaction_date", firstDay),
    supabase.from("cash_transactions").select("amount").eq("type", "expense").gte("transaction_date", firstDay),
    supabase.from("loans").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("meetings").select("*", { count: "exact", head: true }).gte("meeting_date", now.toISOString().split("T")[0]),
    supabase.from("dues_payments").select("amount").eq("status", "paid").eq("period_year", year).eq("period_month", month),
    supabase.from("dues_payments").select("*", { count: "exact", head: true }).eq("status", "pending").eq("period_year", year).eq("period_month", month),
    supabase.from("waste_collection_sessions").select("total_weight,total_earnings,session_date").gte("session_date", firstDay).order("session_date", { ascending: false }),
  ]);

  const totalBalance = (accounts ?? []).reduce((s, a) => s + (a.balance ?? 0), 0);
  const incomeThisMonth = (incomeData ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);
  const expenseThisMonth = (expenseData ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);
  const duePaidAmount = (duePaid ?? []).reduce((s, d) => s + (d.amount ?? 0), 0);
  const wasteWeight = (wasteSessions ?? []).reduce((s, w) => s + (w.total_weight ?? 0), 0);
  const wasteEarnings = (wasteSessions ?? []).reduce((s, w) => s + (w.total_earnings ?? 0), 0);

  const { data: recentTransactions } = await supabase.from("cash_transactions")
    .select("id,description,amount,type,transaction_date,category:transaction_categories(name,color)")
    .order("transaction_date", { ascending: false }).limit(5);

  const { data: topWaste } = await supabase.from("waste_collectors")
    .select("id,name,total_weight,total_earnings").order("total_weight", { ascending: false }).limit(5);

  const { data: recentMembers } = await supabase.from("members")
    .select("id,full_name,member_number,role,join_date,status:member_status_types(name,color)")
    .order("created_at", { ascending: false }).limit(4);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Selamat datang kembali! ${formatDate(now.toISOString(), "EEEE, d MMMM yyyy")}`} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Anggota" value={totalMembers ?? 0} subtitle={`${activeMembers ?? 0} aktif`}
          icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50"
          trend={{ value: 0, label: "bulan ini" }} />
        <StatCard title="Saldo Kas" value={formatCurrency(totalBalance)}
          subtitle={`${accounts?.length ?? 0} rekening`} icon={Wallet}
          iconColor="text-brand-600" iconBg="bg-brand-50" />
        <StatCard title="Pemasukan Bulan Ini" value={formatCurrency(incomeThisMonth)}
          subtitle={`Pengeluaran: ${formatCurrency(expenseThisMonth)}`} icon={TrendingUp}
          iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard title="Pinjaman Aktif" value={activeLoans ?? 0}
          subtitle="sedang berjalan" icon={Banknote} iconColor="text-amber-600" iconBg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Rapat Mendatang" value={upcomingMeetings ?? 0}
          icon={CalendarCheck} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
        <StatCard title="Iuran Terkumpul" value={formatCurrency(duePaidAmount)}
          subtitle={`${duePending ?? 0} anggota belum bayar`}
          icon={CreditCard} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="Sampah Bulan Ini" value={`${wasteWeight.toFixed(1)} kg`}
          subtitle={`${wasteSessions?.length ?? 0} sesi`}
          icon={Recycle} iconColor="text-teal-600" iconBg="bg-teal-50" />
        <StatCard title="Pendapatan Sampah" value={formatCurrency(wasteEarnings)}
          icon={Activity} iconColor="text-purple-600" iconBg="bg-purple-50" />
      </div>

      {/* Bento Grid - lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bento-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Transaksi Terbaru</h2>
            <Link href="/finance/transactions" className="text-sm text-brand-700 hover:underline font-medium">Lihat semua</Link>
          </div>
          <div className="space-y-2">
            {(recentTransactions ?? []).map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.type === "income" ? "bg-green-100" : "bg-red-100"}`}>
                  {t.type === "income" ? <TrendingUp size={14} className="text-green-600" /> : <TrendingDown size={14} className="text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>
                  <p className="text-xs text-slate-400">{formatDate(t.transaction_date)}</p>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                  {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
            {(!recentTransactions || recentTransactions.length === 0) && (
              <p className="text-center text-slate-400 text-sm py-6">Belum ada transaksi</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Top Waste Collectors */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Top Bank Sampah</h2>
              <Link href="/waste-bank/leaderboard" className="text-sm text-brand-700 hover:underline font-medium">Semua</Link>
            </div>
            <div className="space-y-2">
              {(topWaste ?? []).map((w, i) => (
                <div key={w.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{w.name}</p>
                    <p className="text-xs text-slate-400">{w.total_weight.toFixed(2)} kg</p>
                  </div>
                  <span className="text-xs font-semibold text-brand-700">{formatCurrency(w.total_earnings)}</span>
                </div>
              ))}
              {(!topWaste || topWaste.length === 0) && (
                <p className="text-center text-slate-400 text-sm py-3">Belum ada data</p>
              )}
            </div>
          </div>

          {/* Recent Members */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Anggota Baru</h2>
              <Link href="/members" className="text-sm text-brand-700 hover:underline font-medium">Semua</Link>
            </div>
            <div className="space-y-2">
              {(recentMembers ?? []).map(m => (
                <div key={m.id} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-brand-700">
                      {m.full_name.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.full_name}</p>
                    <p className="text-xs text-slate-400">{m.member_number}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
