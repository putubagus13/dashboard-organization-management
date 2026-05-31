import { cn } from "@/lib/utils/helpers";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "secondary";
  size?: "sm" | "md";
  dot?: boolean;
}

const variants = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  secondary: "bg-purple-100 text-purple-700",
};

const dotColors = {
  default: "bg-slate-500",
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  secondary: "bg-purple-500",
};

export default function Badge({ children, variant = "default", size = "md", dot }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-medium rounded-full",
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
      variants[variant]
    )}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])} />}
      {children}
    </span>
  );
}
