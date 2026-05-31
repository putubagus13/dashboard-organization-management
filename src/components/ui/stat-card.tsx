import { cn } from "@/lib/utils/helpers";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export default function StatCard({
  title, value, subtitle, icon: Icon, iconColor = "text-brand-600",
  iconBg = "bg-brand-50", trend, className
}: StatCardProps) {
  return (
    <div className={cn("bento-card p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="stat-value text-slate-900 mt-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn("text-xs font-semibold", trend.value >= 0 ? "text-green-600" : "text-red-600")}>
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-slate-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon size={22} className={iconColor} />
        </div>
      </div>
    </div>
  );
}
