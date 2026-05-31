import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function generateInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function calculateLoanProgress(totalPaid: number, principal: number): number {
  if (principal === 0) return 100;
  return Math.min(Math.round((totalPaid / principal) * 100), 100);
}

export function getDuesStatusColor(status: string): string {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700 border-green-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    waived: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-700';
}

export function getAttendanceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    excused: 'bg-blue-100 text-blue-700',
    sick: 'bg-amber-100 text-amber-700',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-700';
}

export function getLoanStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-700';
}

export function getMeetingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    ongoing: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-700';
}

export function getTransactionTypeColor(type: string): string {
  return type === 'income' 
    ? 'text-green-600' 
    : type === 'expense' 
    ? 'text-red-600' 
    : 'text-blue-600';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
