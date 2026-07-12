import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  return formatDate(d);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'م';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'ك';
  return num.toString();
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'text-green-600 bg-green-100',
    INACTIVE: 'text-gray-600 bg-gray-100',
    PENDING: 'text-yellow-600 bg-yellow-100',
    CLOSED: 'text-gray-600 bg-gray-100',
    ESCALATED: 'text-red-600 bg-red-100',
    NEW: 'text-blue-600 bg-blue-100',
    CONTACTED: 'text-purple-600 bg-purple-100',
    QUALIFIED: 'text-green-600 bg-green-100',
    CONVERTED: 'text-emerald-600 bg-emerald-100',
    LOST: 'text-red-600 bg-red-100',
    TRAINING: 'text-orange-600 bg-orange-100',
    ERROR: 'text-red-600 bg-red-100',
    completed: 'text-green-600 bg-green-100',
    processing: 'text-yellow-600 bg-yellow-100',
    failed: 'text-red-600 bg-red-100',
  };
  return colors[status.toUpperCase()] || 'text-gray-600 bg-gray-100';
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    ADMIN: 'text-purple-600 bg-purple-100',
    MANAGER: 'text-blue-600 bg-blue-100',
    AGENT: 'text-green-600 bg-green-100',
    VIEWER: 'text-gray-600 bg-gray-100',
  };
  return colors[role.toUpperCase()] || 'text-gray-600 bg-gray-100';
}