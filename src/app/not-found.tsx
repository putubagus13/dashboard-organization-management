import Link from "next/link";
import { Home, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h1 className="font-display text-3xl font-bold text-slate-900">404</h1>
        <p className="text-slate-500">Halaman yang Anda cari tidak ditemukan.</p>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 btn-primary mt-4">
          <Home size={16} /> Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
