import type { IconName } from './Icon';

const CATEGORY_ICONS: Record<string, IconName> = {
  Подключение: 'activity',
  Оборудование: 'device',
  'Wi-Fi': 'wifi',
  Оплата: 'tag',
  Безопасность: 'lock',
  Бизнес: 'building',
};

const CATEGORY_CLASS: Record<string, string> = {
  Подключение: 'cat-connect',
  Оборудование: 'cat-hardware',
  'Wi-Fi': 'cat-wifi',
  Оплата: 'cat-payment',
  Безопасность: 'cat-security',
  Бизнес: 'cat-business',
};

export function categoryIcon(category: string): IconName {
  return CATEGORY_ICONS[category] ?? 'book';
}

export function categoryClass(category: string): string {
  return CATEGORY_CLASS[category] ?? 'cat-default';
}
