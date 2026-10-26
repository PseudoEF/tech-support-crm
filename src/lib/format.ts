import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isYesterday,
} from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy, HH:mm', { locale: ru });
}

export function formatShortDateTime(iso: string): string {
  return format(new Date(iso), 'd MMM, HH:mm', { locale: ru });
}

export function formatDate(iso: string): string {
  return format(new Date(iso), 'd MMMM yyyy', { locale: ru });
}

export function formatDateShort(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy', { locale: ru });
}

export function formatTime(iso: string): string {
  return format(new Date(iso), 'HH:mm', { locale: ru });
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const difference = now.getTime() - date.getTime();
  if (difference < 45_000) return 'только что';
  if (difference < 60 * 60_000) {
    const minutes = Math.max(1, Math.floor(difference / 60_000));
    return `${minutes} мин назад`;
  }
  if (isToday(date)) {
    return `сегодня, ${formatTime(iso)}`;
  }
  if (isYesterday(date)) {
    return `вчера, ${formatTime(iso)}`;
  }
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: ru });
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}

export function initials(name: string): string {
  const cleaned = name.replace(/[«»"]/g, ' ').trim();
  const parts = cleaned
    .split(/\s+/)
    .filter((part) => !['ООО', 'ИП', 'АО', 'ПАО', 'ЗАО'].includes(part.toUpperCase()));
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}
