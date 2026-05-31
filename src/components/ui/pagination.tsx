import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
        <ChevronLeft size={14} />
      </button>
      {pages.map(p => (
        <button key={p} onClick={() => onPageChange(p)}
          className={cn("w-8 h-8 rounded-lg text-sm font-medium transition-colors",
            p === page ? "bg-brand-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50")}>
          {p}
        </button>
      ))}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
