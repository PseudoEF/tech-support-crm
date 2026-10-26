import { computeSla, type SlaState } from './sla';
import type {
  CrmSnapshot,
  KbArticle,
  Priority,
  SlaPolicy,
  Ticket,
  TicketStatus,
} from './types';

export interface TicketListFilters {
  search: string;
  status: TicketStatus | 'all';
  priority: Priority | 'all';
  teamId: string | 'all';
  assigneeId: string | 'all';
  sla: SlaState | 'all';
}

export const DEFAULT_TICKET_FILTERS: TicketListFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  teamId: 'all',
  assigneeId: 'all',
  sla: 'all',
};

export type TicketSort =
  'updated-desc' | 'created-desc' | 'priority-desc' | 'sla-asc' | 'number-asc';

export interface TicketFilterContext {
  clientNameById: ReadonlyMap<string, string>;
  policies: readonly SlaPolicy[];
  now: Date;
}

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

const SLA_ORDER: Record<SlaState, number> = {
  overdue: 0,
  'due-soon': 1,
  'on-track': 2,
  met: 3,
};

export function filterTickets(
  tickets: readonly Ticket[],
  filters: TicketListFilters,
  context: TicketFilterContext,
): Ticket[] {
  const query = filters.search.trim().toLowerCase();

  return tickets.filter((ticket) => {
    if (filters.status !== 'all' && ticket.status !== filters.status) return false;
    if (filters.priority !== 'all' && ticket.priority !== filters.priority) return false;
    if (filters.teamId !== 'all' && ticket.teamId !== filters.teamId) return false;
    if (filters.assigneeId !== 'all' && ticket.assigneeId !== filters.assigneeId) return false;

    if (filters.sla !== 'all') {
      const sla = computeSla(ticket, context.now, context.policies);
      if (sla.overall !== filters.sla) return false;
    }

    if (query) {
      const clientName = context.clientNameById.get(ticket.clientId) ?? '';
      const haystack = [
        ticket.number,
        ticket.subject,
        ticket.description,
        clientName,
        ...ticket.tags,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export function sortTickets(
  tickets: readonly Ticket[],
  sort: TicketSort,
  context: TicketFilterContext,
): Ticket[] {
  const result = [...tickets];

  switch (sort) {
    case 'created-desc':
      return result.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );
    case 'number-asc':
      return result.sort((left, right) => left.number.localeCompare(right.number, 'ru'));
    case 'priority-desc':
      return result.sort((left, right) => {
        const priorityDelta = PRIORITY_ORDER[right.priority] - PRIORITY_ORDER[left.priority];
        if (priorityDelta !== 0) return priorityDelta;
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
    case 'sla-asc':
      return result.sort((left, right) => {
        const leftSla = computeSla(left, context.now, context.policies);
        const rightSla = computeSla(right, context.now, context.policies);
        const stateDelta = SLA_ORDER[leftSla.overall] - SLA_ORDER[rightSla.overall];
        if (stateDelta !== 0) return stateDelta;
        return leftSla.resolutionRemainingMs - rightSla.resolutionRemainingMs;
      });
    case 'updated-desc':
    default:
      return result.sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
  }
}

export interface CrmMetrics {
  openTickets: number;
  overdueTickets: number;
  resolvedTickets: number;
  averageFirstResponseMinutes: number | null;
  averageResolutionMinutes: number | null;
  activeByPriority: Record<Priority, number>;
  byStatus: Record<TicketStatus, number>;
}

export function summarizeTickets(
  tickets: readonly Ticket[],
  now: Date,
  policies: readonly SlaPolicy[],
): CrmMetrics {
  const activeByPriority: Record<Priority, number> = {
    critical: 0,
    high: 0,
    normal: 0,
    low: 0,
  };
  const byStatus: Record<TicketStatus, number> = {
    new: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
  };

  let openTickets = 0;
  let overdueTickets = 0;
  let resolvedTickets = 0;
  let firstResponseTotal = 0;
  let firstResponseCount = 0;
  let resolutionTotal = 0;
  let resolutionCount = 0;

  tickets.forEach((ticket) => {
    byStatus[ticket.status] += 1;
    const active =
      ticket.status === 'new' || ticket.status === 'open' || ticket.status === 'pending';
    if (active) {
      openTickets += 1;
      activeByPriority[ticket.priority] += 1;
      const sla = computeSla(ticket, now, policies);
      if (sla.overall === 'overdue') overdueTickets += 1;
    }
    if (ticket.status === 'resolved' || ticket.status === 'closed') resolvedTickets += 1;

    if (ticket.firstRespondedAt) {
      const duration =
        new Date(ticket.firstRespondedAt).getTime() - new Date(ticket.createdAt).getTime();
      firstResponseTotal += duration / 60_000;
      firstResponseCount += 1;
    }

    const resolutionAt = ticket.resolvedAt ?? ticket.closedAt;
    if (resolutionAt) {
      const duration = new Date(resolutionAt).getTime() - new Date(ticket.createdAt).getTime();
      resolutionTotal += duration / 60_000;
      resolutionCount += 1;
    }
  });

  return {
    openTickets,
    overdueTickets,
    resolvedTickets,
    averageFirstResponseMinutes:
      firstResponseCount > 0 ? firstResponseTotal / firstResponseCount : null,
    averageResolutionMinutes: resolutionCount > 0 ? resolutionTotal / resolutionCount : null,
    activeByPriority,
    byStatus,
  };
}

export interface DailyTicketPoint {
  date: string;
  label: string;
  count: number;
}

export interface TicketFlowPoint {
  date: string;
  label: string;
  created: number;
  resolved: number;
}

interface DayWindow {
  date: Date;
  startMs: number;
  endMs: number;
}

function getDayWindows(now: Date, days: number): DayWindow[] {
  const windows: DayWindow[] = [];
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(end);
    day.setDate(end.getDate() - offset);
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    windows.push({ date: day, startMs: day.getTime(), endMs: next.getTime() });
  }

  return windows;
}

export function getTicketFlowPerDay(
  tickets: readonly Ticket[],
  now: Date,
  days = 14,
): TicketFlowPoint[] {
  return getDayWindows(now, days).map((window) => {
    let created = 0;
    let resolved = 0;

    tickets.forEach((ticket) => {
      const createdAt = new Date(ticket.createdAt).getTime();
      if (createdAt >= window.startMs && createdAt < window.endMs) created += 1;

      const resolutionAt = ticket.resolvedAt ?? ticket.closedAt;
      if (resolutionAt) {
        const resolvedAt = new Date(resolutionAt).getTime();
        if (resolvedAt >= window.startMs && resolvedAt < window.endMs) resolved += 1;
      }
    });

    return {
      date: window.date.toISOString(),
      label: new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
      }).format(window.date),
      created,
      resolved,
    };
  });
}

export function getTicketsPerDay(
  tickets: readonly Ticket[],
  now: Date,
  days = 14,
): DailyTicketPoint[] {
  return getTicketFlowPerDay(tickets, now, days).map((point) => ({
    date: point.date,
    label: point.label,
    count: point.created,
  }));
}

export interface SlaHealth {
  compliance: number;
  firstResponse: number;
  resolution: number;
  complianceMet: number;
  complianceTotal: number;
  firstResponseMet: number;
  firstResponseTotal: number;
  resolutionMet: number;
  resolutionTotal: number;
}

function percentage(met: number, total: number): number {
  return total > 0 ? Math.round((met / total) * 100) : 0;
}

export function getSlaHealth(
  tickets: readonly Ticket[],
  now: Date,
  policies: readonly SlaPolicy[],
): SlaHealth {
  let complianceMet = 0;
  let complianceTotal = 0;
  let firstResponseMet = 0;
  let firstResponseTotal = 0;
  let resolutionMet = 0;
  let resolutionTotal = 0;

  tickets.forEach((ticket) => {
    const sla = computeSla(ticket, now, policies);
    const finished = ticket.status === 'resolved' || ticket.status === 'closed';

    if (finished) {
      complianceTotal += 1;
      if (!sla.responseBreached && !sla.resolutionBreached) complianceMet += 1;
    }

    if (sla.responseCompleted) {
      firstResponseTotal += 1;
      if (!sla.responseBreached) firstResponseMet += 1;
    }

    if (sla.resolutionCompleted) {
      resolutionTotal += 1;
      if (!sla.resolutionBreached) resolutionMet += 1;
    }
  });

  return {
    compliance: percentage(complianceMet, complianceTotal),
    firstResponse: percentage(firstResponseMet, firstResponseTotal),
    resolution: percentage(resolutionMet, resolutionTotal),
    complianceMet,
    complianceTotal,
    firstResponseMet,
    firstResponseTotal,
    resolutionMet,
    resolutionTotal,
  };
}

export function filterKbArticles(
  articles: readonly KbArticle[],
  query: string,
  category: string | 'all',
): KbArticle[] {
  const normalized = query.trim().toLowerCase();
  return articles.filter((article) => {
    if (category !== 'all' && article.category !== category) return false;
    if (!normalized) return true;
    const body = article.sections
      .flatMap((section) => [
        section.heading,
        ...section.paragraphs,
        ...(section.bullets ?? []),
      ])
      .join(' ');
    return [article.title, article.excerpt, article.category, ...article.tags, body]
      .join(' ')
      .toLowerCase()
      .includes(normalized);
  });
}

export function getSnapshotCounts(snapshot: CrmSnapshot): {
  tickets: number;
  clients: number;
  agents: number;
  teams: number;
  assets: number;
  articles: number;
  messages: number;
  activities: number;
} {
  return {
    tickets: snapshot.tickets.length,
    clients: snapshot.clients.length,
    agents: snapshot.agents.length,
    teams: snapshot.teams.length,
    assets: snapshot.assets.length,
    articles: snapshot.kbArticles.length,
    messages: snapshot.messages.length,
    activities: snapshot.activities.length,
  };
}
