import { format, formatDistance, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("id-ID").format(num);
}

export function formatDate(
  dateStr: string | null | undefined,
  fmt = "d MMMM yyyy"
): string {
  if (!dateStr) return "-";
  try {
    return format(parseISO(dateStr), fmt, { locale: id });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | null | undefined): string {
  return formatDate(dateStr, "dd/MM/yyyy");
}

export function formatDateTime(dateStr: string | null | undefined): string {
  return formatDate(dateStr, "d MMM yyyy HH:mm");
}

export function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistance(parseISO(dateStr), new Date(), {
      addSuffix: true,
      locale: id,
    });
  } catch {
    return dateStr;
  }
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} ton`;
  if (kg === 0) return "0 kg";
  return `${kg % 1 === 0 ? kg : kg.toFixed(3)} kg`;
}

export function getMonthName(month: number): string {
  const months = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember",
  ];
  return months[month - 1] ?? "-";
}

export function formatPeriod(year: number, month: number): string {
  return `${getMonthName(month)} ${year}`;
}
