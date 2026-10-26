import { computeSla } from './sla';
import { getTicketFlowPerDay, type TicketFlowPoint } from './selectors';
import type { SlaPolicy, Ticket } from './types';

export interface DashboardTrends {
  flow: TicketFlowPoint[];
  open: number[];
  overdue: number[];
  firstResponse: number[];
  resolution: number[];
}

function endOfDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(23, 59, 59, 999);
  return result;
}

function averageMinutes(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function durationMinutes(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60_000;
}

export function getDashboardTrends(
  tickets: readonly Ticket[],
  now: Date,
  policies: readonly SlaPolicy[],
  days = 30,
): DashboardTrends {
  const flow = getTicketFlowPerDay(tickets, now, days);
  const activeTickets = tickets.filter(
    (ticket) =>
      ticket.status === 'new' || ticket.status === 'open' || ticket.status === 'pending',
  );

  const open = new Array<number>(flow.length).fill(activeTickets.length);
  for (let index = flow.length - 1; index > 0; index -= 1) {
    const point = flow[index];
    open[index - 1] = Math.max(0, open[index] - point.created + point.resolved);
  }

  const overdue = flow.map((point) => {
    const snapshotAt = endOfDay(new Date(point.date));
    return activeTickets.filter(
      (ticket) => computeSla(ticket, snapshotAt, policies).overall === 'overdue',
    ).length;
  });

  let lastFirstResponse = 0;
  const firstResponse = flow.map((point) => {
    const dayStart = new Date(point.date).getTime();
    const dayEnd = endOfDay(new Date(point.date)).getTime();
    const values = tickets
      .filter((ticket) => {
        if (!ticket.firstRespondedAt) return false;
        const respondedAt = new Date(ticket.firstRespondedAt).getTime();
        return respondedAt >= dayStart && respondedAt <= dayEnd;
      })
      .map((ticket) => durationMinutes(ticket.createdAt, ticket.firstRespondedAt as string));
    if (values.length > 0) lastFirstResponse = averageMinutes(values);
    return values.length > 0 ? averageMinutes(values) : lastFirstResponse;
  });

  let lastResolution = 0;
  const resolution = flow.map((point) => {
    const dayStart = new Date(point.date).getTime();
    const dayEnd = endOfDay(new Date(point.date)).getTime();
    const values = tickets
      .filter((ticket) => {
        const resolvedAt = ticket.resolvedAt ?? ticket.closedAt;
        if (!resolvedAt) return false;
        const time = new Date(resolvedAt).getTime();
        return time >= dayStart && time <= dayEnd;
      })
      .map((ticket) =>
        durationMinutes(ticket.createdAt, (ticket.resolvedAt ?? ticket.closedAt) as string),
      );
    if (values.length > 0) lastResolution = averageMinutes(values);
    return values.length > 0 ? averageMinutes(values) : lastResolution;
  });

  return { flow, open, overdue, firstResponse, resolution };
}
