"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Users, Wallet, ArrowLeftRight, Banknote, HeartHandshake,
  CalendarCheck, CreditCard, Recycle, BarChart3, PackageSearch, Trophy,
  PieChart, ChevronDown, ChevronRight, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";

const icons: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Wallet, ArrowLeftRight, Banknote, HeartHandshake,
  CalendarCheck, CreditCard, Recycle, BarChart3, PackageSearch, Trophy, PieChart,
};

interface NavChild { href: string; label: string; icon: string; }
interface NavItem {
  href?: string; label: string; icon: string;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/members", label: "Anggota", icon: "Users" },
  {
    label: "Keuangan", icon: "Wallet",
    children: [
      { href: "/finance", label: "Ringkasan", icon: "PieChart" },
      { href: "/finance/transactions", label: "Transaksi", icon: "ArrowLeftRight" },
      { href: "/finance/loans", label: "Pinjaman", icon: "Banknote" },
      { href: "/finance/donors", label: "Donatur", icon: "HeartHandshake" },
    ],
  },
  { href: "/attendance", label: "Absensi Rapat", icon: "CalendarCheck" },
  { href: "/dues", label: "Iuran Anggota", icon: "CreditCard" },
  {
    label: "Bank Sampah", icon: "Recycle",
    children: [
      { href: "/waste-bank", label: "Ringkasan", icon: "BarChart3" },
      { href: "/waste-bank/collections", label: "Pengumpulan", icon: "PackageSearch" },
      { href: "/waste-bank/leaderboard", label: "Leaderboard", icon: "Trophy" },
    ],
  },
];

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  const Icon = icons[icon] ?? LayoutDashboard;
  return (
    <Link href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
        active
          ? "bg-brand-700 text-white shadow-sm shadow-brand-900/20"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}>
      <Icon size={18} className="shrink-0" />
      {label}
    </Link>
  );
}

function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const isChildActive = item.children?.some(c => pathname.startsWith(c.href)) ?? false;
  const [open, setOpen] = useState(isChildActive);
  const Icon = icons[item.icon] ?? LayoutDashboard;

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
          isChildActive ? "text-brand-700 bg-brand-50" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}>
        <Icon size={18} className="shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-0.5">
          {item.children?.map(child => (
            <NavLink key={child.href} {...child} active={pathname === child.href || (child.href !== "/finance" && child.href !== "/waste-bank" && pathname.startsWith(child.href))} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-brand-700 flex items-center justify-center shrink-0">
          <span className="text-xs font-display font-bold text-white">STT</span>
        </div>
        <div>
          <p className="font-display text-sm font-bold text-slate-900 leading-tight">Tunas Guna Dharma</p>
          <p className="text-xs text-slate-500">Sistem Manajemen</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(item =>
          item.href
            ? <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon}
                active={item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)} />
            : <NavGroup key={item.label} item={item} pathname={pathname} />
        )}
      </nav>
      <div className="px-3 py-4 border-t border-slate-200">
        <p className="text-xs text-slate-400 text-center">© 2024 STT TGD</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-slate-200 flex-col shrink-0">
        {content}
      </aside>
      {/* Mobile toggle */}
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
        <Menu size={18} />
      </button>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white h-full shadow-xl flex flex-col">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
