"use client";
import { Loader2, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: "danger" | "warning";
}

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading, variant = "danger" }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${variant === "danger" ? "bg-red-100" : "bg-amber-100"}`}>
            <AlertTriangle size={20} className={variant === "danger" ? "text-red-600" : "text-amber-600"} />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onCancel} className="btn-secondary" disabled={loading}>Batal</button>
          <button onClick={onConfirm} disabled={loading}
            className={variant === "danger" ? "btn-danger" : "inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 active:scale-95 transition-all"}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {variant === "danger" ? "Hapus" : "Lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
