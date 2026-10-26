import type {
  ActivityType,
  AssetKind,
  AssetStatus,
  ClientKind,
  Priority,
  SlaPolicy,
  TicketChannel,
  TicketStatus,
} from './types';
import type { SlaState } from './sla';

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Критический',
  high: 'Высокий',
  normal: 'Обычный',
  low: 'Низкий',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'Новая',
  open: 'В работе',
  pending: 'Ожидает',
  resolved: 'Решена',
  closed: 'Закрыта',
};

export const CHANNEL_LABELS: Record<TicketChannel, string> = {
  phone: 'Телефон',
  email: 'E-mail',
  chat: 'Чат',
  portal: 'Личный кабинет',
};

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  router: 'Маршрутизатор',
  ont: 'ONU / оптический терминал',
  stb: 'ТВ-приставка',
  camera: 'IP-камера',
  switch: 'Коммутатор',
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  online: 'В сети',
  offline: 'Не в сети',
  maintenance: 'Обслуживание',
};

export const CLIENT_KIND_LABELS: Record<ClientKind, string> = {
  individual: 'Частное лицо',
  business: 'Компания',
};

export const SLA_STATE_LABELS: Record<SlaState, string> = {
  overdue: 'Просрочен',
  'due-soon': 'Скоро дедлайн',
  'on-track': 'В норме',
  met: 'Соблюдён',
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  ticket_created: 'Новая заявка',
  status_changed: 'Статус',
  message_added: 'Сообщение',
  note_added: 'Заметка',
  assigned: 'Назначение',
  priority_changed: 'Приоритет',
  resolved: 'Решена',
  tags_changed: 'Теги',
};

export const SLA_TARGET_LABELS: Record<Priority, (policy: SlaPolicy) => string> = {
  critical: (policy) => `Реакция ${policy.responseMinutes} мин · решение 4 ч`,
  high: (policy) => `Реакция ${policy.responseMinutes} мин · решение 8 ч`,
  normal: (policy) => `Реакция ${policy.responseMinutes / 60} ч · решение 24 ч`,
  low: (policy) => `Реакция ${policy.responseMinutes / 60} ч · решение 48 ч`,
};

export function pluralRu(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
