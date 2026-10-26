import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, useReducedMotion } from 'motion/react';
import { computeSla } from '../domain/sla';
import { getSlaHealth, summarizeTickets } from '../domain/selectors';
import { getDashboardTrends } from '../domain/trends';
import {
  PRIORITIES,
  TICKET_STATUSES,
  type Priority,
  type TicketStatus,
} from '../domain/types';
import { PRIORITY_LABELS, STATUS_LABELS, pluralRu } from '../domain/labels';
import { formatDateTime } from '../lib/format';
import { routeHref } from '../lib/router';
import { useCrmData } from '../state/CrmContext';
import { useNow } from '../lib/useNow';
import { ActivityFeed } from '../components/ActivityFeed';
import { Avatar } from '../components/Avatar';
import { PriorityBadge, SlaBadge } from '../components/Badges';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { KpiBento } from '../components/KpiBento';
import { PageHeader } from '../components/PageHeader';
import { SlaRings } from '../components/SlaRings';
import { TicketFlowChart } from '../components/TicketFlowChart';

const PRIORITY_COLOR: Record<Priority, string> = {
  critical: 'var(--danger)',
  high: 'var(--warning)',
  normal: 'var(--brand)',
  low: 'var(--slate-400)',
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  new: '#7c4dd4',
  open: '#2f6fed',
  pending: '#b7791f',
  resolved: '#138a63',
  closed: '#667085',
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const LIST_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const ROW_VARIANTS = {
  hidden: { opacity: 0, y: 7 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function DashboardPage() {
  const data = useCrmData();
  const now = useNow(30_000);
  const reducedMotion = useReducedMotion();
  const metrics = summarizeTickets(data.tickets, now, data.slaPolicies);
  const trends = getDashboardTrends(data.tickets, now, data.slaPolicies, 30);
  const health = getSlaHealth(data.tickets, now, data.slaPolicies);
  const clientById = new Map(data.clients.map((client) => [client.id, client]));
  const maxPriority = Math.max(
    1,
    ...PRIORITIES.map((priority) => metrics.activeByPriority[priority]),
  );

  const overdue = data.tickets
    .filter((ticket) => {
      if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
      return computeSla(ticket, now, data.slaPolicies).overall === 'overdue';
    })
    .sort(
      (left, right) =>
        computeSla(left, now, data.slaPolicies).resolutionRemainingMs -
        computeSla(right, now, data.slaPolicies).resolutionRemainingMs,
    )
    .slice(0, 5);

  const todayLabel = capitalize(format(now, 'EEEE, d MMMM', { locale: ru }));
  const overdueShare =
    metrics.openTickets > 0
      ? Math.round((metrics.overdueTickets / metrics.openTickets) * 100)
      : 0;

  return (
    <div className="page dashboard-page">
      <PageHeader
        title="Обзор поддержки"
        description={`${todayLabel} · операционная смена в разгаре`}
        actions={
          <>
            <a href={routeHref.kb} className="button button-secondary">
              <Icon name="book" size={16} />
              Инструкции
            </a>
            <a href={routeHref.tickets} className="button button-primary">
              <Icon name="tickets" size={16} />
              Открыть очередь
            </a>
          </>
        }
      />

      <KpiBento metrics={metrics} trends={trends} overdueShare={overdueShare} />

      <div className="dashboard-grid dashboard-grid-top">
        <TicketFlowChart points={trends.flow} />
        <SlaRings health={health} />
      </div>

      <div className="dashboard-grid dashboard-grid-bottom">
        <section className="card queue-card" aria-labelledby="queue-title">
          <header className="card-header">
            <div>
              <h2 id="queue-title">Очередь</h2>
              <p>Активные заявки по приоритету и статусу</p>
            </div>
            <span className="card-count">{metrics.openTickets}</span>
          </header>

          <div className="priority-bars">
            {PRIORITIES.map((priority) => {
              const count = metrics.activeByPriority[priority];
              const width = Math.max(3, (count / maxPriority) * 100);
              return (
                <div className="priority-row" key={priority}>
                  <span className="priority-row-label">
                    <span
                      className="priority-swatch"
                      style={{ backgroundColor: PRIORITY_COLOR[priority] }}
                      aria-hidden="true"
                    />
                    {PRIORITY_LABELS[priority]}
                  </span>
                  <span className="priority-bar-track" aria-hidden="true">
                    <span
                      className="priority-bar-fill"
                      style={{
                        width: `${width}%`,
                        backgroundColor: PRIORITY_COLOR[priority],
                      }}
                    />
                  </span>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>

          <div className="queue-statuses" role="list" aria-label="Заявки по статусам">
            {TICKET_STATUSES.map((status) => (
              <div className="queue-status" key={status} role="listitem">
                <span
                  className="status-swatch"
                  style={{ backgroundColor: STATUS_COLOR[status] }}
                  aria-hidden="true"
                />
                <span>{STATUS_LABELS[status]}</span>
                <strong>{metrics.byStatus[status]}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card attention-card" aria-labelledby="attention-title">
          <header className="card-header">
            <div>
              <h2 id="attention-title">Требуют внимания</h2>
              <p>Активные заявки с нарушенным SLA</p>
            </div>
            <a href={routeHref.tickets} className="text-link">
              Вся очередь <Icon name="arrow-right" size={14} />
            </a>
          </header>

          {overdue.length === 0 ? (
            <EmptyState
              icon="check-circle"
              title="Просрочек нет"
              description="Активные заявки укладываются в SLA. Отличная работа."
            />
          ) : (
            <motion.ul
              className="attention-list"
              initial={reducedMotion ? false : 'hidden'}
              animate="visible"
              variants={LIST_VARIANTS}
            >
              {overdue.map((ticket) => {
                const client = clientById.get(ticket.clientId);
                const sla = computeSla(ticket, now, data.slaPolicies);
                return (
                  <motion.li key={ticket.id} variants={ROW_VARIANTS}>
                    <a href={routeHref.ticket(ticket.id)} className="attention-row">
                      <Avatar name={client?.name ?? 'Клиент'} size={36} />
                      <span className="attention-copy">
                        <strong>{ticket.subject}</strong>
                        <span>
                          {client?.name ?? 'Клиент'} · {ticket.number} ·{' '}
                          {pluralRu(ticket.tags.length, 'тег', 'тега', 'тегов')}
                        </span>
                      </span>
                      <span className="attention-meta">
                        <PriorityBadge priority={ticket.priority} />
                        <span className="attention-sla">
                          {sla.responseBreached ? 'Просрочен ответ' : 'Просрочено решение'}
                        </span>
                      </span>
                      <SlaBadge ticket={ticket} now={now} policies={data.slaPolicies} />
                    </a>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </section>

        <section className="card activity-card" aria-labelledby="activity-title">
          <header className="card-header">
            <div>
              <h2 id="activity-title">Последние события</h2>
              <p>Действия команды в реальном времени</p>
            </div>
            <span className="live-label">
              <span className="local-dot" aria-hidden="true" />
              live
            </span>
          </header>
          <ActivityFeed
            activities={data.activities}
            tickets={data.tickets}
            now={now}
            limit={5}
          />
          <p className="activity-footnote">
            Данные сгенерированы детерминированно · {formatDateTime(data.seededAt)}
          </p>
        </section>
      </div>
    </div>
  );
}
