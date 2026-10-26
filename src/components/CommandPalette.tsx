import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { computeSla } from '../domain/sla';
import { PRIORITY_LABELS, STATUS_LABELS } from '../domain/labels';
import type { CrmSnapshot } from '../domain/types';
import { navigate, routeHref } from '../lib/router';
import { Icon, type IconName } from './Icon';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  data: CrmSnapshot;
  now: Date;
}

interface PaletteResult {
  id: string;
  kind: 'ticket' | 'client' | 'article' | 'nav';
  title: string;
  subtitle: string;
  href: string;
  icon: IconName;
}

interface PaletteGroup {
  label: string;
  results: PaletteResult[];
}

const QUICK_LINKS: PaletteResult[] = [
  {
    id: 'nav-dashboard',
    kind: 'nav',
    title: 'Обзор',
    subtitle: 'Метрики и последние события',
    href: routeHref.dashboard,
    icon: 'dashboard',
  },
  {
    id: 'nav-tickets',
    kind: 'nav',
    title: 'Все заявки',
    subtitle: 'Фильтры, поиск и SLA',
    href: routeHref.tickets,
    icon: 'tickets',
  },
  {
    id: 'nav-clients',
    kind: 'nav',
    title: 'Клиенты',
    subtitle: 'Контакты, оборудование и история',
    href: routeHref.clients,
    icon: 'clients',
  },
  {
    id: 'nav-kb',
    kind: 'nav',
    title: 'База знаний',
    subtitle: 'Регламенты и инструкции',
    href: routeHref.kb,
    icon: 'book',
  },
  {
    id: 'nav-settings',
    kind: 'nav',
    title: 'Настройки демо',
    subtitle: 'Сброс данных и горячие клавиши',
    href: routeHref.settings,
    icon: 'settings',
  },
];

export function CommandPalette({ open, onClose, data, now }: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousOverflowRef = useRef('');
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const listId = useId();
  const activeOptionId = `palette-option-${selected}`;
  const clientById = useMemo(
    () => new Map(data.clients.map((client) => [client.id, client])),
    [data.clients],
  );

  const groups = useMemo<PaletteGroup[]>(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    if (!normalized) {
      const overdue = data.tickets
        .filter((ticket) => {
          const active =
            ticket.status === 'new' || ticket.status === 'open' || ticket.status === 'pending';
          return active && computeSla(ticket, now, data.slaPolicies).overall === 'overdue';
        })
        .sort(
          (left, right) =>
            computeSla(right, now, data.slaPolicies).resolutionRemainingMs -
            computeSla(left, now, data.slaPolicies).resolutionRemainingMs,
        )
        .slice(0, 5)
        .map<PaletteResult>((ticket) => ({
          id: `ticket-${ticket.id}`,
          kind: 'ticket',
          title: `${ticket.number} · ${ticket.subject}`,
          subtitle: `${clientById.get(ticket.clientId)?.name ?? 'Клиент'} · ${
            PRIORITY_LABELS[ticket.priority]
          }`,
          href: routeHref.ticket(ticket.id),
          icon: 'tickets',
        }));

      return [
        { label: 'Перейти', results: QUICK_LINKS },
        ...(overdue.length > 0 ? [{ label: 'Просрочен SLA', results: overdue }] : []),
      ];
    }

    const tickets = data.tickets
      .filter((ticket) => {
        const clientName = clientById.get(ticket.clientId)?.name ?? '';
        return [ticket.number, ticket.subject, clientName, ...ticket.tags]
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      })
      .slice(0, 6)
      .map<PaletteResult>((ticket) => ({
        id: `ticket-${ticket.id}`,
        kind: 'ticket',
        title: `${ticket.number} · ${ticket.subject}`,
        subtitle: `${clientById.get(ticket.clientId)?.name ?? 'Клиент'} · ${
          STATUS_LABELS[ticket.status]
        }`,
        href: routeHref.ticket(ticket.id),
        icon: 'tickets',
      }));

    const clients = data.clients
      .filter((client) =>
        [
          client.name,
          client.contactName ?? '',
          client.email,
          client.phone,
          client.accountNumber,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 4)
      .map<PaletteResult>((client) => ({
        id: `client-${client.id}`,
        kind: 'client',
        title: client.name,
        subtitle: `${client.accountNumber} · ${client.phone}`,
        href: routeHref.client(client.id),
        icon: 'clients',
      }));

    const articles = data.kbArticles
      .filter((article) =>
        [article.title, article.excerpt, article.category, ...article.tags]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 4)
      .map<PaletteResult>((article) => ({
        id: `article-${article.id}`,
        kind: 'article',
        title: article.title,
        subtitle: `${article.category} · ${article.readMinutes} мин чтения`,
        href: routeHref.article(article.slug),
        icon: 'book',
      }));

    const result: PaletteGroup[] = [];
    if (tickets.length > 0) result.push({ label: 'Заявки', results: tickets });
    if (clients.length > 0) result.push({ label: 'Клиенты', results: clients });
    if (articles.length > 0) result.push({ label: 'База знаний', results: articles });
    return result;
  }, [clientById, data, deferredQuery, now]);

  const flatResults = useMemo(() => groups.flatMap((group) => group.results), [groups]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    setQuery('');
    setSelected(0);
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  const finishClose = useCallback(() => {
    if (dialogRef.current?.open) dialogRef.current.close();
    document.body.style.overflow = previousOverflowRef.current;
  }, []);

  useEffect(() => finishClose, [finishClose]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const choose = (result: PaletteResult) => {
    navigate(result.href);
    onClose();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <AnimatePresence onExitComplete={finishClose}>
      {open ? (
        <motion.dialog
          ref={dialogRef}
          className="command-palette"
          aria-label="Быстрый поиск"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.16 }}
          onCancel={(event) => {
            event.preventDefault();
            onClose();
          }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="palette-panel"
            initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: reducedMotion ? 0 : 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="palette-search">
              <Icon name="search" size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelected(0);
                }}
                placeholder="Найти заявку, клиента или статью…"
                aria-label="Поиск по CRM"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={flatResults[selected] ? activeOptionId : undefined}
                aria-autocomplete="list"
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    if (flatResults.length > 0) {
                      setSelected((current) => (current + 1) % flatResults.length);
                    }
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    if (flatResults.length > 0) {
                      setSelected(
                        (current) => (current - 1 + flatResults.length) % flatResults.length,
                      );
                    }
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    const result = flatResults[selected];
                    if (result) choose(result);
                  }
                }}
              />
              <kbd>Esc</kbd>
            </div>
            <div className="palette-results" id={listId} role="listbox" ref={listRef}>
              {flatResults.length === 0 ? (
                <div className="palette-empty">
                  <Icon name="search" size={22} />
                  <p>Ничего не найдено</p>
                  <span>Попробуйте номер заявки, имя клиента или категорию статьи.</span>
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.label}
                    className="palette-group"
                    role="group"
                    aria-label={group.label}
                  >
                    <div className="palette-group-label">{group.label}</div>
                    {group.results.map((result) => {
                      const flatIndex = flatResults.findIndex((item) => item.id === result.id);
                      const active = flatIndex === selected;
                      return (
                        <div
                          key={result.id}
                          id={`palette-option-${flatIndex}`}
                          role="option"
                          aria-selected={active}
                          data-active={active}
                          className={`palette-option ${active ? 'is-selected' : ''}`}
                          onMouseMove={() => setSelected(flatIndex)}
                          onClick={() => choose(result)}
                        >
                          <span className="palette-option-icon">
                            <Icon name={result.icon} size={17} />
                          </span>
                          <span className="palette-option-copy">
                            <strong>{result.title}</strong>
                            <span>{result.subtitle}</span>
                          </span>
                          <Icon name="arrow-up-right" size={15} className="palette-arrow" />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <footer className="palette-footer">
              <span>
                <kbd>↑</kbd> <kbd>↓</kbd> навигация
              </span>
              <span>
                <kbd>Enter</kbd> открыть
              </span>
              <span className="palette-footer-brand">
                <Icon name="spark" size={14} /> Быстрый поиск
              </span>
            </footer>
          </motion.div>
        </motion.dialog>
      ) : null}
    </AnimatePresence>
  );
}
