import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-brand-600" />
        <p className="text-sm text-slate-500 font-medium">Memuat...</p>
      </div>
    </div>
  );
}
