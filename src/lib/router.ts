import { useMemo, useSyncExternalStore } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'tickets' }
  | { name: 'ticket'; id: string }
  | { name: 'clients' }
  | { name: 'client'; id: string }
  | { name: 'kb' }
  | { name: 'article'; slug: string }
  | { name: 'settings' }
  | { name: 'not-found'; path: string };

const DEFAULT_HASH = '#/dashboard';

function readHash(): string {
  return window.location.hash || DEFAULT_HASH;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseRoute(hash: string): Route {
  const normalized = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const segments = normalized.split('/').filter(Boolean);
  const [first, second] = segments;

  if (!first || first === 'dashboard') return { name: 'dashboard' };
  if (first === 'tickets') {
    return second ? { name: 'ticket', id: decodeSegment(second) } : { name: 'tickets' };
  }
  if (first === 'clients') {
    return second ? { name: 'client', id: decodeSegment(second) } : { name: 'clients' };
  }
  if (first === 'kb') {
    return second ? { name: 'article', slug: decodeSegment(second) } : { name: 'kb' };
  }
  if (first === 'settings') return { name: 'settings' };
  return { name: 'not-found', path: normalized };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, readHash, () => DEFAULT_HASH);
  return useMemo(() => parseRoute(hash), [hash]);
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

export const routeHref = {
  dashboard: '#/dashboard',
  tickets: '#/tickets',
  ticket: (id: string): string => `#/tickets/${encodeURIComponent(id)}`,
  clients: '#/clients',
  client: (id: string): string => `#/clients/${encodeURIComponent(id)}`,
  kb: '#/kb',
  article: (slug: string): string => `#/kb/${encodeURIComponent(slug)}`,
  settings: '#/settings',
} as const;

export function isSectionActive(route: Route, section: 'dashboard' | 'tickets' | 'clients' | 'kb' | 'settings'): boolean {
  if (section === 'dashboard') return route.name === 'dashboard';
  if (section === 'tickets') return route.name === 'tickets' || route.name === 'ticket';
  if (section === 'clients') return route.name === 'clients' || route.name === 'client';
  if (section === 'kb') return route.name === 'kb' || route.name === 'article';
  return route.name === 'settings';
}
