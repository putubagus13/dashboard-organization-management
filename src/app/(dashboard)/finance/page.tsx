import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';
import PageHeader from '@/components/layout/page-header';
import StatCard from '@/components/ui/stat-card';
import { Wallet, TrendingUp, TrendingDown, Banknote, ArrowLeftRight } from 'lucide-react';
import { formatCurrency, formatDate, formatDateShort } from '@/lib/utils/format';
import Link from 'next/link';
import Badge from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Keuangan' };

interface TxRow {
  id: string;
  description: string;
  amount: number;
  type: string;
  transaction_date: string;
  account: { name: string } | null;
  category: { name: string; color: string } | null;
}

interface LoanRow {
  id: string;
  loan_number: string | null;
  borrower_name: string;
  remaining_amount: number | null;
  due_date: string | null;
  status: string;
}

interface DonorRow {
  id: string;
  name: string;
  total_donated: number;
}

export default async function FinancePage() {
  const supabase = await createClient();
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [
    { data: accounts },
    { data: income },
    { data: expense },
    { data: activeLoans },
    { data: recentTx },
    { data: topDonors },
  ] = await Promise.all([
    supabase
      .from('cash_accounts')
      .select('id,name,description,balance')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('cash_transactions')
      .select('amount')
      .eq('type', 'income')
      .gte('transaction_date', firstDay)
      .is('deleted_at', null),
    supabase
      .from('cash_transactions')
      .select('amount')
      .eq('type', 'expense')
      .gte('transaction_date', firstDay)
      .is('deleted_at', null),
    supabase
      .from('loans')
      .select('id,loan_number,borrower_name,remaining_amount,due_date,status')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('due_date'),
    supabase
      .from('cash_transactions')
      .select(
        'id,description,amount,type,transaction_date,account:cash_accounts(name),category:transaction_categories(name,color)'
      )
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
      .limit(8),
    supabase
      .from('donors')
      .select('id,name,total_donated')
      .is('deleted_at', null)
      .order('total_donated', { ascending: false })
      .limit(5),
  ]);

  const totalBalance = (accounts ?? []).reduce((s, a) => s + ((a as { balance: number }).balance ?? 0), 0);
  const totalIncome = (income ?? []).reduce((s, t) => s + ((t as { amount: number }).amount ?? 0), 0);
  const totalExpense = (expense ?? []).reduce((s, t) => s + ((t as { amount: number }).amount ?? 0), 0);
  const loans = (activeLoans ?? []) as LoanRow[];
  const tx = (recentTx ?? []) as unknown as TxRow[];
  const donors = (topDonors ?? []) as DonorRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keuangan"
        description="Ringkasan kondisi keuangan organisasi"
        actions={
          <div className="flex gap-2">
            <Link href="/finance/transactions" className="btn-secondary">
              <ArrowLeftRight size={14} /> Transaksi
            </Link>
            <Link href="/finance/loans" className="btn-secondary">
              <Banknote size={14} /> Pinjaman
            </Link>
          </div>
        }
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Saldo"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          title="Pemasukan Bulan Ini"
          value={formatCurrency(totalIncome)}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          title="Pengeluaran Bulan Ini"
          value={formatCurrency(totalExpense)}
          icon={TrendingDown}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          title="Pinjaman Aktif"
          value={loans.length}
          subtitle={`Sisa ${formatCurrency(loans.reduce((s, l) => s + (l.remaining_amount ?? 0), 0))}`}
          icon={Banknote}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Accounts */}
      <div className="bento-card p-5">
        <h2 className="section-title mb-4">Rekening Kas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(accounts ?? []).map((acc) => {
            const a = acc as { id: string; name: string; description: string | null; balance: number };
            return (
              <div
                key={a.id}
                className="rounded-xl border border-slate-200 p-4 hover:border-brand-300 transition-colors"
              >
                <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                {a.description && <p className="text-xs text-slate-400 mt-0.5">{a.description}</p>}
                <p className="font-display text-xl font-bold text-brand-700 mt-2">{formatCurrency(a.balance)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bento-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Transaksi Terbaru</h2>
            <Link href="/finance/transactions" className="text-sm text-brand-700 hover:underline font-medium">
              Lihat semua
            </Link>
          </div>
          <div className="space-y-1">
            {tx.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    t.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  {t.type === 'income' ? (
                    <TrendingUp size={14} className="text-green-600" />
                  ) : (
                    <TrendingDown size={14} className="text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(t.transaction_date)} · {t.account?.name ?? '-'}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold shrink-0 ${
                    t.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
            {tx.length === 0 && <p className="text-center text-slate-400 text-sm py-6">Belum ada transaksi</p>}
          </div>
        </div>

        <div className="space-y-4">
          {/* Active Loans */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Pinjaman Aktif</h2>
              <Link href="/finance/loans" className="text-sm text-brand-700 hover:underline">
                Semua
              </Link>
            </div>
            <div className="space-y-2">
              {loans.slice(0, 4).map((l) => (
                <div key={l.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">{l.borrower_name}</p>
                    <Badge variant="info" size="sm">
                      {l.loan_number}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Sisa: <span className="font-semibold text-red-600">{formatCurrency(l.remaining_amount ?? 0)}</span>
                  </p>
                  {l.due_date && <p className="text-xs text-slate-400">Jatuh tempo: {formatDateShort(l.due_date)}</p>}
                </div>
              ))}
              {loans.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-3">Tidak ada pinjaman aktif</p>
              )}
            </div>
          </div>

          {/* Top Donors */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Top Donatur</h2>
              <Link href="/finance/donors" className="text-sm text-brand-700 hover:underline">
                Semua
              </Link>
            </div>
            <div className="space-y-2">
              {donors.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? 'bg-amber-400 text-white'
                        : i === 1
                        ? 'bg-slate-300 text-slate-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <p className="flex-1 text-sm font-medium text-slate-800 truncate">{d.name}</p>
                  <span className="text-xs font-semibold text-brand-700">{formatCurrency(d.total_donated)}</span>
                </div>
              ))}
              {donors.length === 0 && <p className="text-sm text-slate-400 text-center py-3">Belum ada donatur</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
