import { useId, useMemo, useState, type ChangeEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  DEFAULT_TICKET_FILTERS,
  filterTickets,
  sortTickets,
  type TicketFilterContext,
  type TicketListFilters,
  type TicketSort,
} from '../domain/selectors';
import { PRIORITIES, TICKET_STATUSES, type TicketStatus } from '../domain/types';
import { PRIORITY_LABELS, SLA_STATE_LABELS, STATUS_LABELS } from '../domain/labels';
import type { SlaState } from '../domain/sla';
import { isPriority, isSlaFilter, isTicketSort } from '../domain/guards';
import { formatRelative } from '../lib/format';
import { routeHref } from '../lib/router';
import { useCrmData } from '../state/CrmContext';
import { useNow } from '../lib/useNow';
import { Avatar } from '../components/Avatar';
import { PriorityBadge, SlaBadge, StatusBadge } from '../components/Badges';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';

const PAGE_SIZE = 50;
const SORT_LABELS: Record<TicketSort, string> = {
  'updated-desc': 'Недавно обновлённые',
  'created-desc': 'Сначала новые',
  'priority-desc': 'По приоритету',
  'sla-asc': 'По срочности SLA',
  'number-asc': 'По номеру',
};

const SLA_OPTIONS: Array<SlaState | 'all'> = ['all', 'overdue', 'due-soon', 'on-track', 'met'];

function countStatuses(
  tickets: readonly { status: TicketStatus }[],
): Record<TicketStatus, number> {
  const counts: Record<TicketStatus, number> = {
    new: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
  };
  tickets.forEach((ticket) => {
    counts[ticket.status] += 1;
  });
  return counts;
}

export function TicketsPage() {
  const data = useCrmData();
  const now = useNow(30_000);
  const reducedMotion = useReducedMotion();
  const tabIndicatorId = useId().replace(/:/g, '');
  const [filters, setFilters] = useState<TicketListFilters>(DEFAULT_TICKET_FILTERS);
  const [sort, setSort] = useState<TicketSort>('updated-desc');
  const [page, setPage] = useState(1);

  const clientNameById = useMemo(
    () => new Map(data.clients.map((client) => [client.id, client.name])),
    [data.clients],
  );
  const clientById = useMemo(
    () => new Map(data.clients.map((client) => [client.id, client])),
    [data.clients],
  );
  const teamById = useMemo(
    () => new Map(data.teams.map((team) => [team.id, team])),
    [data.teams],
  );
  const agentById = useMemo(
    () => new Map(data.agents.map((agent) => [agent.id, agent])),
    [data.agents],
  );

  const context = useMemo<TicketFilterContext>(
    () => ({ clientNameById, policies: data.slaPolicies, now }),
    [clientNameById, data.slaPolicies, now],
  );

  const filtered = useMemo(
    () => filterTickets(data.tickets, filters, context),
    [context, data.tickets, filters],
  );
  const sorted = useMemo(
    () => sortTickets(filtered, sort, context),
    [context, filtered, sort],
  );

  const statusCounts = useMemo(() => countStatuses(data.tickets), [data.tickets]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const start = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, sorted.length);

  const hasFilters =
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.teamId !== 'all' ||
    filters.assigneeId !== 'all' ||
    filters.sla !== 'all';

  function applyFilter<K extends keyof TicketListFilters>(
    key: K,
    value: TicketListFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(DEFAULT_TICKET_FILTERS);
    setSort('updated-desc');
    setPage(1);
  }

  const activeCount = statusCounts.new + statusCounts.open + statusCounts.pending;

  return (
    <div className="page tickets-page">
      <PageHeader
        title="Заявки"
        description={`${data.tickets.length} заявок · ${activeCount} активных · очередь обновляется автоматически`}
        actions={
          <a href={routeHref.dashboard} className="button button-secondary">
            <Icon name="dashboard" size={16} />К обзору
          </a>
        }
      />

      <div className="status-tabs" role="group" aria-label="Фильтр по статусу">
        <button
          type="button"
          className={`status-tab ${filters.status === 'all' ? 'is-active' : ''}`}
          aria-pressed={filters.status === 'all'}
          onClick={() => applyFilter('status', 'all')}
        >
          {filters.status === 'all' ? (
            <motion.span
              className="status-tab-indicator"
              layoutId={`status-tab-${tabIndicatorId}`}
              transition={{
                duration: reducedMotion ? 0 : 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ) : null}
          <span>Все</span>
          <strong>{data.tickets.length}</strong>
        </button>
        {TICKET_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`status-tab status-tab-${status} ${
              filters.status === status ? 'is-active' : ''
            }`}
            aria-pressed={filters.status === status}
            onClick={() => applyFilter('status', status)}
          >
            {filters.status === status ? (
              <motion.span
                className="status-tab-indicator"
                layoutId={`status-tab-${tabIndicatorId}`}
                transition={{
                  duration: reducedMotion ? 0 : 0.24,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            ) : null}
            <span className="status-tab-dot" aria-hidden="true" />
            <span>{STATUS_LABELS[status]}</span>
            <strong>{statusCounts[status]}</strong>
          </button>
        ))}
      </div>

      <section className="filter-panel" aria-label="Фильтры заявок">
        <div className="filter-row">
          <div className="search-field">
            <label htmlFor="ticket-search">Поиск</label>
            <div className="search-input-wrap">
              <Icon name="search" size={17} />
              <input
                id="ticket-search"
                type="search"
                placeholder="Номер, тема или клиент"
                value={filters.search}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  applyFilter('search', event.target.value);
                }}
              />
              {filters.search ? (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Очистить поиск"
                  onClick={() => applyFilter('search', '')}
                >
                  <Icon name="close" size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <label className="filter-field">
            <span>Приоритет</span>
            <select
              value={filters.priority}
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'all' || isPriority(value)) {
                  applyFilter('priority', value);
                }
              }}
            >
              <option value="all">Любой</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Команда</span>
            <select
              value={filters.teamId}
              onChange={(event) => applyFilter('teamId', event.target.value)}
            >
              <option value="all">Все команды</option>
              {data.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Исполнитель</span>
            <select
              value={filters.assigneeId}
              onChange={(event) => applyFilter('assigneeId', event.target.value)}
            >
              <option value="all">Все</option>
              {data.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>SLA</span>
            <select
              value={filters.sla}
              onChange={(event) => {
                const value = event.target.value;
                if (isSlaFilter(value)) {
                  applyFilter('sla', value);
                }
              }}
            >
              {SLA_OPTIONS.map((state) => (
                <option key={state} value={state}>
                  {state === 'all' ? 'Любой' : SLA_STATE_LABELS[state]}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Сортировка</span>
            <select
              value={sort}
              onChange={(event) => {
                const value = event.target.value;
                if (isTicketSort(value)) {
                  setSort(value);
                  setPage(1);
                }
              }}
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="filter-summary">
          <span>
            Найдено <strong>{sorted.length}</strong> из {data.tickets.length}
          </span>
          {hasFilters ? (
            <button type="button" className="text-button" onClick={resetFilters}>
              <Icon name="close" size={14} />
              Сбросить фильтры
            </button>
          ) : (
            <span className="filter-hint">
              <Icon name="command" size={14} /> Ctrl K для быстрого перехода
            </span>
          )}
        </div>
      </section>

      {sorted.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="search"
            title="Заявок не найдено"
            description="Измените поисковый запрос или сбросьте выбранные фильтры."
            action={
              <button type="button" className="button button-secondary" onClick={resetFilters}>
                Сбросить фильтры
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="card tickets-table-card">
            <div className="table-scroll">
              <table className="data-table tickets-table">
                <caption className="sr-only">
                  Список заявок поддержки с фильтрами и SLA
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Заявка</th>
                    <th scope="col">Клиент</th>
                    <th scope="col">Приоритет</th>
                    <th scope="col">Исполнитель</th>
                    <th scope="col">Статус</th>
                    <th scope="col">SLA</th>
                    <th scope="col">Обновлено</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((ticket) => {
                    const client = clientById.get(ticket.clientId);
                    const assignee = ticket.assigneeId
                      ? agentById.get(ticket.assigneeId)
                      : undefined;
                    const team = teamById.get(ticket.teamId);
                    return (
                      <tr key={ticket.id}>
                        <td className="ticket-cell">
                          <a href={routeHref.ticket(ticket.id)} className="ticket-subject">
                            {ticket.subject}
                          </a>
                          <span className="ticket-submeta">
                            {ticket.number} · {team?.name ?? 'Без команды'}
                          </span>
                        </td>
                        <td>
                          <a href={routeHref.client(ticket.clientId)} className="client-cell">
                            <Avatar name={client?.name ?? 'Клиент'} size={30} />
                            <span>
                              <strong>{client?.name ?? 'Неизвестный клиент'}</strong>
                              <small>{client?.accountNumber ?? '—'}</small>
                            </span>
                          </a>
                        </td>
                        <td>
                          <PriorityBadge priority={ticket.priority} />
                        </td>
                        <td>
                          {assignee ? (
                            <span className="assignee-cell">
                              <Avatar name={assignee.name} size={26} />
                              <span>{assignee.name}</span>
                            </span>
                          ) : (
                            <span className="muted-text">Не назначен</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td>
                          <SlaBadge ticket={ticket} now={now} policies={data.slaPolicies} />
                        </td>
                        <td className="updated-cell">
                          <time dateTime={ticket.updatedAt}>
                            {formatRelative(ticket.updatedAt, now)}
                          </time>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tickets-cards">
            {pageItems.map((ticket) => {
              const client = clientById.get(ticket.clientId);
              const assignee = ticket.assigneeId
                ? agentById.get(ticket.assigneeId)
                : undefined;
              return (
                <article className="ticket-mobile-card" key={ticket.id}>
                  <div className="ticket-mobile-top">
                    <span className="ticket-number">{ticket.number}</span>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <a href={routeHref.ticket(ticket.id)} className="ticket-mobile-subject">
                    {ticket.subject}
                  </a>
                  <a href={routeHref.client(ticket.clientId)} className="ticket-mobile-client">
                    <Avatar name={client?.name ?? 'Клиент'} size={26} />
                    {client?.name ?? 'Неизвестный клиент'}
                  </a>
                  <div className="ticket-mobile-meta">
                    <StatusBadge status={ticket.status} />
                    {assignee ? (
                      <span className="ticket-mobile-assignee">{assignee.name}</span>
                    ) : (
                      <span className="muted-text">Не назначен</span>
                    )}
                  </div>
                  <div className="ticket-mobile-bottom">
                    <SlaBadge ticket={ticket} now={now} policies={data.slaPolicies} />
                    <time dateTime={ticket.updatedAt}>
                      {formatRelative(ticket.updatedAt, now)}
                    </time>
                  </div>
                </article>
              );
            })}
          </div>

          <nav className="pagination" aria-label="Страницы списка заявок">
            <span className="pagination-info">
              Показано {start}–{end} из {sorted.length}
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                className="icon-button"
                aria-label="Предыдущая страница"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                <Icon name="chevron-left" size={17} />
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`page-button ${pageNumber === safePage ? 'is-active' : ''}`}
                  aria-label={`Страница ${pageNumber}`}
                  aria-current={pageNumber === safePage ? 'page' : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                className="icon-button"
                aria-label="Следующая страница"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
              >
                <Icon name="chevron-right" size={17} />
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
